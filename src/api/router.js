import {
  badRequest,
  json,
  notFound,
  readJsonBody,
  sendNoContent,
} from "../utils/http.js";
import { dataStore } from "../services/data-store.js";

function getIdFromPath(pathname, resourceName) {
  const parts = pathname.split("/").filter(Boolean);
  const resourceIndex = parts.indexOf(resourceName);
  if (resourceIndex === -1 || !parts[resourceIndex + 1]) {
    return null;
  }
  return parts[resourceIndex + 1];
}

export async function handleApiRequest(request, response, url) {
  if (request.method === "OPTIONS") {
    sendNoContent(response);
    return;
  }

  const { pathname, searchParams } = url;

  if (pathname === "/api/health" && request.method === "GET") {
    json(response, 200, { ok: true, service: "financial-transport-control" });
    return;
  }

  if (pathname === "/api/bootstrap" && request.method === "GET") {
    json(response, 200, dataStore.bootstrap());
    return;
  }

  if (pathname === "/api/dashboard" && request.method === "GET") {
    json(response, 200, dataStore.dashboard());
    return;
  }

  if (pathname === "/api/trips" && request.method === "GET") {
    json(
      response,
      200,
      dataStore.listTrips({
        status: searchParams.get("status") || "",
        customerId: searchParams.get("customerId") || "",
        vehicleId: searchParams.get("vehicleId") || "",
      }),
    );
    return;
  }

  if (pathname === "/api/trips" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (
      !body.customerId ||
      !body.routeId ||
      !body.vehicleId ||
      !body.driverId ||
      !body.serviceDate
    ) {
      badRequest(response, "Faltan campos obligatorios del viaje");
      return;
    }
    json(response, 201, dataStore.createTrip(body));
    return;
  }

  if (
    pathname.startsWith("/api/trips/") &&
    pathname.includes("/expenses/") &&
    request.method === "PUT"
  ) {
    const tripId = getIdFromPath(pathname, "trips");
    const expenseId = getIdFromPath(pathname, "expenses");
    const body = await readJsonBody(request);
    if (!tripId || !expenseId || !body.amount || !body.date) {
      badRequest(response, "Faltan campos obligatorios del gasto");
      return;
    }
    const result = dataStore.updateTripExpense(tripId, expenseId, body);
    if (!result) {
      notFound(response);
      return;
    }
    json(response, 200, result);
    return;
  }

  if (
    pathname.startsWith("/api/trips/") &&
    pathname.includes("/expenses/") &&
    request.method === "DELETE"
  ) {
    const tripId = getIdFromPath(pathname, "trips");
    const expenseId = getIdFromPath(pathname, "expenses");
    if (!tripId || !expenseId) {
      badRequest(response, "IDs inválidos");
      return;
    }
    const ok = dataStore.deleteTripExpense(tripId, expenseId);
    if (!ok) {
      notFound(response);
      return;
    }
    json(response, 200, { ok: true });
    return;
  }

  if (
    pathname.startsWith("/api/trips/") &&
    !pathname.endsWith("/expenses") &&
    !pathname.includes("/expenses/") &&
    request.method === "DELETE"
  ) {
    const id = getIdFromPath(pathname, "trips");
    if (!id) {
      badRequest(response, "ID inválido");
      return;
    }
    const ok = dataStore.deleteTrip(id);
    if (!ok) {
      notFound(response);
      return;
    }
    json(response, 200, { ok: true });
    return;
  }

  if (
    pathname.startsWith("/api/trips/") &&
    !pathname.endsWith("/expenses") &&
    !pathname.includes("/expenses/") &&
    request.method === "PUT"
  ) {
    const id = getIdFromPath(pathname, "trips");
    const body = await readJsonBody(request);
    if (
      !id ||
      !body.customerId ||
      !body.routeId ||
      !body.vehicleId ||
      !body.driverId ||
      !body.serviceDate
    ) {
      badRequest(response, "Faltan campos obligatorios del viaje");
      return;
    }
    const result = dataStore.updateTrip(id, body);
    if (!result) {
      notFound(response);
      return;
    }
    json(response, 200, result);
    return;
  }

  if (
    pathname.startsWith("/api/trips/") &&
    pathname.endsWith("/expenses") &&
    request.method === "GET"
  ) {
    const tripId = getIdFromPath(pathname, "trips");
    if (!tripId) {
      badRequest(response, "ID inválido");
      return;
    }
    const trip = dataStore.getTrip(tripId);
    if (!trip) {
      notFound(response);
      return;
    }
    json(response, 200, trip.expenses || []);
    return;
  }

  if (
    pathname.startsWith("/api/trips/") &&
    pathname.endsWith("/expenses") &&
    request.method === "POST"
  ) {
    const tripId = getIdFromPath(pathname, "trips");
    const body = await readJsonBody(request);
    if (!tripId || !body.amount || !body.date) {
      badRequest(response, "Faltan campos obligatorios del gasto");
      return;
    }
    const trip = dataStore.addTripExpense(tripId, body);
    if (!trip) {
      notFound(response);
      return;
    }
    json(response, 201, trip);
    return;
  }

  if (pathname === "/api/receivables" && request.method === "GET") {
    json(response, 200, dataStore.listReceivables());
    return;
  }

  if (
    pathname.startsWith("/api/receivables/") &&
    pathname.endsWith("/payments") &&
    request.method === "POST"
  ) {
    const receivableId = getIdFromPath(pathname, "receivables");
    const body = await readJsonBody(request);
    if (
      !receivableId ||
      !body.cashAccountId ||
      !body.amount ||
      !body.paidAt ||
      !body.method
    ) {
      badRequest(response, "Faltan campos obligatorios del cobro");
      return;
    }
    const receivable = dataStore.addReceivablePayment(receivableId, body);
    if (!receivable) {
      notFound(response);
      return;
    }
    json(response, 201, receivable);
    return;
  }

  if (pathname === "/api/payables" && request.method === "GET") {
    json(response, 200, dataStore.listPayables());
    return;
  }

  if (
    pathname.startsWith("/api/payables/") &&
    pathname.endsWith("/payments") &&
    request.method === "POST"
  ) {
    const payableId = getIdFromPath(pathname, "payables");
    const body = await readJsonBody(request);
    if (
      !payableId ||
      !body.cashAccountId ||
      !body.amount ||
      !body.paidAt ||
      !body.method
    ) {
      badRequest(response, "Faltan campos obligatorios del pago");
      return;
    }
    const payable = dataStore.addPayablePayment(payableId, body);
    if (!payable) {
      notFound(response);
      return;
    }
    json(response, 201, payable);
    return;
  }

  if (pathname === "/api/cash-movements" && request.method === "GET") {
    json(response, 200, {
      accounts: dataStore.getCashAccounts(),
      movements: dataStore.listCashMovements(),
    });
    return;
  }

  if (pathname === "/api/reports/profitability" && request.method === "GET") {
    json(response, 200, dataStore.profitabilityReport());
    return;
  }

  if (pathname === "/api/audit-logs" && request.method === "GET") {
    json(response, 200, dataStore.listAuditLogs());
    return;
  }

  // ─── Maestros: Clientes ────────────────────────────────────────────────────

  if (pathname === "/api/masters/customers" && request.method === "GET") {
    json(response, 200, dataStore.listCustomers());
    return;
  }

  if (pathname === "/api/masters/customers" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!body.name) {
      badRequest(response, "El nombre del cliente es obligatorio");
      return;
    }
    json(response, 201, dataStore.createCustomer(body));
    return;
  }

  if (
    pathname.startsWith("/api/masters/customers/") &&
    request.method === "PUT"
  ) {
    const id = getIdFromPath(pathname, "customers");
    const body = await readJsonBody(request);
    if (!id || !body.name) {
      badRequest(response, "Faltan datos del cliente");
      return;
    }
    const result = dataStore.updateCustomer(id, body);
    if (!result) {
      notFound(response);
      return;
    }
    json(response, 200, result);
    return;
  }

  if (
    pathname.startsWith("/api/masters/customers/") &&
    request.method === "DELETE"
  ) {
    const id = getIdFromPath(pathname, "customers");
    if (!id) {
      badRequest(response, "Id requerido");
      return;
    }
    const ok = dataStore.deleteCustomer(id);
    if (!ok) {
      notFound(response);
      return;
    }
    sendNoContent(response);
    return;
  }

  // ─── Maestros: Rutas ───────────────────────────────────────────────────────

  if (pathname === "/api/masters/routes" && request.method === "GET") {
    json(response, 200, dataStore.listRoutes());
    return;
  }

  if (pathname === "/api/masters/routes" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!body.origin || !body.destination) {
      badRequest(response, "Origen y destino son obligatorios");
      return;
    }
    json(response, 201, dataStore.createRoute(body));
    return;
  }

  if (pathname.startsWith("/api/masters/routes/") && request.method === "PUT") {
    const id = getIdFromPath(pathname, "routes");
    const body = await readJsonBody(request);
    if (!id || !body.origin || !body.destination) {
      badRequest(response, "Faltan datos de la ruta");
      return;
    }
    const result = dataStore.updateRoute(id, body);
    if (!result) {
      notFound(response);
      return;
    }
    json(response, 200, result);
    return;
  }

  if (
    pathname.startsWith("/api/masters/routes/") &&
    request.method === "DELETE"
  ) {
    const id = getIdFromPath(pathname, "routes");
    if (!id) {
      badRequest(response, "Id requerido");
      return;
    }
    const ok = dataStore.deleteRoute(id);
    if (!ok) {
      notFound(response);
      return;
    }
    sendNoContent(response);
    return;
  }

  // ─── Maestros: Vehículos ──────────────────────────────────────────────────

  if (pathname === "/api/masters/vehicles" && request.method === "GET") {
    json(response, 200, dataStore.listVehicles());
    return;
  }

  if (pathname === "/api/masters/vehicles" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!body.plate || !body.model) {
      badRequest(response, "Placa y modelo son obligatorios");
      return;
    }
    json(response, 201, dataStore.createVehicle(body));
    return;
  }

  if (
    pathname.startsWith("/api/masters/vehicles/") &&
    request.method === "PUT"
  ) {
    const id = getIdFromPath(pathname, "vehicles");
    const body = await readJsonBody(request);
    if (!id || !body.plate || !body.model) {
      badRequest(response, "Faltan datos del vehículo");
      return;
    }
    const result = dataStore.updateVehicle(id, body);
    if (!result) {
      notFound(response);
      return;
    }
    json(response, 200, result);
    return;
  }

  if (
    pathname.startsWith("/api/masters/vehicles/") &&
    request.method === "DELETE"
  ) {
    const id = getIdFromPath(pathname, "vehicles");
    if (!id) {
      badRequest(response, "Id requerido");
      return;
    }
    const ok = dataStore.deleteVehicle(id);
    if (!ok) {
      notFound(response);
      return;
    }
    sendNoContent(response);
    return;
  }

  // ─── Maestros: Choferes ───────────────────────────────────────────────────

  if (pathname === "/api/masters/drivers" && request.method === "GET") {
    json(response, 200, dataStore.listDrivers());
    return;
  }

  if (pathname === "/api/masters/drivers" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!body.firstName && !body.name) {
      badRequest(response, "El nombre del chofer es obligatorio");
      return;
    }
    json(response, 201, dataStore.createDriver(body));
    return;
  }

  if (
    pathname.startsWith("/api/masters/drivers/") &&
    request.method === "PUT"
  ) {
    const id = getIdFromPath(pathname, "drivers");
    const body = await readJsonBody(request);
    if (!id || (!body.firstName && !body.name)) {
      badRequest(response, "Faltan datos del chofer");
      return;
    }
    const result = dataStore.updateDriver(id, body);
    if (!result) {
      notFound(response);
      return;
    }
    json(response, 200, result);
    return;
  }

  if (
    pathname.startsWith("/api/masters/drivers/") &&
    request.method === "DELETE"
  ) {
    const id = getIdFromPath(pathname, "drivers");
    if (!id) {
      badRequest(response, "Id requerido");
      return;
    }
    const ok = dataStore.deleteDriver(id);
    if (!ok) {
      notFound(response);
      return;
    }
    sendNoContent(response);
    return;
  }

  notFound(response);
}
