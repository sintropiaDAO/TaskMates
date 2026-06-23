import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
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
}

interface Step {
  pose: CapyveraPose;
  title: string;
  body: string;
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
  const hello = pt ? `Oi, ${userName}! 👋` : `Hi, ${userName}! 👋`;

  switch (section) {
    case 'recommendations':
      return [
        {
          pose: 'wave',
          title: hello,
          body: pt
            ? 'Sou a CapyVera e vou te guiar nesta seção. Aqui você encontra tarefas, produtos e enquetes recomendados de acordo com suas tags e conexões.'
            : "I'm CapyVera and I'll guide you through this section. Here you'll find tasks, products and polls recommended based on your tags and connections.",
        },
        {
          pose: 'explorer',
          title: pt ? 'Filtros de conteúdo' : 'Content filters',
          body: pt
            ? 'Use o filtro destacado abaixo para alternar entre Tudo, Tarefas, Produtos, Enquetes e Comunidades. Assim você foca no que mais te interessa agora.'
            : 'Use the highlighted filter below to switch between All, Tasks, Products, Polls and Communities — focus on what matters to you right now.',
          target: 'recommendations-filter',
          anchorLabel: pt ? 'Filtros' : 'Filters',
        },
        {
          pose: 'thinking',
          title: pt ? 'Por que recomendado?' : 'Why recommended?',
          body: pt
            ? 'Cada card mostra os motivos da recomendação (tags em comum, pessoas que você segue ou correlações). Itens novos aparecem destacados desde sua última visita.'
            : 'Each card shows why it was recommended (shared tags, people you follow, or correlations). New items appear highlighted since your last visit.',
        },
        {
          pose: 'soccer',
          title: pt ? 'Comece a colaborar' : 'Start collaborating',
          body: pt
            ? 'Toque em um card para ver detalhes, oferecer colaboração ou pedir ajuda. Quanto mais você interage, melhores ficam as recomendações.'
            : 'Tap a card to see details, offer collaboration or request help. The more you interact, the better the recommendations get.',
        },
      ];
    case 'feed':
      return [
        {
          pose: 'wave',
          title: hello,
          body: pt
            ? 'Este é o seu feed regenerativo: conquistas recentes das pessoas e comunidades que você segue.'
            : "This is your regenerative feed: recent achievements from people and communities you follow.",
        },
        {
          pose: 'newspaper',
          title: pt ? 'Filtros do feed' : 'Feed filters',
          body: pt
            ? 'Use o filtro destacado para focar em Tarefas, Produtos ou Enquetes. Clique novamente em Tarefas/Produtos para alternar Ofertas (verde) ou Solicitações (rosa).'
            : 'Use the highlighted filter to focus on Tasks, Products or Polls. Click Tasks/Products again to toggle Offers (green) or Requests (pink).',
          target: 'feed-filter',
          anchorLabel: pt ? 'Filtro' : 'Filter',
        },
        {
          pose: 'butterflies',
          title: pt ? 'Conquistas em cards' : 'Achievements as cards',
          body: pt
            ? 'Cada card mostra um item concluído. Use 👍 / 👎 para dar feedback, clique para ver provas, fotos e vídeos da entrega.'
            : 'Each card shows a completed item. Use 👍 / 👎 to give feedback, click to see proofs, photos and videos.',
          target: 'feed-list',
          anchorLabel: pt ? 'Cards' : 'Cards',
        },
      ];
    case 'nearby':
      return [
        {
          pose: 'wave',
          title: hello,
          body: pt
            ? 'Aqui você descobre tarefas, produtos e comunidades próximos da sua localização.'
            : 'Here you discover tasks, products and communities near your location.',
        },
        {
          pose: 'thinking',
          title: pt ? 'Filtros' : 'Filters',
          body: pt
            ? 'Filtre por tipo de conteúdo. Clique novamente em Tarefas/Produtos para alternar entre Ofertas e Solicitações.'
            : 'Filter by content type. Click Tasks/Products again to switch between Offers and Requests.',
          target: 'nearby-filter',
          anchorLabel: pt ? 'Filtro' : 'Filter',
        },
        {
          pose: 'explorer',
          title: pt ? 'Mapa interativo' : 'Interactive map',
          body: pt
            ? 'Busque outra cidade ou arraste o mapa para explorar. Os resultados atualizam conforme você navega.'
            : 'Search another city or drag the map to explore. Results refresh as you navigate.',
          target: 'nearby-map',
          anchorLabel: pt ? 'Mapa' : 'Map',
        },
        {
          pose: 'gardener',
          title: pt ? 'Comunidades por perto' : 'Communities nearby',
          body: pt
            ? 'Logo abaixo do mapa aparecem as comunidades da região. Abra uma para conhecer pessoas e ações locais.'
            : 'Right below the map you see communities in the region. Open one to meet local people and actions.',
          target: 'nearby-communities',
          anchorLabel: pt ? 'Comunidades' : 'Communities',
        },
      ];
    case 'mytasks':
      return [
        {
          pose: 'wave',
          title: hello,
          body: pt
            ? 'Este é o seu espaço pessoal: gerencie tudo que você criou — tarefas, produtos, enquetes e tags.'
            : 'This is your personal space: manage everything you created — tasks, products, polls and tags.',
        },
        {
          pose: 'newspaper',
          title: pt ? 'Botões de navegação' : 'Navigation buttons',
          body: pt
            ? 'Use estes botões para alternar entre Tarefas, Produtos, Enquetes, Tags, Calendário e Destaques. Cada um lembra do seu progresso.'
            : 'Use these buttons to switch between Tasks, Products, Polls, Tags, Calendar and Highlights. Each one remembers your progress.',
          target: 'mytasks-tabs',
          anchorLabel: pt ? 'Botões' : 'Buttons',
        },
        {
          pose: 'thinking',
          title: pt ? 'Visualização' : 'View',
          body: pt
            ? 'Aqui aparece o conteúdo da aba selecionada — Plano de Ação, Demandas, Impacto e mais.'
            : 'Here you see the content of the selected tab — Action Plan, Demands, Impact and more.',
          target: 'mytasks-content',
          anchorLabel: pt ? 'Visualização' : 'View',
        },
        {
          pose: 'builder',
          title: pt ? 'Criar tarefa, produto ou enquete' : 'Create a task, product or poll',
          body: pt
            ? 'Toque no realce para abrir o menu + e escolha: Tarefa, Produto ou Enquete. Você também pode editar ou apagar a partir de cada card.'
            : 'Tap the highlight to open the + menu and choose: Task, Product or Poll. You can also edit or delete from each card.',
          target: 'bottomnav-create',
          anchorLabel: pt ? 'Criar (+)' : 'Create (+)',
        },
        {
          pose: 'trophy',
          title: pt ? 'Conquistas e estrelas' : 'Achievements and stars',
          body: pt
            ? 'Concluir tarefas gera moedas e pode dar Estrelas da Sorte. Acompanhe seus destaques e badges por aqui.'
            : 'Completing tasks earns coins and may grant Lucky Stars. Track your highlights and badges right here.',
        },
      ];
  }
}

