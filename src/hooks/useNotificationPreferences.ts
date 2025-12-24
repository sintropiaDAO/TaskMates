import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  email_address: string | null;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: true,
    email_address: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification preferences:', error);
      }

      if (data) {
        setPreferences({
          email_enabled: data.email_enabled,
          push_enabled: data.push_enabled,
          email_address: data.email_address
        });
      }
      setLoading(false);
    };

    fetchPreferences();
  }, [user]);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user) return false;

    const newPrefs = { ...preferences, ...updates };
    
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        email_enabled: newPrefs.email_enabled,
        push_enabled: newPrefs.push_enabled,
        email_address: newPrefs.email_address
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }

    setPreferences(newPrefs);
    return true;
  };

  return {
    preferences,
    loading,
    updatePreferences
  };
}
