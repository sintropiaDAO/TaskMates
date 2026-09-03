import { motion } from 'framer-motion';
import {
  ArrowUp,
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  MapPin,
  MessageSquare,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Users,
  Vote,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import logoMark from '@/assets/logo-taskmates-mark.png';
import anaAvatar from '@/assets/landing-avatar-ana.jpg';
import carlosAvatar from '@/assets/landing-avatar-carlos.jpg';
import mariaAvatar from '@/assets/landing-avatar-maria.jpg';
import seedKitImage from '@/assets/landing-product-seed-kit.jpg';

type AppAvatarProps = {
  src: string;
  name: string;
  location?: string;
  verified?: boolean;
};

function AppAvatar({ src, name, location, verified = false }: AppAvatarProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src={src}
        alt={name}
        loading="lazy"
        width={768}
        height={768}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-bold text-foreground">{name}</span>
          {verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
        </div>
        {location && <p className="truncate text-[10px] text-muted-foreground">{location}</p>}
      </div>
    </div>
  );
}

function AppScreen({ children, active = 'recommendations' }: { children: React.ReactNode; active?: 'recommendations' | 'mine' | 'nearby' }) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const navItems = [
    { key: 'recommendations', icon: Sparkles, label: pt ? 'Para Você' : 'For You' },
    { key: 'mine', icon: ClipboardList, label: pt ? 'Minhas' : 'Mine' },
    { key: 'nearby', icon: MapPin, label: pt ? 'Perto' : 'Nearby' },
    { key: 'completed', icon: CheckCircle2, label: pt ? 'Concluído' : 'Completed' },
  ] as const;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-[var(--clay-shadow-sm-card)]">
      <div className="flex h-11 items-center justify-between border-b border-border/50 bg-background/95 px-3">
        <div className="flex items-center gap-1.5">
          <img src={logoMark} alt="TaskMates" className="h-7 w-7" width={1024} height={1024} />
          <span className="font-display text-xs font-bold text-primary">TaskMates</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <Bell className="h-3.5 w-3.5" />
          <img src={anaAvatar} alt="Ana Silva" className="h-6 w-6 rounded-full object-cover" width={768} height={768} loading="lazy" />
        </div>
      </div>
      <div className="min-h-64 bg-background p-3">{children}</div>
      <div className="grid grid-cols-5 items-end border-t border-border/60 bg-card px-1.5 py-1.5">
        {navItems.slice(0, 2).map(item => (
          <div key={item.key} className={`flex flex-col items-center gap-0.5 text-[8px] font-bold ${active === item.key ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </div>
        ))}
        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-[var(--clay-shadow-sm-primary)]">+</div>
        {navItems.slice(2).map(item => (
          <div key={item.key} className={`flex flex-col items-center gap-0.5 text-[8px] font-bold ${active === item.key ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function FolderTab({ kind, tone = 'green', suffix }: { kind: string; tone?: 'green' | 'pink' | 'violet' | 'amber'; suffix?: string }) {
  const Icon = kind.includes('Produto') || kind.includes('Product') ? Package : kind.includes('Opini') || kind.includes('Opinion') ? BarChart3 : ClipboardList;
  const colors = {
    green: 'bg-success text-success-foreground',
    pink: 'bg-pink-600 text-white',
    violet: 'bg-violet-500 text-white',
    amber: 'bg-amber-500 text-white',
  };
  return (
    <div className={`-mx-3 -mt-3 mb-3 flex items-center gap-1.5 rounded-t-sm px-3 py-1.5 text-[10px] font-bold shadow-[0_3px_5px_-2px_rgba(0,0,0,0.15),inset_0_-3px_4px_-2px_rgba(0,0,0,0.18),inset_0_1.5px_0_rgba(255,255,255,0.35)] ${colors[tone]}`}>
      <Icon className="h-3 w-3" />
      <span>{kind}</span>
      {suffix && <><span className="opacity-60">·</span><span>{suffix}</span></>}
    </div>
  );
}

function TagPill({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'blue' | 'amber' }) {
  const color = tone === 'blue' ? 'border-info/30 bg-info/15 text-info' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/15 text-amber-700' : 'border-primary/30 bg-primary/15 text-primary';
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${color}`}>{children}</span>;
}

function TaskDashboardMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  return (
    <AppScreen>
      <div className="mb-2 flex items-center justify-between">
        <div><p className="text-[9px] font-bold uppercase text-primary">{pt ? 'Para Você' : 'For You'}</p><p className="text-[10px] text-muted-foreground">{pt ? 'Com base nas suas tags' : 'Based on your tags'}</p></div>
        <span className="rounded-md bg-muted px-2 py-1 text-[9px] text-muted-foreground">{pt ? 'Todos' : 'All'}</span>
      </div>
      <div className="rounded-xl bg-card p-3 shadow-[var(--clay-shadow-sm-card)]">
        <FolderTab kind={pt ? 'Tarefa' : 'Task'} suffix={pt ? 'Oferta' : 'Offer'} />
        <div className="mb-2 flex items-center justify-between">
          <AppAvatar src={anaAvatar} name="Ana Silva" location={pt ? 'Hoje, 09:30' : 'Today, 9:30 AM'} verified />
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary"><Sparkles className="h-3 w-3" />92%</span>
        </div>
        <h4 className="font-display text-sm font-bold text-foreground">{pt ? 'Mutirão na horta comunitária' : 'Community garden workday'}</h4>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{pt ? 'Vamos preparar novos canteiros e compartilhar mudas.' : 'Let’s prepare new beds and share seedlings.'}</p>
        <div className="mt-2 flex flex-wrap gap-1"><TagPill>{pt ? 'Jardinagem' : 'Gardening'}</TagPill><TagPill tone="blue">{pt ? 'Horta do Bairro' : 'Neighborhood Garden'}</TagPill></div>
        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-muted-foreground">
          <div className="flex gap-2"><span className="flex items-center gap-0.5 text-[9px]"><ArrowUp className="h-3 w-3" />12</span><span className="flex items-center gap-0.5 text-[9px]"><MessageSquare className="h-3 w-3" />4</span></div>
          <span className="rounded-lg bg-success px-2.5 py-1 text-[9px] font-bold text-success-foreground">{pt ? 'Colaborar' : 'Collaborate'}</span>
        </div>
      </div>
    </AppScreen>
  );
}

function SearchMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const users = [
    { src: anaAvatar, name: 'Ana Silva', location: pt ? 'São Paulo, SP' : 'São Paulo, Brazil', match: '94%' },
    { src: carlosAvatar, name: 'Carlos Mendes', location: pt ? 'Campinas, SP' : 'Campinas, Brazil', match: '87%' },
    { src: mariaAvatar, name: 'Maria Santos', location: pt ? 'Santos, SP' : 'Santos, Brazil', match: '82%' },
  ];
  return (
    <AppScreen>
      <p className="mb-2 font-display text-sm font-bold">{pt ? 'Busca global' : 'Global search'}</p>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-[10px] text-muted-foreground"><Search className="h-3.5 w-3.5" />{pt ? 'horta, pessoas, comunidades...' : 'garden, people, communities...'}</div>
      <div className="mb-2 flex gap-1 text-[9px]"><span className="rounded-full bg-primary px-2 py-1 font-bold text-primary-foreground">{pt ? 'Pessoas' : 'People'}</span><span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">{pt ? 'Comunidades' : 'Communities'}</span><span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">Tags</span></div>
      <div className="space-y-2">
        {users.map(user => <div key={user.name} className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-2.5"><AppAvatar src={user.src} name={user.name} location={user.location} verified /><span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">{user.match}</span></div>)}
      </div>
    </AppScreen>
  );
}

function TagsMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  return (
    <AppScreen active="mine">
      <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-sm font-bold">{pt ? 'Minhas Tags' : 'My Tags'}</p><p className="text-[10px] text-muted-foreground">{pt ? 'Interesses que conectam você' : 'Interests that connect you'}</p></div><Tag className="h-5 w-5 text-primary" /></div>
      <div className="rounded-xl bg-card p-3 shadow-[var(--clay-shadow-sm-card)]">
        <p className="mb-2 text-[10px] font-bold text-foreground">{pt ? 'Habilidades' : 'Skills'}</p>
        <div className="mb-4 flex flex-wrap gap-1.5"><TagPill>{pt ? 'Jardinagem' : 'Gardening'}</TagPill><TagPill>{pt ? 'Facilitação' : 'Facilitation'}</TagPill><TagPill>{pt ? 'Culinária' : 'Cooking'}</TagPill><TagPill>{pt ? 'Captação de Recursos' : 'Fundraising'}</TagPill></div>
        <p className="mb-2 text-[10px] font-bold text-foreground">{pt ? 'Comunidades' : 'Communities'}</p>
        <div className="flex flex-wrap gap-1.5"><TagPill tone="blue">{pt ? 'Horta do Bairro' : 'Neighborhood Garden'}</TagPill><TagPill tone="blue">{pt ? 'Economia Solidária' : 'Solidarity Economy'}</TagPill></div>
      </div>
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[10px] text-muted-foreground"><Sparkles className="mr-1 inline h-3 w-3 text-primary" />{pt ? 'As tags alimentam recomendações e compatibilidade.' : 'Tags power recommendations and compatibility.'}</div>
    </AppScreen>
  );
}

function ReputationMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  return (
    <AppScreen>
      <div className="rounded-xl bg-card p-3 shadow-[var(--clay-shadow-sm-card)]">
        <div className="flex items-start justify-between"><AppAvatar src={carlosAvatar} name="Carlos Mendes" location={pt ? 'Campinas, SP' : 'Campinas, Brazil'} verified /><span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">4.9</span></div>
        <div className="my-3 grid grid-cols-3 gap-1 text-center"><div><p className="text-sm font-bold">28</p><p className="text-[8px] text-muted-foreground">{pt ? 'concluídas' : 'completed'}</p></div><div><p className="text-sm font-bold">17</p><p className="text-[8px] text-muted-foreground">{pt ? 'colaborações' : 'collaborations'}</p></div><div><p className="text-sm font-bold">12</p><p className="text-[8px] text-muted-foreground">{pt ? 'depoimentos' : 'testimonials'}</p></div></div>
        <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}</div>
        <div className="mt-2 rounded-lg bg-muted/50 p-2.5"><p className="text-[10px] italic text-foreground">{pt ? '“Carlos trouxe as ferramentas e ensinou todo mundo com muita paciência.”' : '“Carlos brought the tools and patiently taught everyone.”'}</p><p className="mt-1 text-[9px] text-muted-foreground">— Maria Santos</p></div>
      </div>
    </AppScreen>
  );
}

function BadgesMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const badges = [
    { emoji: '🌱', title: pt ? 'Regeneração' : 'Regeneration', level: 5, progress: 'w-4/5' },
    { emoji: '🤝', title: pt ? 'Colaboração' : 'Collaboration', level: 3, progress: 'w-3/5' },
    { emoji: '🧭', title: pt ? 'Mobilização' : 'Mobilization', level: 7, progress: 'w-2/5' },
  ];
  return (
    <AppScreen active="mine">
      <div className="mb-3 flex items-center gap-2"><Award className="h-5 w-5 text-primary" /><div><p className="font-display text-sm font-bold">{pt ? 'Meus Selos' : 'My Badges'}</p><p className="text-[10px] text-muted-foreground">{pt ? 'Sua jornada de contribuição' : 'Your contribution journey'}</p></div></div>
      <div className="space-y-2">
        {badges.map(badge => <div key={badge.title} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-[var(--clay-shadow-sm-card)]"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">{badge.emoji}</div><div className="min-w-0 flex-1"><div className="mb-1 flex justify-between text-[10px]"><span className="font-bold">{badge.title}</span><span className="font-bold text-primary">Lv. {badge.level}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full bg-primary ${badge.progress}`} /></div></div></div>)}
      </div>
    </AppScreen>
  );
}

function NearbyMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  return (
    <AppScreen active="nearby">
      <div className="relative mb-3 h-28 overflow-hidden rounded-lg border border-border bg-secondary/35">
        <div className="absolute left-0 top-7 h-px w-full rotate-6 bg-info/30" /><div className="absolute left-0 top-16 h-px w-full -rotate-3 bg-info/30" /><div className="absolute left-20 top-0 h-full w-px rotate-12 bg-info/30" />
        {[['left-8 top-6','bg-primary'],['right-16 top-12','bg-pink-600'],['left-1/2 bottom-4','bg-violet-500']].map(([position,color], index) => <span key={index} className={`absolute ${position} flex h-6 w-6 items-center justify-center rounded-full border-2 border-card ${color} text-white shadow-md`}><MapPin className="h-3.5 w-3.5" /></span>)}
      </div>
      <div className="space-y-2"><div className="flex items-center justify-between rounded-lg bg-card p-2.5 shadow-sm"><AppAvatar src={mariaAvatar} name={pt ? 'Aula aberta de compostagem' : 'Open composting class'} location={pt ? '0,8 km · Hoje' : '0.5 mi · Today'} /><span className="rounded-full bg-success/15 px-2 py-1 text-[8px] font-bold text-success">{pt ? 'Aberta' : 'Open'}</span></div><div className="flex items-center justify-between rounded-lg bg-card p-2.5 shadow-sm"><AppAvatar src={anaAvatar} name={pt ? 'Horta Comunitária Centro' : 'Downtown Community Garden'} location={pt ? '1,2 km' : '0.8 mi'} /><Users className="h-4 w-4 text-info" /></div></div>
    </AppScreen>
  );
}

function MarketplaceMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  return (
    <AppScreen active="mine">
      <div className="mb-2"><p className="text-[9px] font-bold uppercase text-amber-600">{pt ? 'Horta do Bairro' : 'Neighborhood Garden'}</p><p className="font-display text-sm font-bold">{pt ? 'Produtos da comunidade' : 'Community products'}</p></div>
      <div className="rounded-xl bg-card p-3 shadow-[var(--clay-shadow-sm-card)]">
        <FolderTab kind={pt ? 'Produto' : 'Product'} tone="green" suffix={pt ? 'Oferta' : 'Offer'} />
        <AppAvatar src={mariaAvatar} name="Maria Santos" location={pt ? 'Hoje, 11:20' : 'Today, 11:20 AM'} verified />
        <h4 className="mt-2 font-display text-sm font-bold">{pt ? 'Kit de sementes agroecológicas' : 'Agroecological seed kit'}</h4>
        <p className="mt-1 text-[10px] text-muted-foreground">{pt ? 'Sementes compartilhadas pela nossa biblioteca comunitária.' : 'Seeds shared by our community library.'}</p>
        <img src={seedKitImage} alt={pt ? 'Kit comunitário de sementes' : 'Community seed kit'} loading="lazy" width={1024} height={1024} className="mt-2 h-24 w-full rounded-lg bg-muted/30 object-contain" />
        <div className="mt-2 flex items-center justify-between"><span className="rounded-md bg-muted px-2 py-1 text-[9px] font-bold text-muted-foreground">{pt ? 'Estoque: 12' : 'Stock: 12'}</span><span className="flex items-center gap-1 rounded-lg bg-pink-600 px-2.5 py-1.5 text-[9px] font-bold text-white"><ShoppingCart className="h-3 w-3" />{pt ? 'Receber' : 'Receive'}</span></div>
      </div>
    </AppScreen>
  );
}

