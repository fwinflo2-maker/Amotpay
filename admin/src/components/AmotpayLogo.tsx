type AmotpayLogoProps = {
  size?: number;
  variant?: 'mark' | 'lockup';
};

/** AMOTPay flow mark — gold transfer path, distinct from Nexus hex logo */
export function AmotpayLogo({ size = 32, variant = 'mark' }: AmotpayLogoProps) {
  if (variant === 'lockup') {
    return (
      <div className="amotpay-lockup" style={{ gap: size * 0.28 }}>
        <AmotpayLogo size={size} />
        <span className="amotpay-lockup-text" style={{ fontSize: size * 0.42 }}>
          AMOTPAY
        </span>
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#141C19" stroke="rgba(201,162,39,0.28)" strokeWidth="1.25" />
      <path
        d="M14 24 H34"
        stroke="rgba(201,162,39,0.42)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="24" r="4.5" fill="#C9A227" />
      <circle cx="34" cy="24" r="3.5" fill="#E8C96A" />
      <circle cx="24" cy="24" r="2.5" fill="#D4AF37" opacity="0.95" />
      <path
        d="M22 17 L26 24 L22 31"
        stroke="#C9A227"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}
