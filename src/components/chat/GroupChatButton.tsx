import { useState } from 'react';
import { MessagesSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface GroupChatButtonProps {
  entityType: 'task' | 'product' | 'poll' | 'tag';
  entityId: string;
  /** Display name of the collective chat (card/community title) */
  name?: string | null;
  /** All user ids involved (owner, collaborators, requesters, voters, members...) */
  memberIds: (string | null | undefined)[];
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export function GroupChatButton({
  entityType,
  entityId,
  name,
  memberIds,
  variant = 'outline',
  size = 'sm',
  className,
  label,
}: GroupChatButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { openConversationById } = useChat();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const uniqueIds = [...new Set(memberIds.filter(Boolean) as string[])];

  // Only enabled when more than one person is involved and the viewer is one of them
  if (!user || uniqueIds.length < 2 || !uniqueIds.includes(user.id)) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('get_or_create_entity_conversation', {
        _entity_type: entityType,
        _entity_id: entityId,
        _name: name || null,
        _member_ids: uniqueIds,
      });
      if (error) throw error;
      if (data) await openConversationById(data as string);
    } catch (e) {
      console.error('Error opening group chat:', e);
      toast({
        title: language === 'pt' ? 'Não foi possível abrir o chat' : 'Could not open chat',
        description: (e as { message?: string })?.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultLabel = language === 'pt' ? 'Iniciar conversa' : 'Start conversation';

  return (
    <Button variant={variant} size={size} className={className} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessagesSquare className="w-4 h-4" />}
      <span className="ml-2">{label || defaultLabel}</span>
    </Button>
  );
}
