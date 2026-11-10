import { Heart } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/contexts/LanguageContext';

export function NurtureLifeAgreement({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4 text-left">
      <h1 id="access-title" className="flex items-center justify-center gap-2 text-center text-2xl font-bold text-foreground"><Heart className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />{t('authNurtureLifeTitle')}</h1>
      <p className="text-base leading-relaxed text-foreground">{t('authNurtureLifeDescription')}</p>
      <RadioGroup value={value || ''} onValueChange={onChange} className="grid grid-cols-2 gap-3">
        <Label htmlFor="agree-yes" className="adventure-choice flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-base has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
          <RadioGroupItem value="yes" id="agree-yes" />{t('yes')}
        </Label>
        <Label htmlFor="agree-no" className="adventure-choice flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-base has-[[data-state=checked]]:border-destructive has-[[data-state=checked]]:bg-destructive/10">
          <RadioGroupItem value="no" id="agree-no" />{t('no')}
        </Label>
      </RadioGroup>
      {value === 'no' && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">{t('authNurtureLifeRejected')}</p>}
    </div>
  );
}