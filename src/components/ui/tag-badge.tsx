import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  category?: 'skills' | 'communities';
  onRemove?: () => void;
  onClick?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
}

export function TagBadge({ 
  name, 
  category, 
  onRemove, 
  onClick, 
  selected,
  size = 'md' 
}: TagBadgeProps) {
  const isSkill = category === 'skills';
  
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-all",
        size === 'sm' ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        onClick && "cursor-pointer hover:scale-105",
        selected
          ? isSkill
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
          : isSkill
            ? "bg-primary/10 text-primary hover:bg-primary/20"
            : "bg-secondary/10 text-secondary hover:bg-secondary/20"
      )}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 rounded-full p-0.5 hover:bg-background/20"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
