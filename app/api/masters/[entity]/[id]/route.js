import { NextResponse } from "next/server";
import { dataStore } from "@/src/services/data-store.js";

const updateFn = {
  customers: (id, b) => dataStore.updateCustomer(id, b),
  routes: (id, b) => dataStore.updateRoute(id, b),
  vehicles: (id, b) => dataStore.updateVehicle(id, b),
  drivers: (id, b) => dataStore.updateDriver(id, b),
  users: (id, b) => dataStore.updateUser(id, b),
};

const deleteFn = {
  customers: (id) => dataStore.deleteCustomer(id),
  routes: (id) => dataStore.deleteRoute(id),
  vehicles: (id) => dataStore.deleteVehicle(id),
  drivers: (id) => dataStore.deleteDriver(id),
  users: (id) => dataStore.deleteUser(id),
};

export async function PUT(request, { params }) {
  try {
    const fn = updateFn[params.entity];
    if (!fn)
      return NextResponse.json({ error: "Entidad no válida" }, { status: 404 });
    const body = await request.json();
    return NextResponse.json(fn(params.id, body));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_, { params }) {
  try {
    const fn = deleteFn[params.entity];
    if (!fn)
      return NextResponse.json({ error: "Entidad no válida" }, { status: 404 });
    fn(params.id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
