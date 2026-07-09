import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ClayCardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section';
  padding?: 'sm' | 'md' | 'lg';
}

export const ClayCard = forwardRef<HTMLDivElement, ClayCardProps>(
  ({ className, padding = 'md', ...rest }, ref) => {
    const pad = padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-6' : 'p-4';
    return (
      <div ref={ref} className={cn('clay-panel', pad, className)} {...rest} />
    );
  }
);
ClayCard.displayName = 'ClayCard';
