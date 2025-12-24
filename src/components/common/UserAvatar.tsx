import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string;
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  clickable?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10'
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
};

export function UserAvatar({ 
  userId, 
  name, 
  avatarUrl, 
  size = 'md', 
  showName = false,
  clickable = true,
  className 
}: UserAvatarProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (!clickable) return;
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  const initials = name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        clickable && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={handleClick}
    >
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl || undefined} alt={name || ''} />
        <AvatarFallback className={cn("bg-primary/10 text-primary", textSizeClasses[size])}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {showName && name && (
        <span className={cn("font-medium", textSizeClasses[size])}>{name}</span>
      )}
    </div>
  );
}
