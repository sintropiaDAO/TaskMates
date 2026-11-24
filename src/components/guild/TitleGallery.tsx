import { Crown, Lock } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { OCCUPATIONS, VOCATION_CATEGORIES, occupationName, type TitleForm } from '@/lib/guildQuiz';
import { useOccupationTitles, useGuildQuizResult } from '@/hooks/useOccupationTitles';

export function TitleGallery({ userId, isOwn, lang }: { userId: string; isOwn: boolean; lang: 'pt' | 'en' }) {
  const pt = lang === 'pt';
  const navigate = useNavigate();
  const { titles, form, setForm } = useOccupationTitles(userId, lang);
  const { result, setTitleForm } = useGuildQuizResult();
  const earned = new Set(titles.map(t => t.category));
  const changeForm = async (f: TitleForm) => { setForm(f); await setTitleForm(f); };

  return (
    <section className="space-y-3 py-5" aria-labelledby="title-gallery">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="title-gallery" className="flex items-center gap-2 text-lg font-black"><Crown className="h-5 w-5 text-warning" />{pt ? 'Galeria de Títulos' : 'Title Gallery'}</h2>
        {isOwn && <Button size="sm" className="journey-card border-2 border-warning/60 font-bold" onClick={() => navigate('/guild-quiz')}>{result ? (pt ? 'Refazer quiz de vocação' : 'Retake vocation quiz') : (pt ? 'Descobrir minha vocação' : 'Find my vocation')}</Button>}
      </div>
      {isOwn && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={pt ? 'Forma do título' : 'Title form'}>
          {([['neutral', pt ? 'Neutra (a/o)' : 'Neutral'], ['feminine', pt ? 'Feminina' : 'Feminine'], ['masculine', pt ? 'Masculina' : 'Masculine']] as const).map(([k, l]) => (
            <Button key={k} size="sm" variant={form === k ? 'default' : 'outline'} className="h-8 rounded-full text-xs" onClick={() => void changeForm(k)}>{l}</Button>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {titles.map((t, i) => (
          <div key={`${t.category}-${t.name}`} className={`rounded-2xl border-2 p-3 ${i === 0 ? 'journey-card border-warning/70' : 'border-primary/30 bg-card'}`}>
            <p className={`text-xs font-bold ${i === 0 ? 'text-warning' : 'text-primary'}`}>{i === 0 ? (pt ? 'Em destaque' : 'Featured') : OCCUPATIONS[t.category].badge[lang]}</p>
            <p className={`font-black ${i === 0 ? 'text-journey-foreground' : ''}`}><span aria-hidden="true">{OCCUPATIONS[t.category].emoji} </span>{t.name}</p>
          </div>
        ))}
        {isOwn && VOCATION_CATEGORIES.filter(c => !earned.has(c)).map(c => (
          <div key={c} className="rounded-2xl border-2 border-dashed border-border bg-muted/40 p-3 opacity-80">
            <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Lock className="h-3 w-3" />{OCCUPATIONS[c].badge[lang]}</p>
            <p className="font-black text-muted-foreground"><span aria-hidden="true">{OCCUPATIONS[c].emoji} </span>{occupationName(c, lang, form, pt ? '[Tag]' : '[Tag]')}</p>
            <p className="text-xs text-muted-foreground">{OCCUPATIONS[c].criterion[lang]}</p>
          </div>
        ))}
      </div>
      {!isOwn && titles.length === 0 && <p className="text-sm text-muted-foreground">{pt ? 'Nenhum título conquistado ainda.' : 'No titles earned yet.'}</p>}
    </section>
  );
}
