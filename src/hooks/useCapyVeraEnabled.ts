import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCapyVeraEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSetting = async () => {
    const { data } = await (supabase as any)
      .from('app_settings')
      .select('value')
      .eq('key', 'capy_vera_enabled')
      .maybeSingle();
    setEnabled(data?.value === true);
    setLoading(false);
  };

  useEffect(() => {
    fetchSetting();
    const channel = supabase
      .channel(`app_settings_capy_vera_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.capy_vera_enabled' },
        () => fetchSetting()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setValue = async (next: boolean) => {
    const { error } = await (supabase as any)
      .from('app_settings')
      .upsert({ key: 'capy_vera_enabled', value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (!error) setEnabled(next);
    return { error };
  };

  return { enabled, loading, setValue, refetch: fetchSetting };
}
