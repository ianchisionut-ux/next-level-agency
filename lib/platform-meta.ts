export type PlatformKey = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "GOOGLE_BUSINESS";

interface PlatformMeta {
  label: string;
  short: string;
  color: string;
  gradient?: string;
  bg: string;
  charLimit?: number;
}

export const PLATFORM_META: Record<PlatformKey, PlatformMeta> = {
  FACEBOOK: {
    label: "Facebook",
    short: "FB",
    color: "#1877F2",
    bg: "#1877F21A",
    charLimit: 63206,
  },
  INSTAGRAM: {
    label: "Instagram",
    short: "IG",
    color: "#E1306C",
    gradient: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF, #515BD4)",
    bg: "#E1306C1A",
    charLimit: 2200,
  },
  TIKTOK: {
    label: "TikTok",
    short: "TT",
    color: "#25F4EE",
    gradient: "linear-gradient(135deg, #25F4EE, #FE2C55)",
    bg: "#FE2C551A",
    charLimit: 2200,
  },
  GOOGLE_BUSINESS: {
    label: "Google Business",
    short: "GB",
    color: "#4285F4",
    bg: "#4285F41A",
    charLimit: 1500,
  },
};

export const PLATFORM_ORDER: PlatformKey[] = [
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "GOOGLE_BUSINESS",
];
