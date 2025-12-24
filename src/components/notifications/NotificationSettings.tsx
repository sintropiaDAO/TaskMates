import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, Smartphone, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationSettings({ open, onClose }: NotificationSettingsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const { isSupported, permission, requestPermission, isEnabled } = usePushNotifications();
  const [saving, setSaving] = useState(false);
  const [emailAddress, setEmailAddress] = useState(preferences.email_address || '');

  const handleEmailToggle = async (enabled: boolean) => {
    setSaving(true);
    const success = await updatePreferences({ email_enabled: enabled });
    setSaving(false);
    if (success) {
      toast({ title: t('notificationSettingsSaved') });
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast({ 
          title: t('notificationPermissionDenied'),
          variant: 'destructive'
        });
        return;
      }
    }
    
    setSaving(true);
    const success = await updatePreferences({ push_enabled: enabled });
    setSaving(false);
    if (success) {
      toast({ title: t('notificationSettingsSaved') });
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    const success = await updatePreferences({ email_address: emailAddress || null });
    setSaving(false);
    if (success) {
      toast({ title: t('notificationSettingsSaved') });
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {t('notificationSettings')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">{t('emailNotifications')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('emailNotificationsDescription')}
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={handleEmailToggle}
                disabled={saving}
              />
            </div>

            {preferences.email_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pl-12 space-y-2"
              >
                <Label htmlFor="email">{t('emailAddress')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSaveEmail}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('emailOptional')}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Push Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Smartphone className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">{t('pushNotifications')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('pushNotificationsDescription')}
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.push_enabled && isEnabled}
                onCheckedChange={handlePushToggle}
                disabled={saving || !isSupported}
              />
            </div>

            {!isSupported && (
              <p className="pl-12 text-sm text-amber-600">
                {t('pushNotificationsNotSupported')}
              </p>
            )}

            {isSupported && permission === 'denied' && (
              <p className="pl-12 text-sm text-red-500">
                {t('pushNotificationsBlocked')}
              </p>
            )}
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
