import Image from 'next/image';

interface MC3LogoProps {
  variant?: 'dark' | 'white';
  size?: number;
}

/**
 * MC3 Logo component
 *
 * TODO: Replace placeholder SVGs in /public/brand/ with actual logo assets:
 * - mc3-logo-dark.svg (or .png) - for light backgrounds
 * - mc3-logo-white.svg (or .png) - for dark backgrounds
 */
export default function MC3Logo({ variant = 'dark', size = 110 }: MC3LogoProps) {
  const height = Math.round(size * 0.29);

  return (
    <Image
      src={`/brand/mc3-logo-${variant}.svg`}
      alt="MC3 Manufacturing"
      width={size}
      height={height}
      priority
    />
  );
}
