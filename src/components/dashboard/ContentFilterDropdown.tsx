import { Sparkles, ClipboardList, Package, BarChart3, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type ContentFilterValue = 'all' | 'tasks' | 'products' | 'polls';

interface Props {
  value: ContentFilterValue;
  onChange: (v: ContentFilterValue) => void;
  /** Hide the 'polls' option (e.g. on the Nearby section where polls don't show on map). */
  hidePolls?: boolean;
  className?: string;
}

const ICONS: Record<ContentFilterValue, React.ReactNode> = {
  all: <Sparkles className="w-4 h-4" />,
  tasks: <ClipboardList className="w-4 h-4" />,
  products: <Package className="w-4 h-4" />,
  polls: <BarChart3 className="w-4 h-4" />,
};

export function ContentFilterDropdown({ value, onChange, hidePolls, className }: Props) {
  const { language } = useLanguage();

  const labels: Record<ContentFilterValue, string> = {
    all: language === 'pt' ? 'Todos' : 'All',
    tasks: language === 'pt' ? 'Tarefas' : 'Tasks',
    products: language === 'pt' ? 'Produtos' : 'Products',
    polls: language === 'pt' ? 'Enquetes' : 'Polls',
  };

  const options: ContentFilterValue[] = hidePolls
    ? ['all', 'tasks', 'products']
    : ['all', 'tasks', 'products', 'polls'];

  return (
    <div className={cn('flex justify-end mb-4', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="clay bg-card text-card-foreground inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="text-primary">{ICONS[value]}</span>
            <span>{labels[value]}</span>
            <ChevronDown className="w-4 h-4 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="clay bg-card border-0 rounded-2xl p-1.5 min-w-[10rem] z-[1000]">
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt}
              onClick={() => onChange(opt)}
              className={cn(
                'rounded-xl gap-2 cursor-pointer px-3 py-2 text-sm',
                value === opt && 'bg-primary/10 text-primary font-medium'
              )}
            >
              <span className={cn(value === opt ? 'text-primary' : 'text-muted-foreground')}>
                {ICONS[opt]}
              </span>
              {labels[opt]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
