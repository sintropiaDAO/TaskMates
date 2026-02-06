import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ChatSearchProps {
  onSearch: (query: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSearch({ onSearch, isOpen, onToggle }: ChatSearchProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    onSearch(value);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  const handleClose = useCallback(() => {
    handleClear();
    onToggle();
  }, [handleClear, onToggle]);

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="h-8 w-8"
        title={t('chatSearchMessages')}
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('chatSearchPlaceholder')}
          className="pl-8 pr-8 h-8 text-sm"
          autoFocus
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
