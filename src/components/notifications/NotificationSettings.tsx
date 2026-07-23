import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, Smartphone, Check, Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotificationPreferences, DEFAULT_EMAIL_TYPES, EmailTypeKey } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationSettings({ open, onClose }: NotificationSettingsProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const { isSupported, permission, requestPermission, isEnabled } = usePushNotifications();
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const pt = language === 'pt';

  const registeredEmail = preferences.email_address || user?.email || '';

  useEffect(() => {
    setEmailAddress(preferences.email_address || user?.email || '');
  }, [preferences.email_address, user?.email]);

  const EMAIL_TYPE_LABELS: Record<EmailTypeKey, { pt: string; en: string }> = {
    new_follower: { pt: 'Novos seguidores', en: 'New followers' },
    collaboration: { pt: 'Colaborações aceitas', en: 'Accepted collaborations' },
    collaboration_request: { pt: 'Pedidos de colaboração', en: 'Collaboration requests' },
    comment: { pt: 'Comentários nos meus itens', en: 'Comments on my items' },
    task_completed: { pt: 'Tarefas concluídas', en: 'Tasks completed' },
    new_task: { pt: 'Novas tarefas de quem sigo', en: 'New tasks from people I follow' },
    new_rating: { pt: 'Novas avaliações recebidas', en: 'New ratings received' },
    new_message: { pt: 'Novas mensagens no chat', en: 'New chat messages' },
    community_invite: { pt: 'Convites de comunidade', en: 'Community invites' },
  };

  const handleEmailToggle = async (enabled: boolean) => {
    setSaving(true);
    const success = await updatePreferences({ email_enabled: enabled });
    setSaving(false);
    if (success) toast({ title: t('notificationSettingsSaved') });
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast({ title: t('notificationPermissionDenied'), variant: 'destructive' });
        return;
      }
    }
    setSaving(true);
    const success = await updatePreferences({ push_enabled: enabled });
    setSaving(false);
    if (success) toast({ title: t('notificationSettingsSaved') });
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    const success = await updatePreferences({ email_address: emailAddress || null });
    setSaving(false);
    if (success) {
      setEditingEmail(false);
      toast({ title: t('notificationSettingsSaved') });
    }
  };

  const handleToggleType = async (key: EmailTypeKey, checked: boolean) => {
    const next = { ...preferences.email_types, [key]: checked };
    setSaving(true);
    const success = await updatePreferences({ email_types: next });
    setSaving(false);
    if (success) toast({ title: t('notificationSettingsSaved') });
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg sm:max-w-2xl lg:max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {t('notificationSettings')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Notifications */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">{t('emailNotifications')}</p>
                  <p className="text-sm text-muted-foreground">{t('emailNotificationsDescription')}</p>
                </div>
              </div>
              <Switch checked={preferences.email_enabled} onCheckedChange={handleEmailToggle} disabled={saving} />
            </div>

            {preferences.email_enabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-12 space-y-4">
                {/* Alterar email */}
                <div className="space-y-2">
                  <Label>{pt ? 'Alterar email' : 'Change email'}</Label>
                  {!editingEmail ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm truncate">
                        {registeredEmail || (pt ? '—' : '—')}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setEditingEmail(true)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        {pt ? 'Alterar' : 'Change'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input type="email" placeholder={t('emailPlaceholder')} value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} />
                      <Button size="sm" onClick={handleSaveEmail} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingEmail(false); setEmailAddress(registeredEmail); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {pt ? 'Por padrão usamos o email cadastrado na sua conta.' : 'By default we use the email registered on your account.'}
                  </p>
                </div>

                {/* Checklist tipos */}
                <div className="space-y-2">
                  <Label>{pt ? 'Tipos de notificação por email' : 'Email notification types'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {pt ? 'Escolha quais eventos disparam email. Todas ligadas por padrão.' : 'Choose which events trigger an email. All on by default.'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(DEFAULT_EMAIL_TYPES) as EmailTypeKey[]).map((key) => {
                      const checked = preferences.email_types[key] ?? true;
                      return (
                        <label key={key} className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => handleToggleType(key, c === true)}
                            disabled={saving}
                            className="mt-0.5"
                          />
                          <span className="text-sm leading-tight">{pt ? EMAIL_TYPE_LABELS[key].pt : EMAIL_TYPE_LABELS[key].en}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Push Notifications */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Smartphone className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">{t('pushNotifications')}</p>
                  <p className="text-sm text-muted-foreground">{t('pushNotificationsDescription')}</p>
                </div>
              </div>
              <Switch checked={preferences.push_enabled && isEnabled} onCheckedChange={handlePushToggle} disabled={saving || !isSupported} />
            </div>

            {!isSupported && <p className="pl-12 text-sm text-amber-600">{t('pushNotificationsNotSupported')}</p>}
            {isSupported && permission === 'denied' && <p className="pl-12 text-sm text-red-500">{t('pushNotificationsBlocked')}</p>}
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
