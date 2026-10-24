import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { ArrowLeft, Map, CheckCircle2, Circle, Trophy, Users, Gift, RefreshCw, Pencil, Archive, Loader2, Send, Trash2, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/common/UserAvatar';
import { TagBadge } from '@/components/ui/tag-badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { describeStep, journeyMultiplier, type JourneyStepInput } from '@/lib/journeys';
import { evaluateJourney, fetchProfiles, countCompletedJourneys, type MiniProfile, type JourneyRow } from '@/hooks/useJourneys';
import { useTagName } from '@/components/journeys/JourneyPickers';
import { ShareItemButton } from '@/components/common/ShareItemButton';

const db = supabase as any;

interface Step extends JourneyStepInput { id: string; position: number }
interface Participant { id: string; user_id: string; status: string; joined_at: string; completed_at: string | null; reward_delivered: boolean }
interface Progress { participant_id: string; step_id: string; entity_kind: string | null; entity_id: string | null }

export default function JourneyDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const lang = language === 'pt' ? 'pt' : 'en';
  const pt = lang === 'pt';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tags } = useTags();
  const tagName = useTagName();

  const [journey, setJourney] = useState<JourneyRow | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [myMultiplier, setMyMultiplier] = useState(1);

  const load = useCallback(async () => {
    const { data: j } = await db.from('journeys').select('*').eq('id', id).maybeSingle();
    setJourney(j);
    if (!j) { setLoading(false); return; }
    const [{ data: s }, { data: r }, { data: p }, { data: c }] = await Promise.all([
      db.from('journey_steps').select('*').eq('journey_id', id).order('position'),
      db.from('journey_rewards').select('*, products(id, title)').eq('journey_id', id),
      db.from('journey_participants').select('*').eq('journey_id', id).order('joined_at'),
      db.from('journey_comments').select('*').eq('journey_id', id).order('created_at'),
    ]);
    const parts = (p ?? []) as Participant[];
    const { data: pr } = parts.length
      ? await db.from('journey_step_progress').select('participant_id, step_id, entity_kind, entity_id').in('participant_id', parts.map(x => x.id))
      : { data: [] };
    setSteps(s ?? []); setRewards(r ?? []); setParticipants(parts); setProgress(pr ?? []); setComments(c ?? []);
    setProfiles(await fetchProfiles([j.created_by, ...parts.map(x => x.user_id), ...((c ?? []) as any[]).map(x => x.user_id)]));
    setLoading(false);
  }, [id]);

  const refresh = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      const res = await evaluateJourney(id);
      if (res.just_completed) toast({ title: pt ? '🏆 Jornada concluída!' : '🏆 Journey completed!', description: pt ? 'Seu multiplicador de EXP aumentou.' : 'Your EXP multiplier went up.' });
      else if (!silent && res.joined) toast({ title: pt ? 'Progresso atualizado' : 'Progress updated', description: `${res.done}/${res.total}` });
    } catch { /* ignore */ }
    await load();
  }, [id, user, load, toast, pt]);

  useEffect(() => { load().then(() => refresh(true)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, user?.id]);
  useEffect(() => { if (user) countCompletedJourneys(user.id).then(n => setMyMultiplier(journeyMultiplier(n))); }, [user, participants]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!journey) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-3">
      <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
      <p className="text-muted-foreground">{pt ? 'Jornada não encontrada ou privada.' : 'Journey not found or private.'}</p>
      <Button variant="ghost" onClick={() => navigate('/journeys')}>{pt ? 'Minhas jornadas' : 'My journeys'}</Button>
    </div>
  );

  const isOwner = user?.id === journey.created_by;
  const me = participants.find(p => p.user_id === user?.id);
  const myDone = new Set(progress.filter(p => p.participant_id === me?.id).map(p => p.step_id));
  const finishers = participants.filter(p => p.status === 'completed').sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? ''));
  const creator = profiles[journey.created_by];

  const join = async () => {
    if (!user) { navigate('/auth'); return; }
    setBusy(true);
    const { error } = await db.from('journey_participants').insert({ journey_id: id, user_id: user.id });
    setBusy(false);
    if (error) { toast({ title: pt ? 'Não foi possível participar' : 'Could not join', variant: 'destructive' }); return; }
    toast({ title: pt ? 'Você entrou na jornada!' : 'You joined the journey!', description: pt ? 'Ações feitas a partir de agora contam como progresso.' : 'Actions from now on count as progress.' });
    load();
  };
  const leave = async () => {
    if (!me) return;
    await db.from('journey_participants').delete().eq('id', me.id);
    load();
  };
  const archive = async () => {
    await db.from('journeys').update({ status: journey.status === 'archived' ? 'active' : 'archived' }).eq('id', id);
    load();
  };
  const sendComment = async () => {
    if (!user || !comment.trim()) return;
    const { error } = await db.from('journey_comments').insert({ journey_id: id, user_id: user.id, content: comment.trim() });
    if (error) { toast({ title: pt ? 'Entre na jornada para comentar' : 'Join the journey to comment', variant: 'destructive' }); return; }
    setComment(''); load();
  };
  const toggleReward = async (p: Participant) => {
    await db.from('journey_participants').update({ reward_delivered: !p.reward_delivered }).eq('id', p.id);
    load();
  };

  const linkFor = (kind: string | null, eid: string | null) => {
    if (!kind || !eid) return null;
    if (kind === 'tag') return `/tags/${eid}`;
    if (kind === 'person') return `/profile/${eid}`;
    return `/share/${kind}/${eid}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />{pt ? 'Voltar' : 'Back'}</Button>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-5 border-2 border-amber-300/60 shadow-xl">
        {journey.image_url && <img src={journey.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
        <div className="relative space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1"><Map className="w-3.5 h-3.5" />{pt ? 'Jornada' : 'Journey'}{journey.status === 'archived' && ` · ${pt ? 'arquivada' : 'archived'}`}</p>
          <h1 className="text-2xl font-black leading-tight">{journey.title}</h1>
          {journey.description && <p className="text-sm text-white/90 whitespace-pre-wrap">{journey.description}</p>}
          {creator && <div className="flex items-center gap-2 text-xs"><UserAvatar userId={creator.id} name={creator.full_name} avatarUrl={creator.avatar_url} size="sm" /><span>{pt ? 'por' : 'by'} {creator.full_name || '@' + creator.username}</span></div>}
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <span>{steps.length} {pt ? 'etapas' : 'steps'}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{participants.length}</span>
            <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />{finishers.length}</span>
            {journey.is_ordered && <span>{pt ? 'Em sequência' : 'In order'}</span>}
            {journey.deadline && <span>{pt ? 'Prazo' : 'Due'}: {new Date(journey.deadline).toLocaleDateString(lang)}</span>}
          </div>
          {me && (
            <div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-300 to-yellow-200" style={{ width: `${steps.length ? (myDone.size / steps.length) * 100 : 0}%` }} /></div>
              <p className="text-xs mt-1 font-bold">{me.status === 'completed' ? `🏆 ${pt ? 'Concluída!' : 'Completed!'}` : `${myDone.size}/${steps.length} ${pt ? 'etapas concluídas' : 'steps done'}`}</p>
            </div>
          )}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 text-indigo-900 px-2.5 py-1 text-xs font-black"><Sparkles className="w-3.5 h-3.5" />{pt ? 'Seu multiplicador' : 'Your multiplier'}: x{myMultiplier.toFixed(1)}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-60 text-xs">{pt ? 'Concluir uma jornada soma +10% ao seu multiplicador de EXP (até x2) e +15 EXP. Todo EXP que você ganha é multiplicado, então você sobe de nível mais rápido.' : 'Completing a journey adds +10% to your EXP multiplier (up to x2) plus 15 EXP. All EXP you earn is multiplied, so you level up faster.'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!me && journey.status === 'active' && <Button onClick={join} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{pt ? 'Participar da jornada' : 'Join journey'}</Button>}
        {me && me.status !== 'completed' && <Button variant="outline" onClick={() => refresh()}><RefreshCw className="w-4 h-4 mr-1" />{pt ? 'Atualizar progresso' : 'Refresh progress'}</Button>}
        {me && me.status !== 'completed' && !journey.is_starter && <Button variant="ghost" onClick={leave}>{pt ? 'Sair' : 'Leave'}</Button>}
        {isOwner && <Button variant="outline" onClick={() => navigate(`/journeys/new?edit=${id}`)}><Pencil className="w-4 h-4 mr-1" />{pt ? 'Editar' : 'Edit'}</Button>}
        {isOwner && <Button variant="ghost" onClick={archive}><Archive className="w-4 h-4 mr-1" />{journey.status === 'archived' ? (pt ? 'Reativar' : 'Reactivate') : (pt ? 'Arquivar' : 'Archive')}</Button>}
        <ShareItemButton type={'journey' as any} id={id} title={journey.title} />
      </div>

      {journey.tag_ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {journey.tag_ids.map(tid => { const t = tags.find(x => x.id === tid); return t ? <button key={tid} onClick={() => navigate(`/tags/${tid}`)}><TagBadge name={tagName(tid)} category={t.category} /></button> : null; })}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-black">{pt ? 'Etapas' : 'Steps'}</h2>
        {steps.map((s, i) => {
          const done = myDone.has(s.id);
          const pr = progress.find(p => p.participant_id === me?.id && p.step_id === s.id);
          const href = pr ? linkFor(pr.entity_kind, pr.entity_id) : null;
          return (
            <div key={s.id} className={`flex items-start gap-3 rounded-xl border-2 p-3 ${done ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-violet-400/30 bg-card'}`}>
              {done ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> : <Circle className="w-6 h-6 text-violet-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{i + 1}. {s.title || describeStep(s, lang, tagName)}</p>
                {s.title && <p className="text-xs text-muted-foreground">{describeStep(s, lang, tagName)}</p>}
                {href && <button className="text-xs text-primary underline" onClick={() => navigate(href)}>{pt ? 'Ver o que contou' : 'See what counted'}</button>}
              </div>
            </div>
          );
        })}
      </section>

      {rewards.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-black flex items-center gap-1.5"><Gift className="w-4 h-4 text-amber-500" />{pt ? 'Recompensas' : 'Rewards'}</h2>
          {rewards.map(r => (
            <div key={r.id} className="rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-400/20 to-orange-400/5 p-3 text-sm">
              {r.products?.title && <button className="font-bold text-primary underline" onClick={() => navigate(`/share/product/${r.product_id}`)}>{r.products.title}</button>}
              {r.description && <p className="whitespace-pre-wrap">{r.description}</p>}
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-black flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" />{pt ? 'Hall da Fama' : 'Hall of Fame'}</h2>
        {finishers.length ? (
          <div className="flex flex-wrap gap-3">
            {finishers.map((p, i) => { const pf = profiles[p.user_id]; return (
              <div key={p.id} className="flex flex-col items-center w-16 text-center">
                <div className="relative">
                  <UserAvatar userId={p.user_id} name={pf?.full_name} avatarUrl={pf?.avatar_url} size="md" />
                  <span className="absolute -top-1 -right-1 text-xs">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</span>
                </div>
                <span className="text-[10px] truncate w-full">{pf?.full_name || '@' + (pf?.username ?? '')}</span>
              </div>
            ); })}
          </div>
        ) : <p className="text-xs text-muted-foreground">{pt ? 'Ninguém concluiu ainda. Seja a primeira pessoa!' : 'Nobody finished yet. Be the first!'}</p>}
      </section>

      {isOwner && participants.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-black flex items-center gap-1.5"><Users className="w-4 h-4" />{pt ? 'Progresso dos participantes' : 'Participant progress'}</h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-2">{pt ? 'Pessoa' : 'Person'}</th>
                {steps.map((s, i) => <th key={s.id} className="p-2 w-8" title={s.title || describeStep(s, lang, tagName)}>{i + 1}</th>)}
                <th className="p-2">%</th>
                {rewards.length > 0 && <th className="p-2">{pt ? 'Recompensa' : 'Reward'}</th>}
              </tr></thead>
              <tbody>
                {participants.map(p => {
                  const pf = profiles[p.user_id];
                  const ds = new Set(progress.filter(x => x.participant_id === p.id).map(x => x.step_id));
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-2 truncate max-w-32">{pf?.full_name || '@' + (pf?.username ?? '')}</td>
                      {steps.map(s => <td key={s.id} className="p-2 text-center">{ds.has(s.id) ? '✅' : '·'}</td>)}
                      <td className="p-2 text-center font-bold">{steps.length ? Math.round((ds.size / steps.length) * 100) : 0}</td>
                      {rewards.length > 0 && <td className="p-2 text-center">{p.status === 'completed' && (
                        <Button size="sm" variant={p.reward_delivered ? 'secondary' : 'default'} className="h-6 text-[10px]" onClick={() => toggleReward(p)}>
                          {p.reward_delivered ? (pt ? 'Entregue' : 'Delivered') : (pt ? 'Marcar entregue' : 'Mark delivered')}
                        </Button>)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-black">{pt ? 'Comentários' : 'Comments'}</h2>
        {comments.map(c => { const pf = profiles[c.user_id]; return (
          <div key={c.id} className="flex gap-2">
            <UserAvatar userId={c.user_id} name={pf?.full_name} avatarUrl={pf?.avatar_url} size="sm" />
            <div className="flex-1 rounded-xl bg-muted/50 p-2">
              <p className="text-xs font-bold">{pf?.full_name || '@' + (pf?.username ?? '')}</p>
              <p className="text-sm whitespace-pre-wrap">{c.content}</p>
            </div>
            {c.user_id === user?.id && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await db.from('journey_comments').delete().eq('id', c.id); load(); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
          </div>
        ); })}
        {(me || isOwner) ? (
          <div className="flex gap-2">
            <Textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder={pt ? 'Escreva um comentário…' : 'Write a comment…'} />
            <Button size="icon" onClick={sendComment}><Send className="w-4 h-4" /></Button>
          </div>
        ) : <p className="text-xs text-muted-foreground">{pt ? 'Participe da jornada para comentar.' : 'Join the journey to comment.'}</p>}
      </section>
    </div>
  );
}
