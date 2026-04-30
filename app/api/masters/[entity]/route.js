import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

const listFn = {
  customers: () => dataStore.listCustomers(),
  routes: () => dataStore.listRoutes(),
  vehicles: () => dataStore.listVehicles(),
  drivers: () => dataStore.listDrivers(),
};

const createFn = {
  customers: (b) => dataStore.createCustomer(b),
  routes: (b) => dataStore.createRoute(b),
  vehicles: (b) => dataStore.createVehicle(b),
  drivers: (b) => dataStore.createDriver(b),
};

export async function GET(_, { params }) {
  try {
    const fn = listFn[params.entity];
    if (!fn)
      return NextResponse.json({ error: "Entidad no válida" }, { status: 404 });
    return NextResponse.json(fn());
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const fn = createFn[params.entity];
    if (!fn)
      return NextResponse.json({ error: "Entidad no válida" }, { status: 404 });
    const body = await request.json();
    return NextResponse.json(fn(body), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
