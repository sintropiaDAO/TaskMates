import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Send, Paperclip, X, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSend: (message: string, attachment?: { url: string; type: string; name: string }) => Promise<boolean>;
  onTyping?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTyping, disabled }: ChatInputProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; preview?: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || sending || uploading) return;
    
    setSending(true);
    
    let attachmentData: { url: string; type: string; name: string } | undefined;
    
    // Upload attachment if present
    if (attachment && user) {
      setUploading(true);
      try {
        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, attachment.file);
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(data.path);
        
        attachmentData = {
          url: urlData.publicUrl,
          type: attachment.file.type.startsWith('image/') ? 'image' : 'file',
          name: attachment.file.name
        };
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: t('chatUploadError'),
          variant: 'destructive'
        });
        setUploading(false);
        setSending(false);
        return;
      }
      setUploading(false);
    }
    
    const success = await onSend(message, attachmentData);
    if (success) {
      setMessage('');
      setAttachment(null);
      textareaRef.current?.focus();
    }
    setSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('chatFileTooLarge'),
        variant: 'destructive'
      });
      return;
    }
    
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setAttachment({ file, preview });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = () => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
  };

  return (
    <div className="p-3 border-t bg-background">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 p-2 rounded-lg bg-muted flex items-center gap-2">
          {attachment.preview ? (
            <img src={attachment.preview} alt="Preview" className="h-12 w-12 object-cover rounded" />
          ) : (
            <div className="h-12 w-12 bg-primary/10 rounded flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          )}
          <span className="flex-1 text-sm truncate">{attachment.file.name}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={removeAttachment}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending || uploading}
          className="shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('chatInputPlaceholder')}
          disabled={disabled || sending || uploading}
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!message.trim() && !attachment) || disabled || sending || uploading}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
