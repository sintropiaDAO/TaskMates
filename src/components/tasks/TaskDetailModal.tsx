import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Calendar, User, ArrowUp, ArrowDown, HandHelping, Hand, MessageCircle, Send, CheckCircle, Award, Loader2, Upload, FileText, Image, Link as LinkIcon, ThumbsUp, ThumbsDown, Check, X as XIcon, Settings, Pencil, Trash2, ChevronDown, GitBranch, Plus, Video, Music } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/common/UserAvatar';
import { StarRating } from '@/components/ui/star-rating';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TaskHistorySection } from '@/components/tasks/TaskHistorySection';
import { RelatedTasksSection } from '@/components/tasks/RelatedTasksSection';
import { CommentInput } from '@/components/tasks/CommentInput';
import { CommentItem } from '@/components/tasks/CommentItem';
import { TaskSettingsPanel, TaskSettings } from '@/components/tasks/TaskSettingsPanel';
import { Task, TaskComment, TaskFeedback, TaskCollaborator } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useTaskCollaborators } from '@/hooks/useTaskCollaborators';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onComplete?: (taskId: string, proofUrl: string, proofType: string) => Promise<{
    success: boolean;
    txHash: string | null;
  }>;
  onRefresh?: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => Promise<boolean>;
  onCreateSubtask?: (parentTask: Task) => void;
  onOpenRelatedTask?: (task: Task) => void;
}

