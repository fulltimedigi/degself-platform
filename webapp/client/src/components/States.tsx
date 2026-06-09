import { SearchX, AlertTriangle } from "lucide-react";

export function EmptyState({
  title = "لا توجد نتائج",
  hint = "جرّب تعديل عوامل التصفية أو البحث بكلمات مختلفة.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center"
      data-testid="state-empty"
    >
      <SearchX size={40} className="text-muted-foreground" />
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 py-16 text-center"
      data-testid="state-error"
    >
      <AlertTriangle size={40} className="text-destructive" />
      <p className="text-lg font-bold">تعذّر تحميل البيانات</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        حدث خطأ أثناء الاتصال بالخادم. تأكد من اتصالك وحاول مرة أخرى.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover-elevate active-elevate-2"
          data-testid="button-retry"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
