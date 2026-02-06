import { useState } from 'react';
import { X, ExternalLink, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Conversation } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation: Conversation;
  onClose?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function ChatHeader({ conversation, onClose, searchQuery = '', onSearchChange }: ChatHeaderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { setShowTaskDetailModal, setTaskIdForModal } = useChat();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const otherParticipants = conversation.participants?.filter(
    p => p.user_id !== user?.id
  ) || [];

  const handleOpenTaskDetail = () => {
    if (conversation.task_id) {
      setTaskIdForModal(conversation.task_id);
      setShowTaskDetailModal(true);
    }
  };

  const getTitle = () => {
    if (conversation.type === 'task' && conversation.task) {
      return conversation.task.title;
    }
    
    if (otherParticipants.length === 1) {
      return otherParticipants[0].profile?.full_name || t('chatUnknownUser');
    }
    
    return t('chatGroupConversation');
  };

  const getSubtitle = () => {
    if (conversation.type === 'task') {
      return `${otherParticipants.length + 1} ${t('chatParticipants')}`;
    }
    return null;
  };

  const handleSearchToggle = () => {
    if (isSearchOpen) {
      onSearchChange?.('');
    }
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between p-3">
        <div className={cn("flex items-center gap-3 min-w-0", isSearchOpen && "hidden sm:flex")}>
          {conversation.type === 'task' ? (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
          ) : otherParticipants.length === 1 ? (
            <UserAvatar
              userId={otherParticipants[0].user_id}
              avatarUrl={otherParticipants[0].profile?.avatar_url}
              name={otherParticipants[0].profile?.full_name}
              size="md"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
          )}
          
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{getTitle()}</h3>
            {getSubtitle() && (
              <p className="text-xs text-muted-foreground">{getSubtitle()}</p>
            )}
          </div>
        </div>

        {isSearchOpen && (
          <div className="flex-1 mr-2">
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={t('chatSearchPlaceholder')}
              className="h-9"
              autoFocus
            />
          </div>
        )}
        
        <div className="flex items-center gap-1 shrink-0">
          {onSearchChange && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchToggle}
              className={cn(isSearchOpen && "text-primary")}
              title={t('chatSearchMessages')}
            >
              {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          )}
          
          {conversation.type === 'task' && conversation.task_id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenTaskDetail}
              title={t('chatViewTask')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}