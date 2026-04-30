import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function GET() {
  try {
    return NextResponse.json(dataStore.listPayables());
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
