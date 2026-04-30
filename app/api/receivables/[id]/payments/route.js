import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function GET(_, { params }) {
  try {
    return NextResponse.json(dataStore.listReceivablePayments(params.id));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    // Normalizar nombres de campo del cliente al formato del data-store
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
    // Si no viene cashAccountId, usar la primera cuenta disponible
    if (!normalized.cashAccountId) {
      const accounts = dataStore.getCashAccounts();
      normalized.cashAccountId = accounts[0]?.id;
    }
    return NextResponse.json(
      dataStore.addReceivablePayment(params.id, normalized),
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
