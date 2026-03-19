import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useCoins } from '@/hooks/useCoins';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface HighlightButtonProps {
  targetId: string;
  targetType: 'task' | 'product';
  isOwner: boolean;
}

export function HighlightButton({ targetId, targetType, isOwner }: HighlightButtonProps) {
  const { language } = useLanguage();
  const { getBalance, highlightTask, highlightProduct } = useCoins();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOwner) return null;

  const availableStars = getBalance('LUCKY_STARS');
  const labelPt = targetType === 'task' ? 'Tarefa' : 'Produto';
  const labelEn = targetType === 'task' ? 'Task' : 'Product';

  const handleHighlight = async () => {
    setLoading(true);
    const fn = targetType === 'task' ? highlightTask : highlightProduct;
    const result = await fn(targetId);
    setLoading(false);
    setShowConfirm(false);

    if (result) {
      toast({
        title: language === 'pt' ? `⭐ ${labelPt} destacado(a)!` : `⭐ ${labelEn} highlighted!`,
        description: language === 'pt'
          ? `Ficará em destaque por 1 semana.`
          : `It will be highlighted for 1 week.`,
      });
    } else {
      toast({
        title: language === 'pt' ? 'Erro' : 'Error',
        description: language === 'pt'
          ? 'Não foi possível destacar. Verifique seu saldo de estrelas.'
          : 'Could not highlight. Check your star balance.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-purple-500 border-purple-200 hover:bg-purple-50"
        onClick={() => setShowConfirm(true)}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {language === 'pt' ? 'Destacar' : 'Highlight'}
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {language === 'pt' ? `Destacar ${labelPt}` : `Highlight ${labelEn}`}
            </DialogTitle>
            <DialogDescription>
              {language === 'pt'
                ? `Use 1 Estrela da Sorte para destacar por 1 semana. Você tem ${availableStars} estrela(s) disponível(is).`
                : `Use 1 Lucky Star to highlight for 1 week. You have ${availableStars} star(s) available.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              onClick={handleHighlight}
              disabled={loading || availableStars < 1}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {loading
                ? (language === 'pt' ? 'Destacando...' : 'Highlighting...')
                : (language === 'pt' ? 'Usar 1 Estrela' : 'Use 1 Star')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
