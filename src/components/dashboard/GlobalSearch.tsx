import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Search, X, Users2, User, ClipboardList, Package, Megaphone, Tag as TagIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Task, Product, Poll } from '@/types';

interface GlobalSearchProps {
  onTaskSelect?: (task: Task) => void;
  onProductSelect?: (product: Product) => void;
  onPollSelect?: (poll: Poll) => void;
}

type Row = {
  key: string;
  group: string;
  icon: JSX.Element;
  title: string;
  subtitle?: string;
  avatar?: string | null;
  onSelect: () => void;
};

const GROUP_LIMIT = 5;

export function GlobalSearch({ onTaskSelect, onProductSelect, onPollSelect }: GlobalSearchProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { getTranslatedName } = useTags();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, total, loading, active } = useGlobalSearch(query);
  const pt = language === 'pt';

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => setCursor(0), [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];

    results.communities.slice(0, GROUP_LIMIT).forEach(tag => out.push({
      key: `c-${tag.id}`,
      group: pt ? 'Comunidades' : 'Communities',
      icon: <Users2 className="w-4 h-4 text-blue-500" />,
      title: getTranslatedName(tag),
      onSelect: () => { close(); navigate(`/tags/${tag.id}`); },
    }));

    results.people.slice(0, GROUP_LIMIT).forEach(p => out.push({
      key: `u-${p.id}`,
      group: pt ? 'Pessoas' : 'People',
      icon: <User className="w-4 h-4 text-primary" />,
      title: p.full_name || `@${p.username}`,
      subtitle: [p.username ? `@${p.username}` : null, p.location].filter(Boolean).join(' · '),
      avatar: p.avatar_url,
      onSelect: () => { close(); navigate(`/profile/${p.id}`); },
    }));

    results.tasks.slice(0, GROUP_LIMIT).forEach(t => out.push({
      key: `t-${t.id}`,
      group: pt ? 'Tarefas' : 'Tasks',
      icon: <ClipboardList className="w-4 h-4 text-emerald-600" />,
      title: t.title,
      subtitle: t.location || undefined,
      onSelect: () => { close(); onTaskSelect?.(t); },
    }));

    results.products.slice(0, GROUP_LIMIT).forEach(p => out.push({
      key: `p-${p.id}`,
      group: pt ? 'Recursos' : 'Resources',
      icon: <Package className="w-4 h-4 text-amber-500" />,
      title: p.title,
      subtitle: p.location || undefined,
      onSelect: () => { close(); onProductSelect?.(p); },
    }));

    results.polls.slice(0, GROUP_LIMIT).forEach(p => out.push({
      key: `o-${p.id}`,
      group: pt ? 'Opiniões' : 'Opinions',
      icon: <Megaphone className="w-4 h-4 text-violet-500" />,
      title: p.title,
      onSelect: () => { close(); onPollSelect?.(p); },
    }));

    results.tags.slice(0, GROUP_LIMIT).forEach(tag => out.push({
      key: `g-${tag.id}`,
      group: 'Tags',
      icon: <TagIcon className={`w-4 h-4 ${tag.category === 'skills' ? 'text-emerald-600' : 'text-amber-500'}`} />,
      title: getTranslatedName(tag),
      onSelect: () => { close(); navigate(`/tags/${tag.id}`); },
    }));

    return out;
  }, [results, pt, getTranslatedName, navigate, onTaskSelect, onProductSelect, onPollSelect]);

  const grouped = useMemo(() => {
    const map: Array<{ group: string; rows: Row[] }> = [];
    rows.forEach(r => {
      const last = map.find(g => g.group === r.group);
      if (last) last.rows.push(r);
      else map.push({ group: r.group, rows: [r] });
    });
    return map;
  }, [rows]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!rows.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => (c + 1) % rows.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => (c - 1 + rows.length) % rows.length); }
    if (e.key === 'Enter') { e.preventDefault(); rows[cursor]?.onSelect(); }
  };

  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative w-full mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={pt ? 'Buscar comunidades, pessoas, cards e tags...' : 'Search communities, people, cards and tags...'}
          aria-label={pt ? 'Busca global' : 'Global search'}
          className="clay bg-card border-none pl-9 pr-9 h-11 rounded-xl"
        />
        {query && (
          <button
            type="button"
            onClick={close}
            aria-label={pt ? 'Limpar busca' : 'Clear search'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && active && (
        <div className="absolute z-50 mt-2 left-0 right-0 max-w-full clay bg-card rounded-xl overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden py-2">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {pt ? 'Buscando...' : 'Searching...'}
              </div>
            )}

            {!loading && total === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {pt ? 'Nenhum resultado encontrado. Tente outras palavras.' : 'No results found. Try different words.'}
              </div>
            )}

            {!loading && grouped.map(group => (
              <div key={group.group} className="py-1">
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.group}
                </p>
                {group.rows.map(row => {
                  flatIndex += 1;
                  const isActive = flatIndex === cursor;
                  return (
                    <button
                      key={row.key}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={row.onSelect}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isActive ? 'bg-muted' : 'hover:bg-muted/60'}`}
                    >
                      {row.avatar !== undefined ? (
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={row.avatar || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {row.title.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="shrink-0">{row.icon}</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{row.title}</span>
                        {row.subtitle && (
                          <span className="block text-xs text-muted-foreground truncate">{row.subtitle}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
