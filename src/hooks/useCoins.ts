import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CoinBalance {
  currency_key: string;
  balance: number;
}

export interface CoinInfo {
  key: string;
  label: string;
  labelEn: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  scope: 'user' | 'global';
}

export const COIN_DEFINITIONS: CoinInfo[] = [
  { key: 'TASKS', label: 'Tarefas', labelEn: 'Tasks', icon: 'CheckCircle', color: 'text-green-500', scope: 'user' },
  { key: 'SOLICITATIONS', label: 'Solicitações', labelEn: 'Requests', icon: 'UserPlus', color: 'text-blue-500', scope: 'user' },
  { key: 'LIKES', label: 'Likes', labelEn: 'Likes', icon: 'ThumbsUp', color: 'text-yellow-500', scope: 'global' },
  { key: 'MAX_RATING', label: 'Avaliação Máxima', labelEn: 'Max Rating', icon: 'Star', color: 'text-amber-500', scope: 'global' },
  { key: 'LUCKY_STARS', label: 'Estrelas da Sorte', labelEn: 'Lucky Stars', icon: 'Sparkles', color: 'text-purple-500', scope: 'user' },
];

export function useCoins() {
  const { user } = useAuth();
  const [userBalances, setUserBalances] = useState<Record<string, number>>({});
  const [globalBalances, setGlobalBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [userRes, globalRes] = await Promise.all([
        supabase.rpc('get_user_coin_balances', { _user_id: user.id }),
        supabase.rpc('get_global_coin_balances'),
      ]);

      const uMap: Record<string, number> = {};
      (userRes.data as any[] || []).forEach((r: any) => { uMap[r.currency_key] = Number(r.balance); });
      setUserBalances(uMap);

      const gMap: Record<string, number> = {};
      (globalRes.data as any[] || []).forEach((r: any) => { gMap[r.currency_key] = Number(r.balance); });
      setGlobalBalances(gMap);
    } catch (err) {
      console.error('Error fetching coin balances:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const getBalance = (key: string): number => {
    const def = COIN_DEFINITIONS.find(c => c.key === key);
    if (!def) return 0;
    if (def.scope === 'global') return globalBalances[key] || 0;
    return userBalances[key] || 0;
  };

  const recordEvent = useCallback(async (
    eventId: string,
    eventType: string,
    currencyKey: string,
    subjectUserId: string,
    amount: number,
    meta: Record<string, any> = {}
  ) => {
    const { data, error } = await supabase.rpc('record_coin_event', {
      _event_id: eventId,
      _event_type: eventType,
      _currency_key: currencyKey,
      _subject_user_id: subjectUserId,
      _amount: amount,
      _meta: meta,
    });

    if (error) {
      console.error('Error recording coin event:', error);
      return false;
    }
    // Refresh balances after recording
    await fetchBalances();
    return data;
  }, [fetchBalances]);

  const rollLuckyStar = useCallback(async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('roll-lucky-star', {
        body: { taskId },
      });
      if (error) throw error;
      if (data?.won) {
        await fetchBalances();
      }
      return data;
    } catch (err) {
      console.error('Error rolling lucky star:', err);
      return null;
    }
  }, [fetchBalances]);

  const highlightTask = useCallback(async (taskId: string, cost: number = 1) => {
    try {
      const { data, error } = await supabase.rpc('use_stars_for_highlight', {
        _task_id: taskId,
        _cost: cost,
      });
      if (error) throw error;
      await fetchBalances();
      return data;
    } catch (err) {
      console.error('Error highlighting task:', err);
      return null;
    }
  }, [fetchBalances]);

  return {
    loading,
    getBalance,
    userBalances,
    globalBalances,
    recordEvent,
    rollLuckyStar,
    highlightTask,
    refreshBalances: fetchBalances,
  };
}
