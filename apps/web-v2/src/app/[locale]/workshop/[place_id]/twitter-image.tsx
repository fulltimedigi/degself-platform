// Reuse the same generated card for Twitter/X (otherwise twitter:image would
// inherit the static site-wide image from the root layout). Route-segment config
// must be local literals (re-exporting them fails static analysis), so only the
// image generator itself is re-exported.
import OgImage from "./opengraph-image";

export const runtime = "nodejs";
export const revalidate = 86400;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "دق سلف — دليل كراجات الكويت";

export default OgImage;
