import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download, BadgeCheck, Pencil, Trash2, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { removeAccents } from '@/lib/stringUtils';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function useResolvedAttachmentUrl(rawUrl?: string | null) {
  const [url, setUrl] = useState<string | null>(rawUrl ?? null);
  useEffect(() => {
    if (!rawUrl) { setUrl(null); return; }
    const match = rawUrl.match(/^supabase-storage:\/\/([^/]+)\/(.+)$/);
    if (!match) { setUrl(rawUrl); return; }
    const [, bucket, path] = match;
    let cancelled = false;
    supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [rawUrl]);
  return url;
}


interface ChatMessageProps {
  message: Message;
  highlightText?: string;
  onEdit?: (messageId: string, content: string) => Promise<boolean> | void;
  onDelete?: (messageId: string) => Promise<boolean> | void;
}

function HighlightedText({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight?.trim() || !text) {
    return <>{text}</>;
  }

  const normalizedHighlight = removeAccents(highlight.toLowerCase().trim());
  const normalizedText = removeAccents(text.toLowerCase());
  
  const parts: { text: string; isMatch: boolean }[] = [];
  let lastIndex = 0;
  let searchIndex = 0;
  
  while ((searchIndex = normalizedText.indexOf(normalizedHighlight, lastIndex)) !== -1) {
    if (searchIndex > lastIndex) {
      parts.push({ text: text.slice(lastIndex, searchIndex), isMatch: false });
    }
    parts.push({ 
      text: text.slice(searchIndex, searchIndex + highlight.length), 
      isMatch: true 
    });
    lastIndex = searchIndex + highlight.length;
  }
  
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMatch: false });
  }
  
  if (parts.length === 0) {
    return <>{text}</>;
  }
  
  return (
    <>
      {parts.map((part, i) => 
        part.isMatch ? (
          <mark key={i} className="bg-accent text-accent-foreground rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

export function ChatMessage({ message, highlightText, onEdit, onDelete }: ChatMessageProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isOwn = message.sender_id === user?.id;
  const attachmentUrl = useResolvedAttachmentUrl(message.attachment_url);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content || '');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const wasEdited = !!message.updated_at &&
    new Date(message.updated_at).getTime() - new Date(message.created_at).getTime() > 2000;

  const saveEdit = async () => {
    const value = draft.trim();
    if (!value || value === message.content) { setIsEditing(false); return; }
    await onEdit?.(message.id, value);
    setIsEditing(false);
  };


  return (
    <div
      className={cn(
        'flex gap-2 mb-3',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isOwn && (
        <UserAvatar
          userId={message.sender_id}
          avatarUrl={message.sender?.avatar_url}
          name={message.sender?.full_name}
          size="sm"
        />
      )}
      
      <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            {message.sender?.full_name || 'Usuário'}
            {message.sender?.is_verified && <BadgeCheck className="w-3 h-3 text-primary" />}
          </span>
        )}
        
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          )}
        >
          {/* Attachment */}
          {message.attachment_url && attachmentUrl && (
            <div className="mb-2">
              {message.attachment_type === 'image' ? (
                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={attachmentUrl}
                    alt={message.attachment_name || t('chatAttachment')}
                    className="max-w-full rounded-lg max-h-48 object-cover"
                  />
                </a>
              ) : (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"

                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg',
                    isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'
                  )}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm flex-1 truncate">
                    <HighlightedText 
                      text={message.attachment_name || t('chatAttachment')} 
                      highlight={highlightText}
                    />
                  </span>
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="text-sm bg-background text-foreground resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit(); }
                  if (e.key === 'Escape') { setIsEditing(false); setDraft(message.content || ''); }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsEditing(false); setDraft(message.content || ''); }}
                  className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100"
                >
                  <X className="w-3 h-3" /> {t('chatCancel')}
                </button>
                <button onClick={() => void saveEdit()} className="flex items-center gap-1 text-xs font-medium">
                  <Check className="w-3 h-3" /> {t('chatSave')}
                </button>
              </div>
            </div>
          ) : (
            message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                <HighlightedText text={message.content} highlight={highlightText} />
              </p>
            )
          )}
        </div>
        
        <span className={cn(
          'text-[10px] text-muted-foreground mt-1 block',
          isOwn ? 'text-right' : 'text-left'
        )}>
          {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
          {wasEdited && <span className="ml-1 italic">({t('chatMessageEdited')})</span>}
          {isOwn && !isEditing && (onEdit || onDelete) && (
            <span className="inline-flex items-center gap-2 ml-2 align-middle">
              {onEdit && message.content && (
                <button
                  onClick={() => { setDraft(message.content || ''); setIsEditing(true); }}
                  aria-label={t('chatEditMessage')}
                  title={t('chatEditMessage')}
                  className="hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => setConfirmOpen(true)}
                  aria-label={t('chatDeleteMessage')}
                  title={t('chatDeleteMessage')}
                  className="hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </span>
          )}
        </span>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('chatDeleteMessage')}</AlertDialogTitle>
              <AlertDialogDescription>{t('chatDeleteMessageConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('chatCancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { void onDelete?.(message.id); setConfirmOpen(false); }}>
                {t('chatDeleteMessage')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}