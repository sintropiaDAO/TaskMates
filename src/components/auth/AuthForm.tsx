import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, Leaf, ArrowLeft, Eye, EyeOff, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { LanguageSelector } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';

export function AuthForm() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nurtureLifeAgreement, setNurtureLifeAgreement] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Update isLogin when URL params change
  useEffect(() => {
    setIsLogin(searchParams.get('mode') !== 'signup');
    setIsForgotPassword(false);
  }, [searchParams]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const emailSchema = z.string().email(t('authInvalidEmail'));
      const validation = emailSchema.safeParse(email);
      
      if (!validation.success) {
        toast({
          title: t('authValidationError'),
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setResetLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: t('error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('authResetEmailSent'),
          description: t('authResetEmailSentDescription'),
        });
        setIsForgotPassword(false);
      }
    } catch (err) {
      toast({
        title: t('error'),
        description: t('authUnexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const authSchema = z.object({
    email: z.string().email(t('authInvalidEmail')),
    password: z.string().min(6, t('authPasswordMin')),
    fullName: z.string().optional(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check nurture life agreement for signup
    if (!isLogin && nurtureLifeAgreement !== 'yes') {
      toast({
        title: t('authAgreementRequired'),
        description: t('authAgreementRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }
    
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
            {isForgotPassword 
              ? t('authForgotPasswordTitle')
              : isLogin 
                ? t('authLoginTitle') 
                : t('authSignupTitle')}
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            {isForgotPassword
              ? t('authForgotPasswordSubtitle')
              : isLogin 
                ? t('authLoginSubtitle')
                : t('authSignupSubtitle')}
          </p>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={resetLoading}
              >
                {resetLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('authSendResetLink')}
              </Button>

              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('authBackToLogin')}
              </button>
            </form>
          ) : (
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('authPassword')}</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('authForgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('authPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Nurture Life Agreement - Only for signup */}
              {!isLogin && (
                <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-2">
                    <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <Label className="text-sm font-medium text-foreground">
                        {t('authNurtureLifeTitle')}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('authNurtureLifeDescription')}
                      </p>
                    </div>
                  </div>
                  
                  <RadioGroup
                    value={nurtureLifeAgreement || ''}
                    onValueChange={(value) => setNurtureLifeAgreement(value)}
                    className="mt-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="agree-yes" />
                      <Label htmlFor="agree-yes" className="text-sm cursor-pointer">
                        {t('yes')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="agree-no" />
                      <Label htmlFor="agree-no" className="text-sm cursor-pointer">
                        {t('no')}
                      </Label>
                    </div>
                  </RadioGroup>

                  {nurtureLifeAgreement === 'no' && (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive font-medium">
                        {t('authNurtureLifeRejected')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLogin ? t('authLogin') : t('authSignup')}
              </Button>
            </form>
          )}

          {!isForgotPassword && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('or')}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  // Check nurture life agreement for signup with Google
                  if (!isLogin && nurtureLifeAgreement !== 'yes') {
                    toast({
                      title: t('authAgreementRequired'),
                      description: t('authAgreementRequiredDescription'),
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  setGoogleLoading(true);
                  try {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/dashboard`,
                      },
                    });
                    if (error) {
                      toast({
                        title: t('authLoginError'),
                        description: error.message,
                        variant: 'destructive',
                      });
                    }
                  } catch (err) {
                    toast({
                      title: t('error'),
                      description: t('authUnexpectedError'),
                      variant: 'destructive',
                    });
                  } finally {
                    setGoogleLoading(false);
                  }
                }}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {t('authContinueWithGoogle')}
              </Button>

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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
