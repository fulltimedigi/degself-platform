import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogoHero, TAGLINE } from "@/components/Brand";
import {
  ensureWorkshops,
  onLoadProgress,
  WORKSHOPS_QUERY_KEY,
  type Workshop,
} from "@/lib/dataStore";

/**
 * BootGate loads the master workshops dataset (/data/workshops.json) exactly
 * once on app start via React Query, then renders the app. While loading it
 * shows a branded splash with a real progress bar.
 */
export function BootGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, refetch, isFetching } = useQuery<Workshop[]>({
    queryKey: WORKSHOPS_QUERY_KEY,
    queryFn: ensureWorkshops,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  const [progress, setProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: 0,
  });

  useEffect(() => {
    return onLoadProgress((loaded, total) => setProgress({ loaded, total }));
  }, []);

  if (isLoading) {
    const pct =
      progress.total > 0
        ? Math.min(99, Math.round((progress.loaded / progress.total) * 100))
        : 0;
    const sizeKB = progress.loaded > 0 ? Math.round(progress.loaded / 1024) : 0;
    const totalKB = progress.total > 0 ? Math.round(progress.total / 1024) : 0;
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6"
        data-testid="boot-loading"
      >
        <LogoHero className="h-28 animate-pulse" />
        <p className="font-ar text-sm text-muted-foreground">{TAGLINE}</p>

        {/* Real progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: progress.total > 0 ? `${pct}%` : "30%" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-en text-[11px] text-muted-foreground">
            <span>
              {progress.total > 0
                ? `${sizeKB} / ${totalKB} KB`
                : "جارٍ التحميل…"}
            </span>
            <span>{progress.total > 0 ? `${pct}%` : ""}</span>
          </div>
        </div>

        <span className="sr-only">جارٍ تحميل بيانات الكراجات…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center"
        data-testid="boot-error"
      >
        <LogoHero className="h-24 opacity-60" />
        <div className="space-y-1">
          <p className="font-ar text-lg font-bold text-foreground">
            تعذّر تحميل البيانات
          </p>
          <p className="font-ar text-sm text-muted-foreground">
            تأكد من اتصالك بالإنترنت وحاول مرة أخرى.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md bg-primary px-5 py-2 font-ar text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          data-testid="button-boot-retry"
        >
          {isFetching ? "جارٍ المحاولة…" : "إعادة المحاولة"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
