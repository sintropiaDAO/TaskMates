import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Profile } from '@/types';

interface TypingIndicatorProps {
  typingUserIds: string[];
}

export function TypingIndicator({ typingUserIds }: TypingIndicatorProps) {
  const { t } = useLanguage();
  const [typingNames, setTypingNames] = useState<string[]>([]);

  useEffect(() => {
    if (typingUserIds.length === 0) {
      setTypingNames([]);
      return;
    }

    const fetchNames = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', typingUserIds);

      if (data) {
        setTypingNames(
          data.map((p: Profile) => p.full_name?.split(' ')[0] || t('chatUserUnknown'))
        );
      }
    };
    fetchNames();
  }, [typingUserIds, t]);

  if (typingNames.length === 0) return null;

  const getTypingText = () => {
    if (typingNames.length === 1) {
      return t('chatTypingSingle').replace('{name}', typingNames[0]);
    } else if (typingNames.length === 2) {
      return t('chatTypingTwo')
        .replace('{name1}', typingNames[0])
        .replace('{name2}', typingNames[1]);
    } else {
      return t('chatTypingMultiple');
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}
