const state = {
  bootstrap: null,
  dashboard: null,
  trips: [],
  receivables: [],
  payables: [],
  cash: { accounts: [], movements: [] },
  reports: [],
  auditLogs: [],
  masters: {
    customers: [],
    routes: [],
    vehicles: [],
    drivers: [],
  },
};

const pageTitles = {
  dashboard: "Dashboard financiero",
  trips: "Operacion de viajes",
  "trip-expenses": "Gastos por viaje",
  receivables: "Cuentas por cobrar",
  payables: "Cuentas por pagar",
  cash: "Caja, bancos y tesoreria",
  reports: "Rentabilidad por viaje",
  audit: "Bitacora de auditoria",
  masters: "Datos parametricos",
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
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
    currency: state.bootstrap?.settings?.currency || "BOB",
    maximumFractionDigits: 0,
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
  const { summary, tripStatusBreakdown, customerRanking, accounts } =
    state.dashboard;

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
          ${tripStatusBreakdown
            .map(
              (item) => `
            <div class="list-item">
              <strong>${item.status}</strong>
              <span>${item.count} viajes</span>
            </div>
          `,
            )
            .join("")}
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
          ${accounts
            .map(
              (account) => `
            <div class="list-item">
              <strong>${account.name}</strong>
              <div class="inline-meta">
                <span>${account.type}</span>
                <span>${currency(account.balance)}</span>
              </div>
            </div>
          `,
            )
            .join("")}
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
            ${customerRanking
              .map(
                (item) => `
              <tr>
                <td>${item.customerName}</td>
                <td>${item.trips}</td>
                <td>${currency(item.profit)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function tripFormOptions(items, labelFn) {
  return items
    .map((item) => `<option value="${item.id}">${labelFn(item)}</option>`)
    .join("");
}

function renderTrips() {
  const view = document.querySelector("#trips-view");
  const { masters } = state.bootstrap;

  const statusOptions = `
    <option value="planned">Planeado</option>
    <option value="in_progress">En progreso</option>
    <option value="liquidated">Finalizado</option>
    <option value="invoiced">Facturado</option>
    <option value="paid">Pagado</option>
  `;

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
          <label style="font-size:12px;color:#888;margin-bottom:-8px;grid-column:1/-1">Fecha y hora de salida</label>
          <input name="serviceDate" type="date" required />
          <input name="departureTime" type="time" placeholder="Hora de salida" />
          <label style="font-size:12px;color:#888;margin-bottom:-8px;grid-column:1/-1">Fecha y hora de retorno</label>
          <input name="returnDate" type="date" />
          <input name="returnTime" type="time" placeholder="Hora de retorno" />
          <input name="expectedRevenue" type="number" min="0" step="0.01" placeholder="Ingreso esperado" required />
          <input name="totalRevenue"    type="number" min="0" step="0.01" placeholder="Ingreso total" />
          <input name="expectedCost"    type="number" min="0" step="0.01" placeholder="Gasto esperado" />
          <input name="totalCostInput"  type="number" min="0" step="0.01" placeholder="Gasto total" />
          <input name="advanceAmount"   type="number" min="0" step="0.01" placeholder="Anticipo al conductor" />
          <select name="status">${statusOptions}</select>
          <textarea name="notes" placeholder="Notas del viaje" style="grid-column:1/-1"></textarea>
          <div class="action-row" style="grid-column: 1 / -1;">
            <button class="button" type="submit">Crear viaje</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Registrar gasto</h3>
            <p>Asocia un gasto a un viaje específico.</p>
          </div>
        </div>
        <form id="expense-form" class="form-grid">
          <select name="tripId" required>
            <option value="">— Viaje —</option>
            ${tripFormOptions(state.trips, (item) => item.code)}
          </select>
          <select name="category" required>
            <option value="">— Categoría —</option>
            <option value="Gasolina">Gasolina</option>
            <option value="Peajes">Peajes</option>
            <option value="Reparación">Reparación</option>
            <option value="Viáticos">Viáticos</option>
            <option value="Otro">Otro</option>
          </select>
          <select name="stage">
            <option value="">— Etapa —</option>
            <option value="ida">Ida</option>
            <option value="vuelta">Vuelta</option>
          </select>
          <input name="paidBy" placeholder="Pagado por" />
          <input name="description" placeholder="Concepto / descripción" required />
          <input name="amount" type="number" min="0" step="0.01" placeholder="Monto" required />
          <input name="date" type="date" required />
          <input name="time" type="time" />
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
              <th>Camion</th>
              <th>Chofer</th>
              <th>Salida</th>
              <th>Retorno</th>
              <th>Ing. esperado</th>
              <th>Ing. total</th>
              <th>Gasto esp.</th>
              <th>Gasto total</th>
              <th>Gasto real</th>
              <th>Anticipo</th>
              <th>Utilidad</th>
              <th>Estado</th>
              <th class="action-cell"></th>
            </tr>
          </thead>
          <tbody>
            ${
              state.trips
                .map(
                  (trip) => `
              <tr>
                <td><strong>${trip.code}</strong></td>
                <td>${trip.customerName}</td>
                <td>${trip.routeName}</td>
                <td>${trip.vehicleLabel}</td>
                <td>${trip.driverName}</td>
                <td>${trip.serviceDate}${trip.departureTime ? " " + trip.departureTime : ""}</td>
                <td>${trip.returnDate || "-"}${trip.returnTime ? " " + trip.returnTime : ""}</td>
                <td>${currency(trip.expectedRevenue)}</td>
                <td>${currency(trip.totalRevenue)}</td>
                <td>${currency(trip.expectedCost)}</td>
                <td>${currency(trip.totalCostInput)}</td>
                <td>${currency(trip.totalCost)}</td>
                <td>${currency(trip.advanceAmount)}</td>
                <td>${currency(trip.profit)}</td>
                <td>${badge(trip.status)}</td>
                <td class="action-cell">
                  <button class="button secondary btn-edit-trip"
                    data-id="${trip.id}"
                    data-customerid="${trip.customerId}"
                    data-routeid="${trip.routeId}"
                    data-vehicleid="${trip.vehicleId}"
                    data-driverid="${trip.driverId}"
                    data-servicedate="${trip.serviceDate}"
                    data-departuretime="${trip.departureTime || ""}"
                    data-returndate="${trip.returnDate || ""}"
                    data-returntime="${trip.returnTime || ""}"
                    data-expectedrevenue="${trip.expectedRevenue}"
                    data-totalrevenue="${trip.totalRevenue}"
                    data-expectedcost="${trip.expectedCost}"
                    data-totalcostinput="${trip.totalCostInput}"
                    data-advanceamount="${trip.advanceAmount}"
                    data-status="${trip.status}"
                    data-notes="${(trip.notes || "").replace(/"/g, "&quot;")}">Editar</button>
                  <button class="btn-danger btn-delete-trip" data-id="${trip.id}" data-code="${trip.code}">Eliminar</button>
                </td>
              </tr>
            `,
                )
                .join("") ||
              `<tr><td colspan="16" class="empty">Sin viajes registrados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>

    <!-- Panel de gastos por viaje -->
    <section class="panel" style="margin-top:16px;">
      <div class="panel-header">
        <div>
          <h3>Gastos por viaje</h3>
          <p>Detalle de gastos registrados agrupados por viaje.</p>
        </div>
      </div>
      ${
        state.trips.length === 0
          ? `<p class="empty">No hay viajes registrados.</p>`
          : state.trips
              .map((trip) => {
                const expTotal = trip.expenses
                  ? trip.expenses.reduce((s, e) => s + e.amount, 0)
                  : 0;
                return `
            <details style="margin-bottom:8px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
              <summary style="padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;background:#f8fafc;">
                <span><strong>${trip.code}</strong> — ${trip.customerName} / ${trip.routeName}</span>
                <span>Total gastos: <strong>${currency(expTotal)}</strong> (${(trip.expenses || []).length} items)</span>
              </summary>
              ${
                !trip.expenses || trip.expenses.length === 0
                  ? `<p class="empty" style="margin:8px 14px;">Sin gastos registrados.</p>`
                  : `<div class="table-wrap" style="margin:0;">
                    <table>
                      <thead><tr>
                        <th>Fecha</th><th>Hora</th><th>Etapa</th>
                        <th>Categoría</th><th>Concepto</th>
                        <th>Pagado por</th><th>Monto</th>
                      </tr></thead>
                      <tbody>
                        ${trip.expenses
                          .map(
                            (e) => `
                          <tr>
                            <td>${e.date}</td>
                            <td>${e.time || "—"}</td>
                            <td>${e.stage || "—"}</td>
                            <td>${e.category || "—"}</td>
                            <td>${e.description || "—"}</td>
                            <td>${e.paidBy || "—"}</td>
                            <td>${currency(e.amount)}</td>
                          </tr>`,
                          )
                          .join("")}
                      </tbody>
                    </table>
                   </div>`
              }
            </details>`;
              })
              .join("")
      }
    </section>

    <!-- Modal de edicion de viaje -->
    <div id="trip-edit-modal" class="modal-backdrop hidden">
      <div class="modal-box" style="max-width:680px">
        <div class="panel-header"><div><h3>Editar viaje</h3></div></div>
        <form id="trip-edit-form" class="form-grid">
          <input type="hidden" name="id" />
          <select name="customerId" required>${tripFormOptions(masters.customers, (item) => item.name)}</select>
          <select name="routeId" required>${tripFormOptions(masters.routes, (item) => `${item.origin} -> ${item.destination}`)}</select>
          <select name="vehicleId" required>${tripFormOptions(masters.vehicles, (item) => `${item.plate} / ${item.model}`)}</select>
          <select name="driverId" required>${tripFormOptions(masters.drivers, (item) => item.name)}</select>
          <label style="font-size:12px;color:#888;margin-bottom:-8px;grid-column:1/-1">Fecha y hora de salida</label>
          <input name="serviceDate" type="date" required />
          <input name="departureTime" type="time" />
          <label style="font-size:12px;color:#888;margin-bottom:-8px;grid-column:1/-1">Fecha y hora de retorno</label>
          <input name="returnDate" type="date" />
          <input name="returnTime" type="time" />
          <input name="expectedRevenue" type="number" min="0" step="0.01" placeholder="Ingreso esperado" />
          <input name="totalRevenue"    type="number" min="0" step="0.01" placeholder="Ingreso total" />
          <input name="expectedCost"    type="number" min="0" step="0.01" placeholder="Gasto esperado" />
          <input name="totalCostInput"  type="number" min="0" step="0.01" placeholder="Gasto total" />
          <input name="advanceAmount"   type="number" min="0" step="0.01" placeholder="Anticipo al conductor" />
          <select name="status">${statusOptions}</select>
          <textarea name="notes" placeholder="Notas del viaje" style="grid-column:1/-1"></textarea>
          <div class="action-row" style="grid-column: 1/-1;">
            <button class="button" type="submit">Guardar cambios</button>
            <button type="button" class="button secondary" id="trip-edit-cancel">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.querySelector("#trip-form").addEventListener("submit", onTripSubmit);
  document
    .querySelector("#expense-form")
    .addEventListener("submit", onExpenseSubmit);

  view.querySelectorAll(".btn-delete-trip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { id, code } = btn.dataset;
      if (
        !confirm(
          `¿Eliminar el viaje ${code}? Esta acción no se puede deshacer.`,
        )
      )
        return;
      await api(`/api/trips/${id}`, { method: "DELETE" });
      await rerender();
    });
  });

  // ─── Edicion de viaje (modal) ────────────────────────────────────────────
  const tripEditModal = view.querySelector("#trip-edit-modal");
  const tripEditForm = view.querySelector("#trip-edit-form");

  view.querySelectorAll(".btn-edit-trip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset;
      tripEditForm.id.value = d.id;
      tripEditForm.customerId.value = d.customerid;
      tripEditForm.routeId.value = d.routeid;
      tripEditForm.vehicleId.value = d.vehicleid;
      tripEditForm.driverId.value = d.driverid;
      tripEditForm.serviceDate.value = d.servicedate;
      tripEditForm.departureTime.value = d.departuretime;
      tripEditForm.returnDate.value = d.returndate;
      tripEditForm.returnTime.value = d.returntime;
      tripEditForm.expectedRevenue.value = d.expectedrevenue;
      tripEditForm.totalRevenue.value = d.totalrevenue;
      tripEditForm.expectedCost.value = d.expectedcost;
      tripEditForm.totalCostInput.value = d.totalcostinput;
      tripEditForm.advanceAmount.value = d.advanceamount;
      tripEditForm.status.value = d.status;
      tripEditForm.notes.value = btn.dataset.notes;
      tripEditModal.classList.remove("hidden");
    });
  });

  view.querySelector("#trip-edit-cancel")?.addEventListener("click", () => {
    tripEditModal.classList.add("hidden");
  });

  tripEditModal?.addEventListener("click", (e) => {
    if (e.target === tripEditModal) tripEditModal.classList.add("hidden");
  });

  tripEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = tripEditForm.querySelector("button[type=submit]");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const payload = formDataToObject(tripEditForm);
    const { id, ...body } = payload;
    body.expectedRevenue = Number(body.expectedRevenue || 0);
    body.totalRevenue = Number(body.totalRevenue || 0);
    body.expectedCost = Number(body.expectedCost || 0);
    body.totalCostInput = Number(body.totalCostInput || 0);
    body.advanceAmount = Number(body.advanceAmount || 0);
    try {
      await api(`/api/trips/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      tripEditModal.classList.add("hidden");
      await rerender();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
      btn.disabled = false;
      btn.textContent = original;
    }
  });
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
            ${
              state.receivables
                .map(
                  (item) => `
              <tr>
                <td><strong>${item.invoiceNumber}</strong><div class="inline-meta"><span>Vence ${item.dueDate}</span></div></td>
                <td>${item.customerName}</td>
                <td>${item.tripCode}</td>
                <td>${currency(item.totalAmount)}</td>
                <td>${currency(item.paidAmount)}</td>
                <td>${currency(item.outstandingAmount)}</td>
                <td>${badge(item.status)}</td>
              </tr>
            `,
                )
                .join("") ||
              `<tr><td colspan="7" class="empty">No hay cuentas por cobrar.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  document
    .querySelector("#receivable-payment-form")
    .addEventListener("submit", onReceivablePaymentSubmit);
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
            ${
              state.payables
                .map(
                  (item) => `
              <tr>
                <td>${item.supplierName}</td>
                <td><strong>${item.description}</strong><div class="inline-meta"><span>Vence ${item.dueDate}</span></div></td>
                <td>${item.tripCode}</td>
                <td>${currency(item.totalAmount)}</td>
                <td>${currency(item.paidAmount)}</td>
                <td>${currency(item.outstandingAmount)}</td>
                <td>${badge(item.status)}</td>
              </tr>
            `,
                )
                .join("") ||
              `<tr><td colspan="7" class="empty">No hay cuentas por pagar.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  document
    .querySelector("#payable-payment-form")
    .addEventListener("submit", onPayablePaymentSubmit);
}

function renderCash() {
  const view = document.querySelector("#cash-view");
  view.innerHTML = `
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header"><div><h3>Saldos</h3><p>Estado consolidado de caja y bancos.</p></div></div>
        <div class="list">
          ${state.cash.accounts
            .map(
              (item) => `
            <div class="list-item">
              <strong>${item.name}</strong>
              <div class="inline-meta">
                <span>${item.type}</span>
                <span>${currency(item.balance)}</span>
              </div>
            </div>
          `,
            )
            .join("")}
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
            ${state.cash.movements
              .map(
                (item) => `
              <tr>
                <td>${item.date}</td>
                <td>${item.accountName}</td>
                <td>${badge(item.type)}</td>
                <td>${item.category}</td>
                <td>${currency(item.amount)}</td>
                <td>${item.referenceType} / ${item.referenceId}</td>
              </tr>
            `,
              )
              .join("")}
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
            ${state.reports
              .map(
                (item) => `
              <tr>
                <td>${item.tripCode}</td>
                <td>${item.customerName}</td>
                <td>${item.routeName}</td>
                <td>${currency(item.expectedRevenue)}</td>
                <td>${currency(item.totalCost)}</td>
                <td>${currency(item.profit)}</td>
                <td>${item.margin}%</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMasters() {
  const view = document.querySelector("#masters-view");
  const { customers, routes, vehicles, drivers } = state.masters;

  const tabs = [
    { key: "customers", label: "Clientes" },
    { key: "routes", label: "Rutas" },
    { key: "vehicles", label: "Camiones" },
    { key: "drivers", label: "Choferes" },
  ];

  const activeTab = view.dataset.tab || "customers";

  view.innerHTML = `
    <div class="tab-bar">
      ${tabs
        .map(
          (t) => `
        <button class="tab-btn${t.key === activeTab ? " active" : ""}" data-tab="${t.key}">${t.label}</button>
      `,
        )
        .join("")}
    </div>

    <div id="masters-customers" class="masters-panel${activeTab === "customers" ? "" : " hidden"}">
      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><h3>Nuevo cliente</h3></div></div>
          <form id="customer-form" class="form-grid">
            <input name="name" placeholder="Nombre comercial" required />
            <input name="businessName" placeholder="Razon social" />
            <input name="nit" placeholder="NIT" />
            <input name="contact" type="email" placeholder="Email de contacto" />
            <input name="creditDays" type="number" min="0" placeholder="Dias de credito" />
            <input name="contactName" placeholder="Nombre encargado" />
            <input name="contactPhone" placeholder="Telefono encargado" />
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Agregar cliente</button>
            </div>
          </form>
        </section>
        <section class="panel">
          <h3>Resumen</h3>
          <div class="kpi-strip" style="margin-top:12px;">
            <span class="kpi">${customers.length} clientes registrados</span>
          </div>
        </section>
      </div>
      <section class="panel" style="margin-top:16px;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre / Razon social</th>
                <th>NIT</th>
                <th>Email</th>
                <th>Encargado</th>
                <th>Telefono</th>
                <th>Credito (dias)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${
                customers
                  .map(
                    (c) => `
                <tr data-id="${c.id}">
                  <td>
                    <strong>${c.name}</strong>
                    ${c.businessName ? `<div class="inline-meta"><span>${c.businessName}</span></div>` : ""}
                  </td>
                  <td>${c.nit || "-"}</td>
                  <td>${c.contact || "-"}</td>
                  <td>${c.contactName || "-"}</td>
                  <td>${c.contactPhone || "-"}</td>
                  <td>${c.creditDays}</td>
                  <td class="action-cell">
                    <button class="button secondary btn-edit-customer" data-id="${c.id}"
                      data-name="${c.name}" data-businessname="${c.businessName || ""}"
                      data-nit="${c.nit || ""}" data-contact="${c.contact || ""}"
                      data-creditdays="${c.creditDays}" data-contactname="${c.contactName || ""}"
                      data-contactphone="${c.contactPhone || ""}">Editar</button>
                    <button class="btn-danger btn-delete" data-entity="customers" data-id="${c.id}">Eliminar</button>
                  </td>
                </tr>
              `,
                  )
                  .join("") ||
                `<tr><td colspan="7" class="empty">Sin clientes.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal de edicion de cliente -->
      <div id="customer-edit-modal" class="modal-backdrop hidden">
        <div class="modal-box">
          <div class="panel-header"><div><h3>Editar cliente</h3></div></div>
          <form id="customer-edit-form" class="form-grid">
            <input type="hidden" name="id" />
            <input name="name" placeholder="Nombre comercial" required />
            <input name="businessName" placeholder="Razon social" />
            <input name="nit" placeholder="NIT" />
            <input name="contact" type="email" placeholder="Email de contacto" />
            <input name="creditDays" type="number" min="0" placeholder="Dias de credito" />
            <input name="contactName" placeholder="Nombre encargado" />
            <input name="contactPhone" placeholder="Telefono encargado" />
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Guardar cambios</button>
              <button type="button" class="button secondary" id="customer-edit-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div id="masters-routes" class="masters-panel${activeTab === "routes" ? "" : " hidden"}">
      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><h3>Nueva ruta</h3></div></div>
          <form id="route-form" class="form-grid">
            <input name="origin" placeholder="Origen" required />
            <input name="destination" placeholder="Destino" required />
            <input name="kilometers" type="number" min="0" step="0.1" placeholder="Kilometros" />
            <input name="fuelLiters" type="number" min="0" step="0.1" placeholder="Gasolina (litros)" />
            <input name="tolls" type="number" min="0" step="0.01" placeholder="Peajes (monto total)" />
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Agregar ruta</button>
            </div>
          </form>
        </section>
        <section class="panel">
          <h3>Resumen</h3>
          <div class="kpi-strip" style="margin-top:12px;">
            <span class="kpi">${routes.length} rutas registradas</span>
          </div>
        </section>
      </div>
      <section class="panel" style="margin-top:16px;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Origen</th>
                <th>Destino</th>
                <th>Km</th>
                <th>Gasolina (L)</th>
                <th>Peajes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${
                routes
                  .map(
                    (r) => `
                <tr data-id="${r.id}">
                  <td>${r.origin}</td>
                  <td>${r.destination}</td>
                  <td>${r.kilometers}</td>
                  <td>${r.fuelLiters ?? 0}</td>
                  <td>${r.tolls ?? 0}</td>
                  <td class="action-cell">
                    <button class="button secondary btn-edit-route" data-id="${r.id}"
                      data-origin="${r.origin}" data-destination="${r.destination}"
                      data-kilometers="${r.kilometers}" data-fuelliters="${r.fuelLiters ?? 0}"
                      data-tolls="${r.tolls ?? 0}">Editar</button>
                    <button class="btn-danger btn-delete" data-entity="routes" data-id="${r.id}">Eliminar</button>
                  </td>
                </tr>
              `,
                  )
                  .join("") ||
                `<tr><td colspan="6" class="empty">Sin rutas.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal de edicion de ruta -->
      <div id="route-edit-modal" class="modal-backdrop hidden">
        <div class="modal-box">
          <div class="panel-header"><div><h3>Editar ruta</h3></div></div>
          <form id="route-edit-form" class="form-grid">
            <input type="hidden" name="id" />
            <input name="origin" placeholder="Origen" required />
            <input name="destination" placeholder="Destino" required />
            <input name="kilometers" type="number" min="0" step="0.1" placeholder="Kilometros" />
            <input name="fuelLiters" type="number" min="0" step="0.1" placeholder="Gasolina (litros)" />
            <input name="tolls" type="number" min="0" step="0.01" placeholder="Peajes (monto total)" />
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Guardar cambios</button>
              <button type="button" class="button secondary" id="route-edit-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div id="masters-vehicles" class="masters-panel${activeTab === "vehicles" ? "" : " hidden"}">
      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><h3>Nuevo camion</h3></div></div>
          <form id="vehicle-form" class="form-grid">
            <input name="plate" placeholder="Placa (ej: TRK-1234)" required />
            <input name="model" placeholder="Modelo (ej: Volvo FH)" required />
            <input name="color" placeholder="Color" />
            <input name="capacityTons" type="number" min="0" step="0.1" placeholder="Capacidad (toneladas)" />
            <input name="volumeM3" type="number" min="0" step="0.1" placeholder="Volumen (m³)" />
            <select name="status">
              <option value="available">Disponible</option>
              <option value="in_trip">En viaje</option>
              <option value="maintenance">En mantenimiento</option>
              <option value="inactive">Inactivo</option>
            </select>
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Agregar camion</button>
            </div>
          </form>
        </section>
        <section class="panel">
          <h3>Resumen</h3>
          <div class="kpi-strip" style="margin-top:12px;">
            <span class="kpi">${vehicles.length} unidades registradas</span>
            <span class="kpi">${vehicles.filter((v) => v.status === "available").length} disponibles</span>
          </div>
        </section>
      </div>
      <section class="panel" style="margin-top:16px;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Modelo</th>
                <th>Color</th>
                <th>Capacidad</th>
                <th>Volumen</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${
                vehicles
                  .map(
                    (v) => `
                <tr data-id="${v.id}">
                  <td><strong>${v.plate}</strong></td>
                  <td>${v.model}</td>
                  <td>${v.color || "-"}</td>
                  <td>${v.capacityTons} t</td>
                  <td>${v.volumeM3 ?? 0} m³</td>
                  <td>${badge(v.status)}</td>
                  <td class="action-cell">
                    <button class="button secondary btn-edit-vehicle" data-id="${v.id}"
                      data-plate="${v.plate}" data-model="${v.model}" data-color="${v.color || ""}"
                      data-capacitytons="${v.capacityTons}" data-volumem3="${v.volumeM3 ?? 0}"
                      data-status="${v.status}">Editar</button>
                    <button class="btn-danger btn-delete" data-entity="vehicles" data-id="${v.id}">Eliminar</button>
                  </td>
                </tr>
              `,
                  )
                  .join("") ||
                `<tr><td colspan="7" class="empty">Sin camiones.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal de edicion de camion -->
      <div id="vehicle-edit-modal" class="modal-backdrop hidden">
        <div class="modal-box">
          <div class="panel-header"><div><h3>Editar camion</h3></div></div>
          <form id="vehicle-edit-form" class="form-grid">
            <input type="hidden" name="id" />
            <input name="plate" placeholder="Placa" required />
            <input name="model" placeholder="Modelo" required />
            <input name="color" placeholder="Color" />
            <input name="capacityTons" type="number" min="0" step="0.1" placeholder="Capacidad (toneladas)" />
            <input name="volumeM3" type="number" min="0" step="0.1" placeholder="Volumen (m³)" />
            <select name="status">
              <option value="available">Disponible</option>
              <option value="in_trip">En viaje</option>
              <option value="maintenance">En mantenimiento</option>
              <option value="inactive">Inactivo</option>
            </select>
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Guardar cambios</button>
              <button type="button" class="button secondary" id="vehicle-edit-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div id="masters-drivers" class="masters-panel${activeTab === "drivers" ? "" : " hidden"}">
      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><h3>Nuevo chofer</h3></div></div>
          <form id="driver-form" class="form-grid">
            <input name="firstName" placeholder="Nombres" required />
            <input name="lastName"  placeholder="Apellidos" required />
            <input name="identityCard" placeholder="Carnet de identidad" />
            <input name="license" placeholder="Licencia" />
            <select name="status">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="on_leave">De licencia</option>
            </select>
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Agregar chofer</button>
            </div>
          </form>
        </section>
        <section class="panel">
          <h3>Resumen</h3>
          <div class="kpi-strip" style="margin-top:12px;">
            <span class="kpi">${drivers.length} choferes registrados</span>
            <span class="kpi">${drivers.filter((d) => d.status === "active").length} activos</span>
          </div>
        </section>
      </div>
      <section class="panel" style="margin-top:16px;">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombres</th><th>Apellidos</th><th>Carnet</th><th>Licencia</th><th>Estado</th><th class="action-cell"></th></tr></thead>
            <tbody>
              ${
                drivers
                  .map(
                    (d) => `
                <tr data-id="${d.id}">
                  <td><strong>${d.firstName || d.name || "-"}</strong></td>
                  <td>${d.lastName || "-"}</td>
                  <td>${d.identityCard || "-"}</td>
                  <td>${d.license || "-"}</td>
                  <td>${badge(d.status)}</td>
                  <td class="action-cell">
                    <button class="button secondary btn-edit-driver"
                      data-id="${d.id}"
                      data-firstname="${d.firstName || ""}"
                      data-lastname="${d.lastName || ""}"
                      data-identitycard="${d.identityCard || ""}"
                      data-license="${d.license || ""}"
                      data-status="${d.status}">Editar</button>
                    <button class="btn-danger btn-delete" data-entity="drivers" data-id="${d.id}">Eliminar</button>
                  </td>
                </tr>
              `,
                  )
                  .join("") ||
                `<tr><td colspan="6" class="empty">Sin choferes.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal de edicion de chofer -->
      <div id="driver-edit-modal" class="modal-backdrop hidden">
        <div class="modal-box">
          <div class="panel-header"><div><h3>Editar chofer</h3></div></div>
          <form id="driver-edit-form" class="form-grid">
            <input type="hidden" name="id" />
            <input name="firstName" placeholder="Nombres" required />
            <input name="lastName"  placeholder="Apellidos" required />
            <input name="identityCard" placeholder="Carnet de identidad" />
            <input name="license" placeholder="Licencia" />
            <select name="status">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="on_leave">De licencia</option>
            </select>
            <div class="action-row" style="grid-column: 1/-1;">
              <button class="button" type="submit">Guardar cambios</button>
              <button type="button" class="button secondary" id="driver-edit-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  view.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      view.dataset.tab = btn.dataset.tab;
      renderMasters();
    });
  });

  // ─── Edicion de cliente (modal) ──────────────────────────────────────────
  const editModal = view.querySelector("#customer-edit-modal");
  const editForm = view.querySelector("#customer-edit-form");

  view.querySelectorAll(".btn-edit-customer").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset;
      editForm.id.value = d.id;
      editForm.name.value = d.name;
      editForm.businessName.value = d.businessname;
      editForm.nit.value = d.nit;
      editForm.contact.value = d.contact;
      editForm.creditDays.value = d.creditdays;
      editForm.contactName.value = d.contactname;
      editForm.contactPhone.value = d.contactphone;
      editModal.classList.remove("hidden");
    });
  });

  view.querySelector("#customer-edit-cancel")?.addEventListener("click", () => {
    editModal.classList.add("hidden");
  });

  editModal?.addEventListener("click", (e) => {
    if (e.target === editModal) editModal.classList.add("hidden");
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = editForm.querySelector("button[type=submit]");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const payload = formDataToObject(editForm);
    const { id, ...body } = payload;
    try {
      await api(`/api/masters/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      editModal.classList.add("hidden");
      await refreshMasters();
      renderMasters();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // ─── Edicion de ruta (modal) ─────────────────────────────────────────────
  const routeEditModal = view.querySelector("#route-edit-modal");
  const routeEditForm = view.querySelector("#route-edit-form");

  view.querySelectorAll(".btn-edit-route").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset;
      routeEditForm.id.value = d.id;
      routeEditForm.origin.value = d.origin;
      routeEditForm.destination.value = d.destination;
      routeEditForm.kilometers.value = d.kilometers;
      routeEditForm.fuelLiters.value = d.fuelliters;
      routeEditForm.tolls.value = d.tolls;
      routeEditModal.classList.remove("hidden");
    });
  });

  view.querySelector("#route-edit-cancel")?.addEventListener("click", () => {
    routeEditModal.classList.add("hidden");
  });

  routeEditModal?.addEventListener("click", (e) => {
    if (e.target === routeEditModal) routeEditModal.classList.add("hidden");
  });

  routeEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = routeEditForm.querySelector("button[type=submit]");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const payload = formDataToObject(routeEditForm);
    const { id, ...body } = payload;
    try {
      await api(`/api/masters/routes/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      routeEditModal.classList.add("hidden");
      await refreshMasters();
      renderMasters();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // ─── Edicion de camion (modal) ───────────────────────────────────────────
  const vehicleEditModal = view.querySelector("#vehicle-edit-modal");
  const vehicleEditForm = view.querySelector("#vehicle-edit-form");

  view.querySelectorAll(".btn-edit-vehicle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset;
      vehicleEditForm.id.value = d.id;
      vehicleEditForm.plate.value = d.plate;
      vehicleEditForm.model.value = d.model;
      vehicleEditForm.color.value = d.color;
      vehicleEditForm.capacityTons.value = d.capacitytons;
      vehicleEditForm.volumeM3.value = d.volumem3;
      vehicleEditForm.status.value = d.status;
      vehicleEditModal.classList.remove("hidden");
    });
  });

  view.querySelector("#vehicle-edit-cancel")?.addEventListener("click", () => {
    vehicleEditModal.classList.add("hidden");
  });

  vehicleEditModal?.addEventListener("click", (e) => {
    if (e.target === vehicleEditModal) vehicleEditModal.classList.add("hidden");
  });

  vehicleEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = vehicleEditForm.querySelector("button[type=submit]");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const payload = formDataToObject(vehicleEditForm);
    const { id, ...body } = payload;
    try {
      await api(`/api/masters/vehicles/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      vehicleEditModal.classList.add("hidden");
      await refreshMasters();
      renderMasters();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // ─── Edicion de chofer (modal) ───────────────────────────────────────────
  const driverEditModal = view.querySelector("#driver-edit-modal");
  const driverEditForm = view.querySelector("#driver-edit-form");

  view.querySelectorAll(".btn-edit-driver").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset;
      driverEditForm.id.value = d.id;
      driverEditForm.firstName.value = d.firstname;
      driverEditForm.lastName.value = d.lastname;
      driverEditForm.identityCard.value = d.identitycard;
      driverEditForm.license.value = d.license;
      driverEditForm.status.value = d.status;
      driverEditModal.classList.remove("hidden");
    });
  });

  view.querySelector("#driver-edit-cancel")?.addEventListener("click", () => {
    driverEditModal.classList.add("hidden");
  });

  driverEditModal?.addEventListener("click", (e) => {
    if (e.target === driverEditModal) driverEditModal.classList.add("hidden");
  });

  driverEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = driverEditForm.querySelector("button[type=submit]");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const payload = formDataToObject(driverEditForm);
    const { id, ...body } = payload;
    try {
      await api(`/api/masters/drivers/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      driverEditModal.classList.add("hidden");
      await refreshMasters();
      renderMasters();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  async function submitMasterForm(form, endpoint) {
    const btn = form.querySelector("button[type=submit]");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
      await api(endpoint, {
        method: "POST",
        body: JSON.stringify(formDataToObject(form)),
      });
      form.reset();
      await refreshMasters();
      renderMasters();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  view.querySelector("#customer-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitMasterForm(e.currentTarget, "/api/masters/customers");
  });

  view.querySelector("#route-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitMasterForm(e.currentTarget, "/api/masters/routes");
  });

  view.querySelector("#vehicle-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitMasterForm(e.currentTarget, "/api/masters/vehicles");
  });

  view.querySelector("#driver-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitMasterForm(e.currentTarget, "/api/masters/drivers");
  });

  view.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { entity, id } = btn.dataset;
      if (
        !confirm("¿Eliminar este registro? Esta accion no se puede deshacer.")
      )
        return;
      await api(`/api/masters/${entity}/${id}`, { method: "DELETE" });
      await refreshMasters();
      renderMasters();
    });
  });
}

