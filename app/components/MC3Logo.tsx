import Image from 'next/image';

interface MC3LogoProps {
  size?: number;
}

/**
 * MC3 Logo component
 *
 * Logo file: /public/brand/MC3-LOGO.jpg
 */
export default function MC3Logo({ size = 110 }: MC3LogoProps) {
  const height = Math.round(size * 0.29);

  return (
    <Image
      src="/brand/MC3-LOGO.jpg"
      alt="MC3 Manufacturing"
      width={size}
      height={height}
      priority
    />
  );
}
