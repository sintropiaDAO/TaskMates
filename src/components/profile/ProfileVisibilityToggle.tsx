import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfileVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
  className?: string;
}

export function ProfileVisibilityToggle({ visible, onToggle, className = '' }: ProfileVisibilityToggleProps) {
  const { language } = useLanguage();

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`h-7 px-2 text-xs gap-1 ${visible ? 'text-primary' : 'text-muted-foreground'} ${className}`}
          >
            {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {visible
              ? (language === 'pt' ? 'No Perfil' : 'On Profile')
              : (language === 'pt' ? 'Inserir no Perfil' : 'Add to Profile')}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center">
          <p className="text-xs">
            {visible
              ? (language === 'pt' ? 'Visível no seu perfil público' : 'Visible on your public profile')
              : (language === 'pt' ? 'Clique para exibir no perfil público' : 'Click to show on public profile')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
