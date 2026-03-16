import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Tag, Profile, ProductParticipant } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data: productsData, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !productsData) {
      console.error('Error fetching products:', error);
      setLoading(false);
      return;
    }

    const productIds = productsData.map(p => p.id);
    const creatorIds = [...new Set(productsData.map(p => p.created_by))];

    const [tagsResult, profilesResult] = await Promise.all([
      supabase.from('product_tags').select('product_id, tag:tags(*)').in('product_id', productIds),
      supabase.from('public_profiles').select('*').in('id', creatorIds),
    ]);

    const tagsByProduct: Record<string, Tag[]> = {};
    tagsResult.data?.forEach((pt: any) => {
      if (!tagsByProduct[pt.product_id]) tagsByProduct[pt.product_id] = [];
      if (pt.tag) tagsByProduct[pt.product_id].push(pt.tag as Tag);
    });

    const profilesMap: Record<string, Profile> = {};
    profilesResult.data?.forEach(p => {
      profilesMap[p.id!] = p as unknown as Profile;
    });

    const enriched = productsData.map(p => ({
      ...p,
      tags: tagsByProduct[p.id] || [],
      creator: profilesMap[p.created_by],
    })) as Product[];

    setProducts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [user?.id, fetchProducts]);

  const createProduct = async (
    title: string,
    description: string,
    productType: 'offer' | 'request',
    tagIds: string[],
    quantity: number,
    imageUrl?: string,
    priority?: string | null,
    location?: string,
    referenceUrl?: string
  ) => {
    if (!user) return null;

    // Generate delivery code
    const deliveryCode = String(Math.floor(1000 + Math.random() * 9000));

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        title,
        description,
        product_type: productType,
        created_by: user.id,
        quantity,
        image_url: imageUrl || null,
        priority: priority || null,
        location: location || null,
        delivery_code: deliveryCode,
      })
      .select()
      .single();

    if (error || !product) return null;

    if (tagIds.length > 0) {
      await supabase.from('product_tags').insert(
        tagIds.map(tagId => ({ product_id: product.id, tag_id: tagId }))
      );
    }

    // Add creator as participant
    const role = productType === 'offer' ? 'supplier' : 'requester';
    await supabase.from('product_participants').insert({
      product_id: product.id,
      user_id: user.id,
      role,
      quantity: 0,
      status: 'confirmed',
    });

    await fetchProducts();
    return product as Product;
  };

  const updateProduct = async (productId: string, updates: Partial<Product>, tagIds?: string[]) => {
    if (!user) return false;
    const { error } = await supabase
      .from('products')
      .update(updates as any)
      .eq('id', productId);
    if (error) return false;

    // Update tags if provided
    if (tagIds !== undefined) {
      await supabase.from('product_tags').delete().eq('product_id', productId);
      if (tagIds.length > 0) {
        await supabase.from('product_tags').insert(
          tagIds.map(tagId => ({ product_id: productId, tag_id: tagId }))
        );
      }
    }

    await fetchProducts();
    return true;
  };

  const deleteProduct = async (productId: string) => {
    if (!user) return false;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) {
      await fetchProducts();
      return true;
    }
    return false;
  };

  const addParticipant = async (productId: string, role: 'supplier' | 'requester', quantity: number) => {
    if (!user) return null;

    // Check existing participation
    const { data: existing } = await supabase
      .from('product_participants')
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .eq('role', role)
      .maybeSingle();

    if (existing) {
      // Update quantity
      const newQty = existing.quantity + quantity;
      await supabase
        .from('product_participants')
        .update({ quantity: newQty })
        .eq('id', existing.id);
    } else {
      await supabase.from('product_participants').insert({
        product_id: productId,
        user_id: user.id,
        role,
        quantity,
        status: 'confirmed',
      });
    }

    // Update product remaining quantity
    const { data: product } = await supabase
      .from('products')
      .select('quantity')
      .eq('id', productId)
      .single();

    if (product) {
      const newQuantity = Math.max(0, product.quantity - quantity);
      await supabase.from('products').update({ quantity: newQuantity }).eq('id', productId);
    }

    await fetchProducts();
    return true;
  };

  const getParticipants = async (productId: string): Promise<ProductParticipant[]> => {
    const { data: participants } = await supabase
      .from('product_participants')
      .select('*')
      .eq('product_id', productId);

    if (!participants) return [];

    const userIds = [...new Set(participants.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('public_profiles').select('*').in('id', userIds);
    const profilesMap: Record<string, Profile> = {};
    profiles?.forEach(p => { profilesMap[p.id!] = p as unknown as Profile; });

    return participants.map(p => ({
      ...p,
      profile: profilesMap[p.user_id],
    })) as ProductParticipant[];
  };

  const confirmDelivery = async (
    productId: string,
    proofUrl?: string,
    proofType?: string,
    deliveryCodeInput?: string
  ) => {
    if (!user) return false;

    // Check delivery code or proof
    const { data: product } = await supabase
      .from('products')
      .select('delivery_code, created_by')
      .eq('id', productId)
      .single();

    if (!product) return false;

    // Verify delivery code if provided
    if (deliveryCodeInput && product.delivery_code !== deliveryCodeInput) {
      return false;
    }

    // Update participant delivery status
    await supabase
      .from('product_participants')
      .update({
        delivery_confirmed: true,
        delivery_proof_url: proofUrl || null,
        delivery_proof_type: proofType || null,
        delivery_code_input: deliveryCodeInput || null,
      })
      .eq('product_id', productId)
      .eq('user_id', user.id);

    // Check if all participants confirmed, then mark as delivered
    const { data: allParticipants } = await supabase
      .from('product_participants')
      .select('delivery_confirmed')
      .eq('product_id', productId)
      .neq('user_id', product.created_by);

    const allConfirmed = allParticipants?.every(p => p.delivery_confirmed);
    if (allConfirmed && allParticipants && allParticipants.length > 0) {
      await supabase.from('products').update({ status: 'delivered' }).eq('id', productId);
    }

    await fetchProducts();
    return true;
  };

  const voteProduct = async (productId: string, voteType: 'up' | 'down') => {
    if (!user) return false;

    const { data: existing } = await supabase
      .from('product_likes' as any)
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if ((existing as any).like_type === voteType) {
        // Remove vote
        await supabase.from('product_likes' as any).delete().eq('id', (existing as any).id);
      } else {
        // Change vote
        await supabase.from('product_likes' as any).update({ like_type: voteType }).eq('id', (existing as any).id);
      }
    } else {
      await supabase.from('product_likes' as any).insert({
        product_id: productId,
        user_id: user.id,
        like_type: voteType,
      });
    }

    await fetchProducts();
    return true;
  };

  const getUserProductVote = async (productId: string): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('product_likes' as any)
      .select('like_type')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle();
    return data ? (data as any).like_type : null;
  };

  return {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    addParticipant,
    getParticipants,
    confirmDelivery,
    voteProduct,
    getUserProductVote,
    refreshProducts: fetchProducts,
  };
}
