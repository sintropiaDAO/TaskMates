import { Capyvera, type CapyveraPose } from './Capyvera';

interface CapyveraGreetingProps {
  pose: CapyveraPose;
  title: string;
  description: string;
}

/**
 * Header greeting where Capyvera "speaks" to the user.
 * The mascot sits on the left, with a speech bubble (with tail)
 * containing the title and section description on the right.
 */
export function CapyveraGreeting({ pose, title, description }: CapyveraGreetingProps) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="shrink-0 -mb-1">
        <Capyvera pose={pose} size="sm" loading="eager" />
      </div>
      <div
        className="relative flex-1 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm px-4 py-3 shadow-sm"
        role="status"
        aria-live="polite"
      >
        {/* Speech bubble tail */}
        <span
          aria-hidden="true"
          className="absolute -left-2 top-5 h-4 w-4 rotate-45 border-l border-b border-border/60 bg-card/90"
        />
        <h1 className="relative text-lg sm:text-xl font-display font-bold leading-tight">
          {title}
        </h1>
        <p className="relative text-xs sm:text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}
