import { useState, type CSSProperties } from 'react';

import celebrate from '@/assets/capyvera/celebrate.png.asset.json';
import idle from '@/assets/capyvera/idle.png.asset.json';
import wave from '@/assets/capyvera/wave.png.asset.json';
import thinking from '@/assets/capyvera/thinking.png.asset.json';
import trophy from '@/assets/capyvera/trophy.png.asset.json';
import planting from '@/assets/capyvera/planting.png.asset.json';
import sleeping from '@/assets/capyvera/sleeping.png.asset.json';
import sad from '@/assets/capyvera/sad.png.asset.json';
import star from '@/assets/capyvera/star.png.asset.json';

export type CapyveraPose =
  | 'celebrate'
  | 'idle'
  | 'wave'
  | 'thinking'
  | 'trophy'
  | 'planting'
  | 'sleeping'
  | 'sad'
  | 'star';

const POSE_URLS: Record<CapyveraPose, string> = {
  celebrate: celebrate.url,
  idle: idle.url,
  wave: wave.url,
  thinking: thinking.url,
  trophy: trophy.url,
  planting: planting.url,
  sleeping: sleeping.url,
  sad: sad.url,
  star: star.url,
};

const SIZE_PX: Record<NonNullable<CapyveraProps['size']>, number> = {
  xs: 48,
  sm: 80,
  md: 128,
  lg: 192,
  xl: 280,
};

export interface CapyveraProps {
  pose?: CapyveraPose;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  alt?: string;
  className?: string;
  style?: CSSProperties;
  loading?: 'eager' | 'lazy';
}

/**
 * Capyvera mascot illustration. Loads pose image from CDN; falls back to a
 * capybara emoji if the asset fails to load.
 */
export function Capyvera({
  pose = 'idle',
  size = 'md',
  alt,
  className,
  style,
  loading = 'lazy',
}: CapyveraProps) {
  const [failed, setFailed] = useState(false);
  const px = SIZE_PX[size];
  const url = POSE_URLS[pose];
  const label = alt ?? `Capyvera ${pose}`;

  if (failed || !url) {
    return (
      <span
        role="img"
        aria-label={label}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: px,
          height: px,
          fontSize: Math.round(px * 0.7),
          lineHeight: 1,
          ...style,
        }}
      >
        🦫
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={label}
      width={px}
      height={px}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{
        width: px,
        height: px,
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
