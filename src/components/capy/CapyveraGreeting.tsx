import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, ArrowDown } from 'lucide-react';
import { Capyvera, type CapyveraPose } from './Capyvera';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export type TutorialSection = 'mytasks' | 'feed' | 'recommendations' | 'nearby';


interface CapyveraGreetingProps {
  section: TutorialSection;
  userName?: string;
  onAdvanceSection?: (next: TutorialSection) => void;
}

export const TUTORIAL_SECTION_ORDER: TutorialSection[] = ['recommendations', 'mytasks', 'nearby', 'feed'];

export function sectionLabel(section: TutorialSection, pt: boolean): string {
  switch (section) {
    case 'recommendations': return pt ? 'Para Você' : 'For You';
    case 'mytasks': return pt ? 'Minhas' : 'Mine';
    case 'nearby': return pt ? 'Perto' : 'Nearby';
    case 'feed': return pt ? 'Concluído' : 'Completed';
  }
}

interface Step {
  pose: CapyveraPose;
  title: string;
  body: React.ReactNode;
  /** Optional `data-tutorial` value of the element this step describes. */
  target?: string;
  /** Optional label for the floating anchor badge near the highlighted element. */
  anchorLabel?: string;
}

const DISMISSED_KEY = 'taskmates:dashboard-tutorial-dismissed';
const DONE_KEY = 'taskmates:dashboard-tutorial-done';

export function resetSectionTutorial(section: TutorialSection, userId?: string) {
  const doneKey = `${DONE_KEY}:${userId ?? 'anon'}`;
  const dismissedKey = `${DISMISSED_KEY}:${userId ?? 'anon'}`;
  try {
    const raw = localStorage.getItem(doneKey);
    const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    delete map[section];
    localStorage.setItem(doneKey, JSON.stringify(map));
    // Also clear the "dismissed forever" flag so the tutorial reappears
    localStorage.removeItem(dismissedKey);
  } catch {
    /* ignore */
  }
}

export function isSectionTutorialDone(section: TutorialSection, userId?: string): boolean {
  if (typeof window === 'undefined') return false;
  const doneKey = `${DONE_KEY}:${userId ?? 'anon'}`;
  const dismissedKey = `${DISMISSED_KEY}:${userId ?? 'anon'}`;
  try {
    if (localStorage.getItem(dismissedKey) === '1') return true;
    const raw = localStorage.getItem(doneKey);
    const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    return !!map[section];
  } catch {
    return false;
  }
}

