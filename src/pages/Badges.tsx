import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBadges, BadgeCategory, UserBadge, LEVEL_THRESHOLDS, getLevelName } from '@/hooks/useBadges';
import { BadgeSVG } from '@/components/badges/BadgeSVG';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { Task } from '@/types';

type CategoryInfo = {
  key: BadgeCategory;
  icon: string;
  label: (lang: string) => string;
  desc: (lang: string) => string;
};

const CATEGORIES: CategoryInfo[] = [
  {
    key: 'taskmates', icon: '🤝',
    label: l => l === 'pt' ? 'Taskmates' : 'Taskmates',
    desc: l => l === 'pt' ? 'Indica seus maiores parceiros de equipe. Desbloqueado ao concluir tarefas juntos.' : 'Indicates your top teammates. Earned by completing tasks together.',
  },
  {
    key: 'habits', icon: '🎯',
    label: l => l === 'pt' ? 'Hábitos' : 'Habits',
    desc: l => l === 'pt' ? 'Indica seus comportamentos-alvo. Desbloqueado ao concluir tarefas com a mesma tag de habilidade.' : 'Indicates your target behaviors. Earned by completing tasks with the same skill tag.',
  },
  {
    key: 'communities', icon: '🌐',
    label: l => l === 'pt' ? 'Comunidades' : 'Communities',
    desc: l => l === 'pt' ? 'Indica as comunidades em que você é mais ativo. Desbloqueado ao concluir tarefas com a mesma tag de comunidade.' : 'Indicates your most active communities. Earned by completing tasks with the same community tag.',
  },
  {
    key: 'leadership', icon: '👑',
    label: l => l === 'pt' ? 'Liderança' : 'Leadership',
    desc: l => l === 'pt' ? 'Indica sua capacidade de mobilizar pessoas. Desbloqueado ao reunir colaboradores e solicitadores em uma tarefa sua.' : 'Indicates your ability to mobilize people. Earned by gathering collaborators and requesters in your task.',
  },
  {
    key: 'collaboration', icon: '💪',
    label: l => l === 'pt' ? 'Colaboração' : 'Collaboration',
    desc: l => l === 'pt' ? 'Indica seu companheirismo. Desbloqueado ao concluir tarefas como colaborador de outras pessoas.' : 'Indicates your teamwork spirit. Earned by completing tasks as a collaborator for others.',
  },
  {
    key: 'positive_impact', icon: '✨',
    label: l => l === 'pt' ? 'Impacto Positivo' : 'Positive Impact',
    desc: l => l === 'pt' ? 'Indica o reconhecimento das suas tarefas. Desbloqueado ao acumular likes em uma mesma tarefa concluída.' : 'Indicates the recognition of your tasks. Earned by accumulating likes on a single completed task.',
  },
  {
    key: 'sociability', icon: '🌟',
    label: l => l === 'pt' ? 'Sociabilidade' : 'Sociability',
    desc: l => l === 'pt' ? 'Indica sua capacidade de construir redes. Desbloqueado ao acumular seguidores.' : 'Indicates your ability to build networks. Earned by accumulating followers.',
  },
  {
    key: 'reliability', icon: '🛡️',
    label: l => l === 'pt' ? 'Confiabilidade' : 'Reliability',
    desc: l => l === 'pt' ? 'Indica sua integridade. Desbloqueado ao receber avaliações máximas consecutivas.' : 'Indicates your integrity. Earned by receiving consecutive maximum ratings.',
  },
  {
    key: 'consistency', icon: '🔥',
    label: l => l === 'pt' ? 'Consistência' : 'Consistency',
    desc: l => l === 'pt' ? 'Indica seu comprometimento pessoal. Desbloqueado ao acumular streaks em tarefas repetidas.' : 'Indicates your personal commitment. Earned by accumulating streaks in repeated tasks.',
  },
];

interface BadgeTaskHistoryProps {
  badge: UserBadge;
  onClose: () => void;
}

