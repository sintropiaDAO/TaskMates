import { useState, useRef, ChangeEvent } from 'react';
import { Send, Paperclip, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CommentInputProps {
  onSend: (content: string, attachment?: { url: string; type: string; name: string }) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export function CommentInput({ onSend, placeholder, disabled }: CommentInputProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; preview?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if ((!content.trim() && !attachment) || sending || uploading) return;
    
    setSending(true);
    
    let attachmentData: { url: string; type: string; name: string } | undefined;
    
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
    
    await onSend(content, attachmentData);
    setContent('');
    setAttachment(null);
    setSending(false);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('chatFileTooLarge'),
        variant: 'destructive'
      });
      return;
    }
    
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setAttachment({ file, preview });
    
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
    <div>
      {attachment && (
        <div className="mb-2 p-2 rounded-lg bg-muted flex items-center gap-2">
          {attachment.preview ? (
            <img src={attachment.preview} alt="Preview" className="h-10 w-10 object-cover rounded" />
          ) : (
            <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          )}
          <span className="flex-1 text-sm truncate">{attachment.file.name}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeAttachment}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <div className="flex gap-2">
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
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder || t('taskAddComment')}
          disabled={disabled || sending || uploading}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!content.trim() && !attachment) || disabled || sending || uploading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}