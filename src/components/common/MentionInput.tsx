import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { mentionAtCursor, insertMention } from '@/lib/mentions';

type Person = { id: string; username: string; full_name: string | null; avatar_url: string | null };

export function MentionInput({ value, onChange, placeholder, disabled, onSubmit, multiline = false }: {
  value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean; onSubmit?: () => void; multiline?: boolean;
}) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const Field = multiline ? Textarea : Input;
  const listId = useId();
  const [token, setToken] = useState<ReturnType<typeof mentionAtCursor>>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    setPeople([]); setActive(0);
    if (!token || !user) { setSearching(false); return; }
    let live = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      const term = token.query.replace(/_/g, '\\_');
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url')
        .neq('id', user.id).or(`username.ilike.${term}%,full_name.ilike.${term}%`).limit(6);
      if (!live) return;
      setPeople((data ?? []).flatMap(p => p.id && p.username ? [{ ...p, id: p.id, username: p.username }] : []));
      setSearching(false);
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [token?.query, user?.id]);
  useEffect(() => { if (!value) setToken(null); }, [value]);
  useEffect(() => { if (people.length) ref.current?.scrollIntoView({ block: 'nearest' }); }, [people.length]);

  const choose = (person: Person) => {
    if (!token) return;
    const caret = token.start + person.username.length + 2;
    onChange(insertMention(value, token, person.username));
    setToken(null); setPeople([]);
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(caret, caret); });
  };
  return <div className="flex-1 min-w-0 space-y-1">
    {token && <div className="border border-border bg-popover rounded-lg max-h-44 overflow-y-auto" id={listId} role="listbox" aria-label={language === 'pt' ? 'Pessoas para marcar' : 'People to mention'}>
      {people.map((person, i) => <Button key={person.id} id={`${listId}-${i}`} role="option" aria-selected={active === i} variant="ghost"
        className={`w-full justify-start h-auto gap-2 py-2 rounded-none ${active === i ? 'bg-accent text-accent-foreground' : ''}`}
        onMouseDown={e => e.preventDefault()} onClick={() => choose(person)}>
        <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={person.avatar_url ?? ''} /><AvatarFallback>{person.username[0]}</AvatarFallback></Avatar>
        <span className="min-w-0 text-left"><span className="block truncate text-sm">{person.full_name || person.username}</span><span className="block truncate text-xs text-muted-foreground">@{person.username}</span></span>
      </Button>)}
      {!people.length && <p className="text-xs text-muted-foreground p-2">{searching ? (language === 'pt' ? 'Buscando…' : 'Searching…') : (language === 'pt' ? 'Nenhuma pessoa encontrada' : 'No people found')}</p>}
    </div>}
    <Field ref={(element: HTMLInputElement | HTMLTextAreaElement | null) => { ref.current = element; }} rows={multiline ? 2 : undefined} value={value} placeholder={placeholder} disabled={disabled} role="combobox" aria-autocomplete="list" aria-expanded={!!token}
      aria-controls={token ? listId : undefined} aria-activedescendant={token && people.length ? `${listId}-${active}` : undefined}
      onChange={e => { onChange(e.target.value); setToken(mentionAtCursor(e.target.value, e.target.selectionStart ?? e.target.value.length)); }}
      onClick={e => setToken(mentionAtCursor(value, e.currentTarget.selectionStart ?? value.length))}
      onKeyDown={e => {
        if (token && people.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          e.preventDefault(); setActive(i => (i + (e.key === 'ArrowDown' ? 1 : people.length - 1)) % people.length);
        } else if (token && people[active] && e.key === 'Enter') {
          e.preventDefault(); const person = people[active]; if (person) choose(person);
        } else if (token && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setToken(null); }
        else if (e.key === 'Enter' && !multiline && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit?.(); }
      }} />
  </div>;
}