import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { MessageSquare, Search, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';
import { shareToConversation } from '@/lib/chat-share.functions';

export function ChatShareSection({ title, url }: { title: string; url: string }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  if (!user) return null;
  return <div className="space-y-2">
    <Button variant="outline" className="w-full gap-2" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}><MessageSquare className="w-4 h-4" />{language === 'pt' ? 'Compartilhar no chat' : 'Share in chat'}</Button>
    {expanded && <ChatRecipients title={title} url={url} />}
  </div>;
}

function ChatRecipients({ title, url }: { title: string; url: string }) {
  const { conversations, loading } = useConversations();
  const { user } = useAuth();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { toast } = useToast();
  const send = useServerFn(shareToConversation);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const recipients = conversations.map(c => ({ id: c.id, name: c.name || c.task?.title || c.participants?.filter(p => p.user_id !== user?.id).map(p => p.profile?.full_name || p.profile?.username).filter(Boolean).join(', ') || (pt ? 'Conversa' : 'Conversation') }));
  const filtered = recipients.filter(c => c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="space-y-2">
    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder={pt ? 'Buscar conversa…' : 'Search conversations…'} /></div>
    <div className="max-h-48 overflow-y-auto space-y-1" aria-busy={loading}>
      {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /> : filtered.length ? filtered.map(c => <div key={c.id} className="flex items-center gap-2 py-2">
        <MessageSquare className="w-4 h-4 text-primary shrink-0" /><span className="text-sm flex-1 min-w-0 truncate">{c.name}</span>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" title={sent.has(c.id) ? (pt ? 'Enviado' : 'Sent') : (pt ? 'Enviar' : 'Send')} aria-label={`${pt ? 'Enviar para' : 'Send to'} ${c.name}`} disabled={!!busy || sent.has(c.id)}
          onClick={async () => {
            setBusy(c.id);
            try { await send({ data: { conversationId: c.id, title, url } }); setSent(prev => new Set(prev).add(c.id)); toast({ title: pt ? 'Compartilhado no chat!' : 'Shared in chat!' }); }
            catch { toast({ title: pt ? 'Não foi possível enviar. Tente novamente.' : 'Could not send. Try again.', variant: 'destructive' }); }
            finally { setBusy(null); }
          }}>{busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : sent.has(c.id) ? <Check className="h-4 w-4 text-primary" /> : <Send className="h-4 w-4" />}</Button>
      </div>) : <p className="text-sm text-muted-foreground py-2">{pt ? 'Nenhuma conversa encontrada' : 'No conversations found'}</p>}
    </div>
  </div>;
}