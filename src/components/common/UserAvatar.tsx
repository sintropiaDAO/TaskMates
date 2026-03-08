import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { BadgeCheck } from 'lucide-react';

interface UserAvatarProps {
  userId: string;
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  clickable?: boolean;
  isVerified?: boolean;
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

const badgeSizeClasses = {
  sm: 'w-3 h-3 -bottom-0.5 -right-0.5',
  md: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
  lg: 'w-4 h-4 -bottom-0.5 -right-0.5'
};

export function UserAvatar({ 
  userId, 
  name, 
  avatarUrl, 
  size = 'md', 
  showName = false,
  clickable = true,
  isVerified = false,
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
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={avatarUrl || undefined} alt={name || ''} />
          <AvatarFallback className={cn("bg-primary/10 text-primary", textSizeClasses[size])}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {isVerified && (
          <BadgeCheck className={cn("absolute text-primary fill-background", badgeSizeClasses[size])} />
        )}
      </div>
      {showName && name && (
        <span className={cn("font-medium", textSizeClasses[size])}>{name}</span>
      )}
    </div>
  );
}
