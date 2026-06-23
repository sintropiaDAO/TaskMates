import { Sparkles, ClipboardList, Package, BarChart3, Users, ChevronDown, Hand } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type ContentFilterValue = 'all' | 'tasks' | 'products' | 'polls' | 'communities';
export type TypeMode = 'all' | 'offer' | 'request';

interface Props {
  value: ContentFilterValue;
  onChange: (v: ContentFilterValue) => void;
  /** Tri-state offer/request cycling. Defaults to 'all'. */
  typeMode?: TypeMode;
  /** Called when user clicks the already-active category (cycles all → offer → request → all). */
  onCycleType?: () => void;
  /** Hide the 'polls' option (e.g. on the Nearby section where polls don't show on map). */
  hidePolls?: boolean;
  /** Show the 'communities' option (off by default; only Nearby uses it). */
  showCommunities?: boolean;
  className?: string;
}

const ICONS: Record<ContentFilterValue, React.ReactNode> = {
  all: <Sparkles className="w-4 h-4" />,
  tasks: <ClipboardList className="w-4 h-4" />,
  products: <Package className="w-4 h-4" />,
  polls: <BarChart3 className="w-4 h-4" />,
  communities: <Users className="w-4 h-4" />,
};

// Which categories support the tri-state cycle.
const CYCLES: Record<ContentFilterValue, boolean> = {
  all: false,
  tasks: true,
  products: true,
  polls: false,
  communities: false,
};

export function ContentFilterDropdown({
  value,
  onChange,
  typeMode = 'all',
  onCycleType,
  hidePolls,
  showCommunities,
  className,
}: Props) {
  const { language } = useLanguage();
  const pt = language === 'pt';

  const labels: Record<ContentFilterValue, string> = {
    all: pt ? 'Todos' : 'All',
    tasks: pt ? 'Tarefas' : 'Tasks',
    products: pt ? 'Produtos' : 'Products',
    polls: pt ? 'Enquetes' : 'Polls',
    communities: pt ? 'Comunidades' : 'Communities',
  };

  const options: ContentFilterValue[] = [
    'all',
    'tasks',
    'products',
    ...(hidePolls ? [] : ['polls' as ContentFilterValue]),
    ...(showCommunities ? ['communities' as ContentFilterValue] : []),
  ];

  const supportsCycle = CYCLES[value] && !!onCycleType;
  const effectiveMode = supportsCycle ? typeMode : 'all';

  const colorClass =
    effectiveMode === 'offer'
      ? 'text-success'
      : effectiveMode === 'request'
      ? 'text-pink-600'
      : 'text-primary';

  const dotClass =
    effectiveMode === 'offer'
      ? 'bg-success'
      : effectiveMode === 'request'
      ? 'bg-pink-600'
      : '';

  const modeLabel =
    effectiveMode === 'offer'
      ? pt ? ' · Ofertas' : ' · Offers'
      : effectiveMode === 'request'
      ? pt ? ' · Solicitações' : ' · Requests'
      : '';

  const handleSelect = (opt: ContentFilterValue) => {
    if (opt === value && CYCLES[opt] && onCycleType) {
      onCycleType();
    } else {
      onChange(opt);
    }
  };

  return (
    <div className={cn('flex justify-end mb-4', className)}>
      <TooltipProvider delayDuration={150}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-pressed={effectiveMode !== 'all'}
                  className="clay bg-card text-card-foreground inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className={colorClass}>{ICONS[value]}</span>
                  <span className={cn(effectiveMode !== 'all' && 'font-semibold', effectiveMode !== 'all' && colorClass)}>
                    {labels[value]}{modeLabel}
                  </span>
                  {dotClass && <span className={cn('w-2 h-2 rounded-full', dotClass)} />}
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px] text-xs">
              {pt
                ? 'Clique novamente em Tarefas ou Produtos para alternar: todos → ofertas (verde) → solicitações (rosa).'
                : 'Click Tasks or Products again to cycle: all → offers (green) → requests (pink).'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="clay bg-card border-0 rounded-2xl p-1.5 min-w-[12rem] z-[1100]"
          >
            {options.map((opt) => {
              const isActive = opt === value;
              const showCycleHint = isActive && CYCLES[opt] && onCycleType;
              return (
                <DropdownMenuItem
                  key={opt}
                  onSelect={(e) => {
                    // Prevent close when cycling, so user can click again to advance.
                    if (isActive && CYCLES[opt] && onCycleType) e.preventDefault();
                    handleSelect(opt);
                  }}
                  className={cn(
                    'rounded-xl gap-2 cursor-pointer px-3 py-2 text-sm flex items-center justify-between',
                    isActive && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn(isActive ? colorClass : 'text-muted-foreground')}>
                      {ICONS[opt]}
                    </span>
                    {labels[opt]}
                  </span>
                  {showCycleHint && (
                    <span className="flex items-center gap-0.5 ml-2">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          effectiveMode === 'all' ? 'bg-muted-foreground/40' : 'bg-muted-foreground/20'
                        )}
                      />
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          effectiveMode === 'offer' ? 'bg-success' : 'bg-success/30'
                        )}
                      />
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          effectiveMode === 'request' ? 'bg-pink-600' : 'bg-pink-600/30'
                        )}
                      />
                      <Sparkles className="w-3 h-3 ml-1 opacity-50" />
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  );
}
