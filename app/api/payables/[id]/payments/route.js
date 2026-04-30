import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function GET(_, { params }) {
  try {
    return NextResponse.json(dataStore.listPayablePayments(params.id));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const normalized = {
      amount: body.amount,
      paidAt: body.paidAt || body.paymentDate,
      method: body.method || body.paymentMethod || "cash",
      cashAccountId: body.cashAccountId,
      reference: body.reference || "",
    };
    if (!normalized.amount || !normalized.paidAt) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: amount y paidAt" },
        { status: 400 },
      );
    }
    if (!normalized.cashAccountId) {
      const accounts = dataStore.getCashAccounts();
      normalized.cashAccountId = accounts[0]?.id;
    }
    return NextResponse.json(
      dataStore.addPayablePayment(params.id, normalized),
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
