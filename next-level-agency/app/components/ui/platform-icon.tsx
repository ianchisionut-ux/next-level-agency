import { PlatformKey, PLATFORM_META } from "@/lib/platform-meta";

export function PlatformIcon({
  platform,
  size = 18,
  className = "",
}: {
  platform: PlatformKey;
  size?: number;
  className?: string;
}) {
  const meta = PLATFORM_META[platform];

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
  };

  switch (platform) {
    case "FACEBOOK":
      return (
        <svg {...common} fill={meta.color}>
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.78 8.44-4.94 8.44-9.94Z" />
        </svg>
      );
    case "INSTAGRAM":
      return (
        <svg {...common} fill="none" stroke={meta.color} strokeWidth="1.8">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill={meta.color} stroke="none" />
        </svg>
      );
    case "TIKTOK":
      return (
        <svg {...common} fill={meta.color}>
          <path d="M16.6 5.82c-.7-.76-1.1-1.75-1.1-2.82h-3.02v13.44a2.6 2.6 0 1 1-1.84-2.49v-3.1a5.6 5.6 0 1 0 4.86 5.55V9.1a6.6 6.6 0 0 0 3.9 1.26V7.34c-1.03 0-2.03-.32-2.8-.9a4.4 4.4 0 0 1 0-.62Z" />
        </svg>
      );
    case "GOOGLE_BUSINESS":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22 12.23c0-.76-.07-1.5-.2-2.2H12v4.17h5.6a4.8 4.8 0 0 1-2.08 3.15v2.6h3.36c1.97-1.8 3.1-4.47 3.1-7.72Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.8 0 5.16-.93 6.88-2.5l-3.36-2.6c-.93.63-2.13 1-3.52 1-2.7 0-5-1.83-5.82-4.28H2.7v2.68A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.18 13.62a6 6 0 0 1 0-3.84V7.1H2.7a10 10 0 0 0 0 8.9l3.48-2.38Z"
          />
          <path
            fill="#EA4335"
            d="M12 6.18c1.52 0 2.88.52 3.95 1.55l2.96-2.96C17.15 3.02 14.8 2 12 2a10 10 0 0 0-9.3 5.1l3.48 2.68C7 7.97 9.3 6.18 12 6.18Z"
          />
        </svg>
      );
  }
}
