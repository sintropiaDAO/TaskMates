import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TypeOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  emoji?: string;
  tone: 'green' | 'pink' | 'blue' | 'amber' | 'violet';
}

const TONE_ACTIVE: Record<TypeOption<string>['tone'], string> = {
  green: 'border-success bg-success/10 text-success shadow-[0_4px_12px_-4px_hsl(var(--success)/0.35)]',
  pink: 'border-pink-500 bg-pink-500/10 text-pink-600 shadow-[0_4px_12px_-4px_rgba(236,72,153,0.35)]',
  blue: 'border-blue-500 bg-blue-500/10 text-blue-600 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.35)]',
  amber: 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-[0_4px_12px_-4px_rgba(245,158,11,0.35)]',
  violet: 'border-violet-500 bg-violet-500/10 text-violet-600 shadow-[0_4px_12px_-4px_rgba(139,92,246,0.35)]',
};

interface TypeSelectorProps<T extends string> {
  options: TypeOption<T>[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}

export function TypeSelector<T extends string>({ options, value, onChange, columns = 3 }: TypeSelectorProps<T>) {
  return (
    <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
      {options.map(opt => {
        const isActive = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'group relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 py-3 px-2 transition-all min-w-0',
              'text-muted-foreground hover:text-foreground',
              isActive
                ? TONE_ACTIVE[opt.tone] + ' scale-[1.02]'
                : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-8 h-8 rounded-xl transition-all',
              isActive ? 'bg-background/70' : 'bg-muted/50 group-hover:bg-muted'
            )}>
              {opt.emoji ? (
                <span className="text-lg leading-none">{opt.emoji}</span>
              ) : Icon ? (
                <Icon className="w-4 h-4" />
              ) : null}
            </span>
            <span className="text-[11px] font-semibold leading-tight truncate w-full text-center">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