function PollMockup() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const options = [
    { label: pt ? 'Sábado pela manhã' : 'Saturday morning', value: '64%', width: 'w-2/3' },
    { label: pt ? 'Domingo à tarde' : 'Sunday afternoon', value: '36%', width: 'w-1/3' },
  ];
  return (
    <AppScreen>
      <div className="mb-2"><p className="text-[9px] font-bold uppercase text-violet-500">{pt ? 'Decisão coletiva' : 'Collective decision'}</p><p className="font-display text-sm font-bold">{pt ? 'Autogestão em comunidade' : 'Community self-management'}</p></div>
      <div className="rounded-xl bg-card p-3 shadow-[var(--clay-shadow-sm-card)]">
        <FolderTab kind={pt ? 'Opinião' : 'Opinion'} tone="violet" suffix={pt ? 'Enquete' : 'Poll'} />
        <AppAvatar src={carlosAvatar} name="Carlos Mendes" location={pt ? 'Hoje, 08:15' : 'Today, 8:15 AM'} verified />
        <h4 className="mt-2 font-display text-sm font-bold">{pt ? 'Quando faremos o próximo mutirão?' : 'When should we hold the next workday?'}</h4>
        <p className="mb-2 mt-1 text-[10px] text-muted-foreground">{pt ? 'Escolha o melhor horário para a maioria.' : 'Choose the time that works for most people.'}</p>
        <div className="space-y-2">{options.map(option => <div key={option.label} className="rounded-lg border border-border p-2"><div className="mb-1 flex justify-between text-[9px]"><span className="font-bold">{option.label}</span><span className="text-muted-foreground">{option.value}</span></div><div className="h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full bg-violet-500 ${option.width}`} /></div></div>)}</div>
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><Vote className="h-3 w-3" />14 {pt ? 'votos' : 'votes'}</span><span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />6</span></div>
      </div>
    </AppScreen>
  );
}

export function FeaturesSection() {
  const { t, language } = useLanguage();
  const pt = language === 'pt';
  const features = [
    { icon: Sparkles, title: t('landingFeatureRecommendationsTitle'), description: t('landingFeatureRecommendationsDesc'), mockup: <TaskDashboardMockup /> },
    { icon: Search, title: t('landingFeatureSearchTitle'), description: t('landingFeatureSearchDesc'), mockup: <SearchMockup /> },
    { icon: Tag, title: t('landingFeatureTagsTitle'), description: t('landingFeatureTagsDesc'), mockup: <TagsMockup /> },
    { icon: Star, title: t('landingFeatureReputationTitle'), description: t('landingFeatureReputationDesc'), mockup: <ReputationMockup /> },
    { icon: Award, title: t('landingFeatureBadgesTitle'), description: t('landingFeatureBadgesDesc'), mockup: <BadgesMockup /> },
    { icon: MapPin, title: t('landingFeatureNearbyTitle'), description: t('landingFeatureNearbyDesc'), mockup: <NearbyMockup /> },
    { icon: Package, title: t('landingFeatureMarketplaceTitle'), description: t('landingFeatureMarketplaceDesc'), mockup: <MarketplaceMockup /> },
    { icon: HeartHandshake, title: t('landingFeaturePollsTitle'), description: t('landingFeaturePollsDesc'), mockup: <PollMockup /> },
  ];

  return (
    <section className="relative bg-gradient-to-b from-[hsl(155_70%_8%)] via-[hsl(155_65%_14%)] to-[hsl(155_70%_10%)] py-16 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="container relative px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-12 text-center sm:mb-16">
          <h2 className="mb-4 font-display text-3xl font-bold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.6)] sm:text-4xl md:text-5xl">{t('landingFeaturesTitle')}</h2>
          <p className="mx-auto max-w-2xl text-base text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)] sm:text-lg">{t('landingFeaturesSubtitle')}</p>
        </motion.div>
        <div className="grid grid-cols-1 gap-5 sm:gap-8 md:grid-cols-2 lg:gap-12">
          {features.map((feature, index) => (
            <motion.article key={feature.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: (index % 2) * 0.12 }} className="group">
              <div className="h-full rounded-2xl border border-white/10 bg-background/95 p-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-xl sm:p-6 lg:p-8">
                <div className="mb-4 flex items-start gap-3 sm:mb-6 sm:gap-4"><div className="shrink-0 rounded-xl bg-primary/15 p-2.5 text-primary sm:p-3"><feature.icon className="h-5 w-5 sm:h-6 sm:w-6" /></div><div className="min-w-0"><h3 className="mb-1 font-display text-lg font-semibold text-foreground sm:mb-2 sm:text-xl">{feature.title}</h3><p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{feature.description}</p></div></div>
                <div className="transform transition-transform duration-300 group-hover:scale-[1.015]">{feature.mockup}</div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}