function renderTripExpenses() {
  const view = document.querySelector("#trip-expenses-view");
  const { masters } = state.bootstrap;

  const activeFilter = view.dataset.tripFilter || "";
  const activeCatFilter = view.dataset.catFilter || "";

  // Derivar todos los gastos enriquecidos con datos del viaje
  const allExpenses = state.trips.flatMap((trip) =>
    (trip.expenses || []).map((e) => ({
      ...e,
      tripCode: trip.code,
      tripId: trip.id,
      customerName: trip.customerName,
      routeName: trip.routeName,
    })),
  );

  const filtered = allExpenses.filter((e) => {
    if (activeFilter && e.tripId !== activeFilter) return false;
    if (activeCatFilter && (e.category || "") !== activeCatFilter) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
  const pendingCount = filtered.filter(
    (e) => e.paymentStatus === "pending",
  ).length;
  const paidCount = filtered.filter((e) => e.paymentStatus === "paid").length;

  const categoryOptions = `
    <option value="">— Categoría —</option>
    <option value="Gasolina">Gasolina</option>
    <option value="Peajes">Peajes</option>
    <option value="Reparación">Reparación</option>
    <option value="Viáticos">Viáticos</option>
    <option value="Otro">Otro</option>
  `;

  view.innerHTML = `
    <div class="metric-grid" style="--cols:4">
      <article class="stat-card"><span>Total gastos</span><strong>${allExpenses.length}</strong></article>
      <article class="stat-card"><span>Monto filtrado</span><strong>${currency(totalAmount)}</strong></article>
      <article class="stat-card"><span>Pendientes de pago</span><strong>${pendingCount}</strong></article>
      <article class="stat-card"><span>Pagados</span><strong>${paidCount}</strong></article>
    </div>

    <div class="grid-2" style="margin-top:16px;">
      <section class="panel">
        <div class="panel-header">
          <div><h3>Registrar gasto</h3><p>Asocia un gasto a un viaje específico.</p></div>
        </div>
        <form id="te-create-form" class="form-grid">
          <select name="tripId" required>
            <option value="">— Viaje —</option>
            ${tripFormOptions(state.trips, (t) => `${t.code} — ${t.customerName}`)}
          </select>
          <select name="category" required>${categoryOptions}</select>
          <select name="stage">
            <option value="">— Etapa —</option>
            <option value="ida">Ida</option>
            <option value="vuelta">Vuelta</option>
          </select>
          <input name="paidBy" placeholder="Pagado por" />
          <input name="description" placeholder="Concepto / descripción" style="grid-column:1/-1" required />
          <input name="amount" type="number" min="0" step="0.01" placeholder="Monto" required />
          <input name="date" type="date" required />
          <input name="time" type="time" />
          <div class="action-row" style="grid-column:1/-1;">
            <button class="button" type="submit">Agregar gasto</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div><h3>Filtrar gastos</h3><p>Filtra por viaje o categoría.</p></div>
        </div>
        <div class="form-grid">
          <select id="te-filter-trip">
            <option value="">Todos los viajes</option>
            ${tripFormOptions(state.trips, (t) => `${t.code} — ${t.customerName}`)}
          </select>
          <select id="te-filter-cat">
            <option value="">Todas las categorías</option>
            <option value="Gasolina">Gasolina</option>
            <option value="Peajes">Peajes</option>
            <option value="Reparación">Reparación</option>
            <option value="Viáticos">Viáticos</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="kpi-strip" style="margin-top:12px;">
          <span class="kpi">Gastos totales: ${allExpenses.length}</span>
          <span class="kpi">Monto total: ${currency(allExpenses.reduce((s, e) => s + e.amount, 0))}</span>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px;">
      <div class="panel-header">
        <div><h3>Gastos registrados</h3><p>${filtered.length} registro(s) encontrado(s).</p></div>
        <div class="action-row">
          <button class="button secondary" id="te-export-excel">&#8595; Excel</button>
          <button class="button secondary" id="te-export-pdf">&#8595; PDF</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Viaje</th>
              <th>Cliente / Ruta</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Etapa</th>
              <th>Categoría</th>
              <th>Concepto</th>
              <th>Pagado por</th>
              <th>Monto</th>
              <th>Estado</th>
              <th class="action-cell"></th>
            </tr>
          </thead>
          <tbody>
            ${
              filtered.length === 0
                ? `<tr><td colspan="11" class="empty">Sin gastos registrados.</td></tr>`
                : filtered
                    .map(
                      (e) => `
                      <tr>
                        <td><strong>${e.tripCode}</strong></td>
                        <td><div class="inline-meta"><span>${e.customerName}</span><span>${e.routeName}</span></div></td>
                        <td>${e.date}</td>
                        <td>${e.time || "—"}</td>
                        <td>${e.stage || "—"}</td>
                        <td>${e.category || "—"}</td>
                        <td>${e.description || "—"}</td>
                        <td>${e.paidBy || "—"}</td>
                        <td>${currency(e.amount)}</td>
                        <td>${badge(e.paymentStatus)}</td>
                        <td class="action-cell">
                          <button class="button secondary btn-edit-expense"
                            data-id="${e.id}"
                            data-tripid="${e.tripId}"
                            data-description="${(e.description || "").replace(/"/g, "&quot;")}"
                            data-amount="${e.amount}"
                            data-date="${e.date}"
                            data-time="${e.time || ""}"
                            data-stage="${e.stage || ""}"
                            data-paidby="${(e.paidBy || "").replace(/"/g, "&quot;")}"
                            data-category="${e.category || ""}"
                            data-paymentstatus="${e.paymentStatus}">Editar</button>
                          <button class="btn-danger btn-delete-expense"
                            data-id="${e.id}"
                            data-tripid="${e.tripId}"
                            data-description="${(e.description || "").replace(/"/g, "&quot;")}">Eliminar</button>
                        </td>
                      </tr>`,
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal de edicion de gasto -->
    <div id="expense-edit-modal" class="modal-backdrop hidden">
      <div class="modal-box" style="max-width:600px;">
        <div class="panel-header"><div><h3>Editar gasto</h3></div></div>
        <form id="expense-edit-form" class="form-grid">
          <input type="hidden" name="id" />
          <input type="hidden" name="tripId" />
          <select name="category" required>${categoryOptions}</select>
          <select name="stage">
            <option value="">— Etapa —</option>
            <option value="ida">Ida</option>
            <option value="vuelta">Vuelta</option>
          </select>
          <input name="paidBy" placeholder="Pagado por" />
          <select name="paymentStatus">
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
          </select>
          <input name="description" placeholder="Concepto / descripción" style="grid-column:1/-1" required />
          <input name="amount" type="number" min="0" step="0.01" placeholder="Monto" required />
          <input name="date" type="date" required />
          <input name="time" type="time" />
          <div class="action-row" style="grid-column:1/-1;">
            <button class="button" type="submit">Guardar cambios</button>
            <button type="button" class="button secondary" id="expense-edit-cancel">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Restaurar valores de filtros
  view.querySelector("#te-filter-trip").value = activeFilter;
  view.querySelector("#te-filter-cat").value = activeCatFilter;

  // Exportar Excel
  view.querySelector("#te-export-excel").addEventListener("click", () => {
    exportExpensesToExcel(filtered);
  });

  // Exportar PDF
  view.querySelector("#te-export-pdf").addEventListener("click", () => {
    exportExpensesToPDF(filtered);
  });

  // Filtros
  view.querySelector("#te-filter-trip").addEventListener("change", (e) => {
    view.dataset.tripFilter = e.target.value;
    renderTripExpenses();
  });
  view.querySelector("#te-filter-cat").addEventListener("change", (e) => {
    view.dataset.catFilter = e.target.value;
    renderTripExpenses();
  });

  // Crear gasto
  view
    .querySelector("#te-create-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const btn = form.querySelector("button[type=submit]");
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Guardando...";
      const payload = formDataToObject(form);
      const { tripId, ...body } = payload;
      body.amount = Number(body.amount);
      try {
        await api(`/api/trips/${tripId}/expenses`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        form.reset();
        await rerender();
      } catch (err) {
        alert(`Error al guardar: ${err.message}`);
        btn.disabled = false;
        btn.textContent = original;
      }
    });

  // Eliminar gasto
  view.querySelectorAll(".btn-delete-expense").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { id, tripid, description } = btn.dataset;
      if (
        !confirm(
          `¿Eliminar el gasto "${description}"? Esta acción no se puede deshacer.`,
        )
      )
        return;
      await api(`/api/trips/${tripid}/expenses/${id}`, { method: "DELETE" });
      await rerender();
    });
  });

  // Abrir modal de edición
  const expenseEditModal = view.querySelector("#expense-edit-modal");
  const expenseEditForm = view.querySelector("#expense-edit-form");

  view.querySelectorAll(".btn-edit-expense").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset;
      expenseEditForm.id.value = d.id;
      expenseEditForm.tripId.value = d.tripid;
      expenseEditForm.category.value = d.category;
      expenseEditForm.stage.value = d.stage;
      expenseEditForm.paidBy.value = d.paidby;
      expenseEditForm.paymentStatus.value = d.paymentstatus;
      expenseEditForm.description.value = d.description;
      expenseEditForm.amount.value = d.amount;
      expenseEditForm.date.value = d.date;
      expenseEditForm.time.value = d.time;
      expenseEditModal.classList.remove("hidden");
    });
  });

  view.querySelector("#expense-edit-cancel")?.addEventListener("click", () => {
    expenseEditModal.classList.add("hidden");
  });

  expenseEditModal?.addEventListener("click", (e) => {
    if (e.target === expenseEditModal) expenseEditModal.classList.add("hidden");
  });

  expenseEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = expenseEditForm.querySelector("button[type=submit]");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const payload = formDataToObject(expenseEditForm);
    const { id, tripId, ...body } = payload;
    body.amount = Number(body.amount);
    try {
      await api(`/api/trips/${tripId}/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      expenseEditModal.classList.add("hidden");
      await rerender();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

