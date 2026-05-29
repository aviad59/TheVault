interface Props {
  open?: boolean;
  className?: string;
}

export function VaultEmblem({ open = false, className }: Props) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ve-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d97a" />
          <stop offset="55%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#7c5e15" />
        </linearGradient>
        <radialGradient id="ve-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5d97a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f5d97a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {open && <circle cx="60" cy="60" r="56" fill="url(#ve-glow)" />}
      <circle cx="60" cy="60" r="50" fill="none" stroke="url(#ve-gold)" strokeWidth="2.2" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="url(#ve-gold)" strokeWidth="1.4" opacity="0.7" />
      <circle cx="60" cy="60" r="26" fill="none" stroke="url(#ve-gold)" strokeWidth="1" opacity="0.45" />
      <circle cx="60" cy="60" r="5" fill="url(#ve-gold)" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 60 + Math.cos(rad) * 40;
        const y1 = 60 + Math.sin(rad) * 40;
        const x2 = 60 + Math.cos(rad) * 50;
        const y2 = 60 + Math.sin(rad) * 50;
        return (
          <line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#ve-gold)"
            strokeWidth={a % 90 === 0 ? 2.2 : 1.2}
            strokeLinecap="round"
          />
        );
      })}
      {/* keyhole */}
      <g transform="translate(60 60)">
        <circle r="4" fill="#0a0a0a" stroke="url(#ve-gold)" strokeWidth="1.4" />
        <rect x="-1.2" y="2" width="2.4" height="9" fill="#0a0a0a" stroke="url(#ve-gold)" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
