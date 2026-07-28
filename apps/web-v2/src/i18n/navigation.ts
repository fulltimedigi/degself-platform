import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// Locale-aware navigation helpers. Use these Link/redirect/usePathname/useRouter
// instead of next/navigation so the active locale prefix is preserved (and the
// default Arabic locale stays unprefixed).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
