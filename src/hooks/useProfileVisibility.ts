import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type VisibilityKey =
  | 'show_coins'
  | 'show_completed_chart'
  | 'show_ratings'
  | 'show_recent_activity'
  | 'show_my_action_plan'
  | 'show_my_demands'
  | 'show_my_impact'
  | 'show_my_deliver'
  | 'show_my_receive'
  | 'show_my_delivered'
  | 'show_my_voting'
  | 'show_my_completed_polls'
  | 'show_my_highlights';

export type VisibilitySettings = Record<VisibilityKey, boolean>;

const DEFAULTS: VisibilitySettings = {
  show_coins: true,
  show_completed_chart: true,
  show_ratings: true,
  show_recent_activity: true,
  show_my_action_plan: false,
  show_my_demands: false,
  show_my_impact: false,
  show_my_deliver: false,
  show_my_receive: false,
  show_my_delivered: false,
  show_my_voting: false,
  show_my_completed_polls: false,
  show_my_highlights: false,
};

const PRIVATE_SETTINGS = Object.fromEntries(
  Object.keys(DEFAULTS).map(key => [key, false]),
) as VisibilitySettings;

export function useProfileVisibility(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;
  const [settings, setSettings] = useState<VisibilitySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSettings(PRIVATE_SETTINGS);
    if (!userId || !user) { setLoading(false); return; }
    fetchSettings();
  }, [userId, user?.id]);

  const fetchSettings = async () => {
    if (!userId || !user) return;
    setLoading(true);
    try {
      if (userId !== user.id) {
        const { data, error } = await supabase.rpc('get_public_profile_visibility', {
          _user_id: userId,
        });
        if (error) throw error;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          setSettings(PRIVATE_SETTINGS);
          return;
        }
        const publicSettings = { ...PRIVATE_SETTINGS };
        (Object.keys(DEFAULTS) as VisibilityKey[]).forEach(key => {
          publicSettings[key] = data[key] === true;
        });
        setSettings(publicSettings);
      } else {
        const { data, error } = await supabase
          .from('profile_section_visibility')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        const ownSettings = { ...DEFAULTS };
        if (data) {
          (Object.keys(DEFAULTS) as VisibilityKey[]).forEach(key => {
            ownSettings[key] = data[key] === true;
          });
        }
        setSettings(ownSettings);
      }
    } catch {
      setSettings(PRIVATE_SETTINGS);
    } finally {
      setLoading(false);
    }
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
        .update({ [key]: newValue, updated_at: new Date().toISOString() } as any)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('profile_section_visibility')
        .insert({ user_id: user.id, ...newSettings });
    }
  }, [user, settings]);

  return { settings, loading, toggleSection, refetch: fetchSettings };
}
