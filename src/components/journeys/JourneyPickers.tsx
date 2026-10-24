import { useEffect, useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTags } from '@/hooks/useTags';
import { useHiddenCommunityAccess } from '@/hooks/useHiddenCommunityAccess';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

export function TagPicker({ value, onChange, category }: { value: string[]; onChange: (v: string[]) => void; category?: string | null }) {
  const { tags, getTranslatedName } = useTags();
  const { isTagHiddenFromUser } = useHiddenCommunityAccess();
  const { language } = useLanguage();
  const [q, setQ] = useState('');
  const options = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return tags.filter(t => !value.includes(t.id) && !isTagHiddenFromUser(t.id) && (!category || t.category === category)
      && (t.name.toLowerCase().includes(s) || getTranslatedName(t).toLowerCase().includes(s))).slice(0, 8);
  }, [q, tags, value, category, getTranslatedName, isTagHiddenFromUser]);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {value.map(id => {
          const t = tags.find(x => x.id === id);
          return (
            <Badge key={id} variant="secondary" className="gap-1">
              #{t ? getTranslatedName(t) : '…'}
              <button type="button" onClick={() => onChange(value.filter(v => v !== id))}><X className="w-3 h-3" /></button>
            </Badge>
          );
        })}
      </div>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder={language === 'pt' ? 'Buscar tag…' : 'Search tag…'} className="pl-8 h-9" />
      </div>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {options.map(t => (
            <button type="button" key={t.id} onClick={() => { onChange([...value, t.id]); setQ(''); }}
              className="text-xs rounded-full border px-2 py-0.5 hover:bg-primary/10">#{getTranslatedName(t)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function useTagName() {
  const { tags, getTranslatedName } = useTags();
  return (id: string) => { const t = tags.find(x => x.id === id); return t ? getTranslatedName(t) : '…'; };
}

type Kind = 'task' | 'product' | 'poll' | 'person';
const TABLE: Record<Kind, { table: string; label: string }> = {
  task: { table: 'tasks', label: 'title' },
  product: { table: 'products', label: 'title' },
  poll: { table: 'polls', label: 'title' },
  person: { table: 'profiles', label: 'username' },
};

/** Search an existing item (task, product, opinion or person) by name. */
export function EntityPicker({ kind, value, onChange, filter }: { kind: Kind; value: string | null; onChange: (id: string | null, label?: string) => void; filter?: (q: any) => any }) {
  const { language } = useLanguage();
  const [q, setQ] = useState('');
  const [label, setLabel] = useState<string>('');
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
  const cfg = TABLE[kind];

  useEffect(() => {
    if (!value) { setLabel(''); return; }
    (supabase as any).from(cfg.table).select(`id, ${cfg.label}`).eq('id', value).maybeSingle()
      .then(({ data }: any) => setLabel(data?.[cfg.label] ?? ''));
  }, [value, cfg.table, cfg.label]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setResults([]); return; }
    const h = setTimeout(async () => {
      let query = (supabase as any).from(cfg.table).select(`id, ${cfg.label}`).ilike(cfg.label, `%${s}%`).limit(8);
      if (filter) query = filter(query);
      const { data } = await query;
      setResults(((data ?? []) as any[]).map(r => ({ id: r.id, label: r[cfg.label] })));
    }, 250);
    return () => clearTimeout(h);
  }, [q, cfg.table, cfg.label, filter]);

  if (value) {
    return (
      <Badge variant="secondary" className="gap-1 max-w-full">
        <span className="truncate">{kind === 'person' ? '@' : ''}{label || '…'}</span>
        <button type="button" onClick={() => onChange(null)}><X className="w-3 h-3" /></button>
      </Badge>
    );
  }
  return (
    <div className="space-y-1">
      <Input value={q} onChange={e => setQ(e.target.value)} className="h-9"
        placeholder={language === 'pt' ? 'Buscar pelo nome (opcional)…' : 'Search by name (optional)…'} />
      {results.map(r => (
        <button type="button" key={r.id} onClick={() => { onChange(r.id, r.label); setQ(''); }}
          className="block w-full text-left text-xs rounded-md px-2 py-1.5 hover:bg-muted truncate">{kind === 'person' ? '@' : ''}{r.label}</button>
      ))}
    </div>
  );
}
