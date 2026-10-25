import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@/lib/router-compat';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Map, Gift, Gauge, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ACTIONS, ITEM_KINDS, ITEM_TYPES, METRICS, OPS, describeStep, taskSubtypeOptions,
  type JourneyStepInput, type JourneyItemKind, type JourneyAction,
} from '@/lib/journeys';
import { createJourney, type JourneyRewardInput } from '@/hooks/useJourneys';
import { TagPicker, EntityPicker, useTagName } from '@/components/journeys/JourneyPickers';
import { JourneyCoverPicker } from '@/components/journeys/JourneyCoverPicker';

const sel = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

const TEMPLATES: { pt: string; en: string; step: JourneyStepInput }[] = [
  { pt: 'Criar tarefa com tag', en: 'Create task with tag', step: { action: 'create', item_kind: 'task', tag_ids: [] } },
  { pt: 'Concluir tarefa sem downvotes', en: 'Complete task with no downvotes', step: { action: 'complete', item_kind: 'task', indicators: [{ metric: 'downvotes', op: 'eq', value: 0 }] } },
  { pt: 'Votar em uma opinião', en: 'Vote in an opinion', step: { action: 'vote', item_kind: 'poll' } },
  { pt: 'Seguir uma comunidade', en: 'Follow a community', step: { action: 'follow_tag', item_kind: 'tag', tag_category: 'communities' } },
];

