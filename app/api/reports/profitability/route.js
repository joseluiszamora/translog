import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(
      dataStore.profitabilityReport({
        from: searchParams.get("from") || "",
        to: searchParams.get("to") || "",
      }),
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
