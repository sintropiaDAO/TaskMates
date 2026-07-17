import { Plus, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-11 rounded-2xl border-dashed border-2 border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary font-semibold gap-2"
      >
        <Plus className="w-4 h-4" />
        {language === 'pt' ? 'Inserir campo' : 'Insert field'}
        {active.length > 0 && (
          <span className="ml-1 text-xs bg-primary/20 rounded-full px-2 py-0.5">{active.length}</span>
        )}
        <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', open && 'rotate-180')} />
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/[0.03] p-2 space-y-1">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">
                {language === 'pt' ? 'Adicionar campos ao formulário' : 'Add fields to the form'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {options.map((opt) => {
                  const isActive = active.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={(e) => { e.preventDefault(); onToggle(opt.key); }}
                      className={cn(
                        'w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors',
                        isActive ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60 bg-background/60'
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