function buildSteps(
  section: TutorialSection,
  language: 'pt' | 'en',
  userName: string,
): Step[] {
  const pt = language === 'pt';
  const sectionName = sectionLabel(section, pt);
  const B = ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  );

  switch (section) {
    case 'recommendations':
      return [
        {
          pose: 'wave',
          title: pt ? `Oi, ${userName}! 👋` : `Hi, ${userName}! 👋`,
          body: pt ? (
            <>
              Sou a CapyVera e vou te guiar por todo o app. Estamos começando pela seção <B>{sectionName}</B>, onde você encontra tarefas, produtos e enquetes recomendados com base nas suas tags e conexões.
            </>
          ) : (
            <>
              I'm CapyVera and I'll guide you through the whole app. We're starting on the <B>{sectionName}</B> section, where you'll find tasks, products and polls recommended from your tags and connections.
            </>
          ),
        },
        {
          pose: 'explorer',
          title: pt ? 'Filtros de conteúdo' : 'Content filters',
          body: pt ? (
            <>
              Ainda em <B>{sectionName}</B>, use o filtro destacado para alternar entre Tudo, Tarefas, Produtos, Enquetes e Comunidades — assim você foca no que mais te interessa agora.
            </>
          ) : (
            <>
              Still in <B>{sectionName}</B>, use the highlighted filter to switch between All, Tasks, Products, Polls and Communities — focus on what matters to you right now.
            </>
          ),
          target: 'recommendations-filter',
          anchorLabel: pt ? 'Filtros' : 'Filters',
        },
        {
          pose: 'thinking',
          title: pt ? 'Por que recomendado?' : 'Why recommended?',
          body: pt ? (
            <>
              Cada card em <B>{sectionName}</B> mostra os motivos da recomendação (tags em comum, pessoas que você segue ou correlações). Itens novos aparecem destacados desde sua última visita.
            </>
          ) : (
            <>
              Each card in <B>{sectionName}</B> shows why it was recommended (shared tags, people you follow, or correlations). New items appear highlighted since your last visit.
            </>
          ),
        },
        {
          pose: 'soccer',
          title: pt ? 'Comece a colaborar' : 'Start collaborating',
          body: pt ? (
            <>
              Toque em um card para ver detalhes, oferecer colaboração ou pedir ajuda. Quanto mais você interage, melhores ficam as recomendações. A seguir vamos para a sua seção pessoal.
            </>
          ) : (
            <>
              Tap a card to see details, offer collaboration or request help. The more you interact, the better the recommendations get. Next we'll head to your personal section.
            </>
          ),
        },
      ];
    case 'mytasks':
      return [
        {
          pose: 'builder',
          title: pt ? 'Seu espaço pessoal' : 'Your personal space',
          body: pt ? (
            <>
              Chegamos em <B>{sectionName}</B>: aqui você gerencia tudo que criou — tarefas, produtos, enquetes e tags — em um só lugar.
            </>
          ) : (
            <>
              Welcome to <B>{sectionName}</B>: this is where you manage everything you created — tasks, products, polls and tags — in one place.
            </>
          ),
        },
        {
          pose: 'newspaper',
          title: pt ? 'Botões de navegação' : 'Navigation buttons',
          body: pt ? (
            <>
              Dentro de <B>{sectionName}</B>, use estes botões para alternar entre Tarefas, Produtos, Enquetes, Tags, Calendário e Destaques. Cada um lembra do seu progresso.
            </>
          ) : (
            <>
              Inside <B>{sectionName}</B>, use these buttons to switch between Tasks, Products, Polls, Tags, Calendar and Highlights. Each one remembers your progress.
            </>
          ),
          target: 'mytasks-tabs',
          anchorLabel: pt ? 'Botões' : 'Buttons',
        },
        {
          pose: 'thinking',
          title: pt ? 'Visualização' : 'View',
          body: pt ? (
            <>
              Logo abaixo aparece o conteúdo da aba selecionada — Plano de Ação, Demandas, Impacto e mais.
            </>
          ) : (
            <>
              Right below you see the content of the selected tab — Action Plan, Demands, Impact and more.
            </>
          ),
          target: 'mytasks-content',
          anchorLabel: pt ? 'Visualização' : 'View',
        },
        {
          pose: 'builder',
          title: pt ? 'Criar tarefa, produto ou enquete' : 'Create a task, product or poll',
          body: pt ? (
            <>
              Toque no realce para abrir o menu <B>+</B> e escolha: Tarefa, Produto ou Enquete. Você também pode editar ou apagar a partir de cada card.
            </>
          ) : (
            <>
              Tap the highlight to open the <B>+</B> menu and choose: Task, Product or Poll. You can also edit or delete from each card.
            </>
          ),
          target: 'bottomnav-create',
          anchorLabel: pt ? 'Criar (+)' : 'Create (+)',
        },
        {
          pose: 'trophy',
          title: pt ? 'Conquistas e estrelas' : 'Achievements and stars',
          body: pt ? (
            <>
              Concluir tarefas gera moedas e pode dar Estrelas da Sorte. Acompanhe seus destaques e badges por aqui. Vamos agora explorar o que está perto de você.
            </>
          ) : (
            <>
              Completing tasks earns coins and may grant Lucky Stars. Track your highlights and badges right here. Now let's explore what's near you.
            </>
          ),
        },
      ];
    case 'nearby':
      return [
        {
          pose: 'explorer',
          title: pt ? 'Descubra o que está por perto' : 'Discover what is nearby',
          body: pt ? (
            <>
              Estamos em <B>{sectionName}</B>: aqui você encontra tarefas, produtos e comunidades próximos da sua localização.
            </>
          ) : (
            <>
              We're in <B>{sectionName}</B>: here you'll find tasks, products and communities near your location.
            </>
          ),
        },
        {
          pose: 'thinking',
          title: pt ? 'Filtros' : 'Filters',
          body: pt ? (
            <>
              Em <B>{sectionName}</B>, filtre por tipo de conteúdo. Clique novamente em Tarefas/Produtos para alternar entre Ofertas e Solicitações.
            </>
          ) : (
            <>
              In <B>{sectionName}</B>, filter by content type. Click Tasks/Products again to switch between Offers and Requests.
            </>
          ),
          target: 'nearby-filter',
          anchorLabel: pt ? 'Filtro' : 'Filter',
        },
        {
          pose: 'explorer',
          title: pt ? 'Mapa interativo' : 'Interactive map',
          body: pt ? (
            <>
              Busque outra cidade ou arraste o mapa para explorar. Os resultados atualizam conforme você navega.
            </>
          ) : (
            <>
              Search another city or drag the map to explore. Results refresh as you navigate.
            </>
          ),
          target: 'nearby-map',
          anchorLabel: pt ? 'Mapa' : 'Map',
        },
        {
          pose: 'gardener',
          title: pt ? 'Comunidades por perto' : 'Communities nearby',
          body: pt ? (
            <>
              Logo abaixo do mapa aparecem as comunidades da região. Abra uma para conhecer pessoas e ações locais. Por fim, vamos ver as conquistas mais recentes.
            </>
          ) : (
            <>
              Right below the map you see communities in the region. Open one to meet local people and actions. Finally, let's check the latest achievements.
            </>
          ),
          target: 'nearby-communities',
          anchorLabel: pt ? 'Comunidades' : 'Communities',
        },
      ];
    case 'feed':
      return [
        {
          pose: 'newspaper',
          title: pt ? 'Feed regenerativo' : 'Regenerative feed',
          body: pt ? (
            <>
              Chegamos em <B>{sectionName}</B>: este é o seu feed com as conquistas recentes das pessoas e comunidades que você segue.
            </>
          ) : (
            <>
              Welcome to <B>{sectionName}</B>: this is your feed with the latest achievements from the people and communities you follow.
            </>
          ),
        },
        {
          pose: 'newspaper',
          title: pt ? 'Filtros do feed' : 'Feed filters',
          body: pt ? (
            <>
              Em <B>{sectionName}</B>, use o filtro destacado para focar em Tarefas, Produtos ou Enquetes. Clique novamente em Tarefas/Produtos para alternar Ofertas (verde) ou Solicitações (rosa).
            </>
          ) : (
            <>
              In <B>{sectionName}</B>, use the highlighted filter to focus on Tasks, Products or Polls. Click Tasks/Products again to toggle Offers (green) or Requests (pink).
            </>
          ),
          target: 'feed-filter',
          anchorLabel: pt ? 'Filtro' : 'Filter',
        },
        {
          pose: 'butterflies',
          title: pt ? 'Conquistas em cards' : 'Achievements as cards',
          body: pt ? (
            <>
              Cada card mostra um item concluído. Use 👍 / 👎 para dar feedback e clique para ver provas, fotos e vídeos da entrega. Pronto, você já conhece o app!
            </>
          ) : (
            <>
              Each card shows a completed item. Use 👍 / 👎 to give feedback and click to see proofs, photos and videos. That's it — you know the app!
            </>
          ),
          target: 'feed-list',
          anchorLabel: pt ? 'Cards' : 'Cards',
        },
      ];
  }
}


