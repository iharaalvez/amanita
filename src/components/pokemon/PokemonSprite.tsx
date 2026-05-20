"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
};

export function PokemonSprite({
  src,
  alt,
  width,
  height,
  className,
  style,
}: Props) {
  const normalizedSrc = src?.trim() || null;

  if (normalizedSrc) {
    return (
      <Image
        src={normalizedSrc}
        alt={alt}
        width={width}
        height={height}
        unoptimized
        style={style}
        className={className}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={alt}
      style={style}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300/45 dark:bg-gray-600/35 ${className ?? ""}`}
    >
      <span className="absolute top-[17%] h-[36%] w-[36%] rounded-full bg-gray-500/60 opacity-35 dark:bg-gray-300/50" />
      <span className="absolute bottom-[16%] h-[38%] w-[56%] rounded-t-full bg-gray-500/60 opacity-35 dark:bg-gray-300/50" />
    </span>
  );
}
