import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface ProductQuantityModalProps {
  open: boolean;
  onClose: () => void;
  maxQuantity: number;
  onConfirm: (quantity: number) => Promise<void>;
}

export function ProductQuantityModal({ open, onClose, maxQuantity, onConfirm }: ProductQuantityModalProps) {
  const { language } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (quantity < 1 || quantity > maxQuantity) return;
    setLoading(true);
    await onConfirm(quantity);
    setLoading(false);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{language === 'pt' ? 'Indicar Quantidade' : 'Specify Quantity'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{language === 'pt' ? 'Quantidade' : 'Quantity'}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={e => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <Button variant="outline" size="sm" onClick={() => setQuantity(maxQuantity)}>
                {language === 'pt' ? 'Total' : 'All'} ({maxQuantity})
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'pt' ? `Disponível: ${maxQuantity}` : `Available: ${maxQuantity}`}
            </p>
          </div>
          <Button onClick={handleConfirm} disabled={loading || quantity < 1 || quantity > maxQuantity} className="w-full">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {language === 'pt' ? 'Confirmar' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
