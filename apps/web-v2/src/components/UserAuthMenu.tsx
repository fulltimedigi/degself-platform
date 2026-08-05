"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function UserAuthMenu() {
  const t = useTranslations("nav");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
      >
        {t("login")}
      </Link>
    );
  }

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    t("account");
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <Link
      href="/account"
      title={name}
      className="flex h-9 items-center gap-2 rounded-xl border border-border px-2 transition hover:border-primary"
    >
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full"
          unoptimized
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
          {String(name).slice(0, 1)}
        </span>
      )}
      <span className="hidden max-w-[7rem] truncate text-sm font-bold sm:inline">
        {name}
      </span>
    </Link>
  );
}