function BadgeTaskHistory({ badge, onClose }: BadgeTaskHistoryProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      let taskIds: string[] = [];

      if (badge.category === 'taskmates' && badge.entity_id) {
        const { data: myCollabs } = await supabase
          .from('task_collaborators')
          .select('task_id')
          .eq('user_id', badge.user_id)
          .eq('approval_status', 'approved');
        const { data: theirCollabs } = await supabase
          .from('task_collaborators')
          .select('task_id')
          .eq('user_id', badge.entity_id)
          .eq('approval_status', 'approved');
        const mySet = new Set(myCollabs?.map(c => c.task_id) || []);
        const theirSet = new Set(theirCollabs?.map(c => c.task_id) || []);
        taskIds = [...mySet].filter(id => theirSet.has(id));
      } else if ((badge.category === 'habits' || badge.category === 'communities' || badge.category === 'positive_impact' || badge.category === 'consistency') && badge.entity_id) {
        const { data: taggedTasks } = await supabase
          .from('task_tags')
          .select('task_id')
          .eq('tag_id', badge.entity_id);
        taskIds = taggedTasks?.map(tt => tt.task_id) || [];
      } else if (badge.category === 'collaboration') {
        const { data: collabs } = await supabase
          .from('task_collaborators')
          .select('task_id')
          .eq('user_id', badge.user_id)
          .eq('status', 'collaborator')
          .eq('approval_status', 'approved');
        taskIds = collabs?.map(c => c.task_id) || [];
      } else if (badge.category === 'leadership') {
        const { data: myTasks } = await supabase.from('tasks').select('id').eq('created_by', badge.user_id);
        taskIds = myTasks?.map(t => t.id) || [];
      }

      if (taskIds.length === 0) { setLoading(false); return; }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)')
        .in('id', taskIds)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(20);

      setTasks((tasksData || []) as unknown as Task[]);
      setLoading(false);
    };
    fetchTasks();
  }, [badge]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <BadgeSVG category={badge.category} level={badge.level} entityName={badge.entity_name} size={48} />
            <div>
              <h3 className="font-semibold text-sm">{t('badgesTaskHistory')}</h3>
              <p className="text-xs text-muted-foreground">{badge.entity_name || badge.category}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">{t('loading')}</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">{t('badgesNoTaskHistory')}</div>
          ) : tasks.map(task => (
            <div key={task.id} className="flex flex-col gap-0.5">
              <TaskCardMini task={task} onClick={() => {}} />
              <p className="text-xs text-muted-foreground pl-2">
                {t('badgesCompletedOn')}: {format(new Date(task.updated_at), 'dd/MM/yyyy', { locale: dateLocale })}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function Badges() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { galleryBadges, loading, computeAndSyncBadges } = useBadges(userId);

  const isOwnProfile = user?.id === userId;
  const [syncing, setSyncing] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [filterCategory, setFilterCategory] = useState<BadgeCategory | 'all'>('all');
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    const cat = searchParams.get('category') as BadgeCategory | null;
    if (cat) setFilterCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('full_name').eq('id', userId).single().then(({ data }) => {
      if (data) setProfileName(data.full_name || '');
    });
  }, [userId]);

  const handleSync = async () => {
    if (!isOwnProfile) return;
    setSyncing(true);
    await computeAndSyncBadges();
    setSyncing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => userId ? navigate(`/profile/${userId}`) : navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              {isOwnProfile ? t('badgesPageTitle') : `${profileName} — ${t('badgesTitle')}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('badgesPageSubtitle')}</p>
          </div>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2">
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              {t('badgesSyncNow')}
            </Button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <button
            onClick={() => setFilterCategory('all')}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              filterCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {t('badgesFilterAll')}
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                filterCategory === cat.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat.icon} {cat.label(language)}
            </button>
          ))}
        </div>

        {/* Level Requirements — shared for all categories */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft mb-6"
        >
          <h2 className="font-semibold text-sm mb-1">{t('badgesRequirement')}</h2>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'pt'
              ? 'Os requisitos de nível são os mesmos para todas as categorias de selos.'
              : 'Level requirements are the same for all badge categories.'}
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {LEVEL_THRESHOLDS.map((threshold, i) => {
              const level = i + 1;
              const levelName = getLevelName(level, language as 'pt' | 'en');
              const hasAnyEarned = galleryBadges.some(b => b.level >= level);
              return (
                <div
                  key={level}
                  className={cn(
                    "text-center px-1 py-1.5 rounded-lg transition-all",
                    hasAnyEarned ? 'bg-primary/15 text-primary font-semibold' : 'bg-muted/50 text-muted-foreground'
                  )}
                >
                  <div className="font-bold text-[10px] truncate">{levelName}</div>
                  <div className="text-[9px] opacity-70">{threshold >= 1000000 ? `${threshold/1000000}M` : threshold >= 1000 ? `${threshold/1000}k` : threshold}</div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Category Sections */}
        <div className="space-y-6">
          {CATEGORIES.filter(cat => filterCategory === 'all' || filterCategory === cat.key).map(cat => {
            const earned = galleryBadges.filter(b => b.category === cat.key);
            return (
              <motion.section
                key={cat.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-5 border border-border/50 shadow-soft"
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-base">{cat.label(language)}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.desc(language)}</p>
                  </div>
                  {earned.length > 0 && (
                    <Badge variant="secondary" className="flex-shrink-0">{earned.length}</Badge>
                  )}
                </div>

                {/* Badges row */}
                {earned.length === 0 ? (
                  <div className="flex items-center gap-3">
                    <BadgeSVG category={cat.key} level={1} locked size={80} />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('badgesNoBadges')}</p>
                      <p className="text-xs text-muted-foreground/70">{t('badgesNoBadgesDesc')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {earned.map(badge => (
                      <button
                        key={badge.id}
                        onClick={() => setSelectedBadge(badge)}
                        className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
                      >
                        <BadgeSVG
                          category={badge.category}
                          level={badge.level}
                          entityName={badge.entity_name}
                          size={88}
                        />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(badge.earned_at), 'dd/MM/yy')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.section>
            );
          })}
        </div>
      </div>

      {selectedBadge && (
        <BadgeTaskHistory badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}
