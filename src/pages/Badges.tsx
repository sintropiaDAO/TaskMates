import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from '@/lib/router-compat';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Award, Lock, Sparkles, Trophy } from 'lucide-react';
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
import { AdventureHeading } from '@/components/rpg/AdventureHeading';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { badgeProgress } from '@/lib/badge-progress';

const CATEGORY_TONES: Record<BadgeCategory, string> = {
  habits: 'achievement-tone-forest', collaboration: 'achievement-tone-water', proactivity: 'achievement-tone-sun',
  reliability: 'achievement-tone-water', leadership: 'achievement-tone-sun', positive_impact: 'achievement-tone-flower',
  consistency: 'achievement-tone-flower', sociability: 'achievement-tone-magic', taskmates: 'achievement-tone-forest', communities: 'achievement-tone-water',
};

type CategoryInfo = {
  key: BadgeCategory;
  icon: string;
  label: (lang: string) => string;
  desc: (lang: string) => string;
};

const CATEGORIES: CategoryInfo[] = [
  {
    key: 'habits', icon: '🎯',
    label: l => l === 'pt' ? 'Hábitos' : 'Habits',
    desc: l => l === 'pt' ? 'Indica seus comportamentos-alvo. Desbloqueado ao concluir tarefas com a mesma tag de habilidade.' : 'Indicates your target behaviors. Earned by completing tasks with the same skill tag.',
  },
  {
    key: 'collaboration', icon: '💪',
    label: l => l === 'pt' ? 'Colaboração' : 'Collaboration',
    desc: l => l === 'pt' ? 'Indica seu companheirismo. Desbloqueado ao concluir tarefas como colaborador de outras pessoas.' : 'Indicates your teamwork spirit. Earned by completing tasks as a collaborator for others.',
  },
  {
    key: 'proactivity', icon: '🚀',
    label: l => l === 'pt' ? 'Proatividade' : 'Proactivity',
    desc: l => l === 'pt' ? 'Indica sua capacidade de agir e tomar iniciativa em prol da comunidade. Desbloqueado ao criar tarefas do tipo oferta concluídas com ao menos um solicitador aprovado.' : 'Indicates your ability to act and take initiative for the community. Earned by creating offer tasks completed with at least one approved requester.',
  },
  {
    key: 'reliability', icon: '🛡️',
    label: l => l === 'pt' ? 'Confiabilidade' : 'Reliability',
    desc: l => l === 'pt' ? 'Indica sua integridade. Desbloqueado ao receber avaliações máximas consecutivas.' : 'Indicates your integrity. Earned by receiving consecutive maximum ratings.',
  },
  {
    key: 'leadership', icon: '👑',
    label: l => l === 'pt' ? 'Liderança' : 'Leadership',
    desc: l => l === 'pt' ? 'Indica sua capacidade de mobilizar pessoas. Desbloqueado ao reunir colaboradores e solicitadores em uma tarefa sua.' : 'Indicates your ability to mobilize people. Earned by gathering collaborators and requesters in your task.',
  },
  {
    key: 'positive_impact', icon: '✨',
    label: l => l === 'pt' ? 'Impacto Positivo' : 'Positive Impact',
    desc: l => l === 'pt' ? 'Indica o reconhecimento das suas tarefas. Desbloqueado ao acumular likes em uma mesma tarefa concluída.' : 'Indicates the recognition of your tasks. Earned by accumulating likes on a single completed task.',
  },
  {
    key: 'consistency', icon: '🔥',
    label: l => l === 'pt' ? 'Consistência' : 'Consistency',
    desc: l => l === 'pt' ? 'Indica seu comprometimento pessoal. Desbloqueado ao acumular streaks em tarefas repetidas.' : 'Indicates your personal commitment. Earned by accumulating streaks in repeated tasks.',
  },
  {
    key: 'sociability', icon: '🌟',
    label: l => l === 'pt' ? 'Sociabilidade' : 'Sociability',
    desc: l => l === 'pt' ? 'Indica sua capacidade de construir redes. Desbloqueado ao acumular seguidores.' : 'Indicates your ability to build networks. Earned by accumulating followers.',
  },
  {
    key: 'taskmates', icon: '🤝',
    label: l => l === 'pt' ? 'Taskmates' : 'Taskmates',
    desc: l => l === 'pt' ? 'Indica seus maiores parceiros de equipe. Desbloqueado ao concluir tarefas juntos.' : 'Indicates your top teammates. Earned by completing tasks together.',
  },
  {
    key: 'communities', icon: '🌐',
    label: l => l === 'pt' ? 'Comunidades' : 'Communities',
    desc: l => l === 'pt' ? 'Indica as comunidades em que você é mais ativo. Desbloqueado ao concluir tarefas com a mesma tag de comunidade.' : 'Indicates your most active communities. Earned by completing tasks with the same community tag.',
  },
];

