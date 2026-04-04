import { useState } from 'react';
import { ClipboardList, Activity, Sparkles, MapPin, Plus, X, ListChecks, Package, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat } from '@/contexts/ChatContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

type Section = 'mytasks' | 'feed' | 'recommendations' | 'nearby';

export function BottomNav() {
  const [showMenu, setShowMenu] = useState(false);
  const { language } = useLanguage();
  const { closeChatDrawer } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isDashboard = location.pathname === '/dashboard';
  const activeSection: Section = isDashboard
    ? (searchParams.get('section') as Section) || 'recommendations'
    : (null as any);

  const navItems: { key: Section; icon: typeof ClipboardList; label: string }[] = [
    { key: 'recommendations', icon: Sparkles, label: language === 'pt' ? 'Para Você' : 'For You' },
    { key: 'nearby', icon: MapPin, label: language === 'pt' ? 'Perto' : 'Nearby' },
    { key: 'feed', icon: Activity, label: 'Feed' },
    { key: 'mytasks', icon: ClipboardList, label: language === 'pt' ? 'Minhas' : 'Mine' },
  ];

  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  const handleSectionChange = (section: Section) => {
    closeChatDrawer();
    if (isDashboard) {
      // Update search params in place
      const params = new URLSearchParams(searchParams);
      params.set('section', section);
      navigate(`/dashboard?${params.toString()}`, { replace: true });
    } else {
      navigate(`/dashboard?section=${section}`);
    }
  };

  const handleCreate = (type: 'task' | 'product' | 'poll') => {
    setShowMenu(false);
    if (isDashboard) {
      // Dispatch custom event for Dashboard to handle
      window.dispatchEvent(new CustomEvent('bottomnav-create', { detail: { type } }));
    } else {
      navigate(`/dashboard?create=${type}`);
    }
  };

  const renderNavButton = (item: typeof navItems[0]) => (
    <button
      key={item.key}
      onClick={() => handleSectionChange(item.key)}
      className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
        activeSection === item.key 
          ? 'text-primary' 
          : 'text-muted-foreground'
      }`}
    >
      <div className="relative">
        <item.icon className={`w-5 h-5 ${activeSection === item.key ? 'scale-110' : ''} transition-transform`} />
      </div>
      <span className="text-[10px] font-medium">{item.label}</span>
    </button>
  );

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating menu options */}
      <AnimatePresence>
        {showMenu && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[95] flex flex-col items-center gap-3">
            {[
              { label: language === 'pt' ? 'Tarefa' : 'Task', icon: ListChecks, type: 'task' as const, color: 'bg-primary text-primary-foreground' },
              { label: language === 'pt' ? 'Produto' : 'Product', icon: Package, type: 'product' as const, color: 'bg-amber-500 text-white' },
              { label: language === 'pt' ? 'Enquete' : 'Poll', icon: BarChart3, type: 'poll' as const, color: 'bg-info text-white' },
            ].map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: (2 - i) * 0.05 }}
                className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-lg ${item.color} font-medium text-sm`}
                onClick={() => handleCreate(item.type)}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[91] bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {leftItems.map(item => renderNavButton(item))}

          {/* Center + button */}
          <div className="flex flex-col items-center justify-center flex-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMenu(!showMenu)}
              className={`w-14 h-14 -mt-7 rounded-full shadow-lg flex items-center justify-center transition-all ${
                showMenu 
                  ? 'bg-destructive text-destructive-foreground rotate-45' 
                  : 'bg-gradient-primary text-primary-foreground'
              }`}
            >
              {showMenu ? <X className="w-7 h-7 -rotate-45" /> : <Plus className="w-7 h-7" />}
            </motion.button>
          </div>

          {rightItems.map(item => renderNavButton(item))}
        </div>
      </nav>
    </>
  );
}
