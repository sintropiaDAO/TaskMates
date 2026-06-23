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
  const key = `${DONE_KEY}:${userId ?? 'anon'}`;
  try {
    const raw = localStorage.getItem(key);
    const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    delete map[section];
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
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
            ? 'Use o filtro no topo para alternar entre Tudo, Tarefas, Produtos, Enquetes e Comunidades. Assim você foca no que mais te interessa agora.'
            : 'Use the filter at the top to switch between All, Tasks, Products, Polls and Communities — focus on what matters to you right now.',
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
          pose: 'butterflies',
          title: pt ? 'O que aparece aqui' : "What's shown here",
          body: pt
            ? 'Tarefas concluídas, produtos entregues e enquetes encerradas viram cartões no feed. Use 👍 / 👎 para dar feedback ao autor.'
            : 'Completed tasks, delivered products and closed polls become feed cards. Use 👍 / 👎 to give feedback to the author.',
        },
        {
          pose: 'newspaper',
          title: pt ? 'Filtros e galeria' : 'Filters and gallery',
          body: pt
            ? 'Filtre por tipo de conteúdo no topo. Itens com mídia aparecem em galeria — clique para ampliar provas, fotos e vídeos.'
            : 'Filter by content type at the top. Items with media appear in a gallery — click to expand proofs, photos and videos.',
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
          pose: 'explorer',
          title: pt ? 'Mapa interativo' : 'Interactive map',
          body: pt
            ? 'Use o mapa para buscar outra cidade ou arrastar para explorar. Os resultados atualizam conforme você navega.'
            : 'Use the map to search another city or drag to explore. Results refresh as you navigate.',
        },
        {
          pose: 'gardener',
          title: pt ? 'Comunidades por perto' : 'Communities nearby',
          body: pt
            ? 'Logo abaixo do mapa aparecem as comunidades da região. Abra uma para conhecer pessoas e ações locais.'
            : 'Right below the map you see communities in the region. Open one to meet local people and actions.',
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
          title: pt ? 'Abas e organização' : 'Tabs and organization',
          body: pt
            ? 'Use as abas para alternar entre Tarefas, Produtos, Enquetes e Tags. Cada aba lembra do seu progresso e mostra novidades.'
            : 'Use the tabs to switch between Tasks, Products, Polls and Tags. Each tab remembers your progress and shows what is new.',
        },
        {
          pose: 'builder',
          title: pt ? 'Criar e editar' : 'Create and edit',
          body: pt
            ? 'Toque no botão + da barra inferior para criar novos itens. Em cada card você pode editar, completar ou apagar.'
            : 'Tap the + button in the bottom bar to create new items. On each card you can edit, complete or delete.',
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

  const steps = useMemo(() => buildSteps(section, language, name), [section, language, name]);

  // Reset step when section or language changes
  useEffect(() => {
    setStepIndex(0);
  }, [section, language]);

  if (dismissed || doneMap[section]) return null;

  const total = steps.length;
  const current = steps[Math.min(stepIndex, total - 1)];
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

  return (
    <div
      className="flex items-start gap-3 sm:gap-5 animate-fade-in motion-reduce:animate-none"
      role="region"
      aria-label={pt ? 'Tutorial da CapyVera' : 'CapyVera tutorial'}
    >
      <div className="shrink-0 -mb-2 hidden xs:block sm:block">
        <Capyvera pose={current.pose} size="md" loading="eager" />
      </div>
      <div className="shrink-0 -mb-2 block sm:hidden">
        <Capyvera pose={current.pose} size="sm" loading="eager" />
      </div>

      <div
        className={cn(
          'relative flex-1 rounded-3xl px-4 py-4 sm:px-5 sm:py-5',
          'bg-card border border-border/40',
          // Claymorphism: layered soft shadows + subtle inner highlight
          'shadow-[0_10px_24px_-12px_hsl(var(--foreground)/0.18),0_4px_10px_-4px_hsl(var(--foreground)/0.10),inset_0_1px_0_hsl(var(--background)/0.6),inset_0_-2px_6px_hsl(var(--foreground)/0.06)]',
        )}
        role="status"
        aria-live="polite"
      >
        {/* Speech bubble tail */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -left-2 top-6 h-4 w-4 rotate-45',
            'bg-card border-l border-b border-border/40',
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
  );
}
