import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export function JourneyCoverPicker({ imageUrl, onChange, disabled }: {
  imageUrl: string | null;
  onChange: (file: File | null, preview: string | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { language } = useLanguage();
  const { toast } = useToast();
  const pt = language === 'pt';
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const select = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: pt ? 'Escolha PNG, JPG ou WEBP de até 5 MB.' : 'Choose PNG, JPG or WEBP up to 5 MB.', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(1200 / bitmap.width, 630 / bitmap.height);
      const w = bitmap.width * scale, h = bitmap.height * scale;
      ctx.drawImage(bitmap, (1200 - w) / 2, (630 - h) / 2, w, h);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image conversion failed')), 'image/jpeg', 0.85));
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      onChange(new File([blob], 'journey-cover.jpg', { type: 'image/jpeg' }), objectUrl.current);
    } catch {
      toast({ title: pt ? 'Não foi possível abrir essa imagem.' : 'Could not open this image.', variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  return <div className="space-y-2">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label={pt ? 'Imagem de capa' : 'Cover image'} className="hidden" disabled={disabled || processing}
      onChange={e => { const file = e.target.files?.[0]; if (file) void select(file); e.target.value = ''; }} />
    {imageUrl && <img src={imageUrl} alt={pt ? 'Prévia da capa' : 'Cover preview'} className="w-full aspect-[1200/630] object-contain rounded-lg bg-muted/30" />}
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" disabled={disabled || processing} onClick={() => input.current?.click()}>
        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
        {imageUrl ? (pt ? 'Trocar capa' : 'Change cover') : (pt ? 'Adicionar capa' : 'Add cover')}
      </Button>
      {imageUrl && <Button type="button" variant="ghost" size="icon" disabled={disabled || processing} aria-label={pt ? 'Remover capa' : 'Remove cover'} title={pt ? 'Remover capa' : 'Remove cover'} onClick={() => onChange(null, null)}><X className="w-4 h-4" /></Button>}
      <span className="text-xs text-muted-foreground">PNG, JPG, WEBP · 5 MB</span>
    </div>
  </div>;
}