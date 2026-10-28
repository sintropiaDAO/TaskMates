import type { LucideIcon } from 'lucide-react';

export function SectionHeading({ title, icon: Icon, id }: { title: string; icon: LucideIcon; id?: string }) {
  return (
    <h2 id={id} className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
      <span className="clay-sm flex h-8 w-8 shrink-0 items-center justify-center bg-secondary/40 text-secondary-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {title}
    </h2>
  );
}