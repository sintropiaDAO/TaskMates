import React, { useId } from 'react';
import { BadgeCategory, getLevelName } from '@/hooks/useBadges';
import { useLanguage } from '@/contexts/LanguageContext';

interface BadgeSVGProps {
  category: BadgeCategory;
  level: number;
  entityName?: string | null;
  userName?: string | null;
  locked?: boolean;
  size?: number;
  className?: string;
}

// Level color schemes (same across all categories)
function getLevelColors(level: number, locked: boolean) {
  const tier = locked ? 'locked' : level >= 12 ? 'diamond' : level === 11 ? 'gold' : level === 10 ? 'silver' : level >= 7 ? 'violet' : level >= 5 ? 'rose' : level >= 3 ? 'teal' : 'base';
  return { tier, bg: 'var(--badge-bg)', accent: 'var(--badge-ring)', text: 'var(--badge-ink)', ring: 'var(--badge-ring)', shine: 'var(--badge-shine)' };
}

// Category specific icon/symbol
function getCategoryIcon(category: BadgeCategory): string {
  switch (category) {
    case 'taskmates': return '🤝';
    case 'habits': return '🎯';
    case 'communities': return '🌐';
    case 'leadership': return '👑';
    case 'collaboration': return '💪';
    case 'positive_impact': return '✨';
    case 'sociability': return '🌟';
    case 'reliability': return '🛡️';
    case 'consistency': return '🔥';
    case 'proactivity': return '🚀';
    default: return '🏆';
  }
}

function getCategoryLabel(category: BadgeCategory, lang: 'pt' | 'en'): string {
  const labels: Record<BadgeCategory, { pt: string; en: string }> = {
    taskmates: { pt: 'Taskmates', en: 'Taskmates' },
    habits: { pt: 'Hábitos', en: 'Habits' },
    communities: { pt: 'Comunidades', en: 'Communities' },
    leadership: { pt: 'Liderança', en: 'Leadership' },
    collaboration: { pt: 'Colaboração', en: 'Collaboration' },
    positive_impact: { pt: 'Impacto Positivo', en: 'Positive Impact' },
    sociability: { pt: 'Sociabilidade', en: 'Sociability' },
    reliability: { pt: 'Confiabilidade', en: 'Reliability' },
    consistency: { pt: 'Consistência', en: 'Consistency' },
    proactivity: { pt: 'Proatividade', en: 'Proactivity' },
  };
  return labels[category]?.[lang] ?? category;
}

function getHighlightLabel(category: BadgeCategory, entityName: string | null | undefined, lang: 'pt' | 'en'): string {
  switch (category) {
    case 'taskmates': return entityName || '?';
    case 'habits': return entityName || '?';
    case 'communities': return entityName || '?';
    case 'leadership': return lang === 'pt' ? 'Mobilizador Social' : 'Social Mobilizer';
    case 'collaboration': return lang === 'pt' ? 'Altruísta Exemplar' : 'Exemplary Altruist';
    case 'positive_impact': return entityName || (lang === 'pt' ? 'Impacto' : 'Impact');
    case 'sociability': return lang === 'pt' ? 'Influenciador' : 'Influencer';
    case 'reliability': return lang === 'pt' ? 'Colaborador Excelente' : 'Excellent Collaborator';
    case 'consistency': return entityName || (lang === 'pt' ? 'Consistência' : 'Consistency');
    case 'proactivity': return lang === 'pt' ? 'Dinâmico Benfeitor' : 'Dynamic Benefactor';
    default: return '';
  }
}

export function BadgeSVG({ category, level, entityName, userName, locked = false, size = 140, className }: BadgeSVGProps) {
  const { language } = useLanguage();
  const svgId = useId().replace(/:/g, '');
  const colors = getLevelColors(level, locked);
  const icon = getCategoryIcon(category);
  const categoryLabel = getCategoryLabel(category, language as 'pt' | 'en');
  const highlightLabel = getHighlightLabel(category, entityName, language as 'pt' | 'en');
  const levelLabel = locked ? (language === 'pt' ? '?' : '?') : getLevelName(level, language as 'pt' | 'en');

  // Truncate text for SVG
  const truncate = (str: string, max: number) => str.length > max ? str.slice(0, max - 1) + '…' : str;

  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const outerR = s * 0.46;
  const innerR = s * 0.38;

  // Hexagon points
  const hex = (r: number) => Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={`achievement-medallion badge-tier-${colors.tier} select-none shrink-0 ${className ?? ''}`}
      role="img"
      aria-label={`${categoryLabel}: ${locked ? (language === 'pt' ? 'Bloqueado' : 'Locked') : `${highlightLabel}, ${levelLabel}`}`}
    >
      <defs>
        <radialGradient id={`bg-${svgId}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={colors.shine} />
          <stop offset="100%" stopColor={colors.bg} />
        </radialGradient>
        <filter id={`shadow-${svgId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={s * 0.02} stdDeviation={s * 0.03} floodColor={colors.bg} floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Outer ring */}
      <polygon
        points={hex(outerR)}
        fill={colors.ring}
        filter={`url(#shadow-${svgId})`}
      />
      {/* Inner hex body */}
      <polygon
        points={hex(innerR)}
        fill={`url(#bg-${svgId})`}
        stroke={colors.accent}
        strokeWidth={s * 0.012}
      />

      {/* Category label (top) */}
      <text
        x={cx}
        y={cy - s * 0.18}
        textAnchor="middle"
        fontSize={s * 0.085}
        fontWeight="700"
        fontFamily="'Space Grotesk', sans-serif"
        fill={locked ? colors.text : colors.text}
        opacity={locked ? 0.7 : 1}
      >
        {truncate(categoryLabel, 12)}
      </text>

      {/* Icon */}
      <text
        x={cx}
        y={cy + s * 0.04}
        textAnchor="middle"
        fontSize={s * 0.18}
        dominantBaseline="middle"
      >
        {locked ? '🔒' : icon}
      </text>

      {/* Highlight label */}
      <text
        x={cx}
        y={cy + s * 0.17}
        textAnchor="middle"
        fontSize={s * 0.072}
        fontWeight="600"
        fontFamily="'Nunito', sans-serif"
        fill={colors.text}
        opacity={locked ? 0.6 : 0.9}
      >
        {locked ? '???' : truncate(highlightLabel, 14)}
      </text>

      {/* User name */}
      {userName && !locked && (
        <text
          x={cx}
          y={cy + s * 0.26}
          textAnchor="middle"
          fontSize={s * 0.062}
          fontFamily="'Nunito', sans-serif"
          fill={colors.text}
          opacity={0.75}
        >
          {truncate(userName, 14)}
        </text>
      )}

      {/* Level label (bottom) */}
      <text
        x={cx}
        y={cy + s * 0.34}
        textAnchor="middle"
        fontSize={s * 0.07}
        fontWeight="800"
        fontFamily="'Space Grotesk', sans-serif"
        fill={colors.text}
        opacity={locked ? 0.5 : 1}
      >
        {truncate(levelLabel, 12)}
      </text>
    </svg>
  );
}
