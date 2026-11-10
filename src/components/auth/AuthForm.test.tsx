// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { translations } from '@/i18n/translations';

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams('mode=signup&redirect=%2Fjourneys%2Fexample'),
  signIn: vi.fn(), signUp: vi.fn(), oauth: vi.fn(), reset: vi.fn(), session: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'pt', t: (key: keyof typeof translations.pt) => translations.pt[key] }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ signIn: mocks.signIn, signUp: mocks.signUp }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/router-compat', () => ({ useSearchParams: () => [mocks.params, vi.fn()] }));
vi.mock('@/components/LanguageSelector', () => ({ LanguageSelector: () => null }));
vi.mock('./AdventureScene', () => ({ AdventureScene: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { section: ({ children }: { children: React.ReactNode }) => <section>{children}</section> },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  signInWithOAuth: mocks.oauth, resetPasswordForEmail: mocks.reset, getSession: mocks.session,
} } }));

import { AuthForm } from './AuthForm';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = new URLSearchParams('mode=signup&redirect=%2Fjourneys%2Fexample');
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.signUp.mockResolvedValue({ error: null });
  mocks.oauth.mockResolvedValue({ error: null });
  mocks.reset.mockResolvedValue({ error: null });
  mocks.session.mockResolvedValue({ data: { session: null } });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  // Keep the established signup anti-bot duration while advancing a deterministic clock.
  let tick = 100000;
  vi.spyOn(Date, 'now').mockImplementation(() => { tick += 4000; return tick; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function signupDetails(view: ReturnType<typeof render>) {
  fireEvent.change(view.getByLabelText('Nome completo'), { target: { value: 'Aventureiro Teste' } });
  fireEvent.click(view.getByRole('button', { name: 'Continuar', exact: true }));
  fireEvent.change(view.getByLabelText('Email'), { target: { value: 'adventure@example.com' } });
  fireEvent.click(view.getByRole('button', { name: 'Continuar', exact: true }));
  fireEvent.change(view.getByLabelText('Senha'), { target: { value: 'test-password' } });
  fireEvent.click(view.getByRole('button', { name: 'Continuar', exact: true }));
}

describe('adventurer access submissions', () => {
  it('cannot create an account without consent or with a refusal', async () => {
    const view = render(<AuthForm />);
    signupDetails(view);
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    expect(mocks.signUp).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('radio', { name: 'Não concordo', exact: true }));
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('submits the original name and credentials only after agreement and keeps confirmation-required signup on auth', async () => {
    const pending = vi.fn();
    const view = render(<AuthForm onPendingChange={pending} />);
    signupDetails(view);
    fireEvent.click(view.getByRole('radio', { name: 'Sim, concordo', exact: true }));
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(mocks.session).toHaveBeenCalledOnce());
    expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith('adventure@example.com', 'test-password', 'Aventureiro Teste');
    expect(pending).toHaveBeenLastCalledWith(true);
  });
  it('lets an authenticated signup explicitly continue to profile setup', async () => {
    mocks.session.mockResolvedValue({ data: { session: { user: { id: 'new-user' } } } });
    const continueSignup = vi.fn();
    const view = render(<AuthForm onSignupContinue={continueSignup} />);
    signupDetails(view);
    fireEvent.click(view.getByRole('radio', { name: 'Sim, concordo', exact: true }));
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    fireEvent.click(await view.findByRole('button', { name: 'Configurar meu perfil' }));
    expect(continueSignup).toHaveBeenCalledOnce();
  });
  it('keeps credentials when navigating back without sending them', () => {
    const view = render(<AuthForm />);
    signupDetails(view);
    fireEvent.click(view.getByRole('button', { name: 'Voltar', exact: true }));
    expect((view.getByLabelText('Senha') as HTMLInputElement).value).toBe('test-password');
    fireEvent.click(view.getByRole('button', { name: 'Voltar', exact: true }));
    expect((view.getByLabelText('Email') as HTMLInputElement).value).toBe('adventure@example.com');
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('waits for agreement before Google signup and preserves intent in a public same-origin callback', async () => {
    const view = render(<AuthForm />);
    fireEvent.click(view.getByRole('button', { name: 'Continuar com Google' }));
    expect(mocks.oauth).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('radio', { name: 'Não concordo', exact: true }));
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    expect(mocks.oauth).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('radio', { name: 'Sim, concordo', exact: true }));
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledOnce());
    expect(mocks.oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth${window.location.search}` } });
  });
  it('submits login and releases navigation to the Auth page once resolved', async () => {
    mocks.params = new URLSearchParams('mode=login');
    const pending = vi.fn();
    const view = render(<AuthForm onPendingChange={pending} />);
    fireEvent.change(view.getByLabelText('Email'), { target: { value: 'member@example.com' } });
    fireEvent.click(view.getByRole('button', { name: 'Continuar', exact: true }));
    fireEvent.change(view.getByLabelText('Senha'), { target: { value: 'test-password' } });
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(pending).toHaveBeenLastCalledWith(false));
    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith('member@example.com', 'test-password');
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('uses the existing reset-password destination for recovery', async () => {
    mocks.params = new URLSearchParams('mode=login');
    const view = render(<AuthForm />);
    fireEvent.change(view.getByLabelText('Email'), { target: { value: 'member@example.com' } });
    fireEvent.click(view.getByRole('button', { name: 'Continuar', exact: true }));
    fireEvent.click(view.getByRole('button', { name: 'Esqueceu a senha?' }));
    fireEvent.submit(view.container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(mocks.reset).toHaveBeenCalledOnce());
    expect(mocks.reset).toHaveBeenCalledWith('member@example.com', { redirectTo: `${window.location.origin}/reset-password` });
  });
});