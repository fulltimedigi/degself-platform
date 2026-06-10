import { getMapPoints } from "@/lib/workshops";
import { MapLoader } from "@/components/MapLoader";

export const revalidate = 3600; // ISR: refresh map points hourly

export const metadata = {
  title: "خريطة الكراجات | دق سلف",
  description: "كل كراجات وخدمات السيارات في الكويت على الخريطة.",
};

export default async function MapPage() {
  const points = await getMapPoints();

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <h1 className="text-2xl font-extrabold">خريطة الكراجات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          كل المنشآت على الخريطة — اضغط أي نقطة للتفاصيل.
        </p>
      </div>

      <div className="mt-4 h-[70vh] w-full">
        <MapLoader points={points} />
      </div>
    </div>
  );
}
