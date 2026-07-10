import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface InsertFieldOption {
  key: string;
  label: string;
  description?: string;
}

interface InsertFieldMenuProps {
  options: InsertFieldOption[];
  active: string[];
  onToggle: (key: string) => void;
}

export function InsertFieldMenu({ options, active, onToggle }: InsertFieldMenuProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 rounded-2xl border-dashed border-2 border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary font-semibold gap-2"
        >
          <Plus className="w-4 h-4" />
          {language === 'pt' ? 'Inserir campo' : 'Insert field'}
          {active.length > 0 && (
            <span className="ml-1 text-xs bg-primary/20 rounded-full px-2 py-0.5">{active.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 z-[300]" align="start">
        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
          {language === 'pt' ? 'Adicionar campos ao formulário' : 'Add fields to the form'}
        </div>
        <div className="space-y-1">
          {options.map((opt) => {
            const isActive = active.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={(e) => { e.preventDefault(); onToggle(opt.key); setOpen(false); }}
                className={cn(
                  'w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors',
                  isActive ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5',
                    isActive ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                  )}
                >
                  {isActive && <Check className="w-3 h-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{opt.label}</span>
                  {opt.description && (
                    <span className="block text-xs text-muted-foreground mt-0.5">{opt.description}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