interface BadgeTaskHistoryProps {
  badge: UserBadge;
  onClose: () => void;
}

function BadgeTaskHistory({ badge, onClose }: BadgeTaskHistoryProps) {
  const { t, language } = useLanguage();
  const progress = badgeProgress(badge.level, badge.metric_value);
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
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className={`achievement-world ${CATEGORY_TONES[badge.category]} max-w-md pb-6`}>
        <div className="flex flex-col items-center pt-2 text-center">
          <BadgeSVG category={badge.category} level={badge.level} entityName={badge.entity_name} size={140} />
          <DialogTitle className="mt-2 text-lg font-black">{badge.entity_name || CATEGORIES.find(c => c.key === badge.category)?.label(language)}</DialogTitle>
          <DialogDescription>{getLevelName(badge.level, language === 'pt' ? 'pt' : 'en')} · {format(new Date(badge.earned_at), 'dd/MM/yyyy')}</DialogDescription>
          <p className="mt-3 text-sm font-bold text-primary">{badge.metric_value} {language === 'pt' ? 'ações registradas' : 'recorded actions'}</p>
          {progress.target !== null && <div className="mt-2 w-full">
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="achievement-meter h-full" style={{ width: `${progress.percent}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{badge.metric_value}/{progress.target.toLocaleString(language)} · {language === 'pt' ? 'Próximo nível' : 'Next level'}</p>
          </div>}
        </div>
        <h3 className="border-t border-border pt-4 text-sm font-bold">{t('badgesTaskHistory')}</h3>
        <div className="space-y-2">
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
      </DialogContent>
    </Dialog>
  );
}

export default function Badges() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { galleryBadges, loading, computeAndSyncBadges } = useBadges(userId);
  const reduced = useReducedMotion();

  const isOwnProfile = user?.id === userId;
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

  // Auto-sync badges when own profile is viewed
  useEffect(() => {
    if (isOwnProfile) {
      computeAndSyncBadges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile]);

  return (
    <div className="achievement-world min-h-screen bg-background pb-24">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/dashboard')} className="mx-3 mt-4 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <AdventureHeading page title={isOwnProfile ? t('badgesPageTitle') : `${profileName} — ${t('badgesTitle')}`} subtitle={language === 'pt' ? 'Cada conquista faz a vida florescer.' : 'Every achievement helps life flourish.'} />
        <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 border-b border-border py-4">
          <p className="flex items-center gap-2 text-sm font-bold"><Award className="h-5 w-5 text-primary" />{galleryBadges.length} {language === 'pt' ? 'selos conquistados' : 'badges earned'}</p>
          <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Trophy className="h-4 w-4 text-warning" />12 {language === 'pt' ? 'níveis' : 'levels'}</span>
        </div>

        {/* Category Filter */}
        <div className="py-5">
          <Select value={filterCategory} onValueChange={value => setFilterCategory(value as BadgeCategory | 'all')}>
            <SelectTrigger aria-label={language === 'pt' ? 'Categoria de selos' : 'Badge category'} className="h-11 border-primary/30 bg-card font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('badgesFilterAll')}</SelectItem>
              {CATEGORIES.map(cat => <SelectItem key={cat.key} value={cat.key}>{cat.icon} {cat.label(language)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Category Sections */}
        {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground" role="status">{t('loading')}</div> : <div className="space-y-8">
          {CATEGORIES.filter(cat => filterCategory === 'all' || filterCategory === cat.key).map(cat => {
            const earned = galleryBadges.filter(b => b.category === cat.key);
            return (
              <motion.section
                key={cat.key}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-border pb-6"
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-lg">{cat.label(language)}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.desc(language)}</p>
                  </div>
                  {earned.length > 0 && (
                    <Badge variant="secondary" className="flex-shrink-0">{earned.length}</Badge>
                  )}
                </div>

                {/* Badges row */}
                {earned.length === 0 ? (
                  <div className={`achievement-control ${CATEGORY_TONES[cat.key]} flex items-center gap-3 rounded-lg border border-border p-3`}>
                    <BadgeSVG category={cat.key} level={1} locked size={80} />
                    <div>
                      <p className="flex items-center gap-1 text-sm font-bold"><Lock className="h-3.5 w-3.5" />{t('badgesNoBadges')}</p>
                      <p className="text-xs text-muted-foreground/70">{t('badgesNoBadgesDesc')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
                    {earned.map(badge => (
                      <Button variant="achievement"
                        key={badge.id}
                        onClick={() => setSelectedBadge(badge)}
                        aria-label={`${cat.label(language)}: ${badge.entity_name || getLevelName(badge.level, language === 'pt' ? 'pt' : 'en')}`}
                        className={`badge-collection-item ${CATEGORY_TONES[cat.key]} h-auto w-full min-w-0 flex flex-col items-center gap-1 px-3 py-4`}
                      >
                        <BadgeSVG
                          category={badge.category}
                          level={badge.level}
                          entityName={badge.entity_name}
                          size={112}
                        />
                        <span className="w-full break-words text-center text-xs font-bold leading-snug">{badge.entity_name || cat.label(language)}</span>
                        <span className="text-[11px] font-bold">{getLevelName(badge.level, language === 'pt' ? 'pt' : 'en')}</span>
                        {(() => { const p = badgeProgress(badge.level, badge.metric_value); return <div className="mt-2 w-full">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="achievement-meter h-full" style={{ width: `${p.percent}%` }} /></div>
                          <p className="mt-1 text-[10px] text-muted-foreground">{p.target !== null ? `${badge.metric_value}/${p.target.toLocaleString(language)}` : (language === 'pt' ? 'Nível máximo' : 'Maximum level')}</p>
                        </div>; })()}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(badge.earned_at), 'dd/MM/yy')}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </motion.section>
            );
          })}
        </div>}

        {/* Level Requirements — at the bottom */}
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 pb-6"
        >
          <h2 className="font-black text-base mb-1 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{t('badgesRequirement')}</h2>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'pt'
              ? 'Os requisitos de nível são os mesmos para todas as categorias de selos.'
              : 'Level requirements are the same for all badge categories.'}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {LEVEL_THRESHOLDS.map((threshold, i) => {
              const level = i + 1;
              const levelName = getLevelName(level, language as 'pt' | 'en');
              const hasAnyEarned = galleryBadges.some(b => b.level >= level);
              return (
                <div
                  key={level}
                  className={cn(
                    "text-center px-2 py-3 rounded-lg border",
                    hasAnyEarned ? 'border-primary/30 bg-primary/10 text-primary font-semibold' : 'border-border bg-muted/50 text-muted-foreground'
                  )}
                >
                  <div className="font-bold text-[11px] leading-tight">{levelName}</div>
                  <div className="mt-1 text-xs">{threshold >= 1000000 ? `${threshold/1000000}M` : threshold >= 1000 ? `${threshold/1000}k` : threshold}</div>
                </div>
              );
            })}
          </div>
        </motion.section>
        </div>
      </div>

      {selectedBadge && (
        <BadgeTaskHistory badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}
