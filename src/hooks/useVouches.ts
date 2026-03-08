import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Vouch {
  id: string;
  voucher_id: string;
  vouched_user_id: string;
  created_at: string;
}

export function useVouches(targetUserId?: string) {
  const { user, profile } = useAuth();
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVouches = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await (supabase as any)
      .from('user_vouches')
      .select('*')
      .eq('vouched_user_id', targetUserId);
    if (data) setVouches(data);
  }, [targetUserId]);

  useEffect(() => {
    fetchVouches();
  }, [fetchVouches]);

  const hasVouched = vouches.some(v => v.voucher_id === user?.id);

  const vouchForUser = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !targetUserId) return { success: false, error: 'Not authenticated' };
    if (user.id === targetUserId) return { success: false, error: 'vouchSelf' };
    if (!profile?.is_verified) return { success: false, error: 'vouchRequiresVerified' };
    if (hasVouched) return { success: false, error: 'vouchAlready' };

    setLoading(true);
    const { error } = await (supabase as any)
      .from('user_vouches')
      .insert({ voucher_id: user.id, vouched_user_id: targetUserId });
    setLoading(false);

    if (error) {
      if (error.message.includes('duplicate')) return { success: false, error: 'vouchAlready' };
      return { success: false, error: error.message };
    }

    await fetchVouches();
    return { success: true };
  };

  const removeVouch = async (): Promise<boolean> => {
    if (!user || !targetUserId) return false;
    setLoading(true);
    const { error } = await (supabase as any)
      .from('user_vouches')
      .delete()
      .eq('voucher_id', user.id)
      .eq('vouched_user_id', targetUserId);
    setLoading(false);
    if (!error) {
      await fetchVouches();
      return true;
    }
    return false;
  };

  return {
    vouches,
    vouchCount: vouches.length,
    hasVouched,
    loading,
    vouchForUser,
    removeVouch,
    refreshVouches: fetchVouches,
  };
}
