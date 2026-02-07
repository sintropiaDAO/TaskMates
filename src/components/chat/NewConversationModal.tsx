import { useState, useCallback } from 'react';
import { Search, MessageCircle, Loader2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat } from '@/contexts/ChatContext';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { removeAccents } from '@/lib/stringUtils';

interface NewConversationModalProps {
  trigger?: React.ReactNode;
}

export function NewConversationModal({ trigger }: NewConversationModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { createDirectConversation } = useConversations();
  const { setActiveConversation, openChatDrawer } = useChat();
  
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'location'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const normalizedQuery = removeAccents(searchQuery.toLowerCase());
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;

      // Filter results by name matching (accent-insensitive)
      const filtered = (data || []).filter(profile => {
        const name = removeAccents((profile.full_name || '').toLowerCase());
        return name.includes(normalizedQuery);
      });

      setResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [user?.id]);

  const handleStartChat = async (profileId: string) => {
    setCreating(profileId);
    try {
      const conversation = await createDirectConversation(profileId);
      if (conversation) {
        setActiveConversation(conversation);
        openChatDrawer();
        setOpen(false);
        setQuery('');
        setResults([]);
      }
    } finally {
      setCreating(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t('chatNewConversation')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t('chatNewConversation')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('chatSearchUsersPlaceholder')}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {searching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!searching && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t('chatNoUsersFound')}
              </div>
            )}

            {!searching && query.length > 0 && query.length < 2 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t('chatTypeToSearch')}
              </div>
            )}

            {!searching && results.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleStartChat(profile.id)}
                disabled={creating === profile.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
              >
                <UserAvatar
                  userId={profile.id}
                  avatarUrl={profile.avatar_url}
                  name={profile.full_name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile.full_name || t('chatUserUnknown')}
                  </p>
                  {profile.location && (
                    <p className="text-sm text-muted-foreground truncate">
                      {profile.location}
                    </p>
                  )}
                </div>
                {creating === profile.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
