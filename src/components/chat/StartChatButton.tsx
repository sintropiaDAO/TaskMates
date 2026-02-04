import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/contexts/ChatContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface StartChatButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function StartChatButton({ 
  userId, 
  variant = 'outline',
  size = 'default',
  showLabel = true 
}: StartChatButtonProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { createDirectConversation } = useConversations();
  const { openChatDrawer, setActiveConversation } = useChat();
  const [loading, setLoading] = useState(false);

  if (!user || user.id === userId) return null;

  const handleClick = async () => {
    setLoading(true);
    const conversation = await createDirectConversation(userId);
    if (conversation) {
      setActiveConversation(conversation);
      openChatDrawer();
    }
    setLoading(false);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
      {showLabel && <span className="ml-2">{t('chatStartConversation')}</span>}
    </Button>
  );
}
