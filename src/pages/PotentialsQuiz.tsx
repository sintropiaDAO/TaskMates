import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ChevronLeft, ChevronRight, Check, 
  Heart, Users, Star, Leaf, Zap, Palette,
  Sun, TreePine, Brain, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TagBadge } from '@/components/ui/tag-badge';
import { QuizTagInput } from '@/components/quiz/QuizTagInput';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tag } from '@/types';

interface QuizQuestion {
  id: number;
  titleKey: string;
  subtitleKey: string;
  icon: React.ReactNode;
  suggestedTags: string[];
  category: 'skills' | 'communities';
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    titleKey: 'quizQ1Title',
    subtitleKey: 'quizQ1Subtitle',
    icon: <Users className="w-8 h-8" />,
    suggestedTags: [
      'Soberania Alimentar', 'Cultura e Lazer', 'Educação', 'Abastecimento de Água',
      'Saúde e Bem-Estar', 'Preservação Ambiental', 'Governança Comunitária',
      'Energia Renovável', 'Confecção de Roupas', 'Fabricação Artesanal',
      'Mobilidade Urbana', 'Construção Civil', 'Práticas Relacionais'
    ],
    category: 'skills'
  },
  {
    id: 2,
    titleKey: 'quizQ2Title',
    subtitleKey: 'quizQ2Subtitle',
    icon: <Heart className="w-8 h-8" />,
    suggestedTags: [
      'Jardinagem', 'Criação de Conteúdo', 'Cozinhar', 'Ensinar',
      'Cuidar de Animais', 'Música', 'Atividade Física', 'Arte',
      'Práticas de Autocuidado', 'Poesia'
    ],
    category: 'skills'
  },
  {
    id: 3,
    titleKey: 'quizQ3Title',
    subtitleKey: 'quizQ3Subtitle',
    icon: <Star className="w-8 h-8" />,
    suggestedTags: [
      'Reparos e Manutenção', 'Cuidado Infantil', 'Apoio a Idosos',
      'Mutirão de Limpeza', 'Organização de Eventos', 'Alfabetização',
      'Assistência Médica', 'Grafite e Muralismo', 'Transporte e Logística',
      'Horta Comunitária'
    ],
    category: 'skills'
  },
  {
    id: 4,
    titleKey: 'quizQ4Title',
    subtitleKey: 'quizQ4Subtitle',
    icon: <Zap className="w-8 h-8" />,
    suggestedTags: [
      'Confeitaria', 'Artesanato', 'Suporte Técnico', 'Mediação de Conflitos',
      'Design Gráfico', 'Massoterapia', 'Tradução de Idiomas', 'Costura',
      'Fotografia', 'Apoio Emocional'
    ],
    category: 'skills'
  },
  {
    id: 5,
    titleKey: 'quizQ5Title',
    subtitleKey: 'quizQ5Subtitle',
    icon: <Leaf className="w-8 h-8" />,
    suggestedTags: [
      'Violão', 'Idiomas', 'Meditação', 'Marcenaria', 'Programação',
      'Crochê', 'Panificação Artesanal', 'Compostagem', 'Edição de Vídeo',
      'Plantas Medicinais'
    ],
    category: 'skills'
  },
  {
    id: 6,
    titleKey: 'quizQ6Title',
    subtitleKey: 'quizQ6Subtitle',
    icon: <Palette className="w-8 h-8" />,
    suggestedTags: [
      'Contação de Histórias', 'Teatro', 'Esportes', 'Leitura', 'Ciência',
      'Desenho', 'Estar na Natureza', 'Jogos Digitais', 'Cantar', 'Dançar'
    ],
    category: 'skills'
  },
  {
    id: 7,
    titleKey: 'quizQ7Title',
    subtitleKey: 'quizQ7Subtitle',
    icon: <TreePine className="w-8 h-8" />,
    suggestedTags: [
      'Reflorestamento', 'Biblioteca Comunitária', 'Reciclagem',
      'Refeições Comunitárias', 'Biblioteca das Coisas', 'Revitalização Pública',
      'Transformação Social', 'Economia Solidária', 'Permacultura', 'Psicoterapia'
    ],
    category: 'skills'
  },
  {
    id: 8,
    titleKey: 'quizQ8Title',
    subtitleKey: 'quizQ8Subtitle',
    icon: <Brain className="w-8 h-8" />,
    suggestedTags: [
      'Planejamento Estratégico', 'Gestão de Pessoas', 'Resolução de Problemas',
      'Gestão Financeira', 'Ideação e Criatividade', 'Entretenimento', 'Mentoria',
      'Controle de Qualidade', 'Execução Prática', 'Gestão de Projetos', 'Tecnologia'
    ],
    category: 'skills'
  },
  {
    id: 9,
    titleKey: 'quizQ9Title',
    subtitleKey: 'quizQ9Subtitle',
    icon: <Sun className="w-8 h-8" />,
    suggestedTags: [
      'Ar Livre', 'Trilhas', 'Beira-Mar', 'Festivais', 'Centros de Aprendizagem',
      'Ateliês', 'Fazenda', 'Academia', 'Cidades Sustentáveis', 'Templos e Retiros'
    ],
    category: 'skills'
  },
  {
    id: 10,
    titleKey: 'quizQ11Title',
    subtitleKey: 'quizQ11Subtitle',
    icon: <Leaf className="w-8 h-8" />,
    suggestedTags: [
      'Corrida', 'Voluntariado', 'Ativismo', 'Comunicação Não-Violenta',
      'Lixo a Zero', 'Ciclismo', 'Agricultura Regenerativa', 'Energia Solar',
      'Bioconstrução', 'Captação de Água da Chuva'
    ],
    category: 'skills'
  }
];

