import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { useBlocks } from '@/hooks/useBlocks';
import { useHiddenCommunityAccess } from '@/hooks/useHiddenCommunityAccess';
import { Profile, Tag, Task, Product, Poll } from '@/types';

export interface GlobalSearchResults {
  communities: Tag[];
  tags: Tag[];
  people: Profile[];
  tasks: Task[];
  products: Product[];
  polls: Poll[];
}

const EMPTY: GlobalSearchResults = {
  communities: [],
  tags: [],
  people: [],
  tasks: [],
  products: [],
  polls: [],
};

const escapeLike = (s: string) => s.replace(/[%_,]/g, ' ').trim();

/**
 * Global search across communities, people, cards (tasks/products/polls) and tags.
 * Tag matching is translation-aware (uses the tag names + registered translations).
 */
export function useGlobalSearch(query: string) {
  const { user } = useAuth();
  const { tags, tagMatchesQuery } = useTags();
  const { blockedIds } = useBlocks();
  const { isItemVisibleToUser, isTagHiddenFromUser } = useHiddenCommunityAccess();

  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState<{
    people: Profile[];
    tasks: Task[];
    products: Product[];
    polls: Poll[];
  }>({ people: [], tasks: [], products: [], polls: [] });
  const [itemTagMap, setItemTagMap] = useState<Record<string, Array<{ id: string; category: string }>>>({});
  const reqId = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const term = escapeLike(debounced);
    if (term.length < 2) {
      setRemote({ people: [], tasks: [], products: [], polls: [] });
      setItemTagMap({});
      setLoading(false);
      return;
    }

    const current = ++reqId.current;
    setLoading(true);

    const run = async () => {
      const like = `%${term}%`;
      const cleanHandle = `%${term.replace('@', '')}%`;

      const [profilesRes, tasksRes, productsRes, pollsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .or(`full_name.ilike.${like},username.ilike.${cleanHandle},location.ilike.${like}`)
          .limit(12),
        supabase
          .from('tasks')
          .select('*')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('products')
          .select('*')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('polls')
          .select('*')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      if (current !== reqId.current) return;

      const tasksData = (tasksRes.data || []) as unknown as Task[];
      const productsData = (productsRes.data || []) as unknown as Product[];
      const pollsData = (pollsRes.data || []) as unknown as Poll[];

      // Fetch community/skill tags for each matched item so private items can be filtered out
      const [taskTags, productTags, pollTags] = await Promise.all([
        tasksData.length
          ? supabase.from('task_tags').select('task_id, tag:tags(id, category)').in('task_id', tasksData.map(t => t.id))
          : Promise.resolve({ data: [] as any[] }),
        productsData.length
          ? supabase.from('product_tags').select('product_id, tag:tags(id, category)').in('product_id', productsData.map(p => p.id))
          : Promise.resolve({ data: [] as any[] }),
        pollsData.length
          ? supabase.from('poll_tags').select('poll_id, tag:tags(id, category)').in('poll_id', pollsData.map(p => p.id))
          : Promise.resolve({ data: [] as any[] }),
      ]);

      if (current !== reqId.current) return;

      const map: Record<string, Array<{ id: string; category: string }>> = {};
      const push = (key: string, tag: any) => {
        if (!tag) return;
        if (!map[key]) map[key] = [];
        map[key].push({ id: tag.id, category: tag.category });
      };
      (taskTags.data || []).forEach((r: any) => push(r.task_id, r.tag));
      (productTags.data || []).forEach((r: any) => push(r.product_id, r.tag));
      (pollTags.data || []).forEach((r: any) => push(r.poll_id, r.tag));

      setItemTagMap(map);
      setRemote({
        people: ((profilesRes.data || []) as unknown as Profile[]),
        tasks: tasksData,
        products: productsData,
        polls: pollsData,
      });
      setLoading(false);
    };

    run().catch(() => {
      if (current === reqId.current) setLoading(false);
    });
  }, [debounced]);

  const results: GlobalSearchResults = useMemo(() => {
    if (debounced.trim().length < 2) return EMPTY;

    const visible = (id: string) => isItemVisibleToUser(itemTagMap[id] || []);

    const matchedTags = tags.filter(tag => tagMatchesQuery(tag, debounced));

    return {
      communities: matchedTags.filter(t => t.category === 'communities' && !isTagHiddenFromUser(t.id)),
      tags: matchedTags.filter(t => t.category !== 'communities'),
      people: remote.people.filter(p => p.id !== user?.id && !blockedIds.includes(p.id)),
      tasks: remote.tasks.filter(t => visible(t.id)),
      products: remote.products.filter(p => visible(p.id)),
      polls: remote.polls.filter(p => visible(p.id)),
    };
  }, [debounced, tags, tagMatchesQuery, remote, itemTagMap, blockedIds, user?.id, isItemVisibleToUser, isTagHiddenFromUser]);

  const total =
    results.communities.length +
    results.tags.length +
    results.people.length +
    results.tasks.length +
    results.products.length +
    results.polls.length;

  return { results, total, loading, active: debounced.trim().length >= 2 };
}
