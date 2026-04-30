import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(
      dataStore.listTrips({
        status: searchParams.get("status") || "",
        customerId: searchParams.get("customerId") || "",
        vehicleId: searchParams.get("vehicleId") || "",
      }),
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (
      !body.customerId ||
      !body.routeId ||
      !body.vehicleId ||
      !body.driverId ||
      !body.serviceDate
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios del viaje" },
        { status: 400 },
      );
    }
    return NextResponse.json(dataStore.createTrip(body), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
