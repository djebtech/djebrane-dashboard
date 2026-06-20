import { NextResponse } from "next/server";

// Always execute (no static caching) so Railway's health check gets a live response.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
