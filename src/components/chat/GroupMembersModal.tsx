import { useState, useCallback } from 'react';
import { Search, Loader2, Users, X, Check, UserPlus, UserMinus, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { Conversation, ConversationParticipant } from '@/types/chat';
import { removeAccents } from '@/lib/stringUtils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface GroupMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onMembersUpdate: (participants: ConversationParticipant[]) => void;
}

export function GroupMembersModal({ open, onOpenChange, conversation, onMembersUpdate }: GroupMembersModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showAddSection, setShowAddSection] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'location'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [removingUser, setRemovingUser] = useState<string | null>(null);

  const participants = conversation.participants || [];
  const currentParticipantIds = participants.map(p => p.user_id);

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
        .limit(20);

      if (error) throw error;

      const filtered = (data || []).filter(profile => {
        if (currentParticipantIds.includes(profile.id)) return false;
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
  }, [currentParticipantIds]);

  const handleAddMember = async (profileId: string) => {
    setAddingUser(profileId);
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversation.id, user_id: profileId });

      if (error) throw error;

      // Fetch the new participant's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      const newParticipant: ConversationParticipant = {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        user_id: profileId,
        joined_at: new Date().toISOString(),
        last_read_at: null,
        profile: profile || undefined,
      };

      const updated = [...participants, newParticipant];
      onMembersUpdate(updated);
      setResults(prev => prev.filter(r => r.id !== profileId));
      toast({ title: t('chatMemberAdded') });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({ title: t('chatMemberAddError'), variant: 'destructive' });
    } finally {
      setAddingUser(null);
    }
  };

  const handleRemoveMember = async (participantUserId: string) => {
    setRemovingUser(participantUserId);
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('user_id', participantUserId);

      if (error) throw error;

      const updated = participants.filter(p => p.user_id !== participantUserId);
      onMembersUpdate(updated);
      toast({ title: t('chatMemberRemoved') });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: t('chatMemberRemoveError'), variant: 'destructive' });
    } finally {
      setRemovingUser(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    setRemovingUser(user.id);
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);

      if (error) throw error;

      onOpenChange(false);
      toast({ title: t('chatLeftGroup') });
      // Signal parent to close conversation
      onMembersUpdate(participants.filter(p => p.user_id !== user.id));
    } catch (error) {
      console.error('Error leaving group:', error);
    } finally {
      setRemovingUser(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowAddSection(false);
    setQuery('');
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('chatMembers')} ({participants.length})
          </DialogTitle>
        </DialogHeader>

        {/* Current members list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {participants.map((participant) => {
            const isCurrentUser = participant.user_id === user?.id;
            return (
              <div
                key={participant.user_id}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                <UserAvatar
                  userId={participant.user_id}
                  avatarUrl={participant.profile?.avatar_url}
                  name={participant.profile?.full_name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">
                    {participant.profile?.full_name || t('chatUnknownUser')}
                    {isCurrentUser && (
                      <span className="text-xs text-muted-foreground ml-1">({t('chatYou')})</span>
                    )}
                  </p>
                </div>
                {!isCurrentUser && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleRemoveMember(participant.user_id)}
                    disabled={removingUser === participant.user_id}
                  >
                    {removingUser === participant.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Add member section */}
        {showAddSection ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('chatAddMember')}</span>
              <Button variant="ghost" size="sm" onClick={() => { setShowAddSection(false); setQuery(''); setResults([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
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
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!searching && query.length >= 2 && results.length === 0 && (
                <p className="text-center py-4 text-muted-foreground text-sm">{t('chatNoUsersFound')}</p>
              )}
              {!searching && results.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleAddMember(profile.id)}
                  disabled={addingUser === profile.id}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
                >
                  <UserAvatar
                    userId={profile.id}
                    avatarUrl={profile.avatar_url}
                    name={profile.full_name}
                    size="sm"
                  />
                  <span className="flex-1 text-sm font-medium truncate">{profile.full_name || t('chatUnknownUser')}</span>
                  {addingUser === profile.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowAddSection(true)}>
              <UserPlus className="h-4 w-4" />
              {t('chatAddMember')}
            </Button>
            <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleLeaveGroup}>
              {removingUser === user?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {t('chatLeaveGroup')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
