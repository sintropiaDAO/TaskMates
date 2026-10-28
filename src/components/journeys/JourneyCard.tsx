import { Map, Users, Trophy, Sparkles } from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JOURNEY_MULTIPLIER_STEP } from '@/lib/journeys';
import type { JourneySummary } from '@/hooks/useJourneys';
import { Button } from '@/components/ui/button';

function ProgressRing({ value, total }: { value: number; total: number }) {
  const pct = total ? value / total : 0;
  const r = 18, c = 2 * Math.PI * r;
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" className="size-[46px] shrink-0">
      <circle cx="23" cy="23" r={r} fill="none" strokeWidth="5" className="stroke-white/25" />
      <circle cx="23" cy="23" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
        className="stroke-amber-300" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 23 23)" />
      <text x="23" y="27" textAnchor="middle" className="fill-white text-[11px] font-black">{value}/{total}</text>
    </svg>
  );
}

export function JourneyCard({ journey, compact = false }: { journey: JourneySummary; compact?: boolean }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const done = journey.my_status === 'completed';
  return (
    <Button variant="journey"
      onClick={() => navigate(`/journeys/${journey.id}`)}
      className={`journey-card relative block h-auto whitespace-normal text-left overflow-hidden rounded-2xl border-2 border-warning/60 hover:scale-[1.02] transition-transform motion-reduce:transform-none ${compact ? 'w-64 shrink-0 p-3' : 'w-full p-4'}`}
    >
      {journey.image_url && <img src={journey.image_url} alt={journey.title} loading="lazy" className="w-full h-40 object-contain bg-muted/30 rounded-lg mb-3" />}
      <div className="relative space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1">
              <Map className="w-3 h-3" />{pt ? 'Jornada' : 'Journey'}{journey.is_starter && ' · ⭐'}
            </p>
            <h3 className="font-black leading-tight line-clamp-2 text-journey-foreground">{journey.title}</h3>
          </div>
          {journey.my_status ? <ProgressRing value={journey.my_done} total={journey.steps_count} /> : null}
        </div>
        {/* quest map */}
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(journey.steps_count, 10) }).map((_, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <span className={`w-3 h-3 rounded-full border-2 border-white/70 ${i < journey.my_done ? 'bg-amber-300' : 'bg-white/10'}`} />
              {i < Math.min(journey.steps_count, 10) - 1 && <span className="h-0.5 flex-1 bg-white/30 rounded" />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-white/90">
          <span>{journey.steps_count} {pt ? 'etapas' : 'steps'}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{journey.participants_count}</span>
          <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />{journey.completed_count}</span>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-300/90 text-indigo-900 px-2 py-0.5 font-black">
                  <Sparkles className="w-3 h-3" />+{Math.round(JOURNEY_MULTIPLIER_STEP * 100)}% EXP
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-xs">
                {pt ? 'Cada jornada concluída aumenta seu multiplicador de EXP em 10% (até x2), fazendo você subir de nível mais rápido.'
                  : 'Each completed journey raises your EXP multiplier by 10% (up to x2), so you level up faster.'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {done && <p className="text-xs font-black text-amber-200">🏆 {pt ? 'Concluída!' : 'Completed!'}</p>}
      </div>
    </Button>
  );
}
