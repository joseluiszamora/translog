import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    if (!body.amount || !body.paymentDate) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios del pago" },
        { status: 400 },
      );
    }
    return NextResponse.json(dataStore.addReceivablePayment(params.id, body), {
      status: 201,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
