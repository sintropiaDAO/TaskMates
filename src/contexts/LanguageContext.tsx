import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys } from '@/i18n/translations';

export type { Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language || (navigator as any).userLanguage;
  const langCode = browserLang?.split('-')[0]?.toLowerCase();
  
  const supportedLanguages: Language[] = ['pt', 'en'];
  if (supportedLanguages.includes(langCode as Language)) {
    return langCode as Language;
  }
  return 'en'; // fallback for non-Brazilian / unsupported locales
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR-safe: the server has no localStorage/navigator, so render with 'en'
  // and swap to the saved/detected language right after hydration.
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('taskmates-language');
    if (saved && ['pt', 'en'].includes(saved)) {
      setLanguageState(saved as Language);
    } else {
      setLanguageState(detectBrowserLanguage());
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('taskmates-language', lang);
  };

  const t = (key: keyof TranslationKeys): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Keep the backend copy in sync so emails are sent in the member's language
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId || cancelled) return;
        await supabase
          .from('profiles')
          .update({ preferred_language: language })
          .eq('id', userId);
      } catch {
        // best-effort only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);


  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
