'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getFlagUrl } from '@/data/teams';

interface Props {
  name: string;
  flagEmoji: string;
  /** Height in px. Width is derived at 3:2 ratio. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TeamFlag({ name, flagEmoji, size = 32, className, style }: Props) {
  const [error, setError] = useState(false);
  const w = Math.round(size * 1.5);

  if (error) {
    return (
      <span style={{ fontSize: size * 0.85, lineHeight: 1, display: 'inline-block' }}>
        {flagEmoji}
      </span>
    );
  }

  return (
    <Image
      src={getFlagUrl(name)}
      alt={name}
      width={w}
      height={size}
      className={className}
      style={{
        objectFit: 'cover',
        borderRadius: 3,
        flexShrink: 0,
        ...style,
      }}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
