import { badRequest, json, notFound, readJsonBody, sendNoContent } from "../utils/http.js";
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
    json(response, 200, dataStore.listTrips({
      status: searchParams.get("status") || "",
      customerId: searchParams.get("customerId") || "",
      vehicleId: searchParams.get("vehicleId") || ""
    }));
    return;
  }

  if (pathname === "/api/trips" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!body.customerId || !body.routeId || !body.vehicleId || !body.driverId || !body.serviceDate) {
      badRequest(response, "Faltan campos obligatorios del viaje");
      return;
    }
    json(response, 201, dataStore.createTrip(body));
    return;
  }

  if (pathname.startsWith("/api/trips/") && pathname.endsWith("/expenses") && request.method === "POST") {
    const tripId = getIdFromPath(pathname, "trips");
    const body = await readJsonBody(request);
    if (!tripId || !body.categoryId || !body.supplierId || !body.amount || !body.date) {
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

  if (pathname.startsWith("/api/receivables/") && pathname.endsWith("/payments") && request.method === "POST") {
    const receivableId = getIdFromPath(pathname, "receivables");
    const body = await readJsonBody(request);
    if (!receivableId || !body.cashAccountId || !body.amount || !body.paidAt || !body.method) {
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

  if (pathname.startsWith("/api/payables/") && pathname.endsWith("/payments") && request.method === "POST") {
    const payableId = getIdFromPath(pathname, "payables");
    const body = await readJsonBody(request);
    if (!payableId || !body.cashAccountId || !body.amount || !body.paidAt || !body.method) {
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
      movements: dataStore.listCashMovements()
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

  notFound(response);
}
