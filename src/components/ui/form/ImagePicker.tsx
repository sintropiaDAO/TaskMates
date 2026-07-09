import { useRef, ReactNode } from 'react';
import { Image as ImageIcon, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ImagePickerProps {
  preview: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  maxSizeMB?: number;
  helper?: ReactNode;
}

export function ImagePicker({ preview, onFile, onClear, maxSizeMB = 5, helper }: ImagePickerProps) {
  const { language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) return;
    onFile(file);
    e.target.value = '';
  };

  return (
    <div className="min-w-0">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted/20">
          <img src={preview} alt="Preview" className="w-full h-36 object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
            onClick={onClear}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-2 h-28 rounded-2xl',
            'border-2 border-dashed border-primary/30 bg-primary/[0.04]',
            'hover:border-primary/60 hover:bg-primary/10 transition-all'
          )}
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary">
            <Upload className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold text-foreground/80">
            {language === 'pt' ? 'Adicionar imagem' : 'Add image'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {helper ?? (language === 'pt' ? `PNG, JPG até ${maxSizeMB}MB` : `PNG, JPG up to ${maxSizeMB}MB`)}
          </span>
        </button>
      )}
    </div>
  );
}
