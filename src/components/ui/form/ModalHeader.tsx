import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: 'primary' | 'blue' | 'pink' | 'amber' | 'violet';
}

const TONES: Record<NonNullable<ModalHeaderProps['tone']>, string> = {
  primary: 'bg-primary/15 text-primary',
  blue: 'bg-blue-500/15 text-blue-500',
  pink: 'bg-pink-500/15 text-pink-500',
  amber: 'bg-amber-500/15 text-amber-500',
  violet: 'bg-violet-500/15 text-violet-500',
};

export function ModalHeader({ icon: Icon, title, subtitle, tone = 'primary' }: ModalHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 clay-tag', TONES[tone])}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
