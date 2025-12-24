import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Calendar, User, ArrowUp, ArrowDown, HandHelping, Hand, 
  MessageCircle, Send, CheckCircle, Award, Loader2, Upload, FileText, Image, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Task, TaskComment, TaskFeedback } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onComplete?: (taskId: string, proofUrl: string, proofType: string) => Promise<{ success: boolean; txHash: string | null }>;
  onRefresh?: () => void;
}

export function TaskDetailModal({ task, open, onClose, onComplete, onRefresh }: TaskDetailModalProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [feedback, setFeedback] = useState<TaskFeedback[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newFeedback, setNewFeedback] = useState('');
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMode, setProofMode] = useState<'link' | 'file'>('file');
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateLocale = language === 'pt' ? ptBR : enUS;

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
        .from('public_profiles')
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
        .from('public_profiles')
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
      } else if (userVote) {
        // Update existing vote
        await supabase
          .from('task_votes')
          .update({ vote_type: voteType })
          .eq('task_id', task.id)
          .eq('user_id', user.id);
        setUserVote(voteType);
      } else {
        // Insert new vote
        await supabase
          .from('task_votes')
          .insert({
            task_id: task.id,
            user_id: user.id,
            vote_type: voteType,
          });
        setUserVote(voteType);
      }
      onRefresh?.();
    } catch (error) {
      console.error('Error voting:', error);
      toast({ title: t('taskVoteError'), variant: 'destructive' });
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
      toast({ title: t('taskCommentAdded') });
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
      toast({ title: t('taskFeedbackAdded') });
    }
  };

  const handleComplete = async () => {
    if (!task || !onComplete) return;
    
    let finalProofUrl = proofUrl.trim();
    let proofType = 'link';
    
    // Upload file if selected
    if (proofMode === 'file' && proofFile) {
      setUploading(true);
      try {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user?.id}/${task.id}/${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('task-proofs')
          .upload(fileName, proofFile);
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('task-proofs')
          .getPublicUrl(data.path);
        
        finalProofUrl = urlData.publicUrl;
        proofType = proofFile.type.startsWith('image/') ? 'image' : 'pdf';
      } catch (error) {
        console.error('Upload error:', error);
        toast({ title: t('taskUploadError'), variant: 'destructive' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    
    if (!finalProofUrl) {
      toast({ title: t('taskAddProof'), variant: 'destructive' });
      return;
    }
    
    setCompleting(true);
    
    const result = await onComplete(task.id, finalProofUrl, proofType);
    if (result.success) {
      setShowCompleteModal(false);
      setProofUrl('');
      setProofFile(null);
      toast({ 
        title: t('taskCompletedSuccess'),
        description: result.txHash 
          ? `${t('taskRegisteredBlockchain')} ${result.txHash.slice(0, 10)}...`
          : t('taskProofRegistered'),
      });
      onClose();
    }
    setCompleting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({ title: t('taskInvalidFileType'), variant: 'destructive' });
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('taskFileTooLarge'), variant: 'destructive' });
        return;
      }
      setProofFile(file);
    }
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
      toast({ title: t('taskCollaborationSent') });
    } else if (error.code === '23505') {
      toast({ title: t('taskAlreadyCollaborated') });
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
      toast({ title: t('taskRequestSent') });
    } else if (error.code === '23505') {
      toast({ title: t('taskAlreadyRequested') });
    }
  };

  if (!task) return null;

  const isOwner = user?.id === task.created_by;
  const isCompleted = task.status === 'completed';
  
  const getTaskTypeStyles = () => {
    switch (task.task_type) {
      case 'offer':
        return 'bg-success/10 text-success';
      case 'request':
        return 'bg-pink-600/10 text-pink-600';
      case 'personal':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getTaskTypeLabel = () => {
    switch (task.task_type) {
      case 'offer':
        return t('taskOffer');
      case 'request':
        return t('taskRequest');
      case 'personal':
        return t('taskPersonal');
      default:
        return '';
    }
  };

  const formatCreatedDate = () => {
    if (language === 'pt') {
      return format(new Date(task.created_at), "dd 'de' MMMM 'de' yyyy", { locale: dateLocale });
    }
    return format(new Date(task.created_at), "MMMM dd, yyyy", { locale: dateLocale });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getTaskTypeStyles()}`}>
                  {getTaskTypeLabel()}
                </span>
                <DialogTitle className="text-2xl">{task.title}</DialogTitle>
              </div>
              {isCompleted && (
                <div className="flex items-center gap-1 text-primary">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('taskCompleted')}</span>
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
              <p className="font-medium">{task.creator?.full_name || t('user')}</p>
              <p className="text-sm text-muted-foreground">
                {t('taskCreatedOn')} {formatCreatedDate()}
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
                <span>{t('taskDeadlineLabel')}: {format(new Date(task.deadline), "dd/MM/yyyy", { locale: dateLocale })}</span>
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
                {t('taskCompletionProof')}
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
                    {t('taskBlockchainRegistered')}
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
                  {t('taskMarkComplete')}
                </Button>
              ) : (
                <>
                  <Button onClick={handleCollaborate} className="bg-gradient-primary hover:opacity-90">
                    <HandHelping className="w-4 h-4 mr-2" />
                    {t('taskCollaborate')}
                  </Button>
                  <Button variant="outline" onClick={handleRequest}>
                    <Hand className="w-4 h-4 mr-2" />
                    {t('taskRequestAction')}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="py-4">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {t('taskComments')} ({comments.length})
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
                placeholder={t('taskAddComment')}
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
                {t('taskFeedback')} ({feedback.length})
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
                  placeholder={t('taskLeaveFeedback')}
                  className="min-h-[80px]"
                />
              </div>
              <Button onClick={handleAddFeedback} className="mt-2">
                {t('taskSendFeedback')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Task Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('taskCompleteTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t('taskCompleteDescription')}
            </p>
            
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={proofMode === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProofMode('file')}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('taskUploadFile')}
              </Button>
              <Button
                variant={proofMode === 'link' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProofMode('link')}
                className="flex-1"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                {t('taskExternalLink')}
              </Button>
            </div>

            {proofMode === 'file' ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {proofFile ? (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {proofFile.type.startsWith('image/') ? (
                      <Image className="w-8 h-8 text-primary" />
                    ) : (
                      <FileText className="w-8 h-8 text-primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proofFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProofFile(null)}
                    >
                      {t('taskRemove')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6" />
                      <span>{t('taskClickToSelect')}</span>
                      <span className="text-xs text-muted-foreground">{t('taskMax10MB')}</span>
                    </div>
                  </Button>
                )}
              </div>
            ) : (
              <Input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder={t('taskPasteLinkHere')}
              />
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompleteModal(false);
                  setProofFile(null);
                  setProofUrl('');
                }}
                className="flex-1"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1 bg-gradient-primary hover:opacity-90"
                disabled={(proofMode === 'file' ? !proofFile : !proofUrl.trim()) || completing || uploading}
              >
                {(completing || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? t('taskSending') : t('taskConfirmCompletion')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
