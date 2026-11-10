export type AdventureStep = 'welcome' | 'name' | 'email' | 'password' | 'agreement' | 'success' | 'reset';
export type AccessMethod = 'email' | 'google';

export function nextAccessStep(step: AdventureStep, isLogin: boolean): AdventureStep {
  if (step === 'name') return 'email';
  if (step === 'email') return 'password';
  if (step === 'password' && !isLogin) return 'agreement';
  return step;
}

export function previousAccessStep(step: AdventureStep, isLogin: boolean, method: AccessMethod): AdventureStep {
  if (step === 'agreement') return method === 'google' ? 'name' : 'password';
  if (step === 'password') return 'email';
  if (step === 'email') return isLogin ? 'welcome' : 'name';
  return 'welcome';
}

export function canCreateAdventurer(agreement: string | null): boolean {
  return agreement === 'yes';
}