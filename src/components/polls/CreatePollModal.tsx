import { useState, useEffect } from 'react';
import { Plus, X, Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SmartTagSelector } from '@/components/tags/SmartTagSelector';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface CreatePollModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    options: string[],
    tagIds: string[],
    deadline?: string,
    allowNewOptions?: boolean,
    taskId?: string
  ) => Promise<any>;
  taskId?: string;
}

export function CreatePollModal({ open, onClose, onSubmit, taskId }: CreatePollModalProps) {
  const { getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [allowNewOptions, setAllowNewOptions] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setOptions(['', '']);
    setDeadline(undefined);
    setAllowNewOptions(true);
    setSelectedTags([]);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleCreateTag = async (name: string, category: 'skills' | 'communities' | 'physical_resources') => {
    const result = await createTag(name.trim(), category);
    if (result && 'id' in result) {
      toggleTag(result.id);
      refreshTags();
    } else if (result && 'error' in result) {
      toggleTag(result.existingTag.id);
    }
  };

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast({ title: language === 'pt' ? 'Adicione pelo menos 2 opções' : 'Add at least 2 options', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const result = await onSubmit(
      title.trim(),
      description.trim(),
      validOptions,
      selectedTags,
      deadline?.toISOString(),
      allowNewOptions,
      taskId
    );
    if (result) {
      toast({ title: language === 'pt' ? 'Enquete criada!' : 'Poll created!' });
      resetForm();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{language === 'pt' ? 'Criar Enquete' : 'Create Poll'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{language === 'pt' ? 'Título' : 'Title'}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'pt' ? 'Pergunta da enquete...' : 'Poll question...'} maxLength={200} />
          </div>

          <div>
            <Label>{language === 'pt' ? 'Descrição (opcional)' : 'Description (optional)'}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={language === 'pt' ? 'Contexto da enquete...' : 'Poll context...'} maxLength={500} rows={2} />
          </div>

          {/* Options */}
          <div>
            <Label>{language === 'pt' ? 'Opções de Voto' : 'Vote Options'}</Label>
            <div className="space-y-2 mt-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`${language === 'pt' ? 'Opção' : 'Option'} ${idx + 1}`}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                  <Plus className="w-4 h-4 mr-1" />
                  {language === 'pt' ? 'Adicionar opção' : 'Add option'}
                </Button>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <Label>{language === 'pt' ? 'Data limite' : 'Deadline'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {deadline ? format(deadline, "PPP", { locale: dateLocale }) : (language === 'pt' ? 'Selecionar data...' : 'Select date...')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Allow new options */}
          <div className="flex items-center justify-between">
            <Label>{language === 'pt' ? 'Permitir novas opções' : 'Allow new options'}</Label>
            <Switch checked={allowNewOptions} onCheckedChange={setAllowNewOptions} />
          </div>

          {/* Tags */}
          <div>
            <Label>{language === 'pt' ? 'Tags de Habilidades' : 'Skill Tags'}</Label>
            <SmartTagSelector category="skills" selectedTagIds={selectedTags} onToggleTag={toggleTag} onCreateTag={(n) => handleCreateTag(n, 'skills')} />
          </div>
          <div>
            <Label>{language === 'pt' ? 'Tags de Comunidades' : 'Community Tags'}</Label>
            <SmartTagSelector category="communities" selectedTagIds={selectedTags} onToggleTag={toggleTag} onCreateTag={(n) => handleCreateTag(n, 'communities')} />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {language === 'pt' ? 'Criar Enquete' : 'Create Poll'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
