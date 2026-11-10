import { useState, useEffect, useRef, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mail, Lock, User, Loader2, ArrowLeft, ArrowRight, Eye, EyeOff, Compass, Sparkles, Check, ShieldCheck } from 'lucide-react';
import appLogo from '@/assets/logo-taskmates-mark.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from '@/lib/router-compat';
import { z } from 'zod';
import { LanguageSelector } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import { type CapyveraPose } from '@/components/capy/Capyvera';
import { AdventureScene } from './AdventureScene';
import { NurtureLifeAgreement } from './NurtureLifeAgreement';
import { canCreateAdventurer, nextAccessStep, previousAccessStep, type AdventureStep, type AccessMethod } from './adventure-flow';

interface AuthFormProps {
  onPendingChange?: (pending: boolean) => void;
  onSignupContinue?: () => void;
}

export function AuthForm({ onPendingChange, onSignupContinue }: AuthFormProps) {
  const { t, language } = useLanguage();
  const pt = language === 'pt';
  const [searchParams, setSearchParams] = useSearchParams();
  const signupMode = searchParams.get('mode') === 'signup';
  const [isLogin, setIsLogin] = useState(!signupMode);
  const [step, setStep] = useState<AdventureStep>(signupMode ? 'name' : 'welcome');
  const [method, setMethod] = useState<AccessMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nurtureLifeAgreement, setNurtureLifeAgreement] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [formLoadTime] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSignupSession, setHasSignupSession] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setIsLogin(!signupMode);
    setStep(signupMode ? 'name' : 'welcome');
    setMethod('email');
    setErrorMessage('');
  }, [signupMode]);

  // Avoid opening the mobile keyboard automatically; desktop focus follows the screen.
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) fieldRef.current?.focus();
  }, [step]);

  const selectMode = (login: boolean) => {
    setIsLogin(login);
    setMethod('email');
    setNurtureLifeAgreement(null);
    setErrorMessage('');
    setStep(login ? 'email' : 'name');
    const params = new URLSearchParams(searchParams);
    params.set('mode', login ? 'login' : 'signup');
    setSearchParams(params, { replace: true });
  };

  const fail = (message: string) => setErrorMessage(message);
  const validateEmail = () => {
    const validation = z.string().email(t('authInvalidEmail')).safeParse(email);
    if (!validation.success) { fail(validation.error.errors[0]?.message ?? t('authInvalidEmail')); return false; }
    return true;
  };

  const handleGoogle = async () => {
    if (loading) return;
    if (!isLogin && !canCreateAdventurer(nurtureLifeAgreement)) {
      setMethod('google');
      setStep('agreement');
      setErrorMessage('');
      return;
    }
    setLoading(true);
    onPendingChange?.(true);
    try {
      // Always return to the public auth page; its existing intent handler routes after hydration.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth${window.location.search}` },
      });
      if (error) { fail(error.message); onPendingChange?.(false); }
    } catch {
      fail(t('authUnexpectedError'));
      onPendingChange?.(false);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setErrorMessage('');
    if (step === 'name') { setStep('email'); return; }
    if (step === 'email') { if (validateEmail()) setStep(nextAccessStep(step, isLogin)); return; }
    if (step === 'reset') {
      if (!validateEmail()) return;
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) fail(error.message);
        else { setResetSent(true); toast({ title: t('authResetEmailSent'), description: t('authResetEmailSentDescription') }); }
      } catch { fail(t('authUnexpectedError')); }
      finally { setLoading(false); }
      return;
    }
    if (step === 'password') {
      const validation = z.string().min(6, t('authPasswordMin')).safeParse(password);
      if (!validation.success) { fail(t('authPasswordMin')); return; }
      if (!isLogin) { setStep(nextAccessStep(step, false)); return; }
    }
    if (!isLogin) {
      if (!canCreateAdventurer(nurtureLifeAgreement)) { fail(t('authAgreementRequiredDescription')); return; }
      if (method === 'google') { await handleGoogle(); return; }
      if (honeypot || Date.now() - formLoadTime < 3000) { fail(t('authUnexpectedError')); return; }
    }
    const validation = z.object({ email: z.string().email(t('authInvalidEmail')), password: z.string().min(6, t('authPasswordMin')) }).safeParse({ email, password });
    if (!validation.success) { fail(validation.error.errors[0]?.message ?? t('authUnexpectedError')); return; }
    setLoading(true);
    onPendingChange?.(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) fail(error.message === 'Invalid login credentials' ? t('authInvalidCredentials') : error.message);
        else toast({ title: t('authWelcomeBack') });
        onPendingChange?.(false);
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) { fail(error.message.includes('already registered') ? t('authEmailRegistered') : error.message); onPendingChange?.(false); }
        else {
          const { data } = await supabase.auth.getSession();
          setHasSignupSession(Boolean(data.session));
          setPassword('');
          setStep('success');
        }
      }
    } catch { fail(t('authUnexpectedError')); onPendingChange?.(false); }
    finally { setLoading(false); }
  };

  const goBack = () => {
    setErrorMessage('');
    if (step === 'reset') { setResetSent(false); setStep('password'); }
    else setStep(previousAccessStep(step, isLogin, method));
  };
  const pose: CapyveraPose = step === 'agreement' ? 'planting' : step === 'success' ? 'celebrate' : step === 'password' ? 'thinking' : step === 'name' ? 'explorer' : 'wave';
  const steps: AdventureStep[] = isLogin ? ['email', 'password'] : method === 'google' ? ['name', 'agreement'] : ['name', 'email', 'password', 'agreement'];
  const stepIndex = steps.indexOf(step);
  const copy = {
    welcome: { title: pt ? 'A vida é uma aventura!' : 'Life is an adventure!', body: pt ? 'Cultive conexões. Cuide do planeta. Viva essa aventura com amigos.' : 'Grow connections. Care for the planet. Share this adventure with friends.' },
    name: { title: pt ? 'Como vamos te chamar?' : 'What shall we call you?', body: pt ? 'Toda aventura começa com você.' : 'Every adventure begins with you.' },
    email: { title: pt ? 'Qual é o seu e-mail?' : 'What is your email?', body: isLogin ? t('authLoginSubtitle') : (pt ? 'Seu ponto de encontro com novas aventuras.' : 'Your meeting point for new adventures.') },
    password: { title: isLogin ? (pt ? 'Bem-vindo de volta!' : 'Welcome back!') : (pt ? 'Proteja sua aventura' : 'Protect your adventure'), body: isLogin ? (pt ? 'Suas conexões e conquistas esperam por você.' : 'Your connections and achievements await you.') : t('authPasswordMin') },
    reset: { title: t('authForgotPasswordTitle'), body: t('authForgotPasswordSubtitle') },
    success: { title: t('authAccountCreated'), body: hasSignupSession ? t('authConfigureProfile') : (pt ? 'Confirme seu e-mail para começar sua Aventura Regenerativa.' : 'Confirm your email to begin your Regenerative Adventure.') },
  };
  const currentCopy = step === 'agreement' ? null : copy[step];
  const googleLabel = t('authContinueWithGoogle');
  const GoogleButton = <Button type="button" variant="outline" className="w-full min-h-12 tracking-normal" onClick={handleGoogle} disabled={loading}><span aria-hidden="true" className="text-lg font-bold text-info">G</span>{googleLabel}</Button>;

  return (
    <AdventureScene pose={pose}>
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <a href="/" className="flex min-w-0 items-center gap-2 text-foreground"><img src={appLogo} alt="" width={32} height={32} className="h-8 w-8 object-contain" /><span className="font-display text-xl font-bold">TaskMates</span></a>
        <LanguageSelector />
      </header>
      <main className="adventure-content relative z-10">
        <div className="adventure-stage-space h-44 md:h-60" aria-hidden="true" />
        {stepIndex >= 0 && <div className="mb-5 flex items-center justify-center gap-3" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1} aria-label={pt ? 'Progresso da entrada' : 'Access progress'}>
          {steps.map((item, index) => <span key={item} aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${index <= stepIndex ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}>{index < stepIndex ? <Check className="h-3 w-3" /> : index + 1}</span>)}
        </div>}
        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={step} aria-labelledby="access-title" initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
            {currentCopy && <div className="mb-6 text-center">
              {step === 'welcome' && <p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase text-primary"><Compass className="h-4 w-4" />{pt ? 'Aventura Regenerativa' : 'Regenerative Adventure'}</p>}
              <h1 id="access-title" className={`adventure-welcome-title font-display font-bold text-foreground ${step === 'welcome' ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>{currentCopy.title}</h1>
              <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">{currentCopy.body}</p>
            </div>}
            {step === 'welcome' ? <div className="space-y-4">
              <Button type="button" className="min-h-12 w-full tracking-normal" onClick={() => selectMode(false)}><Sparkles />{pt ? 'Criar aventureiro' : 'Create adventurer'}</Button>
              <Button type="button" variant="secondary" className="min-h-12 w-full tracking-normal" onClick={() => selectMode(true)}><Compass />{pt ? 'Já tenho uma conta' : 'I already have an account'}</Button>
              <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t('or')}<span className="h-px flex-1 bg-border" /></div>
              {GoogleButton}
            </div> : step === 'success' ? <div className="space-y-5 text-center">
              <ShieldCheck className="mx-auto h-9 w-9 text-primary" />
              {!hasSignupSession && <p className="text-sm text-muted-foreground">{pt ? 'Confira sua caixa de entrada e a pasta de spam.' : 'Check your inbox and spam folder.'}</p>}
              <Button type="button" className="w-full tracking-normal" onClick={() => { if (hasSignupSession) onSignupContinue?.(); else { onPendingChange?.(false); selectMode(true); } }}><ArrowRight />{hasSignupSession ? (pt ? 'Configurar meu perfil' : 'Configure my profile') : t('authBackToLogin')}</Button>
            </div> : <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="absolute h-0 overflow-hidden opacity-0" aria-hidden="true"><label htmlFor="website_url">Website</label><input id="website_url" name="website_url" value={honeypot} onChange={event => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" /></div>
              {step === 'name' && <div className="space-y-2"><Label htmlFor="fullName">{t('authFullName')}</Label><div className="relative"><User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" /><Input ref={fieldRef} id="fullName" autoComplete="name" placeholder={t('authFullNamePlaceholder')} value={fullName} onChange={event => setFullName(event.target.value)} className="min-h-12 bg-card pl-12 text-base" /></div></div>}
              {(step === 'email' || (step === 'reset' && !resetSent)) && <div className="space-y-2"><Label htmlFor="email">{t('authEmail')}</Label><div className="relative"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" /><Input ref={fieldRef} id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder={t('authEmailPlaceholder')} value={email} onChange={event => { setEmail(event.target.value); setErrorMessage(''); }} aria-invalid={Boolean(errorMessage)} className="min-h-12 bg-card pl-12 text-base" required /></div></div>}
              {step === 'password' && <div className="space-y-2"><Label htmlFor="password">{t('authPassword')}</Label><div className="relative"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" /><Input ref={fieldRef} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder={t('authPasswordPlaceholder')} value={password} onChange={event => { setPassword(event.target.value); setErrorMessage(''); }} aria-invalid={Boolean(errorMessage)} className="min-h-12 bg-card pl-12 pr-12 text-base" required /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? (pt ? 'Ocultar senha' : 'Hide password') : (pt ? 'Mostrar senha' : 'Show password')}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>{isLogin && <Button type="button" variant="link" className="h-auto px-0 py-1 text-xs tracking-normal" onClick={() => { setResetSent(false); setStep('reset'); setErrorMessage(''); }}>{t('authForgotPassword')}</Button>}</div>}
              {step === 'agreement' && <NurtureLifeAgreement value={nurtureLifeAgreement} onChange={value => { setNurtureLifeAgreement(value); setErrorMessage(''); }} />}
              {step === 'reset' && resetSent && <p role="status" className="text-center text-primary">{t('authResetEmailSentDescription')}</p>}
              {errorMessage && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p>}
              {!(step === 'reset' && resetSent) && <Button type="submit" className="min-h-12 w-full tracking-normal" disabled={loading || (step === 'agreement' && !canCreateAdventurer(nurtureLifeAgreement))}>
                {loading ? <Loader2 className="animate-spin" /> : step === 'agreement' ? <Sparkles /> : <ArrowRight />}
                {step === 'reset' ? t('authSendResetLink') : step === 'password' && isLogin ? t('authLogin') : step === 'agreement' ? (method === 'google' ? googleLabel : t('authSignup')) : (pt ? 'Continuar' : 'Continue')}
              </Button>}
              <div className="flex items-center justify-between gap-2"><Button type="button" variant="ghost" className="px-2 tracking-normal text-muted-foreground" disabled={loading} onClick={goBack}><ArrowLeft />{pt ? 'Voltar' : 'Back'}</Button>{step !== 'reset' && <Button type="button" variant="link" className="px-2 text-xs tracking-normal" disabled={loading} onClick={() => selectMode(!isLogin)}>{isLogin ? t('authSignup') : t('authLogin')}</Button>}</div>
              {(step === 'name' || (isLogin && step === 'email')) && <><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t('or')}<span className="h-px flex-1 bg-border" /></div>{GoogleButton}</>}
            </form>}
          </motion.section>
        </AnimatePresence>
      </main>
    </AdventureScene>
  );
}
