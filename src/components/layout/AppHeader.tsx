import { useState } from 'react';
import { Bell, LogOut, Settings, Search, BellRing, Shield, Download, Home, Globe } from 'lucide-react';
import logoTaskmates from '@/assets/logo-taskmates.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { unreadCount, hasNewNotification } = useNotifications();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isOnDashboard = location.pathname === '/dashboard';

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo - always navigates to dashboard */}
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/dashboard')}
        >
          <div className="p-1.5 rounded-lg bg-gradient-primary">
            <img src={logoTaskmates} alt="TaskMates" className="w-5 h-5" />
          </div>
          <span className="font-display text-xl font-bold text-gradient">TaskMates</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Home/Dashboard Button - shown when not on dashboard */}
          {!isOnDashboard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
              title={t('dashboard')}
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">{t('dashboard')}</span>
            </Button>
          )}

          {/* Search Users */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/search')}
            title={t('searchUsers')}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative transition-transform ${hasNewNotification ? 'animate-[wiggle_0.5s_ease-in-out_3]' : ''}`}
            >
              <Bell className={`w-5 h-5 transition-all ${hasNewNotification ? 'text-primary scale-110' : ''}`} />
              {unreadCount > 0 && (
                <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center ${hasNewNotification ? 'animate-pulse' : ''}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            
            {showNotifications && (
              <NotificationsPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.full_name || t('user')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.location || t('dashboardLocationNotSet')}
                </p>
              </div>
              <DropdownMenuSeparator />
              
              {/* Language Selector inside menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="w-4 h-4 mr-2" />
                  <span>{t('language')}</span>
                  <span className="ml-auto">{currentLanguage?.flag}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {languages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={language === lang.code ? 'bg-primary/10' : ''}
                      >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile/edit')}>
                <Settings className="w-4 h-4 mr-2" />
                {t('dashboardEditProfile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/install')}>
                <Download className="w-4 h-4 mr-2" />
                {t('installApp')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNotificationSettings(true)}>
                <BellRing className="w-4 h-4 mr-2" />
                {t('notificationSettings')}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="w-4 h-4 mr-2" />
                    {t('adminPanel')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {t('dashboardLogout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NotificationSettings 
        open={showNotificationSettings} 
        onClose={() => setShowNotificationSettings(false)} 
      />
    </header>
  );
}
