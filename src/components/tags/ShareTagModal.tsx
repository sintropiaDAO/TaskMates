import { useState, useCallback } from 'react';
import { Share2, Copy, Send, Check, Search, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types';
import { removeAccents } from '@/lib/stringUtils';

interface ShareTagModalProps {
  open: boolean;
  onClose: () => void;
  tagId: string;
  tagName: string;
}

export function ShareTagModal({ open, onClose, tagId, tagName }: ShareTagModalProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const shareUrl = `${window.location.origin}/tags/${tagId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: language === 'pt' ? 'Link copiado!' : 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tagName,
          text: language === 'pt' 
            ? `Confira a tag "${tagName}" no TaskMates!` 
            : `Check out the tag "${tagName}" on TaskMates!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const normalizedQuery = removeAccents(searchQuery.toLowerCase());
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user?.id || '')
        .limit(10);

      if (data) {
        const filtered = data.filter(p => {
          const name = removeAccents((p.full_name || '').toLowerCase());
          return name.includes(normalizedQuery);
        });
        setResults(filtered);
      }
    } catch {
      // ignore
    }
    setSearching(false);
  }, [user?.id]);

  const handleSendInvite = async (profileId: string) => {
    if (!user) return;
    setSending(profileId);
    try {
      await supabase.rpc('create_notification', {
        _user_id: profileId,
        _task_id: tagId, // reuse task_id field to store tag reference
        _type: 'tag_invite',
        _message: language === 'pt'
          ? `${user.user_metadata?.full_name || 'Alguém'} convidou você para a tag "${tagName}"`
          : `${user.user_metadata?.full_name || 'Someone'} invited you to the tag "${tagName}"`
      });
      setSentTo(prev => new Set(prev).add(profileId));
      toast({ title: language === 'pt' ? 'Convite enviado!' : 'Invite sent!' });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
    setSending(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            {language === 'pt' ? 'Compartilhar Tag' : 'Share Tag'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* External Share */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {language === 'pt' ? 'Compartilhar externamente' : 'Share externally'}
            </p>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-xs flex-1"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink} className="flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {navigator.share && (
              <Button variant="outline" className="w-full gap-2" onClick={handleNativeShare}>
                <Share2 className="w-4 h-4" />
                {language === 'pt' ? 'Compartilhar...' : 'Share...'}
              </Button>
            )}
          </div>

          {/* Internal Share */}
          {user && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Convidar pessoas' : 'Invite people'}
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={language === 'pt' ? 'Buscar por nome...' : 'Search by name...'}
                  className="pl-9"
                />
              </div>
              {searching && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {results.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {results.map(profile => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{profile.full_name || 'Usuário'}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={sentTo.has(profile.id) ? 'ghost' : 'outline'}
                        disabled={sending === profile.id || sentTo.has(profile.id)}
                        onClick={() => handleSendInvite(profile.id)}
                        className="h-7 px-2"
                      >
                        {sending === profile.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : sentTo.has(profile.id) ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {language === 'pt' ? 'Nenhum resultado' : 'No results'}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
