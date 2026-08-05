import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerClient } from "@/lib/supabase/server";
import { UserLogoutButton } from "@/components/UserLogoutButton";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "حسابي",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const t = await getTranslations("auth");
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,avatar_url,created_at")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    t("accountFallback");
  const avatar =
    profile?.avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="mb-6 text-2xl font-extrabold">{t("accountTitle")}</h1>

      <section className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        {avatar ? (
          <Image
            src={avatar}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-full"
            unoptimized
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-extrabold text-primary">
            {String(name).slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{name}</p>
          {user.email && (
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/saved"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary"
        >
          {t("savedLink")}
        </Link>
        <UserLogoutButton />
      </div>
    </main>
  );
}
