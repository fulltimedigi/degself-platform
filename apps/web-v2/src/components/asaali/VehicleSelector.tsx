"use client";

/**
 * VehicleSelector — مكوّن اختيار السيارة لميزة /asaali
 *
 * تصميم:
 *   - Collapsible: يبدأ مغلق (chevron + ملخص)، يفتح بـ click
 *   - 4 حقول: الماركة (searchable) + الموديل (searchable) + السنة + ناقل الحركة
 *   - حالة عبر `useState` فقط — لا localStorage ولا Supabase
 *   - RTL، ألوان الهوية: أصفر #FFD60A + أسود #0A0A0A
 *
 * الاستخدام:
 *   const [vehicle, setVehicle] = useState<VehicleContextT>({});
 *   <VehicleSelector value={vehicle} onChange={setVehicle} defaultOpen={shouldAsk} />
 */

import { useMemo, useState } from "react";
import {
  VEHICLE_MAKES,
  getYearOptions,
  getModelsForMake,
  TRANSMISSION_OPTIONS,
  findMake,
} from "@/lib/vehicle-data";
import type { VehicleContext as VehicleContextT } from "@/lib/asaali-schema";

interface Props {
  value: VehicleContextT;
  onChange: (v: VehicleContextT) => void;
  defaultOpen?: boolean;
}

export function VehicleSelector({ value, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [makeSearch, setMakeSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  // تحكّم بإظهار الـ dropdown lists — تقفل تلقائياً عند الاختيار
  const [makeListOpen, setMakeListOpen] = useState(false);
  const [modelListOpen, setModelListOpen] = useState(false);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const modelOptions = useMemo(
    () => (value.make ? getModelsForMake(value.make) : []),
    [value.make]
  );

  const filteredMakes = useMemo(() => {
    const q = makeSearch.trim().toLowerCase();
    if (!q) return VEHICLE_MAKES;
    return VEHICLE_MAKES.filter(
      (m) =>
        m.name_ar.toLowerCase().includes(q) ||
        m.name_en.toLowerCase().includes(q)
    );
  }, [makeSearch]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return modelOptions;
    return modelOptions.filter((m) => m.toLowerCase().includes(q));
  }, [modelOptions, modelSearch]);

  function summary(): string {
    const parts: string[] = [];
    const m = value.make ? findMake(value.make) : undefined;
    if (m) parts.push(m.name_ar);
    if (value.model) parts.push(value.model);
    if (value.year) parts.push(String(value.year));
    if (parts.length === 0) return "اختر السيارة (اختياري)";
    return parts.join(" · ");
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: value.make ? "#FFD60A" : "#525252" }}
          />
          <span className="text-sm text-neutral-100">{summary()}</span>
        </span>
        <span
          className="text-neutral-400 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-800 p-4 space-y-4">
          {/* الماركة */}
          <div>
            <label className="mb-1 block text-xs text-neutral-400">الماركة</label>
            {value.make && !makeListOpen ? (
              // اختيار جاهز — صف واحد مع زرّ "تغيير"
              <div className="flex items-center justify-between gap-2 rounded-md border border-yellow-400/40 bg-yellow-400/5 px-3 py-2">
                <span className="text-sm text-yellow-200">
                  {findMake(value.make)?.name_ar}
                  <span className="text-neutral-500 text-xs ml-2">
                    ({findMake(value.make)?.name_en})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMakeListOpen(true);
                    setMakeSearch("");
                  }}
                  className="text-xs text-neutral-400 hover:text-yellow-300"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={makeSearch}
                  onChange={(e) => setMakeSearch(e.target.value)}
                  placeholder="ابحث عن الماركة"
                  className="mb-2 w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
                  autoFocus={makeListOpen}
                />
                <div className="max-h-40 overflow-y-auto rounded-md border border-neutral-800 bg-neutral-900">
                  {filteredMakes.length === 0 ? (
                    <div className="p-3 text-xs text-neutral-500">لا توجد نتائج</div>
                  ) : (
                    filteredMakes.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onChange({ ...value, make: m.id, model: undefined });
                          setMakeSearch("");
                          setModelSearch("");
                          setMakeListOpen(false);
                          setModelListOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-right text-sm hover:bg-neutral-800 ${
                          value.make === m.id ? "bg-yellow-400/10 text-yellow-300" : "text-neutral-100"
                        }`}
                      >
                        {m.name_ar} <span className="text-neutral-500 text-xs">({m.name_en})</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* الموديل */}
          {value.make && (
            <div>
              <label className="mb-1 block text-xs text-neutral-400">الموديل</label>
              {value.model && !modelListOpen ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-yellow-400/40 bg-yellow-400/5 px-3 py-2">
                  <span className="text-sm text-yellow-200">{value.model}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setModelListOpen(true);
                      setModelSearch("");
                    }}
                    className="text-xs text-neutral-400 hover:text-yellow-300"
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="ابحث عن الموديل"
                    className="mb-2 w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
                    autoFocus={modelListOpen}
                  />
                  <div className="max-h-32 overflow-y-auto rounded-md border border-neutral-800 bg-neutral-900">
                    {filteredModels.length === 0 ? (
                      <div className="p-3 text-xs text-neutral-500">لا توجد موديلات</div>
                    ) : (
                      filteredModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            onChange({ ...value, model: m });
                            setModelSearch("");
                            setModelListOpen(false);
                          }}
                          className={`block w-full px-3 py-2 text-right text-sm hover:bg-neutral-800 ${
                            value.model === m ? "bg-yellow-400/10 text-yellow-300" : "text-neutral-100"
                          }`}
                        >
                          {m}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* السنة + ناقل الحركة */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-400">السنة</label>
              <select
                value={value.year ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    year: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
              >
                <option value="">— اختر —</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-400">ناقل الحركة</label>
              <select
                value={value.transmission ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    transmission: (e.target.value || undefined) as VehicleContextT["transmission"],
                  })
                }
                className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400"
              >
                <option value="">— اختر —</option>
                {TRANSMISSION_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(value.make || value.model || value.year || value.transmission) && (
            <button
              type="button"
              onClick={() => {
                onChange({});
                setMakeSearch("");
                setModelSearch("");
                setMakeListOpen(false);
                setModelListOpen(false);
              }}
              className="text-xs text-neutral-400 hover:text-yellow-300"
            >
              مسح الاختيارات
            </button>
          )}
        </div>
      )}
    </div>
  );
}
