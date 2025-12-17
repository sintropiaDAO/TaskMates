import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Calendar, User, ArrowUp, ArrowDown, HandHelping, Hand, 
  MessageCircle, Send, CheckCircle, Award, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Task, TaskComment, TaskFeedback } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onComplete?: (taskId: string, proofUrl: string, proofType: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export function TaskDetailModal({ task, open, onClose, onComplete, onRefresh }: TaskDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [feedback, setFeedback] = useState<TaskFeedback[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newFeedback, setNewFeedback] = useState('');
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (task && open) {
      fetchComments();
      fetchFeedback();
      fetchUserVote();
    }
  }, [task, open]);

  const fetchComments = async () => {
    if (!task) return;
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComments(data.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) as TaskComment['profile']
      })));
    }
  };

  const fetchFeedback = async () => {
    if (!task) return;
    const { data } = await supabase
      .from('task_feedback')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    
    if (data) {
      const userIds = [...new Set(data.map(f => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setFeedback(data.map(f => ({
        ...f,
        profile: profileMap.get(f.user_id) as TaskFeedback['profile']
      })));
    }
  };

  const fetchUserVote = async () => {
    if (!task || !user) return;
    const { data } = await supabase
      .from('task_votes')
      .select('vote_type')
      .eq('task_id', task.id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setUserVote(data.vote_type as 'up' | 'down');
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!task || !user) return;

    try {
      if (userVote === voteType) {
        // Remove vote
        await supabase
          .from('task_votes')
          .delete()
          .eq('task_id', task.id)
          .eq('user_id', user.id);
        setUserVote(null);
        
        // Update task vote counts
        await supabase
          .from('tasks')
          .update({
            [voteType === 'up' ? 'upvotes' : 'downvotes']: Math.max(0, (voteType === 'up' ? task.upvotes : task.downvotes) - 1)
          })
          .eq('id', task.id);
      } else {
        // Check if user already has a vote
        const { data: existingVote } = await supabase
          .from('task_votes')
          .select('vote_type')
          .eq('task_id', task.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingVote) {
          // Update existing vote
          await supabase
            .from('task_votes')
            .update({ vote_type: voteType })
            .eq('task_id', task.id)
            .eq('user_id', user.id);
          
          // Update counts: decrement old, increment new
          const oldType = existingVote.vote_type;
          await supabase
            .from('tasks')
            .update({
              upvotes: oldType === 'up' ? Math.max(0, task.upvotes - 1) : (voteType === 'up' ? task.upvotes + 1 : task.upvotes),
              downvotes: oldType === 'down' ? Math.max(0, task.downvotes - 1) : (voteType === 'down' ? task.downvotes + 1 : task.downvotes)
            })
            .eq('id', task.id);
        } else {
          // Insert new vote
          await supabase
            .from('task_votes')
            .insert({
              task_id: task.id,
              user_id: user.id,
              vote_type: voteType,
            });
          
          // Update task vote count
          await supabase
            .from('tasks')
            .update({
              [voteType === 'up' ? 'upvotes' : 'downvotes']: (voteType === 'up' ? task.upvotes : task.downvotes) + 1
            })
            .eq('id', task.id);
        }
        setUserVote(voteType);
      }
      onRefresh?.();
    } catch (error) {
      console.error('Error voting:', error);
      toast({ title: 'Erro ao votar', variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    if (!task || !user || !newComment.trim()) return;

    const { error } = await supabase
      .from('task_comments')
      .insert({
        task_id: task.id,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (!error) {
      setNewComment('');
      fetchComments();
      toast({ title: 'Comentário adicionado!' });
    }
  };

  const handleAddFeedback = async () => {
    if (!task || !user || !newFeedback.trim()) return;

    const { error } = await supabase
      .from('task_feedback')
      .insert({
        task_id: task.id,
        user_id: user.id,
        content: newFeedback.trim(),
      });

    if (!error) {
      setNewFeedback('');
      fetchFeedback();
      toast({ title: 'Feedback adicionado!' });
    }
  };

  const handleComplete = async () => {
    if (!task || !proofUrl.trim() || !onComplete) return;
    setCompleting(true);
    
    const success = await onComplete(task.id, proofUrl.trim(), 'link');
    if (success) {
      setShowCompleteModal(false);
      setProofUrl('');
      toast({ 
        title: 'Tarefa concluída!',
        description: 'A prova foi registrada com sucesso.',
      });
      onClose();
    }
    setCompleting(false);
  };

  const handleCollaborate = async () => {
    if (!task || !user) return;

    const { error } = await supabase
      .from('task_collaborators')
      .insert({
        task_id: task.id,
        user_id: user.id,
        status: 'collaborate',
      });

    if (!error) {
      toast({ title: 'Solicitação de colaboração enviada!' });
    } else if (error.code === '23505') {
      toast({ title: 'Você já solicitou colaboração nesta tarefa.' });
    }
  };

  const handleRequest = async () => {
    if (!task || !user) return;

    const { error } = await supabase
      .from('task_collaborators')
      .insert({
        task_id: task.id,
        user_id: user.id,
        status: 'request',
      });

    if (!error) {
      toast({ title: 'Solicitação enviada!' });
    } else if (error.code === '23505') {
      toast({ title: 'Você já fez uma solicitação nesta tarefa.' });
    }
  };

  if (!task) return null;

  const isOwner = user?.id === task.created_by;
  const isCompleted = task.status === 'completed';
  const isOffer = task.task_type === 'offer';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                  isOffer 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-secondary/10 text-secondary'
                }`}>
                  {isOffer ? 'Oferta' : 'Solicitação'}
                </span>
                <DialogTitle className="text-2xl">{task.title}</DialogTitle>
              </div>
              {isCompleted && (
                <div className="flex items-center gap-1 text-primary">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Concluída</span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Creator Info */}
          <div className="flex items-center gap-3 py-4 border-b border-border">
            <Avatar>
              <AvatarImage src={task.creator?.avatar_url || ''} />
              <AvatarFallback>{task.creator?.full_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{task.creator?.full_name || 'Usuário'}</p>
              <p className="text-sm text-muted-foreground">
                Criada em {format(new Date(task.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="py-4 border-b border-border">
              <p className="text-muted-foreground">{task.description}</p>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 py-4 border-b border-border">
              {task.tags.map(tag => (
                <TagBadge key={tag.id} name={tag.name} category={tag.category} />
              ))}
            </div>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-6 py-4 border-b border-border">
            {task.deadline && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Prazo: {format(new Date(task.deadline), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleVote('up')}
                className={`flex items-center gap-1 transition-colors ${
                  userVote === 'up' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <ArrowUp className="w-5 h-5" />
                <span>{task.upvotes}</span>
              </button>
              <button
                onClick={() => handleVote('down')}
                className={`flex items-center gap-1 transition-colors ${
                  userVote === 'down' ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
                }`}
              >
                <ArrowDown className="w-5 h-5" />
                <span>{task.downvotes}</span>
              </button>
            </div>
          </div>

          {/* Completion Proof */}
          {isCompleted && task.completion_proof_url && (
            <div className="py-4 border-b border-border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Prova de Conclusão
              </h4>
              <a 
                href={task.completion_proof_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {task.completion_proof_url}
              </a>
              {task.blockchain_tx_hash && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium text-primary flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Registrado na Scroll Blockchain
                  </p>
                  <a
                    href={`https://sepolia.scrollscan.com/tx/${task.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary mt-1 block truncate"
                  >
                    TX: {task.blockchain_tx_hash}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isCompleted && (
            <div className="flex gap-3 py-4 border-b border-border">
              {isOwner ? (
                <Button
                  onClick={() => setShowCompleteModal(true)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar como Concluída
                </Button>
              ) : (
                <>
                  <Button onClick={handleCollaborate} className="bg-gradient-primary hover:opacity-90">
                    <HandHelping className="w-4 h-4 mr-2" />
                    Colaborar
                  </Button>
                  <Button variant="outline" onClick={handleRequest}>
                    <Hand className="w-4 h-4 mr-2" />
                    Solicitar
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="py-4">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Comentários ({comments.length})
            </h4>
            
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{comment.profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted rounded-lg p-3">
                    <p className="text-sm font-medium">{comment.profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button size="icon" onClick={handleAddComment}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Feedback (only for completed tasks) */}
          {isCompleted && (
            <div className="py-4 border-t border-border">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Feedback ({feedback.length})
              </h4>
              
              <div className="space-y-3 mb-4">
                {feedback.map(fb => (
                  <div key={fb.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{fb.profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-primary/5 rounded-lg p-3">
                      <p className="text-sm font-medium">{fb.profile?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{fb.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                  placeholder="Deixe seu feedback sobre esta tarefa..."
                  className="min-h-[80px]"
                />
              </div>
              <Button onClick={handleAddFeedback} className="mt-2">
                Enviar Feedback
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Task Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Adicione uma prova de conclusão (foto, PDF ou link) para registrar esta tarefa na blockchain.
            </p>
            <Input
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="URL da prova (link, foto ou PDF)"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1 bg-gradient-primary hover:opacity-90"
                disabled={!proofUrl.trim() || completing}
              >
                {completing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Conclusão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
