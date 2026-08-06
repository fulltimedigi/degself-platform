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
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations("auth");
  const sp = await searchParams;
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : "/account";

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

      <GoogleSignInButton next={next} label={t("google")} />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t("termsHint")}{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          {t("privacy")}
        </Link>
      </p>
    </main>
  );
}
