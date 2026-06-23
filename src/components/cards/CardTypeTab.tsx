import { Sparkles, Hand, User, ClipboardList, Package, BarChart3, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type CardKind = 'task' | 'product' | 'poll';
export type CardType = 'offer' | 'request' | 'personal' | null;

interface CardTypeTabProps {
  kind: CardKind;
  type: CardType;
  className?: string;
}

/**
 * "Folder tab" header sitting at the top of every dashboard card.
 * Replaces the old colored top border by carrying type + kind labels
 * (Oferta · Tarefa, Solicitação · Produto, etc.) on a full-width
 * colored strip.
 */
export function CardTypeTab({ kind, type, className }: CardTypeTabProps) {
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
    bg = 'bg-success';
    TypeIcon = Sparkles;
    typeLabel = pt ? 'Oferta' : 'Offer';
  } else if (type === 'request') {
    bg = 'bg-pink-600';
    TypeIcon = Hand;
    typeLabel = pt ? 'Solicitação' : 'Request';
  } else if (type === 'personal') {
    bg = 'bg-blue-500';
    TypeIcon = User;
    typeLabel = pt ? 'Pessoal' : 'Personal';
  }

  return (
    <div
      role="presentation"
      aria-label={typeLabel ? `${typeLabel}: ${kindLabel}` : kindLabel}
      className={cn(
        '-mx-5 -mt-5 mb-3 px-4 py-1.5 flex items-center gap-2 text-white text-xs font-bold tracking-wide rounded-t-xl shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)]',
        bg,
        className
      )}
    >
      <TypeIcon className="w-3.5 h-3.5 flex-shrink-0" />
      {typeLabel && (
        <>
          <span>{typeLabel}</span>
          <span className="opacity-60">·</span>
        </>
      )}
      <KindIcon className="w-3.5 h-3.5 opacity-80" />
      <span className="opacity-95">{kindLabel}</span>
    </div>
  );
}