const PotentialsQuiz = () => {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const { tags, addUserTag, createTag, userTags, refreshTags } = useTags();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Map<string, Tag>>(new Map());
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [addedTagsCount, setAddedTagsCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const question = quizQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

  // Get existing tags that match suggested names
  const getMatchingTags = (): Tag[] => {
    return question.suggestedTags
      .map(name => tags.find(t => 
        t.name.toLowerCase() === name.toLowerCase() && 
        t.category === question.category
      ))
      .filter((t): t is Tag => t !== undefined);
  };

  // Get suggested tags that don't exist yet
  const getMissingSuggestions = (): string[] => {
    return question.suggestedTags.filter(name => 
      !tags.find(t => t.name.toLowerCase() === name.toLowerCase())
    );
  };

  const handleToggleTag = async (tag: Tag) => {
    const newSelected = new Map(selectedTags);
    if (newSelected.has(tag.id)) {
      newSelected.delete(tag.id);
    } else {
      newSelected.set(tag.id, tag);
    }
    setSelectedTags(newSelected);
  };

  const handleCreateAndSelectTag = async (name: string) => {
    const result = await createTag(name, question.category);
    if (result && 'id' in result) {
      const newSelected = new Map(selectedTags);
      newSelected.set(result.id, result as Tag);
      setSelectedTags(newSelected);
      toast({ title: t('tagCreated') });
    } else if (result && 'error' in result && result.error === 'duplicate') {
      toast({ title: t('tagAlreadyExists'), variant: 'destructive' });
    }
  };

  const handleSelectExistingTag = (tag: Tag) => {
    if (!selectedTags.has(tag.id)) {
      const newSelected = new Map(selectedTags);
      newSelected.set(tag.id, tag);
      setSelectedTags(newSelected);
    }
  };

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      // Add all selected tags to user profile
      const selectedTagIds = Array.from(selectedTags.keys());
      const existingUserTagIds = userTags.map(ut => ut.tag_id);
      
      let addedCount = 0;
      for (const tagId of selectedTagIds) {
        if (!existingUserTagIds.includes(tagId)) {
          await addUserTag(tagId);
          addedCount++;
        }
      }

      // Mark quiz as completed
      if (user) {
        await supabase
          .from('profiles')
          .update({ quiz_completed: true })
          .eq('id', user.id);
      }

      setAddedTagsCount(addedCount);
      setShowCompletion(true);
    } catch (error) {
      console.error('Error completing quiz:', error);
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    // Mark quiz as skipped
    if (user) {
      await supabase
        .from('profiles')
        .update({ quiz_completed: true })
        .eq('id', user.id);
    }
    navigate('/dashboard');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoToProfile = () => {
    navigate('/profile/edit');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  // Completion Screen
  if (showCompletion) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="container mx-auto max-w-md text-center"
        >
          <div className="glass rounded-2xl p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center"
            >
              <PartyPopper className="w-12 h-12 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-display font-bold mb-4"
            >
              {t('quizCompletionTitle')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-6"
            >
              {t('quizCompletionMessage')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-primary/10 rounded-xl p-6 mb-6"
            >
              <div className="text-4xl font-bold text-primary mb-2">
                {addedTagsCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('quizTagsAddedCount')}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <Button
                onClick={handleGoToDashboard}
                className="w-full bg-gradient-primary"
              >
                {t('quizGoToDashboard')}
              </Button>
              <Button
                variant="outline"
                onClick={handleGoToProfile}
                className="w-full"
              >
                {t('quizGoToProfile')}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  const matchingTags = getMatchingTags();
  const missingSuggestions = getMissingSuggestions();
  const allSuggestedTags = tags.filter(t => t.category === question.category);

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">{t('quizTitle')}</span>
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">{t('quizDescription')}</h1>
        </motion.div>

        {/* Progress */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{t('quizQuestion')} {currentQuestion + 1} {t('of')} {quizQuestions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </motion.div>

        {/* Selected Tags Summary - Moved above question card */}
        {selectedTags.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-6"
          >
            <p className="text-sm font-medium mb-2">
              {t('quizSelectedTags')} ({selectedTags.size})
            </p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {Array.from(selectedTags.values()).map((tag) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <TagBadge
                    name={tag.name}
                    category={tag.category}
                    onRemove={() => handleToggleTag(tag)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl p-6 mb-6"
          >
            {/* Question Icon & Text */}
            <div className="text-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center text-white"
              >
                {question.icon}
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">{t(question.titleKey as keyof typeof import('@/i18n/translations').translations.pt)}</h2>
              <p className="text-muted-foreground text-sm">{t(question.subtitleKey as keyof typeof import('@/i18n/translations').translations.pt)}</p>
            </div>

            {/* Add Custom Tag - Moved to top */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">{t('quizAddCustomTag')}</p>
              <QuizTagInput
                onSubmit={handleCreateAndSelectTag}
                onSelectExisting={handleSelectExistingTag}
                placeholder={t('quizTagPlaceholder')}
                category={question.category}
                existingTags={allSuggestedTags}
              />
            </div>

            {/* Suggested Tags */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3 text-muted-foreground">{t('quizSuggestedTags')}</p>
              <div className="flex flex-wrap gap-2">
                {matchingTags.map((tag) => (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <TagBadge
                      name={tag.name}
                      category={tag.category}
                      onClick={() => handleToggleTag(tag)}
                      selected={selectedTags.has(tag.id)}
                    />
                  </motion.div>
                ))}
                
                {/* Show suggestions that need to be created */}
                {missingSuggestions.slice(0, 5).map((name) => (
                  <motion.button
                    key={name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCreateAndSelectTag(name)}
                    className="px-3 py-1 rounded-full text-sm border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + {name}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('back')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            {t('quizSkip')}
          </Button>

          {currentQuestion < quizQuestions.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              {t('quizNext')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete} 
              disabled={isCompleting}
              className="gap-2 bg-gradient-primary"
            >
              {isCompleting ? t('loading') : t('quizComplete')}
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PotentialsQuiz;
