import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/star-rating';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => void;
  userName: string;
  userAvatar: string | null;
  userRole: 'collaborator' | 'requester' | 'owner';
  submitting?: boolean;
}

export function RatingModal({
  isOpen,
  onClose,
  onSubmit,
  userName,
  userAvatar,
  userRole,
  submitting = false,
}: RatingModalProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const getRoleLabel = () => {
    switch (userRole) {
      case 'collaborator':
        return t('taskCollaborators');
      case 'requester':
        return t('taskRequesters');
      case 'owner':
        return t('rateTaskOwner');
    }
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit(rating, comment.trim() || undefined);
    // Reset state
    setRating(0);
    setComment('');
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rateUser')}</DialogTitle>
          <DialogDescription>
            {t('rateUserDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={userAvatar || ''} />
            <AvatarFallback className="text-xl">
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="font-medium text-lg">{userName}</p>
            <p className="text-sm text-muted-foreground">{getRoleLabel()}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <StarRating
              rating={rating}
              size="lg"
              interactive
              onRatingChange={setRating}
            />
            <p className="text-sm text-muted-foreground">
              {rating === 0 ? t('selectRating') : `${rating} ${rating === 1 ? t('star') : t('stars')}`}
            </p>
          </div>

          <div className="w-full space-y-2">
            <Label htmlFor="comment">{t('ratingCommentOptional')}</Label>
            <Textarea
              id="comment"
              placeholder={t('ratingCommentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || submitting}
          >
            {submitting ? t('sending') : t('submitRating')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
