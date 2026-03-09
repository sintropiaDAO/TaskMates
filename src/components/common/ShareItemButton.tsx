import { useState } from 'react';
import { Share2, Search, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface ShareItemButtonProps {
  itemId: string;
  itemTitle: string;
  itemType: 'task' | 'poll' | 'product';
  variant?: 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'icon';
  className?: string;
}

export function ShareItemButton({ itemId, itemTitle, itemType, variant = 'outline', size = 'sm', className }: ShareItemButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<{ id: string; full_name: string | null; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const typeLabel = {
    task: language === 'pt' ? 'tarefa' : 'task',
    poll: language === 'pt' ? 'enquete' : 'poll',
    product: language === 'pt' ? 'produto' : 'product',
  }[itemType];

  const itemUrl = `${window.location.origin}/dashboard?${itemType}=${itemId}`;

  const inviteMessage = language === 'pt'
    ? `🤝 Olá! Gostaria de te convidar para participar ${itemType === 'poll' ? 'da enquete' : itemType === 'product' ? 'do produto' : 'da tarefa'} "${itemTitle}" no TaskMates — uma plataforma de colaboração baseada em troca de tarefas e recursos. Junte-se a nós!\n\n${itemUrl}`
    : `🤝 Hi! I'd like to invite you to participate in the ${typeLabel} "${itemTitle}" on TaskMates — a collaboration platform based on task and resource exchange. Join us!\n\n${itemUrl}`;

  const searchUsers = async (query: string) => {
    setSearch(query);
    if (query.length < 2) { setUsers([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url')
      .neq('id', user?.id || '')
      .ilike('full_name', `%${query}%`)
      .limit(10);
    setUsers(data || []);
    setSearching(false);
  };

  const handleInviteUser = async (userId: string) => {
    setInviting(userId);
    const message = language === 'pt'
      ? `🤝 Você foi convidado para participar ${itemType === 'poll' ? 'da enquete' : itemType === 'product' ? 'do produto' : 'da tarefa'} "${itemTitle}"`
      : `🤝 You've been invited to participate in the ${typeLabel} "${itemTitle}"`;

    // Use a dummy task_id since the function requires it
    const { error } = await supabase.rpc('create_notification', {
      _user_id: userId,
      _task_id: itemId,
      _type: `${itemType}_invite`,
      _message: message,
    });

    if (!error) {
      toast({ title: language === 'pt' ? 'Convite enviado!' : 'Invite sent!' });
    } else {
      toast({ title: language === 'pt' ? 'Erro ao enviar convite' : 'Error sending invite', variant: 'destructive' });
    }
    setInviting(null);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: language === 'pt' ? 'Link copiado!' : 'Link copied!' });
    } catch {
      toast({ title: language === 'pt' ? 'Erro ao copiar' : 'Error copying', variant: 'destructive' });
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={`gap-1.5 ${className || ''}`} onClick={() => setOpen(true)}>
        <Share2 className="w-3.5 h-3.5" />
        {language === 'pt' ? 'Compartilhar' : 'Share'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              {language === 'pt' ? `Compartilhar ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}` : `Share ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{language === 'pt' ? 'Convidar usuário' : 'Invite user'}</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder={language === 'pt' ? 'Buscar por nome...' : 'Search by name...'} value={search} onChange={e => searchUsers(e.target.value)} />
              </div>
              {users.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={u.avatar_url || ''} />
                          <AvatarFallback className="text-xs">{u.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{u.full_name || (language === 'pt' ? 'Usuário' : 'User')}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={inviting === u.id} onClick={() => handleInviteUser(u.id)}>
                        {inviting === u.id ? '...' : (language === 'pt' ? 'Convidar' : 'Invite')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{language === 'pt' ? 'ou compartilhe externamente' : 'or share externally'}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleShareWhatsApp}>
                <ExternalLink className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? (language === 'pt' ? 'Copiado!' : 'Copied!') : (language === 'pt' ? 'Copiar' : 'Copy')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
