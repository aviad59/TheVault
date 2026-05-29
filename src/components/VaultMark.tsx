interface Props {
  className?: string;
}

export function VaultMark({ className }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vm-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d97a" />
          <stop offset="55%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#7c5e15" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#vm-gold)" strokeWidth="2" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="url(#vm-gold)" strokeWidth="1.2" opacity="0.55" />
      <circle cx="32" cy="32" r="3.5" fill="url(#vm-gold)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 32 + Math.cos(rad) * 22;
        const y1 = 32 + Math.sin(rad) * 22;
        const x2 = 32 + Math.cos(rad) * 28;
        const y2 = 32 + Math.sin(rad) * 28;
        return (
          <line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#vm-gold)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
