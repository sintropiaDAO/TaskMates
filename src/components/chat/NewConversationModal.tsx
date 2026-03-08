import { useState, useCallback } from 'react';
import { Search, MessageCircle, Loader2, UserPlus, Users, X, Check } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

interface NewConversationModalProps {
  trigger?: React.ReactNode;
}

type TabType = 'direct' | 'group';

export function NewConversationModal({ trigger }: NewConversationModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { createDirectConversation, createGroupConversation } = useConversations();
  const { openChatDrawer, setActiveConversation } = useChat();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabType>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'location'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  
  // Group chat state
  const [selectedMembers, setSelectedMembers] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'location'>[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

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
        setOpen(false);
        resetState();
      }
    } finally {
      setCreating(null);
    }
  };

  const toggleMember = (profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'location'>) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === profile.id);
      if (exists) return prev.filter(m => m.id !== profile.id);
      return [...prev, profile];
    });
  };

  const handleCreateGroup = async () => {
    if (selectedMembers.length < 2) {
      toast({ title: t('chatMinGroupMembers'), variant: 'destructive' });
      return;
    }

    setCreatingGroup(true);
    try {
      const memberIds = selectedMembers.map(m => m.id);
      const conversation = await createGroupConversation(memberIds);
      if (conversation) {
        setActiveConversation(conversation);
        setOpen(false);
        resetState();
      }
    } finally {
      setCreatingGroup(false);
    }
  };

  const resetState = () => {
    setQuery('');
    setResults([]);
    setSelectedMembers([]);
    setTab('direct');
  };

  const handleClose = () => {
    setOpen(false);
    resetState();
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

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => { setTab('direct'); setSelectedMembers([]); }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'direct' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            {t('chatDirectMessage')}
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'group' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            {t('chatCreateGroup')}
          </button>
        </div>

        <div className="space-y-4">
          {/* Selected members chips for group */}
          {tab === 'group' && selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedMembers.map(member => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {member.full_name || t('chatUserUnknown')}
                  <button onClick={() => toggleMember(member)} className="hover:bg-primary/20 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

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

            {!searching && results.map((profile) => {
              const isSelected = selectedMembers.some(m => m.id === profile.id);
              
              return (
                <button
                  key={profile.id}
                  onClick={() => tab === 'direct' ? handleStartChat(profile.id) : toggleMember(profile)}
                  disabled={tab === 'direct' && creating === profile.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left disabled:opacity-50 ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-accent/50'
                  }`}
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
                  {tab === 'direct' ? (
                    creating === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    )
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Create group button */}
          {tab === 'group' && (
            <Button
              onClick={handleCreateGroup}
              disabled={selectedMembers.length < 2 || creatingGroup}
              className="w-full gap-2"
            >
              {creatingGroup ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {t('chatCreateGroup')} ({selectedMembers.length})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
