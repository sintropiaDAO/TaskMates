import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { LanguageSelector } from '@/components/LanguageSelector';

export function AuthForm() {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const authSchema = z.object({
    email: z.string().email(t('authInvalidEmail')),
    password: z.string().min(6, t('authPasswordMin')),
    fullName: z.string().optional(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password, fullName });
      if (!validation.success) {
        toast({
          title: t('authValidationError'),
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: t('authLoginError'),
            description: error.message === 'Invalid login credentials' 
              ? t('authInvalidCredentials')
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({ title: t('authWelcomeBack') });
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: t('authSignupError'),
            description: error.message.includes('already registered')
              ? t('authEmailRegistered')
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({ 
            title: t('authAccountCreated'),
            description: t('authConfigureProfile'),
          });
          navigate('/profile/edit');
        }
      }
    } catch (err) {
      toast({
        title: t('error'),
        description: t('authUnexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 shadow-soft">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 rounded-xl bg-gradient-primary">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-gradient">TaskMates</span>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">
            {isLogin ? t('authLoginTitle') : t('authSignupTitle')}
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            {isLogin 
              ? t('authLoginSubtitle')
              : t('authSignupSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('authFullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t('authFullNamePlaceholder')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('authEmail')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('authEmailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('authPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('authPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? t('authLogin') : t('authSignup')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? t('authNoAccount') : t('authHaveAccount')}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? t('authSignup') : t('authLogin')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
