"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentProps } from "react";

/** Keep Next's navigation/cache behavior, enabling prefetch only after intent. */
export default function IntentLink({ href, prefetch, onPointerEnter, onFocus, ...props }: ComponentProps<typeof Link>) {
  const [intendedHref, setIntendedHref] = useState<typeof href | null>(null);
  const intend = () => {
    if (prefetch === false || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    setIntendedHref(href);
  };

  return <Link
    {...props}
    href={href}
    prefetch={prefetch !== false && intendedHref === href ? prefetch ?? null : false}
    onPointerEnter={event => { onPointerEnter?.(event); if (!event.defaultPrevented && event.pointerType === "mouse") intend(); }}
    onFocus={event => { onFocus?.(event); if (!event.defaultPrevented) intend(); }}
  />;
}
