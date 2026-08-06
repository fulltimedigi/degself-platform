import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations("auth");
  const sp = await searchParams;
  const defaultNext = locale === "ar" ? "/account" : `/${locale}/account`;
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : defaultNext;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-extrabold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {sp.error === "auth" && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-500">
          {t("error")}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <GoogleSignInButton next={next} label={t("google")} />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("googleHint")}
        </p>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>{t("or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Link
        href="/"
        className="rounded-xl border border-border px-4 py-3.5 text-center text-sm font-bold transition hover:border-[#FFD60A]"
      >
        {t("guestContinue")}
      </Link>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t("termsHint")}{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          {t("privacy")}
        </Link>
      </p>
    </main>
  );
}
