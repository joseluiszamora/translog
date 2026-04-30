import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accounts = dataStore.getCashAccounts();
    const movements = dataStore.listCashMovements({
      accountId: searchParams.get("accountId") || "",
    });
    return NextResponse.json({ accounts, movements });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
