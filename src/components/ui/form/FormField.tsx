import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClayCard } from './ClayCard';

interface FormFieldProps {
  label: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function FormField({ label, icon: Icon, hint, required, children, footer, className, action }: FormFieldProps) {
  return (
    <ClayCard className={cn('space-y-2.5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <span className="w-7 h-7 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </span>
          )}
          <label className="text-sm font-semibold text-foreground/90 truncate">
            {label}
            {required && <span className="text-primary ml-0.5">*</span>}
          </label>
        </div>
        {action}
      </div>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      <div>{children}</div>
      {footer && <div className="pt-2 border-t border-border/50">{footer}</div>}
    </ClayCard>
  );
}
