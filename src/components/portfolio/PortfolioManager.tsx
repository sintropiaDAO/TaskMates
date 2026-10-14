import { useEffect, useState } from 'react';
import { Briefcase, Plus, Copy, ExternalLink, Trash2, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { UnifiedTagField } from '@/components/ui/form/UnifiedTagField';
import { TagCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TASK_SUBTYPES, SUBTYPE_META } from '@/lib/taskSubtypes';

interface Portfolio { id: string; slug: string; title: string; view_count: number; created_at: string }

const PERIODS = ['month', 'quarter', 'year', 'all', 'custom'] as const;
type Period = typeof PERIODS[number];

function slugify(s: string) {
  const base = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'portfolio';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function PortfolioManager() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { createTag } = useTags();
  const [list, setList] = useState<Portfolio[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    title: '', summary: '', period: 'year' as Period, start: '', end: '', tagId: '', scope: 'mine' as 'mine' | 'tag',
    tasks: true, products: true, polls: true, subtypes: [] as string[],
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('portfolios').select('id, slug, title, view_count, created_at').eq('owner_id', user.id).order('created_at', { ascending: false });
    setList((data as Portfolio[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const url = (slug: string) => `https://taskmates.app/p/${slug}`;

  const create = async () => {
    if (!user || !f.title.trim()) { toast.error(pt ? 'Informe um título' : 'Add a title'); return; }
    if (f.scope === 'tag' && !f.tagId) { toast.error(pt ? 'Escolha uma tag para ver itens gerais' : 'Pick a tag for general items'); return; }
    const now = new Date();
    let start: string | null = null; let end: string | null = iso(now);
    if (f.period === 'month') start = iso(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
    if (f.period === 'quarter') start = iso(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
    if (f.period === 'year') start = iso(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    if (f.period === 'all') { start = null; end = null; }
    if (f.period === 'custom') { start = f.start || null; end = f.end || null; }
    setSaving(true);
    const slug = slugify(f.title);
    const { error } = await supabase.from('portfolios').insert({
      owner_id: user.id, slug, title: f.title.trim(), summary: f.summary.trim() || null,
      period_start: start, period_end: end, tag_id: f.tagId || null, scope: f.scope,
      include_tasks: f.tasks, include_products: f.products, include_polls: f.polls, task_subtypes: f.subtypes,
    });
    setSaving(false);
    if (error) { toast.error(pt ? 'Erro ao criar portfólio' : 'Failed to create portfolio'); return; }
    toast.success(pt ? 'Portfólio criado! Link copiado.' : 'Portfolio created! Link copied.');
    navigator.clipboard?.writeText(url(slug)).catch(() => {});
    setOpen(false);
    load();
    window.open(`/p/${slug}`, '_blank');
  };

  const remove = async (id: string) => {
    if (!confirm(pt ? 'Excluir este portfólio?' : 'Delete this portfolio?')) return;
    await supabase.from('portfolios').delete().eq('id', id);
    load();
  };

  const periodLabel: Record<Period, string> = pt
    ? { month: 'Último mês', quarter: 'Último trimestre', year: 'Último ano', all: 'Todo o período', custom: 'Intervalo livre' }
    : { month: 'Last month', quarter: 'Last quarter', year: 'Last year', all: 'All time', custom: 'Custom range' };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <span className="font-semibold text-lg">{pt ? 'Meus portfólios' : 'My portfolios'}</span>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />{pt ? 'Criar' : 'Create'}</Button>
      </div>
      <p className="text-sm text-muted-foreground">{pt ? 'Crie páginas públicas para compartilhar suas conquistas — sem exigir cadastro de quem vê.' : 'Create public pages to share your achievements — no sign-up needed to view.'}</p>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{pt ? 'Nenhum portfólio ainda.' : 'No portfolios yet.'}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{p.view_count}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => { navigator.clipboard.writeText(url(p.slug)); toast.success(pt ? 'Link copiado!' : 'Link copied!'); }}><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Open" onClick={() => window.open(`/p/${p.slug}`, '_blank')}><ExternalLink className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader><DialogTitle>{pt ? 'Novo portfólio' : 'New portfolio'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{pt ? 'Título' : 'Title'} *</Label>
              <Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={pt ? 'Ex.: Relatório de Impacto 2026' : 'e.g. 2026 Impact Report'} /></div>
            <div className="space-y-1.5"><Label>{pt ? 'Mensagem do ciclo (opcional)' : 'Cycle message (optional)'}</Label>
              <Textarea value={f.summary} maxLength={1500} rows={3} onChange={(e) => setF({ ...f, summary: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{pt ? 'Período' : 'Period'}</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value as Period })}>
                {PERIODS.map((p) => <option key={p} value={p}>{periodLabel[p]}</option>)}
              </select>
              {f.period === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
                  <Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
                </div>
              )}
            </div>
            <div className="space-y-1.5"><Label>{pt ? 'Tag pública (comunidade ou habilidade)' : 'Public tag (community or skill)'}</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.tagId} onChange={(e) => setF({ ...f, tagId: e.target.value })}>
                  <option value="none">{pt ? 'Sem filtro de tag' : 'No tag filter'}</option>
                  {tags.map((t) => <option key={t.id} value={t.id}>{t.category === 'communities' ? '👥 ' : '🛠️ '}{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>{pt ? 'Pessoas' : 'People'}</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as 'mine' | 'tag' })}>
                  <option value="mine">{pt ? 'Somente itens em que estive envolvida(o)' : 'Only items I was involved in'}</option>
                  <option value="tag">{pt ? 'Todos os itens da tag' : 'All items of the tag'}</option>
                </select>
            </div>
            <div className="space-y-2"><Label>{pt ? 'Itens do relatório' : 'Report items'}</Label>
              {([['tasks', pt ? 'Tarefas concluídas' : 'Completed tasks'], ['products', pt ? 'Produtos (oferecidos, entregues, estoque)' : 'Products (offered, delivered, stock)'], ['polls', pt ? 'Opiniões e fóruns' : 'Opinions and forums']] as const).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                  <span className="text-sm">{l}</span>
                  <Switch checked={f[k]} onCheckedChange={(c) => setF({ ...f, [k]: c })} />
                </div>
              ))}
            </div>
            {f.tasks && (
              <div className="space-y-1.5"><Label>{pt ? 'Filtrar tarefas por categoria (opcional)' : 'Filter tasks by category (optional)'}</Label>
                <div className="flex flex-wrap gap-2">
                  {TASK_SUBTYPES.map((s) => {
                    const on = f.subtypes.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => setF({ ...f, subtypes: on ? f.subtypes.filter((x) => x !== s) : [...f.subtypes, s] })}
                        className={`rounded-full px-3 py-1 text-xs border transition ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
                        {SUBTYPE_META[s].emoji} {pt ? SUBTYPE_META[s].portfolioPt : SUBTYPE_META[s].portfolioEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{pt ? 'Gerar portfólio' : 'Generate portfolio'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
