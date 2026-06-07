import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, MessageCircleQuestion, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCapyVeraEnabled } from '@/hooks/useCapyVeraEnabled';

function CapyVeraEnabledToggle() {
  const { enabled, loading, setValue } = useCapyVeraEnabled();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleChange = async (v: boolean) => {
    setSaving(true);
    const { error } = await setValue(v);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: v ? 'Chat da Capy Vera ativado' : 'Chat da Capy Vera desativado' });
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <Power className="w-4 h-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Chat da Capy Vera</p>
          <p className="text-xs text-muted-foreground">
            Quando desligado, o botão flutuante fica oculto para todos os usuários.
          </p>
        </div>
      </div>
      <Switch
        checked={enabled}
        disabled={loading || saving}
        onCheckedChange={handleChange}
        aria-label="Ativar chat da Capy Vera"
      />
    </div>
  );
}

interface CapyQuestion {
  id: string;
  question: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export function CapyVeraQuestionsAdmin() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<CapyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQ, setNewQ] = useState('');
  const [newCat, setNewCat] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('capy_vera_questions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar perguntas', description: error.message, variant: 'destructive' });
    } else {
      setQuestions((data ?? []) as CapyQuestion[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAdd = async () => {
    const q = newQ.trim();
    if (!q) return;
    setSaving(true);
    const { error } = await supabase
      .from('capy_vera_questions')
      .insert({ question: q, category: newCat.trim() || null });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
      return;
    }
    setNewQ('');
    setNewCat('');
    toast({ title: 'Pergunta adicionada' });
    fetchQuestions();
  };

  const handleToggle = async (id: string, value: boolean) => {
    const { error } = await supabase
      .from('capy_vera_questions')
      .update({ is_active: value })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, is_active: value } : q)));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('capy_vera_questions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      setQuestions((qs) => qs.filter((q) => q.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <CapyVeraEnabledToggle />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageCircleQuestion className="w-4 h-4" />
        Perguntas inspiradoras que a Capy Vera usa ao final de cada resposta.
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Nova pergunta..."
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          placeholder="Categoria (opcional)"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          className="sm:max-w-[200px]"
        />
        <Button onClick={handleAdd} disabled={saving || !newQ.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </Button>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : questions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma pergunta cadastrada.</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{q.question}</p>
                {q.category && (
                  <p className="text-xs text-muted-foreground mt-1">{q.category}</p>
                )}
              </div>
              <Switch
                checked={q.is_active}
                onCheckedChange={(v) => handleToggle(q.id, v)}
                aria-label="Ativa"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(q.id)}
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
