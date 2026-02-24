import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Link as LinkIcon, User, Calendar, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface CompletionProof {
  id: string;
  task_id: string;
  user_id: string;
  proof_url: string;
  proof_type: string;
  caption: string | null;
  created_at: string;
  task_title: string;
  user_name: string | null;
  user_avatar: string | null;
}

interface MediaGalleryProps {
  taskIds: string[];
  onTaskClick: (task: Task) => void;
  tasks: Task[];
}

export function MediaGallery({ taskIds, onTaskClick, tasks }: MediaGalleryProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [proofs, setProofs] = useState<CompletionProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<CompletionProof | null>(null);

  useEffect(() => {
    if (taskIds.length > 0) {
      fetchProofs();
    } else {
      setProofs([]);
      setLoading(false);
    }
  }, [taskIds]);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      // Fetch from new table
      const { data: newProofs } = await supabase
        .from('task_completion_proofs')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false });

      // Also fetch legacy proofs from tasks table
      const { data: legacyTasks } = await supabase
        .from('tasks')
        .select('id, title, completion_proof_url, completion_proof_type, created_by, updated_at')
        .in('id', taskIds)
        .not('completion_proof_url', 'is', null);

      // Also fetch legacy proofs from task_collaborators
      const { data: legacyCollabs } = await supabase
        .from('task_collaborators')
        .select('task_id, user_id, completion_proof_url, completion_proof_type, completed_at')
        .in('task_id', taskIds)
        .not('completion_proof_url', 'is', null);

      // Collect all user IDs
      const allUserIds = new Set<string>();
      newProofs?.forEach(p => allUserIds.add(p.user_id));
      legacyTasks?.forEach(t => allUserIds.add(t.created_by));
      legacyCollabs?.forEach(c => allUserIds.add(c.user_id));

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(allUserIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const taskMap = new Map(tasks.map(t => [t.id, t]));

      const combined: CompletionProof[] = [];

      // Add new proofs
      newProofs?.forEach(p => {
        const profile = profileMap.get(p.user_id);
        const task = taskMap.get(p.task_id);
        combined.push({
          id: p.id,
          task_id: p.task_id,
          user_id: p.user_id,
          proof_url: p.proof_url,
          proof_type: p.proof_type,
          caption: p.caption || task?.title || '',
          created_at: p.created_at,
          task_title: task?.title || '',
          user_name: profile?.full_name || null,
          user_avatar: profile?.avatar_url || null,
        });
      });

      // Track which proofs we already have to avoid duplicates
      const existingUrls = new Set(combined.map(p => p.proof_url));

      // Add legacy task proofs
      legacyTasks?.forEach(lt => {
        if (lt.completion_proof_url && !existingUrls.has(lt.completion_proof_url)) {
          const profile = profileMap.get(lt.created_by);
          combined.push({
            id: `legacy-task-${lt.id}`,
            task_id: lt.id,
            user_id: lt.created_by,
            proof_url: lt.completion_proof_url,
            proof_type: lt.completion_proof_type || 'link',
            caption: lt.title,
            created_at: lt.updated_at || '',
            task_title: lt.title,
            user_name: profile?.full_name || null,
            user_avatar: profile?.avatar_url || null,
          });
          existingUrls.add(lt.completion_proof_url);
        }
      });

      // Add legacy collaborator proofs
      legacyCollabs?.forEach(lc => {
        if (lc.completion_proof_url && !existingUrls.has(lc.completion_proof_url)) {
          const profile = profileMap.get(lc.user_id);
          const task = taskMap.get(lc.task_id);
          combined.push({
            id: `legacy-collab-${lc.task_id}-${lc.user_id}`,
            task_id: lc.task_id,
            user_id: lc.user_id,
            proof_url: lc.completion_proof_url,
            proof_type: lc.completion_proof_type || 'link',
            caption: task?.title || '',
            created_at: lc.completed_at || '',
            task_title: task?.title || '',
            user_name: profile?.full_name || null,
            user_avatar: profile?.avatar_url || null,
          });
          existingUrls.add(lc.completion_proof_url);
        }
      });

      // Sort by date
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProofs(combined);
    } catch (error) {
      console.error('Error fetching proofs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProofClick = (proof: CompletionProof) => {
    const task = tasks.find(t => t.id === proof.task_id);
    if (task) {
      onTaskClick(task);
    }
  };

  const isImageProof = (proof: CompletionProof) => {
    return proof.proof_type === 'image' || 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(proof.proof_url) ||
      proof.proof_url.includes('/storage/');
  };

  // Separate image proofs and link proofs
  const imageProofs = proofs.filter(p => isImageProof(p));
  const linkProofs = proofs.filter(p => !isImageProof(p));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (proofs.length === 0) {
    return (
      <div className="text-center py-6">
        <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {language === 'pt' ? 'Nenhuma mídia disponível' : 'No media available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instagram-style image grid */}
      {imageProofs.length > 0 && (
        <div className="grid grid-cols-3 gap-1">
          {imageProofs.map((proof, index) => (
            <motion.div
              key={proof.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="relative group cursor-pointer overflow-hidden rounded-sm"
              onClick={() => handleProofClick(proof)}
            >
              <AspectRatio ratio={1}>
                <img
                  src={proof.proof_url}
                  alt={proof.task_title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                  <div className="w-full min-w-0">
                    <p className="text-white text-xs font-medium line-clamp-1">{proof.task_title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Avatar className="w-3.5 h-3.5">
                        <AvatarImage src={proof.user_avatar || undefined} />
                        <AvatarFallback className="text-[6px] bg-white/20 text-white">
                          {proof.user_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white/80 text-[10px] truncate">{proof.user_name}</span>
                      <span className="text-white/60 text-[10px] ml-auto flex-shrink-0">
                        {proof.created_at && format(new Date(proof.created_at), 'dd/MM', { locale: dateLocale })}
                      </span>
                    </div>
                  </div>
                </div>
              </AspectRatio>
            </motion.div>
          ))}
        </div>
      )}

      {/* Link proofs */}
      {linkProofs.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5" />
            Links ({linkProofs.length})
          </h5>
          {linkProofs.map((proof) => (
            <div
              key={proof.id}
              onClick={() => handleProofClick(proof)}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarImage src={proof.user_avatar || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {proof.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{proof.task_title}</p>
                <p className="text-xs text-primary truncate">{proof.proof_url}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {proof.created_at && format(new Date(proof.created_at), 'dd/MM', { locale: dateLocale })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
