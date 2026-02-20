import React from 'react';
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
  if (locked) return { bg: '#d1d5db', accent: '#9ca3af', text: '#6b7280', ring: '#e5e7eb', shine: '#f3f4f6' };
  if (level >= 12) return { bg: '#0ea5e9', accent: '#38bdf8', text: '#fff', ring: '#7dd3fc', shine: '#bae6fd' }; // Diamond - blue
  if (level === 11) return { bg: '#d97706', accent: '#f59e0b', text: '#fff', ring: '#fcd34d', shine: '#fef3c7' }; // Gold
  if (level === 10) return { bg: '#6b7280', accent: '#9ca3af', text: '#fff', ring: '#d1d5db', shine: '#f3f4f6' }; // Silver
  if (level >= 7) return { bg: '#7c3aed', accent: '#a78bfa', text: '#fff', ring: '#c4b5fd', shine: '#ede9fe' }; // Purple
  if (level >= 5) return { bg: '#dc2626', accent: '#f87171', text: '#fff', ring: '#fca5a5', shine: '#fee2e2' }; // Red
  if (level >= 3) return { bg: '#0d9488', accent: '#2dd4bf', text: '#fff', ring: '#99f6e4', shine: '#ccfbf1' }; // Teal
  return { bg: '#16a34a', accent: '#4ade80', text: '#fff', ring: '#bbf7d0', shine: '#dcfce7' }; // Green base
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
    default: return '';
  }
}

export function BadgeSVG({ category, level, entityName, userName, locked = false, size = 140, className }: BadgeSVGProps) {
  const { language } = useLanguage();
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
      className={className}
      style={{ userSelect: 'none' }}
    >
      <defs>
        <radialGradient id={`bg-${category}-${level}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={colors.shine} />
          <stop offset="100%" stopColor={colors.bg} />
        </radialGradient>
        <filter id={`shadow-${category}-${level}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={s * 0.02} stdDeviation={s * 0.03} floodColor={colors.bg} floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Outer ring */}
      <polygon
        points={hex(outerR)}
        fill={colors.ring}
        filter={`url(#shadow-${category}-${level})`}
      />
      {/* Inner hex body */}
      <polygon
        points={hex(innerR)}
        fill={`url(#bg-${category}-${level})`}
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
        fontFamily="'Outfit', sans-serif"
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
          fontFamily="'Outfit', sans-serif"
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