export function TaskDetailModal({
  task,
  open,
  onClose,
  onComplete,
  onRefresh,
  onEdit,
  onDelete,
  onCreateSubtask,
  onOpenRelatedTask
}: TaskDetailModalProps) {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    t,
    language
  } = useLanguage();
  const {
    toast
  } = useToast();
  const { getTranslatedName } = useTags();
  const { approveCollaborator, rejectCollaborator, updateTaskSettings, cancelInterest } = useTaskCollaborators();
  const [userHasCollaborated, setUserHasCollaborated] = useState(false);
  const [userHasRequested, setUserHasRequested] = useState(false);
  const [cancelingInterest, setCancelingInterest] = useState<'collaborate' | 'request' | null>(null);
  const { history, loading: historyLoading } = useTaskHistory(task?.id || null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [feedback, setFeedback] = useState<TaskFeedback[]>([]);
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>([]);
  const [requesters, setRequesters] = useState<TaskCollaborator[]>([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null); // kept for backward compat
  const [proofMode, setProofMode] = useState<'link' | 'file'>('file');
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [userLike, setUserLike] = useState<'like' | 'dislike' | null>(null);
  const [likeCounts, setLikeCounts] = useState({
    likes: 0,
    dislikes: 0
  });
  const [taskRating, setTaskRating] = useState<{
    average: number;
    total: number;
  }>({
    average: 0,
    total: 0
  });
  const [allowCollaboration, setAllowCollaboration] = useState(true);
  const [allowRequests, setAllowRequests] = useState(true);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [taskSettings, setTaskSettings] = useState<TaskSettings>({
    allowCollaboration: true,
    allowRequests: true,
    autoApproveCollaborators: false,
    autoApproveRequesters: false,
    maxCollaborators: null,
    maxRequesters: null,
    repeatType: null,
    repeatConfig: null,
    repeatEndDate: null,
    repeatOccurrences: null,
    repeatEndMode: null,
    enableStreak: false,
  });
  const [pendingCompletionProof, setPendingCompletionProof] = useState<{
    url: string;
    type: string;
    userId: string;
    userName: string;
  } | null>(null);
  const [showAddMoreProof, setShowAddMoreProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateLocale = language === 'pt' ? ptBR : enUS;
  // Fetch fresh vote/like data from database when modal opens
  const fetchVoteLikeCounts = async () => {
    if (!task) return;
    
    // Fetch fresh task data for vote counts
    const { data: taskData } = await supabase
      .from('tasks')
      .select('upvotes, downvotes, likes, dislikes')
      .eq('id', task.id)
      .single();
    
    if (taskData) {
      setLikeCounts({
        likes: taskData.likes || 0,
        dislikes: taskData.dislikes || 0
      });
    }
  };

  const fetchPendingCompletionProof = async () => {
    if (!task) return;
    
    // Find any collaborator who submitted a completion proof
    const { data } = await supabase
      .from('task_collaborators')
      .select('completion_proof_url, completion_proof_type, user_id')
      .eq('task_id', task.id)
      .not('completion_proof_url', 'is', null)
      .limit(1)
      .maybeSingle();
    
    if (data && data.completion_proof_url) {
      // Get the user's name
      const { data: profile } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', data.user_id)
        .single();
      
      setPendingCompletionProof({
        url: data.completion_proof_url,
        type: data.completion_proof_type || 'link',
        userId: data.user_id,
        userName: profile?.full_name || 'Colaborador'
      });
    } else {
      setPendingCompletionProof(null);
    }
  };

  const fetchUserInterests = async () => {
    if (!task || !user) return;
    
    const { data } = await supabase
      .from('task_collaborators')
      .select('status')
      .eq('task_id', task.id)
      .eq('user_id', user.id);
    
    if (data) {
      setUserHasCollaborated(data.some(d => d.status === 'collaborate'));
      setUserHasRequested(data.some(d => d.status === 'request'));
    } else {
      setUserHasCollaborated(false);
      setUserHasRequested(false);
    }
  };

  useEffect(() => {
    if (task && open) {
      fetchComments();
      fetchFeedback();
      fetchUserVote();
      fetchCollaborators();
      fetchExistingRatings();
      fetchUserLike();
      fetchTaskRating();
      fetchVoteLikeCounts();
      fetchPendingCompletionProof();
      fetchUserInterests();
      // Initialize task settings
      const t = task as any;
      setAllowCollaboration(task.allow_collaboration !== false);
      setAllowRequests(task.allow_requests !== false);
      setTaskSettings({
        allowCollaboration: task.allow_collaboration !== false,
        allowRequests: task.allow_requests !== false,
        autoApproveCollaborators: t.auto_approve_collaborators ?? false,
        autoApproveRequesters: t.auto_approve_requesters ?? false,
        maxCollaborators: t.max_collaborators ?? null,
        maxRequesters: t.max_requesters ?? null,
        repeatType: t.repeat_type ?? null,
        repeatConfig: t.repeat_config ?? null,
        repeatEndDate: t.repeat_end_date ?? null,
        repeatOccurrences: t.repeat_occurrences ?? null,
        repeatEndMode: t.repeat_end_date ? 'date' : t.repeat_occurrences ? 'occurrences' : null,
        enableStreak: t.enable_streak ?? false,
      });
    }
  }, [task, open]);
  const fetchTaskRating = async () => {
    if (!task) return;
    const {
      data
    } = await supabase.from('task_ratings').select('rating').eq('task_id', task.id);
    if (data && data.length > 0) {
      const sum = data.reduce((acc, r) => acc + r.rating, 0);
      setTaskRating({
        average: sum / data.length,
        total: data.length
      });
    } else {
      setTaskRating({
        average: 0,
        total: 0
      });
    }
  };
  const fetchExistingRatings = async () => {
    if (!task || !user) return;
    const {
      data
    } = await supabase.from('task_ratings').select('rated_user_id, rating').eq('task_id', task.id).eq('rater_user_id', user.id);
    if (data) {
      const ratings: Record<string, number> = {};
      data.forEach(r => {
        ratings[r.rated_user_id] = r.rating;
      });
      setUserRatings(ratings);
    }
  };
  const handleRateUser = async (ratedUserId: string, rating: number) => {
    if (!task || !user) return;
    const {
      error
    } = await supabase.from('task_ratings').upsert({
      task_id: task.id,
      rated_user_id: ratedUserId,
      rater_user_id: user.id,
      rating
    }, {
      onConflict: 'task_id,rated_user_id,rater_user_id'
    });
    if (!error) {
      setUserRatings(prev => ({
        ...prev,
        [ratedUserId]: rating
      }));
      toast({
        title: t('ratingSubmitted')
      });
    }
  };
  const fetchUserLike = async () => {
    if (!task || !user) return;
    const {
      data
    } = await supabase.from('task_likes').select('like_type').eq('task_id', task.id).eq('user_id', user.id).maybeSingle();
    if (data) {
      setUserLike(data.like_type as 'like' | 'dislike');
    } else {
      setUserLike(null);
    }
  };
  const handleLike = async (likeType: 'like' | 'dislike') => {
    if (!task || !user) return;
    try {
      if (userLike === likeType) {
        // Remove like
        await supabase.from('task_likes').delete().eq('task_id', task.id).eq('user_id', user.id);
        setUserLike(null);
        setLikeCounts(prev => ({
          ...prev,
          [likeType === 'like' ? 'likes' : 'dislikes']: Math.max(0, prev[likeType === 'like' ? 'likes' : 'dislikes'] - 1)
        }));
      } else if (userLike) {
        // Update existing like
        await supabase.from('task_likes').update({
          like_type: likeType
        }).eq('task_id', task.id).eq('user_id', user.id);
        setUserLike(likeType);
        setLikeCounts(prev => ({
          likes: likeType === 'like' ? prev.likes + 1 : Math.max(0, prev.likes - 1),
          dislikes: likeType === 'dislike' ? prev.dislikes + 1 : Math.max(0, prev.dislikes - 1)
        }));
      } else {
        // Insert new like
        await supabase.from('task_likes').insert({
          task_id: task.id,
          user_id: user.id,
          like_type: likeType
        });
        setUserLike(likeType);
        setLikeCounts(prev => ({
          ...prev,
          [likeType === 'like' ? 'likes' : 'dislikes']: prev[likeType === 'like' ? 'likes' : 'dislikes'] + 1
        }));
      }
    } catch (error) {
      console.error('Error liking:', error);
      toast({
        title: t('error'),
        variant: 'destructive'
      });
    }
  };
  const fetchCollaborators = async () => {
    if (!task) return;
    const {
      data
    } = await supabase.from('task_collaborators').select('*').eq('task_id', task.id).order('created_at', {
      ascending: true
    });
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const {
        data: profiles
      } = await supabase.from('public_profiles').select('*').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const collabs = data.filter(c => c.status === 'collaborate').map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) as TaskCollaborator['profile']
      }));
      const reqs = data.filter(c => c.status === 'request').map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) as TaskCollaborator['profile']
      }));
      setCollaborators(collabs);
      setRequesters(reqs);
    }
  };
  const fetchComments = async () => {
    if (!task) return;
    const {
      data
    } = await supabase.from('task_comments').select('*').eq('task_id', task.id).order('created_at', {
      ascending: true
    });
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const {
        data: profiles
      } = await supabase.from('public_profiles').select('*').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComments(data.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) as TaskComment['profile']
      })));
    }
  };
  const fetchFeedback = async () => {
    if (!task) return;
    const {
      data
    } = await supabase.from('task_feedback').select('*').eq('task_id', task.id).order('created_at', {
      ascending: true
    });
    if (data) {
      const userIds = [...new Set(data.map(f => f.user_id))];
      const {
        data: profiles
      } = await supabase.from('public_profiles').select('*').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setFeedback(data.map(f => ({
        ...f,
        profile: profileMap.get(f.user_id) as TaskFeedback['profile']
      })));
    }
  };
  const fetchUserVote = async () => {
    if (!task || !user) return;
    const {
      data
    } = await supabase.from('task_votes').select('vote_type').eq('task_id', task.id).eq('user_id', user.id).maybeSingle();
    if (data) {
      setUserVote(data.vote_type as 'up' | 'down');
    } else {
      setUserVote(null);
    }
  };
  const handleVote = async (voteType: 'up' | 'down') => {
    if (!task || !user) return;
    try {
      if (userVote === voteType) {
        // Remove vote
        await supabase.from('task_votes').delete().eq('task_id', task.id).eq('user_id', user.id);
        setUserVote(null);
      } else if (userVote) {
        // Update existing vote
        await supabase.from('task_votes').update({
          vote_type: voteType
        }).eq('task_id', task.id).eq('user_id', user.id);
        setUserVote(voteType);
      } else {
        // Insert new vote
        await supabase.from('task_votes').insert({
          task_id: task.id,
          user_id: user.id,
          vote_type: voteType
        });
        setUserVote(voteType);
      }
      onRefresh?.();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: t('taskVoteError'),
        variant: 'destructive'
      });
    }
  };
  const handleAddComment = async (content: string, attachment?: { url: string; type: string; name: string }) => {
    if (!task || !user || (!content.trim() && !attachment)) return;
    const {
      error
    } = await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: user.id,
      content: content.trim(),
      attachment_url: attachment?.url || null,
      attachment_type: attachment?.type || null,
      attachment_name: attachment?.name || null
    });
    if (!error) {
      fetchComments();
      toast({
        title: t('taskCommentAdded')
      });
    }
  };
  const handleAddFeedback = async () => {
    if (!task || !user || !newFeedback.trim()) return;
    const {
      error
    } = await supabase.from('task_feedback').insert({
      task_id: task.id,
      user_id: user.id,
      content: newFeedback.trim()
    });
    if (!error) {
      setNewFeedback('');
      fetchFeedback();
      toast({
        title: t('taskFeedbackAdded')
      });
    }
  };
  const handleSubmitProof = async () => {
    if (!task || !user) return;
    const filesToUpload = proofFiles.length > 0 ? proofFiles : (proofFile ? [proofFile] : []);
    let finalProofUrl = proofUrl.trim();
    let proofType = 'link';

    // Upload files if in file mode
    if (proofMode === 'file' && filesToUpload.length > 0) {
      setUploading(true);
      try {
        const uploadedProofs: { url: string; type: string }[] = [];
        for (const file of filesToUpload) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${task.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const { data, error } = await supabase.storage.from('task-proofs').upload(fileName, file);
          if (error) throw error;
          const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(data.path);
          uploadedProofs.push({
            url: urlData.publicUrl,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'pdf',
          });
        }
        // Use first file as primary proof
        finalProofUrl = uploadedProofs[0].url;
        proofType = uploadedProofs[0].type;

        // Save all proofs to the new table
        const proofInserts = uploadedProofs.map(p => ({
          task_id: task.id,
          user_id: user.id,
          proof_url: p.url,
          proof_type: p.type,
          caption: task.title,
        }));
        await supabase.from('task_completion_proofs').insert(proofInserts);
      } catch (error) {
        console.error('Upload error:', error);
        toast({ title: t('taskUploadError'), variant: 'destructive' });
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (finalProofUrl) {
      // Save link proof to new table
      await supabase.from('task_completion_proofs').insert({
        task_id: task.id,
        user_id: user.id,
        proof_url: finalProofUrl,
        proof_type: 'link',
        caption: task.title,
      });
    }
    
    if (!finalProofUrl) {
      toast({ title: t('taskAddProof'), variant: 'destructive' });
      return;
    }
    
    setCompleting(true);
    
    // If this is just adding more proofs to a completed task
    if (showAddMoreProof) {
      setShowAddMoreProof(false);
      setShowCompleteModal(false);
      setProofUrl('');
      setProofFile(null);
      setProofFiles([]);
      toast({ title: language === 'pt' ? 'Prova adicionada com sucesso!' : 'Proof added successfully!' });
      setCompleting(false);
      onRefresh?.();
      return;
    }
    
    // If owner, complete directly
    if (isOwner) {
      if (onComplete) {
        const result = await onComplete(task.id, finalProofUrl, proofType);
        if (result.success) {
          setShowCompleteModal(false);
          setProofUrl('');
          setProofFile(null);
          setProofFiles([]);
          toast({
            title: t('taskCompletedSuccess'),
            description: result.txHash ? `${t('taskRegisteredBlockchain')} ${result.txHash.slice(0, 10)}...` : t('taskProofRegistered')
          });
          onClose();
        }
      }
    } else {
      // Collaborator submits proof
      const { error } = await supabase
        .from('task_collaborators')
        .update({
          completion_proof_url: finalProofUrl,
          completion_proof_type: proofType,
          completed_at: new Date().toISOString()
        })
        .eq('task_id', task.id)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error saving completion proof:', error);
        toast({ title: t('error'), variant: 'destructive' });
      } else {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          await supabase.functions.invoke('create-notification', {
            body: {
              user_id: task.created_by,
              task_id: task.id,
              type: 'completion_pending',
              message: `${profile?.full_name || 'Um colaborador'} enviou uma prova de conclusão para a tarefa "${task.title}". Confirme para concluir.`
            }
          });
        } catch (err) {
          console.warn('Error sending notification:', err);
        }
        
        setShowCompleteModal(false);
        setProofUrl('');
        setProofFile(null);
        setProofFiles([]);
        toast({
          title: t('taskProofSubmitted'),
          description: t('taskProofSubmittedDescription')
        });
        onClose();
      }
    }
    setCompleting(false);
  };

  const handleConfirmCompletion = async () => {
    if (!task || !onComplete || !pendingCompletionProof) return;
    
    setConfirming(true);
    const result = await onComplete(task.id, pendingCompletionProof.url, pendingCompletionProof.type);
    if (result.success) {
      toast({
        title: t('taskCompletedSuccess'),
        description: result.txHash ? `${t('taskRegisteredBlockchain')} ${result.txHash.slice(0, 10)}...` : t('taskProofRegistered')
      });
      onClose();
    }
    setConfirming(false);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast({ title: t('taskInvalidFileType'), variant: 'destructive' });
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: t('taskFileTooLarge'), variant: 'destructive' });
        continue;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      setProofFiles(prev => [...prev, ...validFiles]);
      setProofFile(validFiles[0]); // backward compat
    }
  };
  const handleCancelCollaboration = async () => {
    if (!task || !user) return;
    
    setCancelingInterest('collaborate');
    const result = await cancelInterest(task.id, 'collaborate');
    setCancelingInterest(null);
    if (result.success) {
      setUserHasCollaborated(false);
      fetchCollaborators();
      toast({ title: t('taskCollaborationCanceled') });
    } else {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const handleCancelRequest = async () => {
    if (!task || !user) return;
    
    setCancelingInterest('request');
    const result = await cancelInterest(task.id, 'request');
    setCancelingInterest(null);
    if (result.success) {
      setUserHasRequested(false);
      fetchCollaborators();
      toast({ title: t('taskRequestCanceled') });
    } else {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const handleCollaborate = async () => {
    if (!task || !user) return;
    
    const { error } = await supabase.from('task_collaborators').insert({
      task_id: task.id,
      user_id: user.id,
      status: 'collaborate'
    });
    if (!error) {
      setUserHasCollaborated(true);
      // Create notification for task owner
      try {
        await supabase.rpc('create_notification', {
          _user_id: task.created_by,
          _task_id: task.id,
          _type: 'collaboration_request',
          _message: `Alguém quer colaborar na sua tarefa: "${task.title}"`
        });
      } catch (notifError) {
        console.warn('Failed to create notification:', notifError);
      }
      fetchCollaborators();
      toast({
        title: t('taskCollaborationSent')
      });
    } else if (error.code === '23505') {
      toast({
        title: t('taskAlreadyCollaborated')
      });
    }
  };
  const handleRequest = async () => {
    if (!task || !user) return;
    
    const { error } = await supabase.from('task_collaborators').insert({
      task_id: task.id,
      user_id: user.id,
      status: 'request'
    });
    if (!error) {
      setUserHasRequested(true);
      // Create notification for task owner
      try {
        await supabase.rpc('create_notification', {
          _user_id: task.created_by,
          _task_id: task.id,
          _type: 'help_request',
          _message: `Alguém solicitou sua tarefa: "${task.title}"`
        });
      } catch (notifError) {
        console.warn('Failed to create notification:', notifError);
      }
      fetchCollaborators();
      toast({
        title: t('taskRequestSent')
      });
    } else if (error.code === '23505') {
      toast({
        title: t('taskAlreadyRequested')
      });
    }
  };

  const handleApproveCollaborator = async (collab: TaskCollaborator) => {
    if (!task) return;
    setProcessingApproval(collab.id);
    const result = await approveCollaborator(collab.id, task.id, collab.user_id, task.title, task.created_by);
    setProcessingApproval(null);
    if (result.success) {
      fetchCollaborators();
      toast({ title: t('collaboratorApproved') });
    }
  };

  const handleRejectCollaborator = async (collab: TaskCollaborator) => {
    if (!task) return;
    setProcessingApproval(collab.id);
    const result = await rejectCollaborator(collab.id, task.id, collab.user_id, task.title);
    setProcessingApproval(null);
    if (result.success) {
      fetchCollaborators();
      toast({ title: t('collaboratorRejected') });
    }
  };

  const handleToggleCollaboration = async (value: boolean) => {
    if (!task) return;
    setAllowCollaboration(value);
    const result = await updateTaskSettings(task.id, { allow_collaboration: value });
    if (result.success) {
      toast({ title: t('settingsSaved') });
      onRefresh?.();
    }
  };

  const handleToggleRequests = async (value: boolean) => {
    if (!task) return;
    setAllowRequests(value);
    const result = await updateTaskSettings(task.id, { allow_requests: value });
    if (result.success) {
      toast({ title: t('settingsSaved') });
      onRefresh?.();
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !onDelete) return;
    setDeleting(true);
    const success = await onDelete(task.id);
    setDeleting(false);
    if (success) {
      toast({ title: t('taskDeleteSuccess') });
      onClose();
    } else {
      toast({ title: t('taskDeleteError'), variant: 'destructive' });
    }
  };

  // Helper function to extract YouTube video ID
  const getYouTubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  if (!task) return null;
  const isOwner = user?.id === task.created_by;
  const isApprovedCollaborator = [...collaborators, ...requesters].some(
    c => c.user_id === user?.id && c.approval_status === 'approved'
  );
  const canComplete = isOwner || isApprovedCollaborator;
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
      return format(new Date(task.created_at), "dd 'de' MMMM 'de' yyyy", {
        locale: dateLocale
      });
    }
    return format(new Date(task.created_at), "MMMM dd, yyyy", {
      locale: dateLocale
    });
  };
  return <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] sm:w-auto sm:max-w-2xl p-3 sm:p-6 [&>*]:min-w-0">
          {/* Header: Type badge + Title + Status */}
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getTaskTypeStyles()}`}>
                    {getTaskTypeLabel()}
                  </span>
                  {isCompleted && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('taskCompleted')}
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-2 min-w-0">
                  <DialogTitle className="text-lg sm:text-2xl leading-tight break-words min-w-0 flex-1" translate="yes">{task.title}</DialogTitle>
                  {isOwner && !isCompleted && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground" onClick={() => onEdit?.(task)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Creator + Date + Deadline inline */}
          <div className="flex items-center gap-3 flex-wrap">
            <UserAvatar userId={task.created_by} name={task.creator?.full_name} avatarUrl={task.creator?.avatar_url} size="md" showName />
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{formatCreatedDate()}</span>
            {task.deadline && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('taskDeadlineLabel')}: {format(new Date(task.deadline), "dd/MM/yyyy", { locale: dateLocale })}
                </span>
              </>
            )}
          </div>

          {/* Task Image */}
          {task.image_url && !isCompleted && (
            <div className="rounded-xl overflow-hidden">
              <img 
                src={task.image_url} 
                alt={task.title}
                className="w-full max-h-64 object-contain rounded-xl max-w-full"
              />
            </div>
          )}

          {/* Description */}
          {task.description && (
            <p className="text-muted-foreground text-sm leading-relaxed" translate="yes">{task.description}</p>
          )}

          {/* Tags + Votes/Likes row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <TagBadge 
                    key={tag.id} 
                    name={tag.name} 
                    category={tag.category}
                    displayName={getTranslatedName(tag)}
                    size="sm"
                    onClick={() => navigate(`/tags/${tag.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Votes / Likes */}
            <div className="flex items-center gap-2 ml-auto">
              {!isCompleted && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleVote('up')} className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-sm transition-colors ${userVote === 'up' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}>
                    <ArrowUp className="w-4 h-4" />
                    <span>{task.upvotes || 0}</span>
                  </button>
                  <button onClick={() => handleVote('down')} className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-sm transition-colors ${userVote === 'down' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5'}`}>
                    <ArrowDown className="w-4 h-4" />
                    <span>{task.downvotes || 0}</span>
                  </button>
                </div>
              )}
              {isCompleted && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleLike('like')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all ${userLike === 'like' ? 'bg-green-500/20 text-green-600' : 'bg-muted/50 text-muted-foreground hover:bg-green-500/10 hover:text-green-600'}`}>
                    <ThumbsUp className={`w-3.5 h-3.5 ${userLike === 'like' ? 'fill-current' : ''}`} />
                    <span className="font-medium">{likeCounts.likes}</span>
                  </button>
                  <button onClick={() => handleLike('dislike')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all ${userLike === 'dislike' ? 'bg-red-500/20 text-red-600' : 'bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-600'}`}>
                    <ThumbsDown className={`w-3.5 h-3.5 ${userLike === 'dislike' ? 'fill-current' : ''}`} />
                    <span className="font-medium">{likeCounts.dislikes}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Task Rating - only for completed tasks */}
          {isCompleted && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span className="text-sm font-medium">{t('taskEvaluation')}</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={taskRating.average} size="sm" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {taskRating.total > 0 ? `${taskRating.average.toFixed(1)} (${taskRating.total})` : t('noRatingsYet')}
                </span>
              </div>
            </div>
          )}

          {/* Completion Proof - Highlighted Section */}
          {isCompleted && task.completion_proof_url && <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {t('taskCompletionProof')}
              </h4>
              
              {/* Image Proof */}
              {task.completion_proof_type === 'image' && (
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src={task.completion_proof_url} 
                    alt={t('taskCompletionProof')}
                    className="w-full max-h-64 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-w-full"
                    onClick={() => window.open(task.completion_proof_url!, '_blank')}
                  />
                </div>
              )}
              
              {/* Video Proof */}
              {task.completion_proof_type === 'video' && (
                <div className="rounded-lg overflow-hidden">
                  <video 
                    src={task.completion_proof_url} 
                    controls
                    className="w-full max-h-64 rounded-lg"
                  />
                </div>
              )}
              
              {/* Audio Proof */}
              {task.completion_proof_type === 'audio' && (
                <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                  <Music className="w-8 h-8 text-primary flex-shrink-0" />
                  <audio src={task.completion_proof_url} controls className="w-full" />
                </div>
              )}
              
              {/* PDF Proof */}
              {task.completion_proof_type === 'pdf' && (
                <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t('taskPdfProof')}</p>
                    <a 
                      href={task.completion_proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary hover:underline"
                    >
                      {t('viewDocument')}
                    </a>
                  </div>
                </div>
              )}
              
              {/* Link Proof with Preview */}
              {task.completion_proof_type === 'link' && (
                <div>
                  {(task.completion_proof_url.includes('youtube.com') || task.completion_proof_url.includes('youtu.be')) ? (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(task.completion_proof_url)}`}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  ) : (
                    <a 
                      href={task.completion_proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <LinkIcon className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm text-primary truncate">{task.completion_proof_url}</span>
                    </a>
                  )}
                </div>
              )}
              
              {task.blockchain_tx_hash && <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium text-primary flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {t('taskBlockchainRegistered')}
                  </p>
                  <a href={`https://sepolia.scrollscan.com/tx/${task.blockchain_tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary mt-1 block truncate">
                    TX: {task.blockchain_tx_hash}
                  </a>
                </div>}

              {/* Add More Proofs Button */}
              {(isOwner || isApprovedCollaborator) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-dashed"
                  onClick={() => {
                    setShowAddMoreProof(true);
                    setShowCompleteModal(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <Upload className="w-4 h-4" />
                  {language === 'pt' ? 'Adicionar mais provas de conclusão' : 'Add more completion proofs'}
                </Button>
              )}
            </div>}

          {/* Pending Completion Proof - Show to owner when collaborator submitted proof */}
          {!isCompleted && isOwner && pendingCompletionProof && (
            <div>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-yellow-600">
                  <Award className="w-5 h-5" />
                  {t('taskPendingConfirmation')}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {pendingCompletionProof.userName} enviou uma prova de conclusão:
                </p>
                
                {/* Show the proof */}
                {pendingCompletionProof.type === 'image' && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img 
                      src={pendingCompletionProof.url} 
                      alt={t('taskCompletionProof')}
                      className="w-full max-h-64 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-w-full"
                      onClick={() => window.open(pendingCompletionProof.url, '_blank')}
                    />
                  </div>
                )}
                
                {pendingCompletionProof.type === 'video' && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <video src={pendingCompletionProof.url} controls className="w-full max-h-64 rounded-lg" />
                  </div>
                )}
                
                {pendingCompletionProof.type === 'audio' && (
                  <div className="mb-3 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                    <Music className="w-8 h-8 text-primary flex-shrink-0" />
                    <audio src={pendingCompletionProof.url} controls className="w-full" />
                  </div>
                )}
                
                {pendingCompletionProof.type === 'pdf' && (
                  <div className="mb-3 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t('taskPdfProof')}</p>
                      <a 
                        href={pendingCompletionProof.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-primary hover:underline"
                      >
                        {t('viewDocument')}
                      </a>
                    </div>
                  </div>
                )}
                
                {pendingCompletionProof.type === 'link' && (
                  <a 
                    href={pendingCompletionProof.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 p-3 mb-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <LinkIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-primary truncate">{pendingCompletionProof.url}</span>
                  </a>
                )}
                
                <Button 
                  onClick={handleConfirmCompletion} 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={confirming}
                >
                  {confirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('taskConfirmCompletionAction')}
                </Button>
              </div>
            </div>
          )}

          {/* Actions - Complete + Settings + Collaborate/Request */}
          {!isCompleted && <div className="flex flex-col gap-3 pt-2 border-t border-border/50">
              {/* For owner with no pending proof, or approved collaborator */}
              {canComplete && !(isOwner && pendingCompletionProof) && (
                <div className="flex gap-2">
                  <Button onClick={() => setShowCompleteModal(true)} className="flex-1 bg-gradient-primary hover:opacity-90">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isOwner ? t('taskMarkComplete') : t('taskSubmitProof')}
                  </Button>
                  
                  {/* Delete Button - only for owner */}
                  {isOwner && onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={deleting}>
                          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('taskDeleteConfirm')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('taskDeleteConfirmDescription')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t('confirmDelete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
              
              {/* Task Settings for Owner - Collapsible */}
              {isOwner && (
                <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        {t('taskSettingsCollapsible')}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                      <TaskSettingsPanel
                        settings={taskSettings}
                        onChange={(s) => {
                          setTaskSettings(s);
                          setAllowCollaboration(s.allowCollaboration);
                          setAllowRequests(s.allowRequests);
                        }}
                        onSaveField={async (field, value) => {
                          const fieldMap: Record<string, string> = {
                            allowCollaboration: 'allow_collaboration',
                            allowRequests: 'allow_requests',
                            autoApproveCollaborators: 'auto_approve_collaborators',
                            autoApproveRequesters: 'auto_approve_requesters',
                            maxCollaborators: 'max_collaborators',
                            maxRequesters: 'max_requesters',
                            repeatType: 'repeat_type',
                            repeatConfig: 'repeat_config',
                            repeatEndDate: 'repeat_end_date',
                            repeatOccurrences: 'repeat_occurrences',
                            enableStreak: 'enable_streak',
                          };
                          const dbField = fieldMap[field];
                          if (!dbField || !task) return;
                          await supabase.from('tasks').update({ [dbField]: value }).eq('id', task.id).eq('created_by', user!.id);
                          toast({ title: t('settingsSaved') });
                          onRefresh?.();
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              {/* Collaborate/Request buttons for non-owners who haven't been approved */}
              {!isOwner && !isApprovedCollaborator && (
                <div className="flex gap-3">
                  {allowCollaboration ? (
                    userHasCollaborated ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            disabled={cancelingInterest === 'collaborate'}
                            variant="default"
                            className="bg-success hover:bg-success/90 text-success-foreground"
                          >
                            {cancelingInterest === 'collaborate' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <HandHelping className="w-4 h-4 mr-2" />
                            )}
                            {t('taskYouAreCollaborating')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('cancelCollaborationTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('cancelCollaborationDescription')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelCollaboration}>
                              {t('confirmCancel')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button 
                        onClick={handleCollaborate} 
                        variant="outline"
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        <HandHelping className="w-4 h-4 mr-2" />
                        {t('taskCollaborate')}
                      </Button>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground italic">{t('collaborationDisabled')}</span>
                  )}
                  {allowRequests ? (
                    userHasRequested ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            disabled={cancelingInterest === 'request'}
                            variant="default"
                            className="bg-pink-600 hover:bg-pink-600/90 text-white"
                          >
                            {cancelingInterest === 'request' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Hand className="w-4 h-4 mr-2" />
                            )}
                            {t('taskYouRequested')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('cancelRequestTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('cancelRequestDescription')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelRequest}>
                              {t('confirmCancel')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button 
                        onClick={handleRequest}
                        variant="outline"
                      >
                        <Hand className="w-4 h-4 mr-2" />
                        {t('taskRequestAction')}
                      </Button>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground italic">{t('requestsDisabled')}</span>
                  )}
                </div>
              )}
            </div>}

          {/* === HIGHLIGHTED SECTIONS === */}

          {/* Related Tasks & Subtask */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <RelatedTasksSection
              task={task} 
              onTaskClick={(relatedTask) => {
                if (onOpenRelatedTask) {
                  onClose();
                  setTimeout(() => onOpenRelatedTask(relatedTask), 100);
                }
              }} 
            />

            {!isCompleted && (isOwner || isApprovedCollaborator) && onCreateSubtask && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
                onClick={() => onCreateSubtask(task)}
              >
                <Plus className="w-3.5 h-3.5" />
                <GitBranch className="w-3.5 h-3.5" />
                {language === 'pt' ? 'Criar Subtarefa' : 'Create Subtask'}
              </Button>
            )}
          </div>

          {/* Interested People - Collaborators and Requesters */}
          {(collaborators.length > 0 || requesters.length > 0) && <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                {t('taskInterestedPeople')}
              </h4>
              
              {collaborators.length > 0 && <div className="mb-4">
                  <p className="text-sm text-success font-medium mb-2 flex items-center gap-2">
                    <HandHelping className="w-4 h-4" />
                    {t('taskCollaborators')} ({collaborators.length})
                  </p>
                  <div className="space-y-2">
                    {collaborators.map(collab => (
                      <div key={collab.id} className="flex items-center justify-between bg-success/10 rounded-lg px-3 py-2">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/profile/${collab.user_id}`)}
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={collab.profile?.avatar_url || ''} />
                            <AvatarFallback className="text-xs bg-success/20 text-success">
                              {collab.profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm hover:underline">{collab.profile?.full_name || t('user')}</span>
                          {collab.approval_status === 'approved' && (
                            <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full">{t('approved')}</span>
                          )}
                          {collab.approval_status === 'pending' && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded-full">{t('pending')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Approval buttons for owner on pending collaborators */}
                          {isOwner && collab.approval_status === 'pending' && !isCompleted && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:bg-success/20" onClick={() => handleApproveCollaborator(collab)} disabled={processingApproval === collab.id}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/20" onClick={() => handleRejectCollaborator(collab)} disabled={processingApproval === collab.id}>
                                <XIcon className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {/* Rating for completed non-personal tasks */}
                          {isCompleted && task?.task_type !== 'personal' && requesters.some(r => r.user_id === user?.id) && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{t('yourRating')}:</span>
                              <StarRating rating={userRatings[collab.user_id] || 0} size="sm" interactive onRatingChange={rating => handleRateUser(collab.user_id, rating)} />
                            </div>
                          )}
                          {isCompleted && userRatings[collab.user_id] && !requesters.some(r => r.user_id === user?.id) && <StarRating rating={userRatings[collab.user_id]} size="sm" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>}
              
              {requesters.length > 0 && (
                <div>
                  <p className="text-sm text-pink-600 font-medium mb-2 flex items-center gap-2">
                    <Hand className="w-4 h-4" />
                    {t('taskRequesters')} ({requesters.length})
                  </p>
                  <div className="space-y-2">
                    {requesters.map(req => (
                      <div key={req.id} className="flex items-center justify-between bg-pink-600/10 rounded-lg px-3 py-2">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/profile/${req.user_id}`)}
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={req.profile?.avatar_url || ''} />
                            <AvatarFallback className="text-xs bg-pink-600/20 text-pink-600">
                              {req.profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm hover:underline">{req.profile?.full_name || t('user')}</span>
                          {req.approval_status === 'approved' && (
                            <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full">{t('approved')}</span>
                          )}
                          {req.approval_status === 'pending' && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded-full">{t('pending')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Approval buttons for owner on pending requesters */}
                          {isOwner && req.approval_status === 'pending' && !isCompleted && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:bg-success/20" onClick={() => handleApproveCollaborator(req)} disabled={processingApproval === req.id}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/20" onClick={() => handleRejectCollaborator(req)} disabled={processingApproval === req.id}>
                                <XIcon className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {/* Rating for completed non-personal tasks */}
                          {isCompleted && task?.task_type !== 'personal' && collaborators.some(c => c.user_id === user?.id) && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{t('yourRating')}:</span>
                              <StarRating rating={userRatings[req.user_id] || 0} size="sm" interactive onRatingChange={rating => handleRateUser(req.user_id, rating)} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task owner rating section - requesters can rate the task creator */}
              {isCompleted && task?.task_type !== 'personal' && !isOwner && <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    {t('rateTaskOwner')}
                  </p>
                  <div className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task?.creator?.avatar_url || ''} />
                        <AvatarFallback className="text-xs bg-primary/20 text-primary">
                          {task?.creator?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task?.creator?.full_name || t('user')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t('yourRating')}:</span>
                      <StarRating rating={userRatings[task?.created_by || ''] || 0} size="sm" interactive onRatingChange={rating => handleRateUser(task?.created_by || '', rating)} />
                    </div>
                  </div>
                </div>}
            </div>}

          {/* Comments */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              {t('taskComments')} ({comments.length})
            </h4>
            
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>

            <CommentInput
              onSend={handleAddComment}
              placeholder={t('taskAddComment')}
            />
          </div>

          {/* Feedback (only for completed tasks) */}
          {isCompleted && <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {t('taskFeedback')} ({feedback.length})
              </h4>
              
              <div className="space-y-3 mb-4">
                {feedback.map(fb => <div key={fb.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{fb.profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-primary/5 rounded-lg p-3">
                      <p className="text-sm font-medium">{fb.profile?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{fb.content}</p>
                    </div>
                  </div>)}
              </div>

              <div className="flex gap-2">
                <Textarea value={newFeedback} onChange={e => setNewFeedback(e.target.value)} placeholder={t('taskLeaveFeedback')} className="min-h-[80px]" />
              </div>
              <Button onClick={handleAddFeedback} className="mt-2">
                {t('taskSendFeedback')}
              </Button>
            </div>}

          {/* Task History */}
          <div className="rounded-xl border border-border bg-card p-4">
            <TaskHistorySection
              history={history} 
              loading={historyLoading} 
              taskImageUrl={task.image_url}
              taskCompletionProofUrl={task.completion_proof_url}
              taskCompletionProofType={task.completion_proof_type}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Task Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showAddMoreProof 
                ? (language === 'pt' ? 'Adicionar Provas' : 'Add Proofs')
                : t('taskCompleteTitle')
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {showAddMoreProof
                ? (language === 'pt' ? 'Adicione mais fotos, documentos ou links como prova de conclusão.' : 'Add more photos, documents or links as completion proof.')
                : t('taskCompleteDescription')
              }
            </p>
            
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button variant={proofMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setProofMode('file')} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                {t('taskUploadFile')}
              </Button>
              <Button variant={proofMode === 'link' ? 'default' : 'outline'} size="sm" onClick={() => setProofMode('link')} className="flex-1">
                <LinkIcon className="w-4 h-4 mr-2" />
                {t('taskExternalLink')}
              </Button>
            </div>

            {proofMode === 'file' ? <div className="space-y-3">
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,video/*,audio/*" onChange={handleFileChange} className="hidden" multiple />
                
                {/* Selected files list */}
                {proofFiles.length > 0 && (
                  <div className="space-y-2">
                    {proofFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 bg-muted rounded-lg">
                        {file.type.startsWith('image/') ? <Image className="w-6 h-6 text-primary flex-shrink-0" /> : file.type.startsWith('video/') ? <Video className="w-6 h-6 text-primary flex-shrink-0" /> : file.type.startsWith('audio/') ? <Music className="w-6 h-6 text-primary flex-shrink-0" /> : <FileText className="w-6 h-6 text-primary flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => {
                          setProofFiles(prev => prev.filter((_, i) => i !== idx));
                          if (idx === 0) setProofFile(proofFiles[1] || null);
                        }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="outline" className="w-full h-20 border-dashed" onClick={() => fileInputRef.current?.click()}>
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">
                      {proofFiles.length > 0 
                        ? (language === 'pt' ? 'Adicionar mais arquivos' : 'Add more files')
                        : t('taskClickToSelect')
                      }
                    </span>
                    <span className="text-xs text-muted-foreground">{t('taskMax10MB')}</span>
                  </div>
                </Button>
              </div> : <Input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder={t('taskPasteLinkHere')} />}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setShowCompleteModal(false);
                setShowAddMoreProof(false);
                setProofFile(null);
                setProofFiles([]);
                setProofUrl('');
              }} className="flex-1">
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmitProof} className="flex-1 bg-gradient-primary hover:opacity-90" disabled={(proofMode === 'file' ? proofFiles.length === 0 : !proofUrl.trim()) || completing || uploading}>
                {(completing || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? t('taskSending') : (showAddMoreProof ? (language === 'pt' ? 'Enviar' : 'Submit') : t('taskConfirmCompletion'))}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>;
}