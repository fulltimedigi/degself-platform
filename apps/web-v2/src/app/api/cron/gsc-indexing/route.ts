import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

// googleapis needs the Node.js runtime (not Edge); never statically optimize.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on cron
// invocations when CRON_SECRET is set, which also gates manual curls.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function verifyAuth(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  const got = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return timingSafeEqualStr(got, expected);
}

/** Only our public site URLs — blocks SSRF via poisoned queue rows. */
function isAllowedIndexingUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    return host === "degself.com" || host === "www.degself.com";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Oldest highest-priority pending URL.
  const { data: pendingUrls, error } = await supabase
    .from("gsc_indexing_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!pendingUrls || pendingUrls.length === 0) {
    return NextResponse.json({ message: "No pending URLs", submitted: 0 });
  }

  const target = pendingUrls[0];

  if (!isAllowedIndexingUrl(target.url)) {
    await supabase
      .from("gsc_indexing_queue")
      .update({
        status: "error",
        error_message: "URL not on allowlist (degself.com https only)",
        attempted_at: new Date().toISOString(),
      })
      .eq("id", target.id);
    return NextResponse.json(
      { error: "URL not allowlisted", url: target.url },
      { status: 400 }
    );
  }

  // 2. Pre-check: don't ask Google to index a URL that isn't reachable.
  try {
    const check = await fetch(target.url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    if (!check.ok) {
      await supabase
        .from("gsc_indexing_queue")
        .update({
          status: "error",
          error_message: `URL returned ${check.status}`,
          attempted_at: new Date().toISOString(),
        })
        .eq("id", target.id);
      return NextResponse.json(
        { error: `URL not reachable (${check.status})`, url: target.url },
        { status: 502 }
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase
      .from("gsc_indexing_queue")
      .update({ status: "error", error_message: `HEAD failed: ${message}`, attempted_at: new Date().toISOString() })
      .eq("id", target.id);
    return NextResponse.json({ error: `HEAD failed: ${message}`, url: target.url }, { status: 502 });
  }

  // 3. Google Indexing API client (service account).
  const credentials = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  const indexing = google.indexing({ version: "v3", auth });

  // 4. Submit + record outcome.
  try {
    const result = await indexing.urlNotifications.publish({
      requestBody: { url: target.url, type: "URL_UPDATED" },
    });

    await supabase
      .from("gsc_indexing_queue")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        response: result.data,
      })
      .eq("id", target.id);

    return NextResponse.json({
      success: true,
      url: target.url,
      submitted_at: new Date().toISOString(),
      response: result.data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("gsc_indexing_queue")
      .update({ status: "error", error_message: message, attempted_at: new Date().toISOString() })
      .eq("id", target.id);
    return NextResponse.json({ error: message, url: target.url }, { status: 500 });
  }
}
