import { Sparkles, Hand, User, ClipboardList, Package, BarChart3, EyeOff, CheckCircle, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type CardKind = 'task' | 'product' | 'poll';
export type CardType = 'offer' | 'request' | 'personal' | null;

interface CardTypeTabProps {
  kind: CardKind;
  type: CardType;
  className?: string;
  /** Renders the tab in a desaturated/inactive style (used in the Completed feed). */
  muted?: boolean;
  /** Appends a completion status to the kind label (e.g. "Tarefa Concluída"). */
  completed?: boolean;
  /** Marks card as private — prepends "Privado" + icon and uses lighter pink/green tones. */
  hidden?: boolean;
}

/**
 * "Folder tab" header sitting at the top of every dashboard card.
 */
export function CardTypeTab({ kind, type, className, muted = false, completed = false, hidden = false }: CardTypeTabProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';

  // Completed labels use an outline CheckCircle icon instead of the ✅ emoji.
  const kindLabel = completed
    ? (kind === 'task' ? (pt ? 'Tarefa Concluída' : 'Task Completed')
      : kind === 'product' ? (pt ? 'Produto Entregue' : 'Product Delivered')
      : (pt ? 'Opinião Encerrada' : 'Poll Closed'))
    : (kind === 'task' ? (pt ? 'Tarefa' : 'Task')
      : kind === 'product' ? (pt ? 'Produto' : 'Product')
      : (pt ? 'Opinião' : 'Poll'));

  const KindIcon: LucideIcon =
    kind === 'task' ? ClipboardList
    : kind === 'product' ? Package
    : BarChart3;

  let bg = 'bg-info';
  let TypeIcon: LucideIcon = BarChart3;
  let typeLabel = '';

  if (type === 'offer') {
    bg = muted
      ? 'bg-success/40'
      : hidden ? 'bg-green-300' : 'bg-success';
    TypeIcon = Sparkles;
    typeLabel = pt ? 'Oferta' : 'Offer';
  } else if (type === 'request') {
    bg = muted
      ? 'bg-pink-600/40'
      : hidden ? 'bg-pink-300' : 'bg-pink-600';
    TypeIcon = Hand;
    typeLabel = pt ? 'Solicitação' : 'Request';
  } else if (type === 'personal') {
    bg = muted ? 'bg-blue-500/40' : 'bg-blue-500';
    TypeIcon = User;
    typeLabel = pt ? 'Pessoal' : 'Personal';
  } else if (muted) {
    bg = 'bg-muted';
  }

  // For lighter hidden backgrounds, use dark text instead of white for legibility.
  const textColor = muted
    ? 'text-muted-foreground'
    : hidden && (type === 'offer' || type === 'request')
      ? 'text-foreground/80'
      : 'text-white';

  const hiddenLabel = pt ? 'Privado' : 'Private';

  return (
    <div
      role="presentation"
      aria-label={`${hidden ? hiddenLabel + ' · ' : ''}${typeLabel ? typeLabel + ': ' : ''}${kindLabel}`}
      className={cn(
        '-mx-5 -mt-5 mb-3 px-4 py-1.5 flex items-center gap-2 text-xs font-bold tracking-wide rounded-t-xl overflow-hidden',
        muted
          ? 'shadow-[0_2px_4px_rgba(0,0,0,0.12),inset_0_-2px_3px_-2px_rgba(0,0,0,0.10)] grayscale-[0.4]'
          : 'shadow-[0_3px_5px_-2px_rgba(0,0,0,0.15),inset_0_-3px_4px_-2px_rgba(0,0,0,0.18),inset_0_1.5px_0_rgba(255,255,255,0.35)]',
        bg,
        textColor,
        className
      )}
    >
      {hidden && (
        <>
          <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span className={cn(!muted && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]')}>{hiddenLabel}</span>
          <span className="opacity-60">·</span>
        </>
      )}
      {!completed && (
        <>
          <TypeIcon className={cn('w-3.5 h-3.5 flex-shrink-0', !muted && !hidden && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]')} />
          {typeLabel && (
            <>
              <span className={cn(!muted && !hidden && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]')}>{typeLabel}</span>
              <span className="opacity-60">·</span>
            </>
          )}
        </>
      )}
      {completed ? (
        <CheckCircle className={cn('w-3.5 h-3.5 flex-shrink-0 opacity-90', !muted && !hidden && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]')} />
      ) : (
        <KindIcon className="w-3.5 h-3.5 opacity-90" />
      )}
      <span className="opacity-95">{kindLabel}</span>
    </div>
  );
}
