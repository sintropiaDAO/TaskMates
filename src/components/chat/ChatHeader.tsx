import { useState } from 'react';
import { X, ExternalLink, Users, Search, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Conversation } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation: Conversation;
  onClose?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onNameUpdate?: (name: string) => void;
}

export function ChatHeader({ conversation, onClose, searchQuery = '', onSearchChange, onNameUpdate }: ChatHeaderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { setShowTaskDetailModal, setTaskIdForModal } = useChat();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const otherParticipants = conversation.participants?.filter(
    p => p.user_id !== user?.id
  ) || [];

  const handleOpenTaskDetail = () => {
    if (conversation.task_id) {
      setTaskIdForModal(conversation.task_id);
      setShowTaskDetailModal(true);
    }
  };

  const isGroupOrTask = conversation.type === 'group' || conversation.type === 'task';

  const getTitle = () => {
    if (conversation.name) return conversation.name;
    
    if (conversation.type === 'task' && conversation.task) {
      return conversation.task.title;
    }
    
    if (otherParticipants.length === 1) {
      return otherParticipants[0].profile?.full_name || t('chatUnknownUser');
    }
    
    if (isGroupOrTask) {
      const names = otherParticipants.slice(0, 3).map(p => p.profile?.full_name?.split(' ')[0] || '?');
      if (otherParticipants.length > 3) names.push(`+${otherParticipants.length - 3}`);
      return names.join(', ');
    }
    
    return t('chatGroupConversation');
  };

  const getSubtitle = () => {
    if (isGroupOrTask) {
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

  const handleStartEdit = () => {
    setEditName(conversation.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    setIsEditingName(false);
    if (trimmed === (conversation.name || '')) return;

    try {
      await supabase
        .from('conversations')
        .update({ name: trimmed || null })
        .eq('id', conversation.id);
      onNameUpdate?.(trimmed);
    } catch (e) {
      console.error('Error updating conversation name:', e);
    }
  };

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between p-3">
        <div className={cn("flex items-center gap-3 min-w-0 flex-1", isSearchOpen && "hidden sm:flex")}>
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
          
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="h-7 text-sm"
                  placeholder={t('chatGroupNamePlaceholder')}
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSaveName}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-semibold truncate">{getTitle()}</h3>
                {isGroupOrTask && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleStartEdit}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
            {!isEditingName && getSubtitle() && (
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