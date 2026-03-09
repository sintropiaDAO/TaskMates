import { useState, useEffect } from 'react';
import { Plus, X, Loader2, CalendarIcon, Trash2 } from 'lucide-react';
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
import { Poll, PollOption } from '@/types';

interface EditablePollOption {
  id?: string;
  label: string;
  isNew?: boolean;
  votes?: number;
}

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
    taskId?: string,
    minQuorum?: number | null
  ) => Promise<any>;
  onUpdate?: (
    pollId: string,
    title: string,
    description: string,
    tagIds: string[],
    deadline?: string,
    allowNewOptions?: boolean,
    minQuorum?: number | null
  ) => Promise<any>;
  onDeleteOption?: (pollId: string, optionId: string, label: string) => Promise<boolean>;
  onAddOption?: (pollId: string, label: string) => Promise<any>;
  taskId?: string;
  editPoll?: Poll | null;
}

export function CreatePollModal({
  open, onClose, onSubmit, onUpdate, onDeleteOption, onAddOption, taskId, editPoll
}: CreatePollModalProps) {
  const { createTag, refreshTags } = useTags();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [editableOptions, setEditableOptions] = useState<EditablePollOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [allowNewOptions, setAllowNewOptions] = useState(true);
  const [minQuorum, setMinQuorum] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const isEditing = !!editPoll;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setOptions(['', '']);
    setEditableOptions([]);
    setNewOptionLabel('');
    setDeadline(undefined);
    setAllowNewOptions(true);
    setMinQuorum(null);
    setSelectedTags([]);
    setCalendarOpen(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    } else if (editPoll) {
      setTitle(editPoll.title);
      setDescription(editPoll.description || '');
      setDeadline(editPoll.deadline ? new Date(editPoll.deadline) : undefined);
      setAllowNewOptions(editPoll.allow_new_options);
      setMinQuorum(editPoll.min_quorum || null);
      setSelectedTags(editPoll.tags?.map(t => t.id) || []);
      setEditableOptions(
        (editPoll.options || []).map(o => ({
          id: o.id,
          label: o.label,
          votes: (editPoll.votes || []).filter(v => v.option_id === o.id).length,
        }))
      );
    }
  }, [open, editPoll?.id]);

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

  const handleDeleteExistingOption = async (opt: EditablePollOption) => {
    if (!editPoll || !opt.id || !onDeleteOption) return;
    const ok = await onDeleteOption(editPoll.id, opt.id, opt.label);
    if (ok) {
      setEditableOptions(prev => prev.filter(o => o.id !== opt.id));
      toast({ title: language === 'pt' ? 'Opção removida' : 'Option removed' });
    }
  };

  const handleAddNewOption = async () => {
    if (!newOptionLabel.trim() || !editPoll || !onAddOption) return;
    const result = await onAddOption(editPoll.id, newOptionLabel.trim());
    if (result) {
      setEditableOptions(prev => [...prev, { id: result.id, label: result.label, votes: 0 }]);
      setNewOptionLabel('');
      toast({ title: language === 'pt' ? 'Opção adicionada' : 'Option added' });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    if (isEditing && onUpdate && editPoll) {
      setLoading(true);
      const result = await onUpdate(
        editPoll.id,
        title.trim(),
        description.trim(),
        selectedTags,
        deadline?.toISOString(),
        allowNewOptions,
        minQuorum
      );
      if (result) {
        toast({ title: language === 'pt' ? 'Enquete atualizada!' : 'Poll updated!' });
        onClose();
      }
      setLoading(false);
      return;
    }

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
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? (language === 'pt' ? 'Editar Enquete' : 'Edit Poll')
              : (language === 'pt' ? 'Criar Enquete' : 'Create Poll')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{language === 'pt' ? 'Título' : 'Title'}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'pt' ? 'Título da enquete...' : 'Poll title...'} maxLength={200} />
          </div>

          <div>
            <Label>{language === 'pt' ? 'Descrição (opcional)' : 'Description (optional)'}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={language === 'pt' ? 'Contexto da enquete...' : 'Poll context...'} maxLength={500} rows={2} />
          </div>

          {/* Options for creation */}
          {!isEditing && (
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
          )}

          {/* Options for editing */}
          {isEditing && (
            <div>
              <Label>{language === 'pt' ? 'Opções de Voto' : 'Vote Options'}</Label>
              <div className="space-y-2 mt-1">
                {editableOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                    <span className="flex-1 text-sm">{opt.label}</span>
                    <span className="text-xs text-muted-foreground px-1.5">
                      {opt.votes} {language === 'pt' ? 'voto(s)' : 'vote(s)'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteExistingOption(opt)}
                      disabled={editableOptions.length <= 2}
                      title={editableOptions.length <= 2 ? (language === 'pt' ? 'Mínimo de 2 opções' : 'Minimum 2 options') : undefined}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {editableOptions.length < 10 && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newOptionLabel}
                      onChange={e => setNewOptionLabel(e.target.value)}
                      placeholder={language === 'pt' ? 'Nova opção...' : 'New option...'}
                      maxLength={100}
                      className="h-8 text-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddNewOption()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={handleAddNewOption}
                      disabled={!newOptionLabel.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deadline */}
          <div>
            <Label>{language === 'pt' ? 'Data limite (opcional)' : 'Deadline (optional)'}</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}
                  onClick={() => setCalendarOpen(true)}
                  type="button"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {deadline ? format(deadline, "PPP", { locale: dateLocale }) : (language === 'pt' ? 'Selecionar data...' : 'Select date...')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={(date) => {
                    setDeadline(date);
                    setCalendarOpen(false);
                  }}
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
            {isEditing
              ? (language === 'pt' ? 'Salvar Alterações' : 'Save Changes')
              : (language === 'pt' ? 'Criar Enquete' : 'Create Poll')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
