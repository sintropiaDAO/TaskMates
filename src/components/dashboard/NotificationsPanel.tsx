import { motion } from 'framer-motion';
import { X, Check, Bell, UserPlus, MessageSquare, Users, ListTodo, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

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
    default:
      return <Bell className="w-4 h-4 text-primary" />;
  }
};

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const dateLocale = language === 'pt' ? ptBR : enUS;
  const dateFormat = language === 'pt' ? "dd 'de' MMM 'às' HH:mm" : "MMM dd 'at' HH:mm";

  const handleNotificationClick = (notification: { id: string; type: string; task_id?: string | null }) => {
    markAsRead(notification.id);
    onClose();
    
    // Navigate based on notification type
    if (notification.type === 'new_follower') {
      navigate('/followers');
    } else if (notification.type === 'collaboration' || notification.type === 'collaboration_request') {
      if (notification.task_id) {
        navigate(`/dashboard?task=${notification.task_id}`);
      } else {
        navigate('/dashboard');
      }
    } else if (notification.task_id) {
      navigate(`/dashboard?task=${notification.task_id}`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{t('notificationsTitle')}</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
              {unreadCount} {t('notificationsNew')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              {t('notificationsMarkAll')}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
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
    </motion.div>
  );
}
