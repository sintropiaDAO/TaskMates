import { Sparkles, Hand, User, ClipboardList, Package, BarChart3, type LucideIcon } from 'lucide-react';
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
}

/**
 * "Folder tab" header sitting at the top of every dashboard card.
 * Replaces the old colored top border by carrying type + kind labels
 * (Oferta · Tarefa, Solicitação · Produto, etc.) on a full-width
 * colored strip.
 */
export function CardTypeTab({ kind, type, className, muted = false }: CardTypeTabProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';

  const kindLabel =
    kind === 'task' ? (pt ? 'Tarefa' : 'Task')
    : kind === 'product' ? (pt ? 'Produto' : 'Product')
    : (pt ? 'Enquete' : 'Poll');

  const KindIcon: LucideIcon =
    kind === 'task' ? ClipboardList
    : kind === 'product' ? Package
    : BarChart3;

  let bg = 'bg-info';
  let TypeIcon: LucideIcon = BarChart3;
  let typeLabel = '';

  if (type === 'offer') {
    bg = muted ? 'bg-success/40' : 'bg-success';
    TypeIcon = Sparkles;
    typeLabel = pt ? 'Oferta' : 'Offer';
  } else if (type === 'request') {
    bg = muted ? 'bg-pink-600/40' : 'bg-pink-600';
    TypeIcon = Hand;
    typeLabel = pt ? 'Solicitação' : 'Request';
  } else if (type === 'personal') {
    bg = muted ? 'bg-blue-500/40' : 'bg-blue-500';
    TypeIcon = User;
    typeLabel = pt ? 'Pessoal' : 'Personal';
  } else if (muted) {
    bg = 'bg-muted';
  }

  return (
    <div
      role="presentation"
      aria-label={typeLabel ? `${typeLabel}: ${kindLabel}` : kindLabel}
      className={cn(
        '-mx-5 -mt-5 mb-3 px-4 py-1.5 flex items-center gap-2 text-xs font-bold tracking-wide rounded-t-xl',
        muted
          ? 'text-muted-foreground shadow-[inset_0_-2px_3px_-2px_rgba(0,0,0,0.10)] grayscale-[0.4]'
          : 'text-white shadow-[inset_0_-3px_4px_-2px_rgba(0,0,0,0.18),inset_0_1.5px_0_rgba(255,255,255,0.35)]',
        bg,
        className
      )}
    >
      <TypeIcon className={cn('w-3.5 h-3.5 flex-shrink-0', !muted && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]')} />
      {typeLabel && (
        <>
          <span className={cn(!muted && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]')}>{typeLabel}</span>
          <span className="opacity-60">·</span>
        </>
      )}
      <KindIcon className="w-3.5 h-3.5 opacity-90" />
      <span className="opacity-95">{kindLabel}</span>
    </div>
  );
}
