import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2, Leaf, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { LanguageSelector } from '@/components/LanguageSelector';

const ResetPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, 'Has session:', !!session);
        
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          if (session) {
            setIsValidSession(true);
            setCheckingSession(false);
            if (timeoutId) clearTimeout(timeoutId);
          }
        }
      }
    );

    // Check for existing session or wait for redirect processing
    const checkSession = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      console.log('URL hash:', hash);
      console.log('URL search:', search);
      
      // Check if we have tokens in the URL (either hash or query params)
      const hasTokenInHash = hash && (hash.includes('access_token') || hash.includes('type=recovery'));
      const hasTokenInSearch = search && search.includes('code=');
      
      if (hasTokenInHash || hasTokenInSearch) {
        console.log('Found tokens in URL, waiting for Supabase to process...');
        
        // Give Supabase time to process the tokens
        timeoutId = setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('After timeout - Has session:', !!session);
          
          if (session) {
            setIsValidSession(true);
          }
          setCheckingSession(false);
        }, 3000);
        
        return;
      }
      
      // No tokens in URL, check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial session check:', !!session);
      
      if (session) {
        setIsValidSession(true);
      }
      
      setCheckingSession(false);
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password
      const passwordSchema = z.string().min(6, t('authPasswordMin'));
      const validation = passwordSchema.safeParse(password);
      
      if (!validation.success) {
        toast({
          title: t('authValidationError'),
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: t('authValidationError'),
          description: t('authPasswordsNotMatch'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: t('error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setSuccess(true);
        toast({
          title: t('authPasswordUpdated'),
          description: t('authPasswordUpdatedDescription'),
        });
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
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

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="absolute top-4 right-4 z-20">
          <LanguageSelector />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-2xl p-8 shadow-soft text-center">
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Leaf className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl font-bold text-gradient">TaskMates</span>
            </div>
            
            <h2 className="text-xl font-bold mb-4">{t('authInvalidResetLink')}</h2>
            <p className="text-muted-foreground mb-6">{t('authInvalidResetLinkDescription')}</p>
            
            <Button onClick={() => navigate('/auth')} className="w-full">
              {t('authBackToLogin')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
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
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 rounded-xl bg-gradient-primary">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-gradient">TaskMates</span>
          </div>

          {success ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t('authPasswordUpdated')}</h2>
              <p className="text-muted-foreground">{t('authRedirectingToDashboard')}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-center mb-2">
                {t('authCreateNewPassword')}
              </h2>
              <p className="text-muted-foreground text-center mb-6">
                {t('authCreateNewPasswordSubtitle')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('authNewPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('authNewPasswordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('authConfirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t('authConfirmPasswordPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {t('authUpdatePassword')}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
