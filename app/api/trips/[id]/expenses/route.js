import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function GET(_, { params }) {
  try {
    const trip = dataStore.getTripById(params.id);
    if (!trip)
      return NextResponse.json(
        { error: "Viaje no encontrado" },
        { status: 404 },
      );
    return NextResponse.json(trip.expenses ?? []);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    if (!body.description || !body.amount || !body.date) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios del gasto" },
        { status: 400 },
      );
    }
    return NextResponse.json(dataStore.addTripExpense(params.id, body), {
      status: 201,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
