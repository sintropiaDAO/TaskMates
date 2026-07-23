import { useState } from 'react';
import { Sparkles, Eye, Clock, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useCoins } from '@/hooks/useCoins';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HighlightButtonProps {
  targetId: string;
  targetType: 'task' | 'product' | 'poll';
  /** @deprecated mantido por compatibilidade — agora qualquer usuário pode destacar */
  isOwner?: boolean;
}

const TYPE_LABELS = {
  task: { pt: 'tarefa', en: 'task', ptCap: 'Tarefa', enCap: 'Task' },
  product: { pt: 'produto', en: 'product', ptCap: 'Produto', enCap: 'Product' },
  poll: { pt: 'opinião', en: 'poll', ptCap: 'Opinião', enCap: 'Poll' },
} as const;

export function HighlightButton({ targetId, targetType }: HighlightButtonProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { getBalance, highlightTask, highlightProduct, highlightPoll } = useCoins();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const availableStars = getBalance('LUCKY_STARS');
  const labels = TYPE_LABELS[targetType];
  const labelPt = labels.pt;
  const labelEn = labels.en;
  const insufficient = availableStars < 1;

  const handleHighlight = async () => {
    setLoading(true);
    const fn = targetType === 'task' ? highlightTask : targetType === 'product' ? highlightProduct : highlightPoll;
    const result = await fn(targetId);
    setLoading(false);
    setShowConfirm(false);

    if (result) {
      toast({
        title: language === 'pt' ? `⭐ ${labels.ptCap} em destaque!` : `⭐ ${labels.enCap} highlighted!`,
        description: language === 'pt'
          ? `Vai aparecer no topo dos feeds e listagens por 7 dias.`
          : `It will appear at the top of feeds and listings for 7 days.`,
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
        className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-900 dark:hover:bg-purple-950"
        onClick={() => setShowConfirm(true)}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {language === 'pt' ? 'Destacar' : 'Highlight'}
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {language === 'pt' ? `Destacar ${labelPt}` : `Highlight ${labelEn}`}
            </DialogTitle>
          </DialogHeader>

          {/* Explicação prática — o que acontece */}
          <div className="space-y-3 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/60 dark:bg-purple-950/30 p-4">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
              {language === 'pt' ? 'O que acontece ao destacar:' : 'What happens when you highlight:'}
            </p>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 mt-0.5 text-purple-600 dark:text-purple-300 flex-shrink-0" />
                <span>
                  {language === 'pt'
                    ? <>Aparece <b>no topo</b> dos feeds e listagens da plataforma.</>
                    : <>Appears <b>at the top</b> of platform feeds and listings.</>}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Eye className="w-4 h-4 mt-0.5 text-purple-600 dark:text-purple-300 flex-shrink-0" />
                <span>
                  {language === 'pt'
                    ? <>Recebe um <b>selo visual roxo</b> ✨ para chamar atenção.</>
                    : <>Gets a <b>purple visual badge</b> ✨ to grab attention.</>}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-purple-600 dark:text-purple-300 flex-shrink-0" />
                <span>
                  {language === 'pt'
                    ? <>Fica destacado por <b>7 dias</b> a partir de agora.</>
                    : <>Stays highlighted for <b>7 days</b> from now.</>}
                </span>
              </li>
            </ul>
          </div>

          {/* Bloco separado: saldo */}
          <div className={cn(
            "flex items-center justify-between rounded-lg border p-3",
            insufficient
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-muted/40"
          )}>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {language === 'pt' ? 'Seu saldo' : 'Your balance'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className={cn("w-4 h-4", insufficient ? "text-destructive" : "text-purple-500")} />
              <span className={cn("text-sm font-semibold", insufficient && "text-destructive")}>
                {availableStars} {language === 'pt' ? (availableStars === 1 ? 'estrela' : 'estrelas') : (availableStars === 1 ? 'star' : 'stars')}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {language === 'pt' ? '· custo: 1' : '· cost: 1'}
              </span>
            </div>
          </div>

          {insufficient && (
            <p className="text-xs text-destructive -mt-1">
              {language === 'pt'
                ? 'Saldo insuficiente. Conclua tarefas para ganhar Estrelas da Sorte.'
                : 'Insufficient balance. Complete tasks to earn Lucky Stars.'}
            </p>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              onClick={handleHighlight}
              disabled={loading || insufficient}
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