export function CapyveraGreeting({ section, userName }: CapyveraGreetingProps) {
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

  const steps = useMemo(() => buildSteps(section, language, name), [section, language, name]);

  // Reset step when section or language changes
  useEffect(() => {
    setStepIndex(0);
  }, [section, language]);

  const hidden = dismissed || doneMap[section];
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const currentTarget = !hidden ? currentStep?.target : undefined;

  // Track the highlighted element's position
  useEffect(() => {
    if (!currentTarget) {
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
    update();
    const interval = window.setInterval(update, 250);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [currentTarget, stepIndex]);

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
  };

  const handleFinish = () => {
    const next = { ...doneMap, [section]: true };
    setDoneMap(next);
    try {
      localStorage.setItem(doneKey, JSON.stringify(next));
    } catch {
      /* ignore */
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
      {highlightRect && (
        <button
          type="button"
          onClick={handleHighlightClick}
          aria-label={pt ? `Ir para ${current.anchorLabel || 'destaque'}` : `Go to ${current.anchorLabel || 'highlight'}`}
          className="fixed z-[80] rounded-2xl ring-4 ring-primary ring-offset-2 ring-offset-background transition-all duration-200 animate-pulse motion-reduce:animate-none cursor-pointer bg-transparent border-0 p-0 hover:ring-[6px] focus:outline-none focus-visible:ring-[6px]"
          style={{
            top: Math.max(4, highlightRect.top - 8),
            left: Math.max(4, highlightRect.left - 8),
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
        className={cn(
          'relative flex-1 w-full max-w-full rounded-3xl px-4 py-4 sm:px-5 sm:py-5',
          'bg-card border border-border/40',
          // Claymorphism: layered soft shadows + subtle inner highlight
          'shadow-[0_10px_24px_-12px_hsl(var(--foreground)/0.18),0_4px_10px_-4px_hsl(var(--foreground)/0.10),inset_0_1px_0_hsl(var(--background)/0.6),inset_0_-2px_6px_hsl(var(--foreground)/0.06)]',
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
          <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {pt ? `Passo ${stepIndex + 1} de ${total}` : `Step ${stepIndex + 1} of ${total}`}
          </p>
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
