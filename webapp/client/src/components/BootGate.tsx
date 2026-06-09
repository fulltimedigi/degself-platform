import { useQuery } from "@tanstack/react-query";
import { LogoHero, TAGLINE } from "@/components/Brand";
import {
  ensureWorkshops,
  WORKSHOPS_QUERY_KEY,
  type Workshop,
} from "@/lib/dataStore";

/**
 * BootGate loads the master workshops dataset (/data/workshops.json) exactly
 * once on app start via React Query, then renders the app. While loading it
 * shows a branded splash; on failure it shows a retryable error state.
 *
 * Because every data function in dataStore.ts also calls ensureWorkshops()
 * (which shares the same React Query key), the file is fetched only one time
 * regardless of how many components mount.
 */
export function BootGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, refetch, isFetching } = useQuery<Workshop[]>({
    queryKey: WORKSHOPS_QUERY_KEY,
    queryFn: ensureWorkshops,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6"
        data-testid="boot-loading"
      >
        <LogoHero className="h-28 animate-pulse" />
        <p className="font-ar text-sm text-muted-foreground">{TAGLINE}</p>
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
        <span className="sr-only">جارٍ تحميل البيانات…</span>
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