export function CapyveraGreeting({ section, userName, onAdvanceSection }: CapyveraGreetingProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const name = userName || (language === 'pt' ? 'amigo' : 'friend');

  const dismissedKey = `${DISMISSED_KEY}:${user?.id ?? 'anon'}`;
  const doneKey = `${DONE_KEY}:${user?.id ?? 'anon'}`;

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(dismissedKey) === '1';
  });
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(doneKey) || '{}');
    } catch {
      return {};
    }
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [navHighlightActive, setNavHighlightActive] = useState(false);
  const [navHighlightRect, setNavHighlightRect] = useState<DOMRect | null>(null);
  const bubbleRef = (typeof window !== 'undefined') ? ((window as any).__tmBubbleRef ||= { current: null as HTMLDivElement | null }) : { current: null };

  const steps = useMemo(() => buildSteps(section, language, name), [section, language, name]);

  // Reset step when section or language changes
  useEffect(() => {
    setStepIndex(0);
  }, [section, language]);

  const hidden = dismissed || doneMap[section];
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const currentTarget = !hidden ? currentStep?.target : undefined;

  // Track the highlighted element's position for 1.5s, then return focus to bubble.
  useEffect(() => {
    if (!currentTarget || navHighlightActive) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tutorial="${currentTarget}"]`);
    if (!el) {
      setHighlightRect(null);
      return;
    }
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      /* ignore */
    }
    const update = () => setHighlightRect(el.getBoundingClientRect());
    // Delay first paint so smooth scroll has time to land
    const initialTimeout = window.setTimeout(update, 350);
    const interval = window.setInterval(update, 200);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    // After 1.5s, clear the highlight and scroll the bubble back into view
    const clearTimeout = window.setTimeout(() => {
      setHighlightRect(null);
      try {
        bubbleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch { /* ignore */ }
    }, 1500);
    return () => {
      window.clearTimeout(initialTimeout);
      window.clearTimeout(clearTimeout);
      window.clearInterval(interval);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [currentTarget, stepIndex, navHighlightActive]);


  // At the start of each section's tutorial, briefly highlight the matching
  // BottomNav item for 1.5s, then bring the focus back to the bubble.
  useEffect(() => {
    if (hidden) return;
    if (stepIndex !== 0) return;
    const navEl = document.querySelector<HTMLElement>(`[data-tutorial="bottomnav-${section}"]`);
    if (!navEl) return;
    setNavHighlightActive(true);
    const updateNav = () => setNavHighlightRect(navEl.getBoundingClientRect());
    updateNav();
    const interval = window.setInterval(updateNav, 200);
    const timeout = window.setTimeout(() => {
      setNavHighlightActive(false);
      setNavHighlightRect(null);
      // Scroll the bubble back into view
      try {
        bubbleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch { /* ignore */ }
    }, 1500);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, stepIndex, hidden]);


  if (hidden) return null;

  const total = steps.length;
  const current = currentStep;
  const progressValue = ((stepIndex + 1) / total) * 100;
  const isLast = stepIndex === total - 1;
  const isFirst = stepIndex === 0;
  const pt = language === 'pt';

  const handleClose = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey, '1');
    } catch {
      /* ignore */
    }
    try { window.dispatchEvent(new Event('taskmates:tutorial-changed')); } catch { /* ignore */ }
  };

  const handleFinish = () => {
    const next = { ...doneMap, [section]: true };
    setDoneMap(next);
    try {
      localStorage.setItem(doneKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    try { window.dispatchEvent(new Event('taskmates:tutorial-changed')); } catch { /* ignore */ }
    // Auto-advance to the next dashboard section for a single continuous tutorial.
    const idx = TUTORIAL_SECTION_ORDER.indexOf(section);
    const nextSection = idx >= 0 && idx < TUTORIAL_SECTION_ORDER.length - 1
      ? TUTORIAL_SECTION_ORDER[idx + 1]
      : null;
    if (nextSection && onAdvanceSection) {
      // Re-open the tutorial for the next section so it isn't auto-hidden.
      resetSectionTutorial(nextSection, user?.id);
      setDoneMap((d) => { const copy = { ...d }; delete copy[nextSection]; return copy; });
      onAdvanceSection(nextSection);
    }
  };

  // Targets where clicking the ring should auto-trigger an action (open filter / menu).
  const AUTO_CLICK_TARGETS = new Set([
    'recommendations-filter', 'nearby-filter', 'feed-filter', 'bottomnav-create',
  ]);
  const handleHighlightClick = () => {
    if (!currentTarget) return;
    const el = document.querySelector<HTMLElement>(`[data-tutorial="${currentTarget}"]`);
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
    if (!AUTO_CLICK_TARGETS.has(currentTarget)) return;
    const clickable = (el.tagName === 'BUTTON' || el.tagName === 'A')
      ? el
      : el.querySelector<HTMLElement>('button, a, [role="button"]');
    clickable?.click();
  };

  return (
    <>
      {navHighlightRect && navHighlightActive && (
        <div
          aria-hidden="true"
          className="fixed z-[80] pointer-events-none flex flex-col items-center text-primary animate-bounce motion-reduce:animate-none"
          style={{
            top: navHighlightRect.top - 36,
            left: navHighlightRect.left + navHighlightRect.width / 2 - 14,
            width: 28,
          }}
        >
          <ArrowDown
            className="h-7 w-7 drop-shadow-[0_4px_8px_hsl(var(--primary)/0.45)]"
            strokeWidth={3}
          />
        </div>
      )}

      {highlightRect && !navHighlightActive && (
        <button
          type="button"
          onClick={handleHighlightClick}
          aria-label={pt ? `Ir para ${current.anchorLabel || 'destaque'}` : `Go to ${current.anchorLabel || 'highlight'}`}
          className="fixed z-[80] rounded-2xl ring-4 ring-primary ring-offset-2 ring-offset-background transition-all duration-200 animate-pulse motion-reduce:animate-none cursor-pointer bg-transparent border-0 p-0 hover:ring-[6px] focus:outline-none focus-visible:ring-[6px]"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            boxShadow: '0 0 0 4px hsl(var(--primary) / 0.25), 0 8px 24px -8px hsl(var(--primary) / 0.45)',
          }}
        >
          {current.anchorLabel && (
            <span className="absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-md pointer-events-none">
              {current.anchorLabel}
            </span>
          )}
        </button>
      )}
      <div
        className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-5 animate-fade-in motion-reduce:animate-none w-full max-w-full overflow-hidden"
        role="region"
        aria-label={pt ? 'Tutorial da CapyVera' : 'CapyVera tutorial'}
      >
      <div className="shrink-0 -mb-2 hidden sm:block">
        <Capyvera pose={current.pose} size="lg" loading="eager" />
      </div>
      <div className="shrink-0 -mb-3 block sm:hidden">
        <Capyvera pose={current.pose} size="lg" loading="eager" />
      </div>

      <div
        ref={(el) => { bubbleRef.current = el; }}
        className={cn(
          'relative flex-1 w-full max-w-full rounded-[28px] px-4 py-4 sm:px-5 sm:py-5',
          'bg-card border border-border/40',
          // Claymorphism: softer layered shadows without harsh inner bottom line
          'shadow-[0_10px_24px_-12px_hsl(var(--foreground)/0.18),0_4px_10px_-4px_hsl(var(--foreground)/0.10),inset_0_1px_0_hsl(var(--background)/0.6)]',
        )}
        role="status"
        aria-live="polite"
      >
        {/* Speech bubble tail — points left on desktop, up on mobile */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute h-4 w-4 rotate-45 bg-card border-border/40',
            // Mobile: tail on top pointing up to the mascot
            '-top-2 left-1/2 -translate-x-1/2 border-l border-t',
            // Desktop: tail on the left pointing to the mascot
            'sm:top-6 sm:left-auto sm:-left-2 sm:translate-x-0 sm:border-l sm:border-b sm:border-t-0',
            'shadow-[-2px_2px_4px_-2px_hsl(var(--foreground)/0.08)]',
          )}
        />



        {/* Close (dismiss forever) */}
        <button
          type="button"
          onClick={handleClose}
          aria-label={pt ? 'Fechar tutorial e não mostrar novamente' : 'Close tutorial and do not show again'}
          className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress */}
        <div className="relative pr-8">
          <Progress
            value={progressValue}
            className="h-1.5"
            aria-label={pt ? 'Progresso do tutorial' : 'Tutorial progress'}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              {pt ? `Passo ${stepIndex + 1} de ${total}` : `Step ${stepIndex + 1} of ${total}`}
            </p>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {sectionLabel(section, pt)}
            </span>
          </div>
        </div>

        <h2 className="relative mt-2 text-lg sm:text-xl font-display font-bold leading-tight">
          {current.title}
        </h2>
        <p className="relative text-sm sm:text-base text-foreground/80 leading-relaxed mt-1.5">
          {current.body}
        </p>

        {/* Navigation */}
        <div className="relative mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="min-h-11"
            aria-label={pt ? 'Passo anterior' : 'Previous step'}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {pt ? 'Voltar' : 'Back'}
          </Button>

          {isLast ? (
            <Button
              type="button"
              size="sm"
              onClick={handleFinish}
              className="min-h-11"
            >
              <Check className="h-4 w-4 mr-1" />
              {pt ? 'Entendi' : 'Got it'}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
              className="min-h-11"
              aria-label={pt ? 'Próximo passo' : 'Next step'}
            >
              {pt ? 'Próximo' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
