import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FeedFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

const PREFILL_OPTIONS = [
  { key: 'good', labelPt: 'Que bom', labelEn: 'How nice', prefix_pt: 'Que bom ', prefix_en: 'How nice ' },
  { key: 'bad', labelPt: 'Que pena', labelEn: 'What a pity', prefix_pt: 'Que pena ', prefix_en: 'What a pity ' },
  { key: 'howabout', labelPt: 'Que tal', labelEn: 'How about', prefix_pt: 'Que tal ', prefix_en: 'How about ' },
];

export function FeedFeedbackModal({ open, onOpenChange, taskId, taskTitle }: FeedFeedbackModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedPrefix, setSelectedPrefix] = useState<string | null>(null);

  const handlePrefixSelect = (option: typeof PREFILL_OPTIONS[0]) => {
    if (selectedPrefix === option.key) {
      setSelectedPrefix(null);
      setContent('');
      return;
    }
    setSelectedPrefix(option.key);
    const prefix = language === 'pt' ? option.prefix_pt : option.prefix_en;
    setContent(prefix);
  };

  const handleSend = async () => {
    if (!content.trim() || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('task_feedback')
        .insert({ task_id: taskId, user_id: user.id, content: content.trim() });
      if (error) throw error;
      toast({ title: language === 'pt' ? 'Feedback enviado!' : 'Feedback sent!' });
      setContent('');
      setSelectedPrefix(null);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: language === 'pt' ? 'Erro ao enviar feedback' : 'Error sending feedback', variant: 'destructive' });
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {language === 'pt' ? 'Dar feedback' : 'Give feedback'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground line-clamp-1">{taskTitle}</p>

        {/* Prefill options */}
        <div className="flex flex-wrap gap-2">
          {PREFILL_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handlePrefixSelect(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                selectedPrefix === opt.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {language === 'pt' ? opt.labelPt : opt.labelEn}...
            </button>
          ))}
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={language === 'pt' ? 'Escreva seu feedback...' : 'Write your feedback...'}
          rows={3}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleSend} disabled={!content.trim() || sending}>
            {language === 'pt' ? 'Enviar' : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
