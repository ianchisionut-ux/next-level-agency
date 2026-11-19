import type { ServiceId } from "@/lib/service-content";

export const serviceDetailPaths = {
  "web-development": "/servicii/web-design-dezvoltare",
  "performance-marketing": "/servicii/performance-marketing",
  "ai-automatizari": "/servicii/ai-automatizari",
} as const;

export function serviceHref(id: ServiceId): string {
  return id in serviceDetailPaths
    ? serviceDetailPaths[id as keyof typeof serviceDetailPaths]
    : `/servicii#${id}`;
}
