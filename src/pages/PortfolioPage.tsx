import { useMemo, useState } from 'react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ListTodo, Package, MessageSquare, Users, Camera, Printer, Share2, Star, CalendarDays, LayoutGrid, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioItem, PublicPortfolio } from '@/lib/portfolio.server';
import logo from '@/assets/logo-taskmates-mark.png';

const route = getRouteApi('/p/$slug');

const KIND = {
  task: { pt: 'Ações realizadas', en: 'Actions completed', icon: ListTodo, cls: 'bg-primary/10 text-primary' },
  product: { pt: 'Produtos & recursos', en: 'Products & resources', icon: Package, cls: 'bg-accent text-accent-foreground' },
  poll: { pt: 'Deliberações coletivas', en: 'Collective deliberations', icon: MessageSquare, cls: 'bg-secondary text-secondary-foreground' },
} as const;

function fmt(d: string | null | undefined, lang: string) {
  if (!d) return '';
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
const initials = (n?: string) => (n ?? '?').slice(0, 2).toUpperCase();
const isImg = (p: { url: string; type: string }) => p.type?.startsWith('image') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(p.url);
const isVid = (p: { url: string; type: string }) => p.type?.startsWith('video') || /\.(mp4|webm|mov)(\?|$)/i.test(p.url);

export default function PortfolioPage() {
  const data = route.useLoaderData() as PublicPortfolio;
  const { language } = useLanguage();
  const pt = language === 'pt';
  const [view, setView] = useState<'timeline' | 'type'>('timeline');
  const [open, setOpen] = useState<PortfolioItem | null>(null);

  const gallery = useMemo(() => (data.items ?? []).flatMap((i) => i.proofs.filter(isImg).map((p) => ({ ...p, item: i }))).slice(0, 12), [data]);

  if (!data?.found) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <img src={logo} alt="TaskMates" className="h-12 w-12" />
        <h1 className="text-xl font-semibold">{pt ? 'Portfólio não encontrado' : 'Portfolio not found'}</h1>
        <Button asChild><Link to="/">{pt ? 'Conhecer o TaskMates' : 'Discover TaskMates'}</Link></Button>
      </main>
    );
  }

  const m = data.metrics!;
  const items = data.items ?? [];
  const share = async () => {
    const url = `https://taskmates.app/p/${data.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: data.title, url });
      else { await navigator.clipboard.writeText(url); toast.success(pt ? 'Link copiado!' : 'Link copied!'); }
    } catch { /* cancelled */ }
  };

  const Card = ({ i }: { i: PortfolioItem }) => {
    const K = KIND[i.kind];
    const thumb = i.proofs.find(isImg)?.url ?? i.image;
    return (
      <button onClick={() => setOpen(i)} className="w-full text-left rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition p-4 flex gap-3 break-inside-avoid">
        {thumb && <img src={thumb} alt="" className="h-20 w-20 rounded-xl object-cover bg-muted/30 shrink-0" loading="lazy" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${K.cls}`}><K.icon className="h-3 w-3" />{pt ? K.pt : K.en}</span>
            <span>{fmt(i.date, language)}</span>
          </div>
          <p className="font-semibold leading-snug line-clamp-2">{i.title}</p>
          {i.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{i.description}</p>}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <div className="flex -space-x-2">
              {[i.creator, ...i.people].filter(Boolean).slice(0, 4).map((u) => (
                <Avatar key={u!.id} className="h-6 w-6 border-2 border-card"><AvatarImage src={u!.avatar ?? undefined} /><AvatarFallback className="text-[9px]">{initials(u!.name)}</AvatarFallback></Avatar>
              ))}
            </div>
            {i.proofs.length > 0 && <span className="inline-flex items-center gap-1"><Camera className="h-3 w-3" />{i.proofs.length}</span>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-background pb-16 print:pb-0">
      {/* Hero */}
      <header className="relative overflow-hidden">
        {data.cover && <img src={data.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 print:hidden" />}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-center justify-between mb-8 print:hidden">
            <Link to="/" className="flex items-center gap-2 font-semibold text-primary"><img src={logo} alt="" className="h-7 w-7" />TaskMates</Link>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />PDF</Button>
              <Button size="sm" onClick={share}><Share2 className="h-4 w-4 mr-1" />{pt ? 'Compartilhar' : 'Share'}</Button>
            </div>
          </div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{pt ? 'Portfólio de impacto' : 'Impact portfolio'}</p>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
            {data.owner && (
              <Link to="/profile/$userId" params={{ userId: data.owner.id }} className="flex items-center gap-2">
                <Avatar className="h-8 w-8"><AvatarImage src={data.owner.avatar ?? undefined} /><AvatarFallback>{initials(data.owner.name)}</AvatarFallback></Avatar>
                <span className="font-medium">{data.owner.name}</span>
              </Link>
            )}
            {data.tag && (
              <Link to="/tags/$tagId" params={{ tagId: data.tag.id }}>
                <Badge variant="secondary" className="gap-1">{data.tag.emoji ?? '#'} {data.tag.name}</Badge>
              </Link>
            )}
            {(data.periodStart || data.periodEnd) && (
              <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-4 w-4" />{fmt(data.periodStart, language) || '…'} – {fmt(data.periodEnd, language) || (pt ? 'hoje' : 'today')}</span>
            )}
          </div>
          {data.summary && <p className="mt-5 text-base text-foreground/80 whitespace-pre-line max-w-2xl">{data.summary}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { v: m.tasks, l: pt ? 'tarefas concluídas' : 'tasks completed', I: ListTodo },
              { v: m.products, l: pt ? 'produtos & recursos' : 'products & resources', I: Package },
              { v: m.polls, l: pt ? 'opiniões & fóruns' : 'opinions & forums', I: MessageSquare },
              { v: m.people, l: pt ? 'pessoas conectadas' : 'people connected', I: Users },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-card/90 border border-border/60 shadow-sm p-3">
                <s.I className="h-4 w-4 text-primary mb-1" />
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 space-y-10">
        {gallery.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Camera className="h-5 w-5 text-primary" />{pt ? 'Provas reais' : 'Real proof'}</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {gallery.map((g, idx) => (
                <button key={idx} onClick={() => setOpen(g.item)} className="aspect-square overflow-hidden rounded-xl bg-muted/30">
                  <img src={g.url} alt={g.caption ?? g.item.title} className="h-full w-full object-cover hover:scale-105 transition" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{pt ? 'Conquistas' : 'Achievements'}</h2>
            <div className="flex rounded-full bg-muted p-1 print:hidden">
              <button onClick={() => setView('timeline')} className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${view === 'timeline' ? 'bg-card shadow-sm' : ''}`}><Clock className="h-3 w-3" />{pt ? 'Linha do tempo' : 'Timeline'}</button>
              <button onClick={() => setView('type')} className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${view === 'type' ? 'bg-card shadow-sm' : ''}`}><LayoutGrid className="h-3 w-3" />{pt ? 'Por tipo' : 'By type'}</button>
            </div>
          </div>
          {items.length === 0 && <p className="text-sm text-muted-foreground">{pt ? 'Nenhum item neste período.' : 'No items in this period.'}</p>}
          {view === 'timeline' ? (
            <div className="space-y-3">{items.map((i) => <Card key={i.kind + i.id} i={i} />)}</div>
          ) : (
            (['task', 'product', 'poll'] as const).map((k) => {
              const list = items.filter((i) => i.kind === k);
              if (!list.length) return null;
              return (
                <div key={k} className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{pt ? KIND[k].pt : KIND[k].en} ({list.length})</h3>
                  <div className="grid md:grid-cols-2 gap-3">{list.map((i) => <Card key={i.id} i={i} />)}</div>
                </div>
              );
            })
          )}
        </section>

        {(data.testimonials?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">{pt ? 'Depoimentos' : 'Testimonials'}</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {data.testimonials!.map((t, idx) => (
                <figure key={idx} className="rounded-2xl bg-card border border-border/60 p-4 shadow-sm">
                  <div className="flex gap-0.5 mb-2">{Array.from({ length: t.rating }).map((_, s) => <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />)}</div>
                  <blockquote className="text-sm">“{t.comment}”</blockquote>
                  <figcaption className="text-xs text-muted-foreground mt-2">— {t.author?.name ?? (pt ? 'Membro' : 'Member')}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-primary/10 border border-primary/20 p-6 text-center print:hidden">
          <h2 className="text-xl font-bold">{pt ? 'Inspirado por essas ações?' : 'Inspired by these actions?'}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{pt ? 'Faça parte da rede de colaboração regenerativa.' : 'Join the regenerative collaboration network.'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {data.tag && <Button asChild><Link to="/tags/$tagId" params={{ tagId: data.tag.id }}>{pt ? `Seguir ${data.tag.name}` : `Follow ${data.tag.name}`}</Link></Button>}
            <Button asChild variant={data.tag ? 'outline' : 'default'}><Link to="/auth">{pt ? 'Criar conta grátis' : 'Create free account'}</Link></Button>
          </div>
        </section>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          {open && (
            <>
              <DialogHeader><DialogTitle>{open.title}</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">{pt ? KIND[open.kind].pt : KIND[open.kind].en} · {fmt(open.date, language)}</p>
              {open.image && <img src={open.image} alt="" className="w-full h-48 object-contain bg-muted/30 rounded-xl" />}
              {open.description && <p className="text-sm whitespace-pre-line">{open.description}</p>}
              <div className="space-y-2">
                {open.creator && <p className="text-sm"><span className="text-muted-foreground">{pt ? 'Proposto por: ' : 'Proposed by: '}</span>{open.creator.name}</p>}
                {open.people.length > 0 && <p className="text-sm"><span className="text-muted-foreground">{pt ? 'Pessoas envolvidas: ' : 'People involved: '}</span>{open.people.map((p) => p.name).join(', ')}</p>}
              </div>
              {open.proofs.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">{pt ? 'Comprovações' : 'Proof'}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {open.proofs.map((p, idx) => isImg(p) ? <img key={idx} src={p.url} alt={p.caption ?? ''} className="rounded-xl w-full h-40 object-cover" />
                      : isVid(p) ? <video key={idx} src={p.url} controls className="rounded-xl w-full h-40 bg-muted" />
                      : <a key={idx} href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{p.caption || p.url}</a>)}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
