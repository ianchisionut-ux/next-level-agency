"use client";

import { ViewTransition, type ReactElement } from "react";
import type {} from "react/canary";
import { usePublicMotion } from "@/lib/public-transitions";

/** A DOM-free boundary around public content; never wraps the dashboard or WebGL hero. */
export default function PublicPageTransition({ children }: { children: ReactElement }) {
  const motion = usePublicMotion();
  return <ViewTransition
    enter={motion ? "nl-page-enter" : "none"}
    exit={motion ? "nl-page-exit" : "none"}
    default="none"
  >{children}</ViewTransition>;
}
