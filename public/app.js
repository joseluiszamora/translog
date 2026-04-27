const state = {
  bootstrap: null,
  dashboard: null,
  trips: [],
  receivables: [],
  payables: [],
  cash: { accounts: [], movements: [] },
  reports: [],
  auditLogs: []
};

const pageTitles = {
  dashboard: "Dashboard financiero",
  trips: "Operacion de viajes",
  receivables: "Cuentas por cobrar",
  payables: "Cuentas por pagar",
  cash: "Caja, bancos y tesoreria",
  reports: "Rentabilidad por viaje",
  audit: "Bitacora de auditoria"
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Error en la solicitud");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function currency(value) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: state.bootstrap?.settings?.currency || "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function badge(status) {
  const tone = ["pending", "planned"].includes(status)
    ? "warn"
    : ["partial", "in_progress"].includes(status)
      ? ""
      : ["paid", "invoiced", "liquidated"].includes(status)
        ? ""
        : "danger";
  return `<span class="badge ${tone}">${status}</span>`;
}

function renderUserCard() {
  const container = document.querySelector("#user-card");
  const { currentUser, settings } = state.bootstrap;
  container.innerHTML = `
    <strong>${currentUser.name}</strong>
    <p>${currentUser.email}</p>
    <div class="inline-meta">
      <span>${settings.companyName}</span>
      <span>Rol: ${currentUser.role}</span>
    </div>
  `;
}

function renderDashboard() {
  const view = document.querySelector("#dashboard-view");
  const { summary, tripStatusBreakdown, customerRanking, accounts } = state.dashboard;

  view.innerHTML = `
    <div class="metric-grid">
      <article class="stat-card"><span>Ingresos esperados</span><strong>${currency(summary.totalRevenue)}</strong></article>
      <article class="stat-card"><span>Costos operativos</span><strong>${currency(summary.totalCosts)}</strong></article>
      <article class="stat-card"><span>Utilidad bruta</span><strong>${currency(summary.grossProfit)}</strong></article>
      <article class="stat-card"><span>Por cobrar</span><strong>${currency(summary.receivableBalance)}</strong></article>
      <article class="stat-card"><span>Caja proyectada</span><strong>${currency(summary.projectedCash)}</strong></article>
    </div>

    <div class="hero-grid" style="margin-top: 16px;">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Estado operativo</h3>
            <p>Lectura rapida del negocio por estado de viaje.</p>
          </div>
        </div>
        <div class="list">
          ${tripStatusBreakdown.map((item) => `
            <div class="list-item">
              <strong>${item.status}</strong>
              <span>${item.count} viajes</span>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Tesoreria disponible</h3>
            <p>Saldos por cuenta con movimientos aplicados.</p>
          </div>
        </div>
        <div class="list">
          ${accounts.map((account) => `
            <div class="list-item">
              <strong>${account.name}</strong>
              <div class="inline-meta">
                <span>${account.type}</span>
                <span>${currency(account.balance)}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top: 16px;">
      <div class="panel-header">
        <div>
          <h3>Clientes mas rentables</h3>
          <p>Rentabilidad acumulada de viajes.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Viajes</th>
              <th>Utilidad</th>
            </tr>
          </thead>
          <tbody>
            ${customerRanking.map((item) => `
              <tr>
                <td>${item.customerName}</td>
                <td>${item.trips}</td>
                <td>${currency(item.profit)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function tripFormOptions(items, labelFn) {
  return items.map((item) => `<option value="${item.id}">${labelFn(item)}</option>`).join("");
}

function renderTrips() {
  const view = document.querySelector("#trips-view");
  const { masters } = state.bootstrap;

  view.innerHTML = `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Registrar viaje</h3>
            <p>Viaje como centro operativo-financiero.</p>
          </div>
        </div>
        <form id="trip-form" class="form-grid">
          <select name="customerId" required>${tripFormOptions(masters.customers, (item) => item.name)}</select>
          <select name="routeId" required>${tripFormOptions(masters.routes, (item) => `${item.origin} -> ${item.destination}`)}</select>
          <select name="vehicleId" required>${tripFormOptions(masters.vehicles, (item) => `${item.plate} / ${item.model}`)}</select>
          <select name="driverId" required>${tripFormOptions(masters.drivers, (item) => item.name)}</select>
          <input name="serviceDate" type="date" required />
          <input name="expectedRevenue" type="number" min="0" placeholder="Ingreso esperado" required />
          <input name="advanceAmount" type="number" min="0" placeholder="Anticipo al conductor" />
          <select name="status">
            <option value="planned">planned</option>
            <option value="in_progress">in_progress</option>
            <option value="liquidated">liquidated</option>
            <option value="invoiced">invoiced</option>
            <option value="paid">paid</option>
          </select>
          <textarea name="notes" placeholder="Notas del viaje"></textarea>
          <div class="action-row" style="grid-column: 1 / -1;">
            <button class="button" type="submit">Crear viaje</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Cargar gasto</h3>
            <p>Actualiza rentabilidad del viaje y genera tesoreria.</p>
          </div>
        </div>
        <form id="expense-form" class="form-grid">
          <select name="tripId" required>${tripFormOptions(state.trips, (item) => item.code)}</select>
          <select name="supplierId" required>${tripFormOptions(masters.suppliers, (item) => item.name)}</select>
          <select name="categoryId" required>${tripFormOptions(masters.expenseCategories, (item) => item.name)}</select>
          <input name="amount" type="number" min="0" placeholder="Monto" required />
          <input name="date" type="date" required />
          <select name="paymentStatus">
            <option value="pending">pending</option>
            <option value="paid">paid</option>
          </select>
          <select name="cashAccountId">${tripFormOptions(masters.cashAccounts, (item) => `${item.name}`)}</select>
          <input name="description" placeholder="Descripcion" required />
          <div class="action-row" style="grid-column: 1 / -1;">
            <button class="button secondary" type="submit">Agregar gasto</button>
          </div>
        </form>
      </section>
    </div>

    <section class="panel" style="margin-top: 16px;">
      <div class="panel-header">
        <div>
          <h3>Viajes registrados</h3>
          <p>Incluye costos, anticipo, utilidad y estado.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Viaje</th>
              <th>Cliente</th>
              <th>Ruta</th>
              <th>Ingreso</th>
              <th>Costo</th>
              <th>Utilidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${state.trips.map((trip) => `
              <tr>
                <td>
                  <strong>${trip.code}</strong>
                  <div class="inline-meta"><span>${trip.serviceDate}</span><span>${trip.vehicleLabel}</span></div>
                </td>
                <td>${trip.customerName}</td>
                <td>${trip.routeName}</td>
                <td>${currency(trip.expectedRevenue)}</td>
                <td>${currency(trip.totalCost)}</td>
                <td>${currency(trip.profit)}</td>
                <td>${badge(trip.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.querySelector("#trip-form").addEventListener("submit", onTripSubmit);
  document.querySelector("#expense-form").addEventListener("submit", onExpenseSubmit);
}

function renderReceivables() {
  const view = document.querySelector("#receivables-view");
  const { masters, settings } = state.bootstrap;
  view.innerHTML = `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Cobranza</h3>
            <p>Aplica pagos parciales o totales a cuentas por cobrar.</p>
          </div>
        </div>
        <form id="receivable-payment-form" class="form-grid">
          <select name="receivableId" required>${tripFormOptions(state.receivables, (item) => `${item.invoiceNumber} / ${item.customerName}`)}</select>
          <select name="cashAccountId" required>${tripFormOptions(masters.cashAccounts, (item) => item.name)}</select>
          <select name="method" required>${settings.paymentMethods.map((item) => `<option value="${item}">${item}</option>`).join("")}</select>
          <input name="paidAt" type="date" required />
          <input name="amount" type="number" min="0" placeholder="Monto cobrado" required />
          <input name="reference" placeholder="Referencia bancaria" />
          <div class="action-row" style="grid-column: 1 / -1;">
            <button class="button" type="submit">Registrar cobro</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <h3>Indicadores</h3>
        <div class="kpi-strip">
          <span class="kpi">Documentos: ${state.receivables.length}</span>
          <span class="kpi">Saldo pendiente: ${currency(state.receivables.reduce((sum, item) => sum + item.outstandingAmount, 0))}</span>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Factura</th>
              <th>Cliente</th>
              <th>Viaje</th>
              <th>Total</th>
              <th>Cobrado</th>
              <th>Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${state.receivables.map((item) => `
              <tr>
                <td><strong>${item.invoiceNumber}</strong><div class="inline-meta"><span>Vence ${item.dueDate}</span></div></td>
                <td>${item.customerName}</td>
                <td>${item.tripCode}</td>
                <td>${currency(item.totalAmount)}</td>
                <td>${currency(item.paidAmount)}</td>
                <td>${currency(item.outstandingAmount)}</td>
                <td>${badge(item.status)}</td>
              </tr>
            `).join("") || `<tr><td colspan="7" class="empty">No hay cuentas por cobrar.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.querySelector("#receivable-payment-form").addEventListener("submit", onReceivablePaymentSubmit);
}

function renderPayables() {
  const view = document.querySelector("#payables-view");
  const { masters, settings } = state.bootstrap;
  view.innerHTML = `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Pagos a proveedores</h3>
            <p>Registra salidas de tesoreria y actualiza el saldo pendiente.</p>
          </div>
        </div>
        <form id="payable-payment-form" class="form-grid">
          <select name="payableId" required>${tripFormOptions(state.payables, (item) => `${item.supplierName} / ${item.description}`)}</select>
          <select name="cashAccountId" required>${tripFormOptions(masters.cashAccounts, (item) => item.name)}</select>
          <select name="method" required>${settings.paymentMethods.map((item) => `<option value="${item}">${item}</option>`).join("")}</select>
          <input name="paidAt" type="date" required />
          <input name="amount" type="number" min="0" placeholder="Monto pagado" required />
          <input name="reference" placeholder="Referencia de pago" />
          <div class="action-row" style="grid-column: 1 / -1;">
            <button class="button" type="submit">Registrar pago</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <h3>Indicadores</h3>
        <div class="kpi-strip">
          <span class="kpi">Documentos: ${state.payables.length}</span>
          <span class="kpi">Saldo pendiente: ${currency(state.payables.reduce((sum, item) => sum + item.outstandingAmount, 0))}</span>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Descripcion</th>
              <th>Viaje</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${state.payables.map((item) => `
              <tr>
                <td>${item.supplierName}</td>
                <td><strong>${item.description}</strong><div class="inline-meta"><span>Vence ${item.dueDate}</span></div></td>
                <td>${item.tripCode}</td>
                <td>${currency(item.totalAmount)}</td>
                <td>${currency(item.paidAmount)}</td>
                <td>${currency(item.outstandingAmount)}</td>
                <td>${badge(item.status)}</td>
              </tr>
            `).join("") || `<tr><td colspan="7" class="empty">No hay cuentas por pagar.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.querySelector("#payable-payment-form").addEventListener("submit", onPayablePaymentSubmit);
}

function renderCash() {
  const view = document.querySelector("#cash-view");
  view.innerHTML = `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header"><div><h3>Saldos</h3><p>Estado consolidado de caja y bancos.</p></div></div>
        <div class="list">
          ${state.cash.accounts.map((item) => `
            <div class="list-item">
              <strong>${item.name}</strong>
              <div class="inline-meta">
                <span>${item.type}</span>
                <span>${currency(item.balance)}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="panel">
        <h3>Flujo reciente</h3>
        <div class="kpi-strip">
          <span class="kpi">Entradas: ${currency(state.cash.movements.filter((item) => item.type === "in").reduce((sum, item) => sum + item.amount, 0))}</span>
          <span class="kpi">Salidas: ${currency(state.cash.movements.filter((item) => item.type === "out").reduce((sum, item) => sum + item.amount, 0))}</span>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cuenta</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Monto</th>
              <th>Referencia</th>
            </tr>
          </thead>
          <tbody>
            ${state.cash.movements.map((item) => `
              <tr>
                <td>${item.date}</td>
                <td>${item.accountName}</td>
                <td>${badge(item.type)}</td>
                <td>${item.category}</td>
                <td>${currency(item.amount)}</td>
                <td>${item.referenceType} / ${item.referenceId}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderReports() {
  const view = document.querySelector("#reports-view");
  view.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Reporte de rentabilidad</h3>
          <p>Comparativo ingreso vs costo real por viaje.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Viaje</th>
              <th>Cliente</th>
              <th>Ruta</th>
              <th>Ingreso</th>
              <th>Costo</th>
              <th>Utilidad</th>
              <th>Margen</th>
            </tr>
          </thead>
          <tbody>
            ${state.reports.map((item) => `
              <tr>
                <td>${item.tripCode}</td>
                <td>${item.customerName}</td>
                <td>${item.routeName}</td>
                <td>${currency(item.expectedRevenue)}</td>
                <td>${currency(item.totalCost)}</td>
                <td>${currency(item.profit)}</td>
                <td>${item.margin}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAudit() {
  const view = document.querySelector("#audit-view");
  view.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Trazabilidad</h3>
          <p>Registro de eventos financieros y operativos sensibles.</p>
        </div>
      </div>
      <div class="list">
        ${state.auditLogs.map((item) => `
          <div class="list-item">
            <strong>${item.action}</strong>
            <div class="inline-meta">
              <span>${item.entityType} / ${item.entityId}</span>
              <span>${item.performedAt}</span>
              <span>${item.notes || "Sin notas"}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function refreshData() {
  const [bootstrap, dashboard, trips, receivables, payables, cash, reports, auditLogs] = await Promise.all([
    api("/api/bootstrap"),
    api("/api/dashboard"),
    api("/api/trips"),
    api("/api/receivables"),
    api("/api/payables"),
    api("/api/cash-movements"),
    api("/api/reports/profitability"),
    api("/api/audit-logs")
  ]);

  state.bootstrap = bootstrap;
  state.dashboard = dashboard;
  state.trips = trips;
  state.receivables = receivables;
  state.payables = payables;
  state.cash = cash;
  state.reports = reports;
  state.auditLogs = auditLogs;
}

async function rerender() {
  await refreshData();
  renderUserCard();
  renderDashboard();
  renderTrips();
  renderReceivables();
  renderPayables();
  renderCash();
  renderReports();
  renderAudit();
}

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function onTripSubmit(event) {
  event.preventDefault();
  const payload = formDataToObject(event.currentTarget);
  payload.expectedRevenue = Number(payload.expectedRevenue);
  payload.advanceAmount = Number(payload.advanceAmount || 0);
  await api("/api/trips", { method: "POST", body: JSON.stringify(payload) });
  event.currentTarget.reset();
  await rerender();
}

async function onExpenseSubmit(event) {
  event.preventDefault();
  const payload = formDataToObject(event.currentTarget);
  const { tripId, ...body } = payload;
  body.amount = Number(body.amount);
  await api(`/api/trips/${tripId}/expenses`, { method: "POST", body: JSON.stringify(body) });
  event.currentTarget.reset();
  await rerender();
}

async function onReceivablePaymentSubmit(event) {
  event.preventDefault();
  const payload = formDataToObject(event.currentTarget);
  const { receivableId, ...body } = payload;
  body.amount = Number(body.amount);
  await api(`/api/receivables/${receivableId}/payments`, { method: "POST", body: JSON.stringify(body) });
  event.currentTarget.reset();
  await rerender();
}

async function onPayablePaymentSubmit(event) {
  event.preventDefault();
  const payload = formDataToObject(event.currentTarget);
  const { payableId, ...body } = payload;
  body.amount = Number(body.amount);
  await api(`/api/payables/${payableId}/payments`, { method: "POST", body: JSON.stringify(body) });
  event.currentTarget.reset();
  await rerender();
}

function setupNavigation() {
  const buttons = document.querySelectorAll(".nav-link");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      const viewName = button.dataset.view;
      document.querySelector("#page-title").textContent = pageTitles[viewName];
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      document.querySelector(`#${viewName}-view`).classList.add("active");
    });
  });
}

async function init() {
  setupNavigation();
  await rerender();
}

init().catch((error) => {
  document.body.innerHTML = `<main class="content"><section class="panel"><h3>Error al cargar la app</h3><p>${error.message}</p></section></main>`;
});
