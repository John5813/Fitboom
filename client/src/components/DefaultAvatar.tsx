/**
 * Rasm yuklanmagan foydalanuvchi uchun avatar: qorong'i fonda tilla
 * gradientli siymo. Ilgari ism bosh harflari ("AK") ko'rsatilardi.
 * Ilovada: mobile/components/DefaultAvatar.tsx (bir xil shakl).
 */
export default function DefaultAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="fb-avatar-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E293B" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="fb-avatar-fg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3D9A4" />
          <stop offset="0.55" stopColor="#D9A751" />
          <stop offset="1" stopColor="#8A5E22" />
        </linearGradient>
        <clipPath id="fb-avatar-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#fb-avatar-clip)">
        <rect width="100" height="100" fill="url(#fb-avatar-bg)" />
        <circle cx="50" cy="40" r="17" fill="url(#fb-avatar-fg)" />
        <path d="M14 104 C14 76 30 62 50 62 C70 62 86 76 86 104 Z" fill="url(#fb-avatar-fg)" />
      </g>
    </svg>
  );
}
