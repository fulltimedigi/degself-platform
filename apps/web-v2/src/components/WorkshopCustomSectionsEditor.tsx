"use client";

export type CustomItem = { label: string; value: string };
export type CustomSection = { title: string; items: CustomItem[] };

export function validateCustomSections(sections: CustomSection[]): string | null {
  for (const section of sections) {
    if (!section.title.trim()) return "اكتب اسم الخانة الإضافية قبل الحفظ.";
    for (const item of section.items) {
      if (!item.label.trim() || !item.value.trim()) {
        return "كل عنصر في الخانات الإضافية يحتاج اسمًا وقيمة.";
      }
    }
  }
  return null;
}

export function WorkshopCustomSectionsEditor({
  sections,
  onChange,
  className = "",
}: {
  sections: CustomSection[];
  onChange: (sections: CustomSection[]) => void;
  className?: string;
}) {
  function addSection() {
    if (sections.length >= 8) return;
    onChange([...sections, { title: "", items: [{ label: "", value: "" }] }]);
  }

  function updateSectionTitle(sectionIndex: number, title: string) {
    onChange(
      sections.map((section, i) => (i === sectionIndex ? { ...section, title } : section))
    );
  }

  function removeSection(sectionIndex: number) {
    onChange(sections.filter((_, i) => i !== sectionIndex));
  }

  function addItem(sectionIndex: number) {
    onChange(
      sections.map((section, i) =>
        i === sectionIndex && section.items.length < 20
          ? { ...section, items: [...section.items, { label: "", value: "" }] }
          : section
      )
    );
  }

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    field: keyof CustomItem,
    value: string
  ) {
    onChange(
      sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, j) =>
                j === itemIndex ? { ...item, [field]: value } : item
              ),
            }
          : section
      )
    );
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    onChange(
      sections.map((section, i) =>
        i === sectionIndex
          ? { ...section, items: section.items.filter((_, j) => j !== itemIndex) }
          : section
      )
    );
  }

  return (
    <section className={`rounded-2xl border border-border bg-card p-4 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">خانات إضافية</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            أضف أي خانة خاصة بهذا الكراج، مثل أشهر الخدمات والأسعار أو الضمان أو طرق الدفع.
          </p>
        </div>
        <button
          type="button"
          onClick={addSection}
          disabled={sections.length >= 8}
          className="rounded-lg border border-[#FFD60A]/50 bg-[#FFD60A]/10 px-4 py-2 text-sm font-extrabold text-[#FFD60A] disabled:opacity-40"
        >
          + إضافة خانة
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          لا توجد خانات إضافية بعد. اضغط «+ إضافة خانة» لإنشاء أول خانة.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="mb-1 block text-sm font-bold">اسم الخانة</span>
                  <input
                    value={section.title}
                    onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                    placeholder="مثال: أشهر الخدمات"
                    maxLength={80}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeSection(sectionIndex)}
                  className="rounded-lg px-3 py-2.5 text-sm font-bold text-red-400"
                >
                  حذف الخانة
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={item.label}
                      onChange={(e) => updateItem(sectionIndex, itemIndex, "label", e.target.value)}
                      placeholder="الخدمة — مثال: تغيير زيت"
                      aria-label={`اسم العنصر ${itemIndex + 1} في ${section.title || "الخانة"}`}
                      maxLength={120}
                      className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
                    />
                    <input
                      value={item.value}
                      onChange={(e) => updateItem(sectionIndex, itemIndex, "value", e.target.value)}
                      placeholder="القيمة — مثال: 8 د.ك"
                      aria-label={`قيمة العنصر ${itemIndex + 1} في ${section.title || "الخانة"}`}
                      maxLength={120}
                      className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-[#FFD60A] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(sectionIndex, itemIndex)}
                      className="rounded-lg px-3 py-2 text-sm font-bold text-red-400"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addItem(sectionIndex)}
                disabled={section.items.length >= 20}
                className="mt-3 text-sm font-extrabold text-[#FFD60A] disabled:opacity-40"
              >
                + إضافة عنصر داخل الخانة
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        الحد الأقصى: 8 خانات، و20 عنصرًا داخل كل خانة.
      </p>
    </section>
  );
}
