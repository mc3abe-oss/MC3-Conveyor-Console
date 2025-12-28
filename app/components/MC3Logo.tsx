import Image from 'next/image';

interface MC3LogoProps {
  size?: number;
}

/**
 * MC3 Logo component
 *
 * Place logo file at: /public/brand/mc3-logo.jpg
 */
export default function MC3Logo({ size = 110 }: MC3LogoProps) {
  const height = Math.round(size * 0.29);

  return (
    <Image
      src="/brand/mc3-logo.jpg"
      alt="MC3 Manufacturing"
      width={size}
      height={height}
      priority
    />
  );
}
