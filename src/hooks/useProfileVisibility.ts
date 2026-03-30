import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type VisibilityKey =
  | 'show_coins'
  | 'show_completed_chart'
  | 'show_ratings'
  | 'show_my_action_plan'
  | 'show_my_demands'
  | 'show_my_impact'
  | 'show_my_deliver'
  | 'show_my_receive'
  | 'show_my_delivered'
  | 'show_my_voting'
  | 'show_my_completed_polls';

export type VisibilitySettings = Record<VisibilityKey, boolean>;

const DEFAULTS: VisibilitySettings = {
  show_coins: true,
  show_completed_chart: true,
  show_ratings: true,
  show_my_action_plan: false,
  show_my_demands: false,
  show_my_impact: false,
  show_my_deliver: false,
  show_my_receive: false,
  show_my_delivered: false,
  show_my_voting: false,
  show_my_completed_polls: false,
};

export function useProfileVisibility(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;
  const [settings, setSettings] = useState<VisibilitySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('profile_section_visibility')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      const s: VisibilitySettings = { ...DEFAULTS };
      (Object.keys(DEFAULTS) as VisibilityKey[]).forEach(key => {
        if (key in data) s[key] = (data as any)[key];
      });
      setSettings(s);
    }
    setLoading(false);
  };

  const toggleSection = useCallback(async (key: VisibilityKey, value?: boolean) => {
    if (!user) return;
    const newValue = value !== undefined ? value : !settings[key];
    const newSettings = { ...settings, [key]: newValue };
    setSettings(newSettings);

    // Upsert
    const { data: existing } = await supabase
      .from('profile_section_visibility')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await supabase
        .from('profile_section_visibility')
        .update({ [key]: newValue, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('profile_section_visibility')
        .insert({ user_id: user.id, ...newSettings });
    }
  }, [user, settings]);

  return { settings, loading, toggleSection, refetch: fetchSettings };
}
