export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#nl-grad)" />
      <path d="M11 28V12h3.2L23 24.2V12h3v16h-3.2L14 15.8V28h-3z" fill="white" />
      <defs>
        <linearGradient id="nl-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconTarget({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconChart({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconCode({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6 3 12l5 6M16 6l5 6-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBot({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8V4M9 4h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="13.5" r="1.2" fill="currentColor" />
      <circle cx="15" cy="13.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconSearch({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconStar({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5z" />
    </svg>
  );
}

export function IconWhatsapp({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M16.02 3C9.4 3 4 8.36 4 15c0 2.28.63 4.42 1.72 6.25L3 29l7.94-2.63A12.9 12.9 0 0 0 16.02 27C22.65 27 28 21.64 28 15S22.65 3 16.02 3zm0 23.4a10.3 10.3 0 0 1-5.27-1.45l-.38-.22-4.7 1.56 1.53-4.58-.25-.4A10.28 10.28 0 1 1 26.28 15c0 5.72-4.65 10.4-10.26 10.4z" />
      <path d="M21.6 17.9c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.68-1.63-.93-2.24-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.25 5.16 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35z" />
    </svg>
  );
}
