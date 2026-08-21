import React from 'react';

/** Formats a date as a subtle chat-like day label. */
export function formatDayLabel(dateStr: string, language: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return language === 'pt' ? 'Hoje' : 'Today';
  if (sameDay(d, yesterday)) return language === 'pt' ? 'Ontem' : 'Yesterday';
  return d.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

/** Subtle grey divider with the day label, like a chat date separator. */
export function DateSeparator({ date, language }: { date: string; language: string }) {
  return (
    <div className="flex items-center gap-2 py-1 select-none" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
        {formatDayLabel(date, language)}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

const dayKey = (dateStr: string) => new Date(dateStr).toDateString();

/**
 * Renders a list with a subtle date separator inserted whenever the day changes,
 * grouping together items created on the same day.
 */
export function DateSeparatedList<T>({
  items,
  getDate,
  getKey,
  renderItem,
  language,
}: {
  items: T[];
  getDate: (item: T) => string;
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  language: string;
}) {
  let lastKey = '';
  return (
    <>
      {items.map(item => {
        const date = getDate(item);
        const key = dayKey(date);
        const showSeparator = key !== lastKey;
        lastKey = key;
        return (
          <React.Fragment key={getKey(item)}>
            {showSeparator && <DateSeparator date={date} language={language} />}
            {renderItem(item)}
          </React.Fragment>
        );
      })}
    </>
  );
}
