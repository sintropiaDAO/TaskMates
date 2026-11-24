import { useState } from 'react';
import { Share2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChatShareSection } from './ChatShareSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export function ShareLinkButton({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { toast } = useToast();
  return <>
    <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><Share2 className="h-4 w-4 mr-1" />{pt ? 'Compartilhar' : 'Share'}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-sm max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{pt ? 'Compartilhar' : 'Share'}</DialogTitle></DialogHeader>
      <ChatShareSection title={title} url={url} />
      <Button variant="outline" className="gap-2 w-full" onClick={async () => { try { await navigator.clipboard.writeText(url); toast({ title: pt ? 'Link copiado!' : 'Link copied!' }); } catch { toast({ title: pt ? 'Não foi possível copiar' : 'Could not copy', variant: 'destructive' }); } }}><Copy className="h-4 w-4" />{pt ? 'Copiar link' : 'Copy link'}</Button>
      <Button variant="outline" className="gap-2 w-full" onClick={async () => { try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); toast({ title: pt ? 'Link copiado!' : 'Link copied!' }); } } catch { /* share dismissed */ } }}><Share2 className="h-4 w-4" />{pt ? 'Compartilhar externamente' : 'Share externally'}</Button>
    </DialogContent></Dialog>
  </>;
}