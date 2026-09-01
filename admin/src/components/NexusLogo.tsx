type NexusLogoProps = {
  size?: number;
};

/** Hex mark aligned with nexustechnologies.cloud branding */
export function NexusLogo({ size = 32 }: NexusLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        d="M20 4L33 11.5V26.5L20 34L7 26.5V11.5L20 4Z"
        stroke="url(#nx-hex-stroke)"
        strokeWidth="1.5"
        fill="url(#nx-hex-fill)"
      />
      <path
        d="M20 12L26 15.5V22.5L20 26L14 22.5V15.5L20 12Z"
        fill="#4F6EF7"
        opacity="0.95"
      />
      <defs>
        <linearGradient id="nx-hex-stroke" x1="7" y1="4" x2="33" y2="34">
          <stop stopColor="#6B84FF" />
          <stop offset="1" stopColor="#4F6EF7" />
        </linearGradient>
        <linearGradient id="nx-hex-fill" x1="7" y1="4" x2="33" y2="34">
          <stop stopColor="#4F6EF71A" />
          <stop offset="1" stopColor="#4F6EF70A" />
        </linearGradient>
      </defs>
    </svg>
  );
}
