import { motion } from 'framer-motion';
import { Sparkles, Search, Tag, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function FeaturesSection() {
  const { t } = useLanguage();

  const mockupTasks = [
    { titleKey: 'mockupTask1Title' as const, tagsKey: 'mockupTask1Tags' as const, match: '92%' },
    { titleKey: 'mockupTask2Title' as const, tagsKey: 'mockupTask2Tags' as const, match: '85%' },
    { titleKey: 'mockupTask3Title' as const, tagsKey: 'mockupTask3Tags' as const, match: '78%' },
  ];

  const mockupUsers = [
    { nameKey: 'mockupUser1Name' as const, locationKey: 'mockupUser1Location' as const, compatibility: '94%', color: 'bg-success' },
    { nameKey: 'mockupUser2Name' as const, locationKey: 'mockupUser2Location' as const, compatibility: '87%', color: 'bg-success' },
    { nameKey: 'mockupUser3Name' as const, locationKey: 'mockupUser3Location' as const, compatibility: '72%', color: 'bg-warning' },
  ];

  const mockupSkills = ['mockupSkill1', 'mockupSkill2', 'mockupSkill3', 'mockupSkill4', 'mockupSkill5'] as const;
  const mockupCommunities = ['mockupCommunity1', 'mockupCommunity2', 'mockupCommunity3'] as const;

  const features = [
    {
      icon: Sparkles,
      titleKey: 'landingFeatureRecommendationsTitle',
      descriptionKey: 'landingFeatureRecommendationsDesc',
      mockup: (
        <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
          <div className="text-xs text-muted-foreground mb-3">{t('dashboardRecommendedTitle')}</div>
          <div className="space-y-3">
            {mockupTasks.map((task, i) => (
              <div key={i} className="bg-background/50 rounded-lg p-3 border border-border/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-foreground">{t(task.titleKey)}</span>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{task.match}</span>
                </div>
                <div className="flex gap-1">
                  {t(task.tagsKey).split(',').map((tag, j) => (
                    <span key={j} className="text-[10px] bg-primary/10 text-primary/80 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Search,
      titleKey: 'landingFeatureSearchTitle',
      descriptionKey: 'landingFeatureSearchDesc',
      mockup: (
        <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
          <div className="bg-background/50 rounded-lg px-3 py-2 mb-3 border border-border/30 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('mockupSearchPlaceholder')}</span>
          </div>
          <div className="space-y-3">
            {mockupUsers.map((user, i) => (
              <div key={i} className="flex items-center gap-3 bg-background/50 rounded-lg p-3 border border-border/30">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {t(user.nameKey).split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{t(user.nameKey)}</div>
                  <div className="text-xs text-muted-foreground">{t(user.locationKey)}</div>
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${user.color}/20 text-foreground`}>
                  {user.compatibility}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Tag,
      titleKey: 'landingFeatureTagsTitle',
      descriptionKey: 'landingFeatureTagsDesc',
      mockup: (
        <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">{t('profileSkillsTitle')}</div>
            <div className="flex flex-wrap gap-2">
              {mockupSkills.map((skillKey, i) => (
                <span key={i} className="tag-skills text-xs px-3 py-1.5 rounded-full">{t(skillKey)}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">{t('profileCommunitiesTitle')}</div>
            <div className="flex flex-wrap gap-2">
              {mockupCommunities.map((communityKey, i) => (
                <span key={i} className="tag-communities text-xs px-3 py-1.5 rounded-full">{t(communityKey)}</span>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Star,
      titleKey: 'landingFeatureReputationTitle',
      descriptionKey: 'landingFeatureReputationDesc',
      mockup: (
        <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
              {t('mockupProfileName').split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{t('mockupProfileName')}</div>
              <div className="text-xs text-muted-foreground">{t('mockupProfileLocation')}</div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-4 h-4 ${star <= 4 ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">(4.8)</span>
              </div>
            </div>
          </div>
          <div className="bg-background/50 rounded-lg p-3 border border-border/30">
            <div className="text-xs text-muted-foreground mb-1">{t('testimonials')}</div>
            <p className="text-xs text-foreground italic">{t('mockupTestimonialText')}</p>
            <div className="text-[10px] text-muted-foreground mt-2">{t('mockupTestimonialAuthor')}</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('landingFeaturesTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landingFeaturesSubtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group"
            >
              <div className="bg-card/50 rounded-2xl p-6 lg:p-8 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                      {t(feature.titleKey as keyof typeof t)}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t(feature.descriptionKey as keyof typeof t)}
                    </p>
                  </div>
                </div>
                <div className="transform group-hover:scale-[1.02] transition-transform duration-300">
                  {feature.mockup}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