function exportExpensesToExcel(rows) {
  if (rows.length === 0) {
    alert("No hay gastos para exportar con los filtros actuales.");
    return;
  }

  const headers = [
    "Viaje",
    "Cliente",
    "Ruta",
    "Fecha",
    "Hora",
    "Etapa",
    "Categoría",
    "Concepto",
    "Pagado por",
    "Monto (BOB)",
    "Estado pago",
  ];

  const xmlRows = rows
    .map((e) => {
      const cells = [
        e.tripCode,
        e.customerName,
        e.routeName,
        e.date,
        e.time || "",
        e.stage || "",
        e.category || "",
        e.description || "",
        e.paidBy || "",
        e.amount,
        e.paymentStatus === "paid" ? "Pagado" : "Pendiente",
      ];
      return `<Row>${cells
        .map((v, i) => {
          const isNum = i === 9;
          return isNum
            ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
            : `<Cell><Data ss:Type="String">${String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>`;
        })
        .join("")}</Row>`;
    })
    .join("\n");

  const totalRow = `<Row>${headers
    .map((_, i) => {
      if (i === 9) {
        const total = rows.reduce((s, e) => s + e.amount, 0);
        return `<Cell ss:StyleID="bold"><Data ss:Type="Number">${total}</Data></Cell>`;
      }
      if (i === 0)
        return `<Cell ss:StyleID="bold"><Data ss:Type="String">TOTAL</Data></Cell>`;
      return `<Cell><Data ss:Type="String"></Data></Cell>`;
    })
    .join("")}</Row>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#2D5016" ss:Pattern="Solid"/>
      <Font ss:Color="#FFFFFF" ss:Bold="1"/>
    </Style>
    <Style ss:ID="bold"><Font ss:Bold="1"/></Style>
  </Styles>
  <Worksheet ss:Name="Gastos por viaje">
    <Table>
      <Row>${headers
        .map(
          (h) =>
            `<Cell ss:StyleID="header"><Data ss:Type="String">${h}</Data></Cell>`,
        )
        .join("")}</Row>
${xmlRows}
${totalRow}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gastos_por_viaje_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExpensesToPDF(rows) {
  if (rows.length === 0) {
    alert("No hay gastos para exportar con los filtros actuales.");
    return;
  }

  const total = rows.reduce((s, e) => s + e.amount, 0);
  const companyName =
    state.bootstrap?.settings?.companyName || "TransLog Control Financiero";
  const now = new Date().toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const tableRows = rows
    .map(
      (e) => `
      <tr>
        <td>${e.tripCode}</td>
        <td>${e.customerName}</td>
        <td>${e.routeName}</td>
        <td>${e.date}</td>
        <td>${e.time || "—"}</td>
        <td>${e.stage || "—"}</td>
        <td>${e.category || "—"}</td>
        <td>${e.description || "—"}</td>
        <td>${e.paidBy || "—"}</td>
        <td class="num">${currency(e.amount)}</td>
        <td>${e.paymentStatus === "paid" ? "Pagado" : "Pendiente"}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Gastos por viaje — ${companyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
    header { margin-bottom: 18px; }
    header h1 { font-size: 16px; color: #2D5016; }
    header p  { font-size: 11px; color: #555; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #2D5016; color: #fff; text-align: left; padding: 5px 6px; font-size: 10px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    td.num, th.num { text-align: right; }
    tfoot td { font-weight: bold; border-top: 2px solid #2D5016; background: #f0f4ec; }
    @media print {
      body { padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${companyName} — Gastos por viaje</h1>
    <p>Generado el ${now} &nbsp;|&nbsp; ${rows.length} registro(s)</p>
  </header>
  <table>
    <thead>
      <tr>
        <th>Viaje</th><th>Cliente</th><th>Ruta</th><th>Fecha</th><th>Hora</th>
        <th>Etapa</th><th>Categoría</th><th>Concepto</th><th>Pagado por</th>
        <th class="num">Monto (BOB)</th><th>Estado</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="9">Total</td>
        <td class="num">${currency(total)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1100,height=700");
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
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
        ${state.auditLogs
          .map(
            (item) => `
          <div class="list-item">
            <strong>${item.action}</strong>
            <div class="inline-meta">
              <span>${item.entityType} / ${item.entityId}</span>
              <span>${item.performedAt}</span>
              <span>${item.notes || "Sin notas"}</span>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

async function refreshMasters() {
  const [customers, routes, vehicles, drivers] = await Promise.all([
    api("/api/masters/customers"),
    api("/api/masters/routes"),
    api("/api/masters/vehicles"),
    api("/api/masters/drivers"),
  ]);
  state.masters.customers = customers;
  state.masters.routes = routes;
  state.masters.vehicles = vehicles;
  state.masters.drivers = drivers;
}

async function refreshData() {
  const [
    bootstrap,
    dashboard,
    trips,
    receivables,
    payables,
    cash,
    reports,
    auditLogs,
  ] = await Promise.all([
    api("/api/bootstrap"),
    api("/api/dashboard"),
    api("/api/trips"),
    api("/api/receivables"),
    api("/api/payables"),
    api("/api/cash-movements"),
    api("/api/reports/profitability"),
    api("/api/audit-logs"),
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
  await Promise.all([refreshData(), refreshMasters()]);
  renderUserCard();
  renderDashboard();
  renderTrips();
  renderTripExpenses();
  renderReceivables();
  renderPayables();
  renderCash();
  renderReports();
  renderAudit();
  renderMasters();
}

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function onTripSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = formDataToObject(form);
  payload.expectedRevenue = Number(payload.expectedRevenue);
  payload.advanceAmount = Number(payload.advanceAmount || 0);
  payload.totalRevenue = Number(payload.totalRevenue || 0);
  payload.expectedCost = Number(payload.expectedCost || 0);
  payload.totalCostInput = Number(payload.totalCostInput || 0);
  await api("/api/trips", { method: "POST", body: JSON.stringify(payload) });
  form.reset();
  await rerender();
}

async function onExpenseSubmit(event) {
  event.preventDefault();
  const payload = formDataToObject(event.currentTarget);
  const { tripId, ...body } = payload;
  body.amount = Number(body.amount);
  await api(`/api/trips/${tripId}/expenses`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  event.currentTarget.reset();
  await rerender();
}

async function onReceivablePaymentSubmit(event) {
  event.preventDefault();
  const payload = formDataToObject(event.currentTarget);
  const { receivableId, ...body } = payload;
  body.amount = Number(body.amount);
  await api(`/api/receivables/${receivableId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  event.currentTarget.reset();
  await rerender();
}

async function onPayablePaymentSubmit(event) {
  event.preventDefault();
  const payload = formDataToObject(event.currentTarget);
  const { payableId, ...body } = payload;
  body.amount = Number(body.amount);
  await api(`/api/payables/${payableId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
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
      document
        .querySelectorAll(".view")
        .forEach((view) => view.classList.remove("active"));
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