function StepEditor({ step, onChange, lang }: { step: JourneyStepInput; onChange: (s: JourneyStepInput) => void; lang: 'pt' | 'en' }) {
  const pt = lang === 'pt';
  const action = ACTIONS.find(a => a.key === step.action);
  const kinds = action?.kinds ?? [];
  const set = (patch: Partial<JourneyStepInput>) => onChange({ ...step, ...patch });
  const kind = step.item_kind ?? null;
  const showItemFilters = kind === 'task' || kind === 'product' || kind === 'poll';

  return (
    <div className="space-y-3">
      <Input value={step.title ?? ''} onChange={e => set({ title: e.target.value })} placeholder={pt ? 'Título da etapa (opcional)' : 'Step title (optional)'} />
      <div>
        <Label className="text-xs">{pt ? 'Ação *' : 'Action *'}</Label>
        <select className={sel} value={step.action} onChange={e => {
          const a = e.target.value as JourneyAction;
          const ks = ACTIONS.find(x => x.key === a)?.kinds ?? [];
          set({ action: a, item_kind: ks.length === 1 ? ks[0] : null, item_type: null, item_subtype: null, tag_category: null, entity_id: null });
        }}>
          {ACTIONS.map(a => <option key={a.key} value={a.key}>{a.label[lang]}</option>)}
        </select>
      </div>

      {kinds.length > 1 && (
        <div>
          <Label className="text-xs">{pt ? 'Item' : 'Item'}</Label>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => set({ item_kind: null, item_type: null, item_subtype: null, entity_id: null })}
              className={`text-xs rounded-full border px-3 py-1 ${!kind ? 'bg-primary text-primary-foreground' : ''}`}>{pt ? 'Qualquer' : 'Any'}</button>
            {kinds.map(k => (
              <button type="button" key={k} onClick={() => set({ item_kind: k, item_type: null, item_subtype: null, entity_id: null })}
                className={`text-xs rounded-full border px-3 py-1 ${kind === k ? 'bg-primary text-primary-foreground' : ''}`}>{ITEM_KINDS[k][lang]}</button>
            ))}
          </div>
        </div>
      )}

      {showItemFilters && kind && ITEM_TYPES[kind] && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{pt ? 'Tipo' : 'Type'}</Label>
            <select className={sel} value={step.item_type ?? ''} onChange={e => set({ item_type: e.target.value || null })}>
              <option value="">{pt ? 'Qualquer' : 'Any'}</option>
              {ITEM_TYPES[kind]?.map(t => <option key={t.key} value={t.key}>{t.label[lang]}</option>)}
            </select>
          </div>
          {kind === 'task' && (
            <div>
              <Label className="text-xs">{pt ? 'Categoria' : 'Category'}</Label>
              <select className={sel} value={step.item_subtype ?? ''} onChange={e => set({ item_subtype: e.target.value || null })}>
                <option value="">{pt ? 'Qualquer' : 'Any'}</option>
                {taskSubtypeOptions(lang).map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {kind === 'tag' && (
        <div>
          <Label className="text-xs">{pt ? 'Tipo de tag' : 'Tag type'}</Label>
          <select className={sel} value={step.tag_category ?? ''} onChange={e => set({ tag_category: e.target.value || null })}>
            <option value="">{pt ? 'Qualquer' : 'Any'}</option>
            {ITEM_TYPES.tag?.map(t => <option key={t.key} value={t.key}>{t.label[lang]}</option>)}
          </select>
        </div>
      )}

      {kind && kind !== 'tag' && (
        <div>
          <Label className="text-xs">{kind === 'person' ? (pt ? 'Pessoa específica' : 'Specific person') : (pt ? 'Item específico' : 'Specific item')}</Label>
          <EntityPicker kind={kind as any} value={step.entity_id ?? null} onChange={id => set({ entity_id: id })} />
        </div>
      )}

      {step.action !== 'follow_person' && (
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{kind === 'tag' ? (pt ? 'Tags aceitas' : 'Accepted tags') : (pt ? 'Tags exigidas' : 'Required tags')}</Label>
            {(step.tag_ids?.length ?? 0) > 1 && (
              <select className="text-xs border rounded px-1 bg-background" value={step.tag_match ?? 'any'} onChange={e => set({ tag_match: e.target.value as 'any' | 'all' })}>
                <option value="any">{pt ? 'qualquer uma (ou)' : 'any (or)'}</option>
                <option value="all">{pt ? 'todas (e)' : 'all (and)'}</option>
              </select>
            )}
          </div>
          <TagPicker value={step.tag_ids ?? []} onChange={v => set({ tag_ids: v })} category={kind === 'tag' ? step.tag_category : null} />
        </div>
      )}

      {showItemFilters && (
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Gauge className="w-3 h-3" />{pt ? 'Indicadores' : 'Indicators'}</Label>
          {(step.indicators ?? []).map((ind, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <select className={sel} value={ind.metric} onChange={e => {
                const arr = [...(step.indicators ?? [])]; arr[i] = { ...ind, metric: e.target.value as any }; set({ indicators: arr });
              }}>{METRICS.map(m => <option key={m.key} value={m.key}>{m.label[lang]}</option>)}</select>
              <select className={`${sel} w-16`} value={ind.op} onChange={e => {
                const arr = [...(step.indicators ?? [])]; arr[i] = { ...ind, op: e.target.value as any }; set({ indicators: arr });
              }}>{OPS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
              <Input type="number" className="w-20 h-9" value={ind.value} onChange={e => {
                const arr = [...(step.indicators ?? [])]; arr[i] = { ...ind, value: Number(e.target.value) }; set({ indicators: arr });
              }} />
              <Button type="button" size="icon" variant="ghost" onClick={() => set({ indicators: (step.indicators ?? []).filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => set({ indicators: [...(step.indicators ?? []), { metric: 'likes', op: 'gte', value: 1 }] })}>
            <Plus className="w-3 h-3 mr-1" />{pt ? 'Indicador' : 'Indicator'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function JourneyEditor() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const pt = lang === 'pt';
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const tagName = useTagName();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagIds, setTagIds] = useState<string[]>(() => { const tag = params.get('tag'); return tag ? [tag] : []; });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savedCover, setSavedCover] = useState<string | null>(null);
  const [ordered, setOrdered] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [steps, setSteps] = useState<JourneyStepInput[]>([{ action: 'create', item_kind: null, tag_ids: [], indicators: [] }]);
  const [rewards, setRewards] = useState<JourneyRewardInput[]>([]);
  const [open, setOpen] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const db = supabase as any;
      const [{ data: j }, { data: s }, { data: r }] = await Promise.all([
        db.from('journeys').select('*').eq('id', editId).maybeSingle(),
        db.from('journey_steps').select('*').eq('journey_id', editId).order('position'),
        db.from('journey_rewards').select('*').eq('journey_id', editId),
      ]);
      if (!j) return;
      setTitle(j.title); setDescription(j.description ?? ''); setTagIds(j.tag_ids ?? []); setOrdered(j.is_ordered);
      setSavedCover(j.image_url ?? null); setCoverPreview(j.image_url ?? null);
      setDeadline(j.deadline ? j.deadline.slice(0, 10) : '');
      setSteps((s ?? []).map((x: any) => ({ ...x, indicators: x.indicators ?? [] })));
      setRewards((r ?? []).map((x: any) => ({ product_id: x.product_id, description: x.description })));
    })();
  }, [editId]);

  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= steps.length) return;
    const arr = [...steps]; [arr[i], arr[j]] = [arr[j], arr[i]]; setSteps(arr); setOpen(j);
  };

  const save = async () => {
    if (!user) return;
    if (!title.trim()) { toast({ title: pt ? 'Dê um título à jornada' : 'Give the journey a title', variant: 'destructive' }); return; }
    if (!steps.length) { toast({ title: pt ? 'Adicione ao menos uma etapa' : 'Add at least one step', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      let imageUrl = savedCover;
      if (coverFile) {
        const path = `${user.id}/journeys/${crypto.randomUUID()}.jpg`;
        const { data, error } = await supabase.storage.from('task-images').upload(path, coverFile, { contentType: 'image/jpeg' });
        if (error) throw error;
        imageUrl = supabase.storage.from('task-images').getPublicUrl(data.path).data.publicUrl;
        setSavedCover(imageUrl);
      }
      const id = await createJourney({
        userId: user.id, title: title.trim(), description, image_url: imageUrl, tag_ids: tagIds, is_ordered: ordered,
        deadline: deadline ? new Date(deadline + 'T23:59:59').toISOString() : null, steps, rewards,
      }, editId ?? undefined);
      toast({ title: pt ? 'Jornada salva!' : 'Journey saved!' });
      navigate(`/journeys/${id}`);
    } catch (e: any) {
      toast({ title: pt ? 'Erro ao salvar' : 'Error saving', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />{pt ? 'Voltar' : 'Back'}</Button>
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-4">
        <h1 className="text-xl font-black flex items-center gap-2"><Map className="w-5 h-5" />{editId ? (pt ? 'Editar Jornada' : 'Edit Journey') : (pt ? 'Criar Jornada' : 'Create Journey')}</h1>
        <p className="text-xs text-white/85">{pt ? 'Monte uma lista de etapas para outras pessoas cumprirem. Quem concluir ganha +10% de EXP (até x2).' : 'Build a list of steps for others to complete. Finishers earn +10% EXP (up to x2).'}</p>
      </div>

      <div className="space-y-3">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={pt ? 'Título da jornada *' : 'Journey title *'} />
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={pt ? 'Descrição' : 'Description'} rows={3} />
        <div className="space-y-2">
          <Label>{pt ? 'Imagem de capa' : 'Cover image'}</Label>
          <JourneyCoverPicker imageUrl={coverPreview} disabled={saving} onChange={(file, preview) => {
            setCoverFile(file); setCoverPreview(preview); if (!preview) setSavedCover(null);
          }} />
        </div>
        <div>
          <Label className="text-xs">{pt ? 'Tags da jornada (aparece na página dessas tags)' : 'Journey tags (shown on those tag pages)'}</Label>
          <TagPicker value={tagIds} onChange={setTagIds} />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <Label className="text-xs">{pt ? 'Prazo (opcional)' : 'Deadline (optional)'}</Label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2"><Switch checked={ordered} onCheckedChange={setOrdered} />{pt ? 'Etapas em sequência' : 'Steps in order'}</label>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-black">{pt ? 'Etapas' : 'Steps'}</h2>
        {steps.map((s, i) => (
          <div key={i} className="rounded-xl border-2 border-violet-400/40 bg-card">
            <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <p className="flex-1 text-sm font-semibold line-clamp-2">{s.title || describeStep(s, lang, tagName)}</p>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); move(i, -1); }}><ChevronUp className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); move(i, 1); }}><ChevronDown className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSteps(steps.filter((_, j) => j !== i)); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
            {open === i && (
              <div className="px-3 pb-3 space-y-2">
                {s.title && <p className="text-xs text-muted-foreground">{describeStep(s, lang, tagName)}</p>}
                <StepEditor step={s} lang={lang} onChange={ns => setSteps(steps.map((x, j) => j === i ? ns : x))} />
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => { setSteps([...steps, { action: 'create', tag_ids: [], indicators: [] }]); setOpen(steps.length); }}>
            <Plus className="w-4 h-4 mr-1" />{pt ? 'Nova etapa' : 'New step'}
          </Button>
          {TEMPLATES.map(t => (
            <button key={t.en} type="button" className="text-xs rounded-full border border-dashed px-3 py-1 hover:bg-muted"
              onClick={() => { setSteps([...steps, { tag_ids: [], indicators: [], ...t.step }]); setOpen(steps.length); }}>+ {pt ? t.pt : t.en}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-black flex items-center gap-1.5"><Gift className="w-4 h-4 text-amber-500" />{pt ? 'Recompensas' : 'Rewards'}</h2>
        {rewards.map((r, i) => (
          <div key={i} className="rounded-xl border p-3 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs">{pt ? 'Produto ou serviço do app (opcional)' : 'App product or service (optional)'}</Label>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRewards(rewards.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <EntityPicker kind="product" value={r.product_id ?? null} onChange={id => setRewards(rewards.map((x, j) => j === i ? { ...x, product_id: id } : x))} />
            <Textarea rows={2} value={r.description ?? ''} placeholder={pt ? 'Descreva a recompensa' : 'Describe the reward'}
              onChange={e => setRewards(rewards.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setRewards([...rewards, { product_id: null, description: '' }])}>
          <Plus className="w-4 h-4 mr-1" />{pt ? 'Recompensa' : 'Reward'}
        </Button>
      </div>

      <Button className="w-full" size="lg" onClick={save} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{pt ? 'Salvar jornada' : 'Save journey'}
      </Button>
    </div>
  );
}
