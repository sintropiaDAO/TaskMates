import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Check, Bell, UserPlus, MessageSquare, Users, ListTodo, CheckCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from '@/lib/router-compat';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { useChat } from '@/contexts/ChatContext';

interface NotificationsPanelProps {
  onClose: () => void;
}


const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_follower':
      return <UserPlus className="w-4 h-4 text-blue-500" />;
    case 'collaboration':
    case 'collaboration_request':
      return <Users className="w-4 h-4 text-purple-500" />;
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-green-500" />;
    case 'task_completed':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'new_task':
      return <ListTodo className="w-4 h-4 text-orange-500" />;
    case 'community_invite':
      return <Users className="w-4 h-4 text-indigo-500" />;
    default:
      return <Bell className="w-4 h-4 text-primary" />;
  }
};

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const { openConversationById, openChatDrawer } = useChat();


  const dateLocale = language === 'pt' ? ptBR : enUS;
  const dateFormat = language === 'pt' ? "dd 'de' MMM 'às' HH:mm" : "MMM dd 'at' HH:mm";

  const handleNotificationClick = (notification: { id: string; type: string; task_id?: string | null; message?: string }) => {
    markAsRead(notification.id);
    onClose();

    const type = notification.type || '';
    const ref = notification.task_id || null;

    // Chat/message notifications → open chat drawer with the conversation
    if (type === 'message' || type === 'new_message' || type === 'chat_message' || type.includes('message')) {
      if (ref) {
        openConversationById(ref);
      } else {
        openChatDrawer();
      }
      return;
    }

    // Community invites → tag page
    if (type === 'community_invite' && ref) {
      navigate(`/tags/${ref}`);
      return;
    }

    // Followers
    if (type === 'new_follower' && user) {
      navigate(`/profile/${user.id}/followers`);
      return;
    }

    // Poll-related notifications
    if (ref && (type.startsWith('poll') || type === 'new_vote' || type === 'poll_invite')) {
      navigate(`/dashboard?poll=${ref}`);
      return;
    }

    // Product-related notifications
    if (ref && (type.startsWith('product') || type === 'product_invite' || type === 'delivery_confirmed')) {
      navigate(`/dashboard?product=${ref}`);
      return;
    }

    // Tag notifications (new_tag, tag_follow, etc.)
    if (type === 'new_tag' && ref) {
      navigate(`/tags/${ref}`);
      return;
    }

    // Rating / vouch
    if (type === 'rating' || type === 'new_rating' || type === 'vouch' || type === 'new_vouch') {
      if (user) navigate(`/profile/${user.id}`);
      else navigate('/dashboard');
      return;
    }

    // Task-related default (collaboration, comment, comment_like, task_completed, task_invite, report_like, etc.)
    if (ref) {
      navigate(`/dashboard?task=${ref}`);
      return;
    }

    // Fallback: go to dashboard
    navigate('/dashboard');
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="fixed right-4 left-4 sm:left-auto sm:absolute sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50 gap-2">
        <div className="flex items-center gap-2 min-w-0 shrink">
          <Bell className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-semibold text-sm sm:text-base truncate">{t('notificationsTitle')}</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs whitespace-nowrap shrink-0">
              {unreadCount} {t('notificationsNew')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs px-2 h-8">
              <Check className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">{t('notificationsMarkAll')}</span>
              <span className="sm:hidden">{language === 'pt' ? 'Marcar' : 'Mark'}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSettings(true)}
            title={t('notificationSettings')}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>{t('notificationsEmpty')}</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/50 ${
                !notification.read ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.created_at), dateFormat, { locale: dateLocale })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <NotificationSettings open={showSettings} onClose={() => setShowSettings(false)} />
    </motion.div>
  );
}

