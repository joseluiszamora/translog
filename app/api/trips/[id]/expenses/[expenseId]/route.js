import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    return NextResponse.json(
      dataStore.updateTripExpense(params.id, params.expenseId, body),
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_, { params }) {
  try {
    dataStore.deleteTripExpense(params.id, params.expenseId);
    return new Response(null, { status: 204 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
