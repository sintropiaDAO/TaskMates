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
import explorer from '@/assets/capyvera/explorer.png.asset.json';
import chef from '@/assets/capyvera/chef.png.asset.json';
import doctor from '@/assets/capyvera/doctor.png.asset.json';
import builder from '@/assets/capyvera/builder.png.asset.json';
import teacher from '@/assets/capyvera/teacher.png.asset.json';
import artist from '@/assets/capyvera/artist.png.asset.json';
import gardener from '@/assets/capyvera/gardener.png.asset.json';
import pool from '@/assets/capyvera/pool.png.asset.json';
import soccer from '@/assets/capyvera/soccer.png.asset.json';
import newspaper from '@/assets/capyvera/newspaper.png.asset.json';
import butterflies from '@/assets/capyvera/butterflies.png.asset.json';

export type CapyveraPose =
  | 'celebrate'
  | 'idle'
  | 'wave'
  | 'thinking'
  | 'trophy'
  | 'planting'
  | 'sleeping'
  | 'sad'
  | 'star'
  | 'explorer'
  | 'chef'
  | 'doctor'
  | 'builder'
  | 'teacher'
  | 'artist'
  | 'gardener'
  | 'pool'
  | 'soccer'
  | 'newspaper'
  | 'butterflies';

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
  explorer: explorer.url,
  chef: chef.url,
  doctor: doctor.url,
  builder: builder.url,
  teacher: teacher.url,
  artist: artist.url,
  gardener: gardener.url,
  pool: pool.url,
  soccer: soccer.url,
  newspaper: newspaper.url,
  butterflies: butterflies.url,
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
