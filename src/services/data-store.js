import { db } from "../database/db.js";

function calculateCollectionStatus(total, paid) {
  if (paid <= 0) return "pending";
  if (paid >= total) return "paid";
  return "partial";
}

// ─── Row mappers (snake_case DB → camelCase JS) ───────────────────────────────

function tripFromRow(row) {
  return {
    id: row.id,
    code: row.code,
    customerId: row.customer_id,
    routeId: row.route_id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    serviceDate: row.service_date,
    departureTime: row.departure_time || "",
    returnDate: row.return_date || "",
    returnTime: row.return_time || "",
    expectedRevenue: row.expected_revenue,
    totalRevenue: row.total_revenue || 0,
    expectedCost: row.expected_cost || 0,
    totalCostInput: row.total_cost || 0,
    status: row.status,
    notes: row.notes,
    advanceAmount: row.advance_amount,
  };
}

function expenseFromRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    supplierId: row.supplier_id,
    categoryId: row.category_id,
    category: row.category || "",
    description: row.description || "",
    amount: row.amount,
    date: row.date,
    time: row.time || "",
    stage: row.stage || "",
    paidBy: row.paid_by || "",
    paymentStatus: row.payment_status,
  };
}

function receivableFromRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    customerId: row.customer_id,
    invoiceNumber: row.invoice_number,
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    totalAmount: row.total_amount,
    status: row.status,
  };
}

function payableFromRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    supplierId: row.supplier_id,
    dueDate: row.due_date,
    totalAmount: row.total_amount,
    status: row.status,
    description: row.description,
  };
}

function cashMovementFromRow(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    date: row.date,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
  };
}

class DataStore {
  bootstrap() {
    const users = db.prepare("SELECT * FROM users").all();
    const roles = db.prepare("SELECT * FROM roles").all();
    const permissions = db
      .prepare("SELECT name FROM permissions")
      .all()
      .map((p) => p.name);

    const settingsRows = db.prepare("SELECT key, value FROM settings").all();
    const settings = Object.fromEntries(
      settingsRows.map(({ key, value }) => {
        try {
          return [key, JSON.parse(value)];
        } catch {
          return [key, value];
        }
      }),
    );

    const customers = db
      .prepare(
        "SELECT id, name, credit_days as creditDays, contact FROM customers",
      )
      .all();
    const suppliers = db.prepare("SELECT * FROM suppliers").all();
    const vehicles = db
      .prepare(
        "SELECT id, plate, model, capacity_tons as capacityTons, status FROM vehicles",
      )
      .all();
    const drivers = db
      .prepare(
        "SELECT id, name, license_type as licenseType, status FROM drivers",
      )
      .all();
    const routes = db.prepare("SELECT * FROM routes").all();
    const expenseCategories = db
      .prepare("SELECT * FROM expense_categories")
      .all();
    const incomeCategories = db
      .prepare("SELECT * FROM income_categories")
      .all();

    return {
      currentUser: users[0],
      roles,
      permissions,
      settings,
      masters: {
        customers,
        suppliers,
        vehicles,
        drivers,
        routes,
        expenseCategories,
        incomeCategories,
        cashAccounts: this.getCashAccounts(),
      },
    };
  }

  listTrips(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    if (filters.customerId) {
      conditions.push("customer_id = ?");
      params.push(filters.customerId);
    }
    if (filters.vehicleId) {
      conditions.push("vehicle_id = ?");
      params.push(filters.vehicleId);
    }

    const where =
      conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
    const rows = db
      .prepare(`SELECT * FROM trips${where} ORDER BY service_date DESC`)
      .all(...params);
    return rows.map((row) => this.enrichTrip(tripFromRow(row)));
  }

  getTripById(id) {
    const row = db.prepare("SELECT * FROM trips WHERE id = ?").get(id);
    return row ? this.enrichTrip(tripFromRow(row)) : null;
  }

  createTrip(input) {
    const count = db.prepare("SELECT COUNT(*) as count FROM trips").get().count;
    const nextIndex = count + 1;
    const id = `trip-${nextIndex + 10}`;
    const trip = {
      id,
      code: input.code || `TRP-2026-${String(nextIndex + 10).padStart(3, "0")}`,
      customerId: input.customerId,
      routeId: input.routeId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      serviceDate: input.serviceDate,
      departureTime: input.departureTime || "",
      returnDate: input.returnDate || "",
      returnTime: input.returnTime || "",
      expectedRevenue: Number(input.expectedRevenue || 0),
      totalRevenue: Number(input.totalRevenue || 0),
      expectedCost: Number(input.expectedCost || 0),
      totalCostInput: Number(input.totalCostInput || 0),
      status: input.status || "planned",
      notes: input.notes || "",
      advanceAmount: Number(input.advanceAmount || 0),
    };

    db.prepare(
      `INSERT INTO trips
        (id, code, customer_id, route_id, vehicle_id, driver_id, service_date,
         departure_time, return_date, return_time,
         expected_revenue, total_revenue, expected_cost, total_cost, status, notes, advance_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      trip.id,
      trip.code,
      trip.customerId,
      trip.routeId,
      trip.vehicleId,
      trip.driverId,
      trip.serviceDate,
      trip.departureTime,
      trip.returnDate,
      trip.returnTime,
      trip.expectedRevenue,
      trip.totalRevenue,
      trip.expectedCost,
      trip.totalCostInput,
      trip.status,
      trip.notes,
      trip.advanceAmount,
    );

    this.logAction("trip.created", "trip", id, `Viaje ${trip.code} creado`);
    return this.enrichTrip(trip);
  }

  updateTrip(id, input) {
    const row = db.prepare("SELECT * FROM trips WHERE id = ?").get(id);
    if (!row) return null;
    db.prepare(
      `UPDATE trips SET
        customer_id = ?, route_id = ?, vehicle_id = ?, driver_id = ?,
        service_date = ?, departure_time = ?, return_date = ?, return_time = ?,
        expected_revenue = ?, total_revenue = ?, expected_cost = ?, total_cost = ?,
        status = ?, notes = ?, advance_amount = ?
       WHERE id = ?`,
    ).run(
      input.customerId,
      input.routeId,
      input.vehicleId,
      input.driverId,
      input.serviceDate,
      input.departureTime || "",
      input.returnDate || "",
      input.returnTime || "",
      Number(input.expectedRevenue || 0),
      Number(input.totalRevenue || 0),
      Number(input.expectedCost || 0),
      Number(input.totalCostInput || 0),
      Number(input.totalCostInput || 0),
      input.status || "planned",
      input.notes || "",
      Number(input.advanceAmount || 0),
      id,
    );
    this.logAction("trip.updated", "trip", id, `Viaje ${row.code} actualizado`);
    return this.getTripById(id);
  }

  addTripExpense(tripId, input) {
    const tripRow = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId);
    if (!tripRow) return null;

    // Mapear categoria a IDs existentes
    const categoryMap = {
      gasolina: { supplierId: "sup-1", categoryId: "exp-1" },
      peajes: { supplierId: "sup-2", categoryId: "exp-2" },
      reparacion: { supplierId: "sup-3", categoryId: "exp-4" },
    };
    const catKey = (input.category || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const mapped = categoryMap[catKey] || {
      supplierId: "sup-1",
      categoryId: "exp-1",
    };

    const maxRow = db
      .prepare(
        `SELECT MAX(CAST(REPLACE(id, 'trx-exp-', '') AS INTEGER)) as maxN FROM trip_expenses WHERE id LIKE 'trx-exp-%'`,
      )
      .get();
    const n = (maxRow.maxN || 0) + 1;
    const id = `trx-exp-${n}`;

    const expense = {
      id,
      tripId,
      supplierId: input.supplierId || mapped.supplierId,
      categoryId: input.categoryId || mapped.categoryId,
      category: input.category || "",
      description: input.description || input.concept || "",
      amount: Number(input.amount || 0),
      date: input.date,
      time: input.time || "",
      stage: input.stage || "",
      paidBy: input.paidBy || "",
      paymentStatus: input.paymentStatus || "pending",
    };

    db.prepare(
      `INSERT INTO trip_expenses
        (id, trip_id, supplier_id, category_id, description, amount, date, payment_status,
         stage, paid_by, time, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      expense.id,
      expense.tripId,
      expense.supplierId,
      expense.categoryId,
      expense.description,
      expense.amount,
      expense.date,
      expense.paymentStatus,
      expense.stage,
      expense.paidBy,
      expense.time,
      expense.category,
    );

    if (expense.paymentStatus === "paid") {
      const defaultAccount = db
        .prepare("SELECT id FROM cash_accounts LIMIT 1")
        .get();
      this.registerCashMovement({
        accountId: input.cashAccountId || defaultAccount.id,
        type: "out",
        category: "Gasto de viaje",
        amount: expense.amount,
        date: expense.date,
        referenceType: "trip_expense",
        referenceId: expense.id,
      });
    } else {
      this.createPayableFromExpense(expense);
    }

    this.logAction("trip.expense_added", "trip", tripId, expense.description);
    return this.enrichTrip(tripFromRow(tripRow));
  }

  getTrip(id) {
    return this.getTripById(id);
  }

  updateTripExpense(tripId, expenseId, input) {
    const tripRow = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId);
    if (!tripRow) return null;
    const expRow = db
      .prepare("SELECT * FROM trip_expenses WHERE id = ? AND trip_id = ?")
      .get(expenseId, tripId);
    if (!expRow) return null;

    db.prepare(
      `UPDATE trip_expenses
         SET description = ?, amount = ?, date = ?, time = ?,
             stage = ?, paid_by = ?, payment_status = ?, category = ?
       WHERE id = ? AND trip_id = ?`,
    ).run(
      input.description !== undefined ? input.description : expRow.description,
      Number(input.amount !== undefined ? input.amount : expRow.amount),
      input.date || expRow.date,
      input.time !== undefined ? input.time : expRow.time || "",
      input.stage !== undefined ? input.stage : expRow.stage || "",
      input.paidBy !== undefined ? input.paidBy : expRow.paid_by || "",
      input.paymentStatus || expRow.payment_status,
      input.category !== undefined ? input.category : expRow.category || "",
      expenseId,
      tripId,
    );

    this.logAction(
      "trip.expense_updated",
      "trip",
      tripId,
      `Gasto ${expenseId} actualizado`,
    );
    const updated = db
      .prepare("SELECT * FROM trip_expenses WHERE id = ?")
      .get(expenseId);
    return expenseFromRow(updated);
  }

  deleteTripExpense(tripId, expenseId) {
    const expRow = db
      .prepare("SELECT * FROM trip_expenses WHERE id = ? AND trip_id = ?")
      .get(expenseId, tripId);
    if (!expRow) return false;
    db.prepare("DELETE FROM trip_expenses WHERE id = ? AND trip_id = ?").run(
      expenseId,
      tripId,
    );
    this.logAction(
      "trip.expense_deleted",
      "trip",
      tripId,
      `Gasto ${expenseId} eliminado`,
    );
    return true;
  }

  listReceivables() {
    const rows = db
      .prepare("SELECT * FROM receivables ORDER BY issued_at DESC")
      .all();
    return rows.map((row) => this.enrichReceivable(receivableFromRow(row)));
  }

  addReceivablePayment(receivableId, input) {
    const recRow = db
      .prepare("SELECT * FROM receivables WHERE id = ?")
      .get(receivableId);
    if (!recRow) return null;

    const count = db
      .prepare("SELECT COUNT(*) as count FROM receivable_payments")
      .get().count;
    const payment = {
      id: `rec-pay-${count + 10}`,
      receivableId,
      cashAccountId: input.cashAccountId,
      amount: Number(input.amount || 0),
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference || "",
    };

    db.prepare(
      `
      INSERT INTO receivable_payments (id, receivable_id, cash_account_id, amount, method, paid_at, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      payment.id,
      payment.receivableId,
      payment.cashAccountId,
      payment.amount,
      payment.method,
      payment.paidAt,
      payment.reference,
    );

    const paid = this.getReceivablePaid(receivableId);
    const newStatus = calculateCollectionStatus(recRow.total_amount, paid);
    db.prepare("UPDATE receivables SET status = ? WHERE id = ?").run(
      newStatus,
      receivableId,
    );

    this.registerCashMovement({
      accountId: payment.cashAccountId,
      type: "in",
      category: "Cobro cliente",
      amount: payment.amount,
      date: payment.paidAt,
      referenceType: "receivable_payment",
      referenceId: payment.id,
    });

    this.logAction(
      "receivable.payment_added",
      "receivable",
      receivableId,
      payment.reference,
    );
    const updatedRow = db
      .prepare("SELECT * FROM receivables WHERE id = ?")
      .get(receivableId);
    return this.enrichReceivable(receivableFromRow(updatedRow));
  }

  listPayables() {
    const rows = db
      .prepare("SELECT * FROM payables ORDER BY due_date ASC")
      .all();
    return rows.map((row) => this.enrichPayable(payableFromRow(row)));
  }

  addPayablePayment(payableId, input) {
    const payRow = db
      .prepare("SELECT * FROM payables WHERE id = ?")
      .get(payableId);
    if (!payRow) return null;

    const count = db
      .prepare("SELECT COUNT(*) as count FROM payable_payments")
      .get().count;
    const payment = {
      id: `pay-pay-${count + 10}`,
      payableId,
      cashAccountId: input.cashAccountId,
      amount: Number(input.amount || 0),
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference || "",
    };

    db.prepare(
      `
      INSERT INTO payable_payments (id, payable_id, cash_account_id, amount, method, paid_at, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      payment.id,
      payment.payableId,
      payment.cashAccountId,
      payment.amount,
      payment.method,
      payment.paidAt,
      payment.reference,
    );

    const paid = this.getPayablePaid(payableId);
    const newStatus = calculateCollectionStatus(payRow.total_amount, paid);
    db.prepare("UPDATE payables SET status = ? WHERE id = ?").run(
      newStatus,
      payableId,
    );

    this.registerCashMovement({
      accountId: payment.cashAccountId,
      type: "out",
      category: "Pago proveedor",
      amount: payment.amount,
      date: payment.paidAt,
      referenceType: "payable_payment",
      referenceId: payment.id,
    });

    this.logAction(
      "payable.payment_added",
      "payable",
      payableId,
      payment.reference,
    );
    const updatedRow = db
      .prepare("SELECT * FROM payables WHERE id = ?")
      .get(payableId);
    return this.enrichPayable(payableFromRow(updatedRow));
  }

  getCashAccounts() {
    const rows = db.prepare("SELECT * FROM cash_accounts").all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: this.computeAccountBalance(row.id),
    }));
  }

  listCashMovements() {
    const rows = db
      .prepare(
        `
      SELECT cm.*, ca.name as account_name
      FROM cash_movements cm
      LEFT JOIN cash_accounts ca ON cm.account_id = ca.id
      ORDER BY cm.date DESC
    `,
      )
      .all();
    return rows.map((row) => ({
      ...cashMovementFromRow(row),
      accountName: row.account_name || "Cuenta desconocida",
    }));
  }

  listAuditLogs() {
    return db
      .prepare("SELECT * FROM audit_logs ORDER BY performed_at DESC")
      .all()
      .map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        performedBy: row.performed_by,
        performedAt: row.performed_at,
        notes: row.notes,
      }));
  }

  dashboard() {
    const receivables = this.listReceivables();
    const payables = this.listPayables();
    const trips = this.listTrips();
    const cashAccounts = this.getCashAccounts();

    const totalRevenue = trips.reduce((sum, t) => sum + t.expectedRevenue, 0);
    const totalCosts = trips.reduce((sum, t) => sum + t.totalCost, 0);
    const receivableBalance = receivables.reduce(
      (sum, r) => sum + r.outstandingAmount,
      0,
    );
    const payableBalance = payables.reduce(
      (sum, p) => sum + p.outstandingAmount,
      0,
    );
    const projectedCash =
      cashAccounts.reduce((sum, a) => sum + a.balance, 0) +
      receivableBalance -
      payableBalance;

    const tripStatusBreakdown = [
      "planned",
      "in_progress",
      "liquidated",
      "invoiced",
      "paid",
    ].map((status) => ({
      status,
      count: trips.filter((t) => t.status === status).length,
    }));

    const customers = db.prepare("SELECT id, name FROM customers").all();
    const customerRanking = customers
      .map((customer) => {
        const customerTrips = trips.filter((t) => t.customerId === customer.id);
        const profit = customerTrips.reduce((sum, t) => sum + t.profit, 0);
        return {
          customerId: customer.id,
          customerName: customer.name,
          trips: customerTrips.length,
          profit,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    return {
      summary: {
        totalRevenue,
        totalCosts,
        grossProfit: totalRevenue - totalCosts,
        receivableBalance,
        payableBalance,
        projectedCash,
      },
      tripStatusBreakdown,
      customerRanking,
      accounts: cashAccounts,
    };
  }

  profitabilityReport() {
    return this.listTrips()
      .map((trip) => ({
        tripId: trip.id,
        tripCode: trip.code,
        customerName: trip.customerName,
        routeName: trip.routeName,
        expectedRevenue: trip.expectedRevenue,
        totalCost: trip.totalCost,
        profit: trip.profit,
        margin:
          trip.expectedRevenue > 0
            ? Number(((trip.profit / trip.expectedRevenue) * 100).toFixed(1))
            : 0,
        status: trip.status,
      }))
      .sort((a, b) => b.profit - a.profit);
  }

  enrichTrip(trip) {
    const customer = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(trip.customerId);
    const route = db
      .prepare("SELECT * FROM routes WHERE id = ?")
      .get(trip.routeId);
    const vehicle = db
      .prepare("SELECT * FROM vehicles WHERE id = ?")
      .get(trip.vehicleId);
    const driver = db
      .prepare("SELECT * FROM drivers WHERE id = ?")
      .get(trip.driverId);
    const expenses = db
      .prepare("SELECT * FROM trip_expenses WHERE trip_id = ?")
      .all(trip.id)
      .map(expenseFromRow);
    const receivableRow = db
      .prepare("SELECT id FROM receivables WHERE trip_id = ?")
      .get(trip.id);
    const totalCost =
      expenses.reduce((sum, e) => sum + e.amount, 0) +
      Number(trip.advanceAmount || 0);
    const profit = Number(trip.expectedRevenue || 0) - totalCost;

    return {
      ...trip,
      customerName: customer ? customer.name : "Cliente desconocido",
      routeName: route
        ? `${route.origin} -> ${route.destination}`
        : "Ruta desconocida",
      vehicleLabel: vehicle
        ? `${vehicle.plate} / ${vehicle.model}`
        : "Unidad desconocida",
      driverName: driver ? driver.name : "Conductor desconocido",
      expenses,
      receivableId: receivableRow ? receivableRow.id : null,
      totalCost,
      profit,
    };
  }

  enrichReceivable(receivable) {
    const customer = db
      .prepare("SELECT name FROM customers WHERE id = ?")
      .get(receivable.customerId);
    const trip = db
      .prepare("SELECT code FROM trips WHERE id = ?")
      .get(receivable.tripId);
    const paidAmount = this.getReceivablePaid(receivable.id);
    return {
      ...receivable,
      customerName: customer ? customer.name : "Cliente desconocido",
      tripCode: trip ? trip.code : "Sin viaje",
      paidAmount,
      outstandingAmount: Math.max(receivable.totalAmount - paidAmount, 0),
    };
  }

  enrichPayable(payable) {
    const supplier = db
      .prepare("SELECT name FROM suppliers WHERE id = ?")
      .get(payable.supplierId);
    const trip = payable.tripId
      ? db.prepare("SELECT code FROM trips WHERE id = ?").get(payable.tripId)
      : null;
    const paidAmount = this.getPayablePaid(payable.id);
    return {
      ...payable,
      supplierName: supplier ? supplier.name : "Proveedor desconocido",
      tripCode: trip ? trip.code : "Administrativo",
      paidAmount,
      outstandingAmount: Math.max(payable.totalAmount - paidAmount, 0),
    };
  }

  getReceivablePaid(receivableId) {
    return db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM receivable_payments WHERE receivable_id = ?",
      )
      .get(receivableId).total;
  }

  getPayablePaid(payableId) {
    return db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payable_payments WHERE payable_id = ?",
      )
      .get(payableId).total;
  }

  createPayableFromExpense(expense) {
    const count = db
      .prepare("SELECT COUNT(*) as count FROM payables")
      .get().count;
    db.prepare(
      `
      INSERT INTO payables (id, trip_id, supplier_id, due_date, total_amount, status, description)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `,
    ).run(
      `pay-${count + 10}`,
      expense.tripId,
      expense.supplierId,
      expense.date,
      expense.amount,
      expense.description,
    );
  }

  registerCashMovement(movement) {
    const count = db
      .prepare("SELECT COUNT(*) as count FROM cash_movements")
      .get().count;
    const id = `mov-${count + 10}`;
    db.prepare(
      `
      INSERT INTO cash_movements (id, account_id, type, category, amount, date, reference_type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      movement.accountId,
      movement.type,
      movement.category,
      movement.amount,
      movement.date,
      movement.referenceType,
      movement.referenceId,
    );
    return { id, ...movement };
  }

  computeAccountBalance(accountId) {
    const account = db
      .prepare("SELECT initial_balance FROM cash_accounts WHERE id = ?")
      .get(accountId);
    const base = account ? account.initial_balance : 0;
    const { net } = db
      .prepare(
        `
      SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) as net
      FROM cash_movements WHERE account_id = ?
    `,
      )
      .get(accountId);
    return base + net;
  }

  logAction(action, entityType, entityId, notes = "") {
    const count = db
      .prepare("SELECT COUNT(*) as count FROM audit_logs")
      .get().count;
    const currentUser = db.prepare("SELECT id FROM users LIMIT 1").get();
    db.prepare(
      `
      INSERT INTO audit_logs (id, action, entity_type, entity_id, performed_by, performed_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      `audit-${count + 10}`,
      action,
      entityType,
      entityId,
      currentUser ? currentUser.id : "system",
      new Date().toISOString(),
      notes,
    );
  }

  // ─── Maestros: Clientes ───────────────────────────────────────────────────

  listCustomers() {
    return db
      .prepare(
        `SELECT id, name, credit_days as creditDays, contact,
                contact_name as contactName, contact_phone as contactPhone,
                nit, business_name as businessName
         FROM customers ORDER BY name`,
      )
      .all();
  }

  createCustomer(input) {
    const row = db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(id, INSTR(id, '-') + 1) AS INTEGER)) as maxN FROM customers",
      )
      .get();
    const id = `cust-${(row.maxN || 0) + 1}`;
    db.prepare(
      `INSERT INTO customers
         (id, name, credit_days, contact, contact_name, contact_phone, nit, business_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.name,
      Number(input.creditDays || 0),
      input.contact || "",
      input.contactName || "",
      input.contactPhone || "",
      input.nit || "",
      input.businessName || "",
    );
    this.logAction("customer.created", "customer", id, input.name);
    return {
      id,
      name: input.name,
      creditDays: Number(input.creditDays || 0),
      contact: input.contact || "",
      contactName: input.contactName || "",
      contactPhone: input.contactPhone || "",
      nit: input.nit || "",
      businessName: input.businessName || "",
    };
  }

  updateCustomer(id, input) {
    const row = db.prepare("SELECT id FROM customers WHERE id = ?").get(id);
    if (!row) return null;
    db.prepare(
      `UPDATE customers
         SET name = ?, credit_days = ?, contact = ?,
             contact_name = ?, contact_phone = ?, nit = ?, business_name = ?
       WHERE id = ?`,
    ).run(
      input.name,
      Number(input.creditDays || 0),
      input.contact || "",
      input.contactName || "",
      input.contactPhone || "",
      input.nit || "",
      input.businessName || "",
      id,
    );
    this.logAction("customer.updated", "customer", id, input.name);
    return {
      id,
      name: input.name,
      creditDays: Number(input.creditDays || 0),
      contact: input.contact || "",
      contactName: input.contactName || "",
      contactPhone: input.contactPhone || "",
      nit: input.nit || "",
      businessName: input.businessName || "",
    };
  }

  deleteTrip(id) {
    const row = db.prepare("SELECT id, code FROM trips WHERE id = ?").get(id);
    if (!row) return false;
    // Eliminar pagos de cuentas por cobrar asociados al viaje
    db.prepare(
      `DELETE FROM receivable_payments WHERE receivable_id IN
      (SELECT id FROM receivables WHERE trip_id = ?)`,
    ).run(id);
    db.prepare("DELETE FROM receivables WHERE trip_id = ?").run(id);
    // Eliminar pagos de cuentas por pagar asociados al viaje
    db.prepare(
      `DELETE FROM payable_payments WHERE payable_id IN
      (SELECT id FROM payables WHERE trip_id = ?)`,
    ).run(id);
    db.prepare("DELETE FROM payables WHERE trip_id = ?").run(id);
    // Eliminar gastos del viaje
    db.prepare("DELETE FROM trip_expenses WHERE trip_id = ?").run(id);
    db.prepare("DELETE FROM trips WHERE id = ?").run(id);
    this.logAction("trip.deleted", "trip", id, `Viaje ${row.code} eliminado`);
    return true;
  }

  deleteCustomer(id) {
    const row = db.prepare("SELECT id FROM customers WHERE id = ?").get(id);
    if (!row) return false;
    db.prepare("DELETE FROM customers WHERE id = ?").run(id);
    this.logAction("customer.deleted", "customer", id, "");
    return true;
  }

  // ─── Maestros: Rutas ──────────────────────────────────────────────────────

  listRoutes() {
    return db
      .prepare(
        `SELECT id, origin, destination, kilometers,
                fuel_liters as fuelLiters, tolls
         FROM routes ORDER BY origin`,
      )
      .all();
  }

  createRoute(input) {
    const row = db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(id, INSTR(id, '-') + 1) AS INTEGER)) as maxN FROM routes",
      )
      .get();
    const id = `route-${(row.maxN || 0) + 1}`;
    db.prepare(
      `INSERT INTO routes (id, origin, destination, kilometers, fuel_liters, tolls)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.origin,
      input.destination,
      Number(input.kilometers || 0),
      Number(input.fuelLiters || 0),
      Number(input.tolls || 0),
    );
    this.logAction(
      "route.created",
      "route",
      id,
      `${input.origin} -> ${input.destination}`,
    );
    return {
      id,
      origin: input.origin,
      destination: input.destination,
      kilometers: Number(input.kilometers || 0),
      fuelLiters: Number(input.fuelLiters || 0),
      tolls: Number(input.tolls || 0),
    };
  }

  updateRoute(id, input) {
    const row = db.prepare("SELECT id FROM routes WHERE id = ?").get(id);
    if (!row) return null;
    db.prepare(
      `UPDATE routes
         SET origin = ?, destination = ?, kilometers = ?, fuel_liters = ?, tolls = ?
       WHERE id = ?`,
    ).run(
      input.origin,
      input.destination,
      Number(input.kilometers || 0),
      Number(input.fuelLiters || 0),
      Number(input.tolls || 0),
      id,
    );
    this.logAction(
      "route.updated",
      "route",
      id,
      `${input.origin} -> ${input.destination}`,
    );
    return {
      id,
      origin: input.origin,
      destination: input.destination,
      kilometers: Number(input.kilometers || 0),
      fuelLiters: Number(input.fuelLiters || 0),
      tolls: Number(input.tolls || 0),
    };
  }

  deleteRoute(id) {
    const row = db.prepare("SELECT id FROM routes WHERE id = ?").get(id);
    if (!row) return false;
    db.prepare("DELETE FROM routes WHERE id = ?").run(id);
    this.logAction("route.deleted", "route", id, "");
    return true;
  }

  // ─── Maestros: Vehículos ──────────────────────────────────────────────────

  listVehicles() {
    return db
      .prepare(
        `SELECT id, plate, model, color,
                capacity_tons as capacityTons, volume_m3 as volumeM3, status
         FROM vehicles ORDER BY plate`,
      )
      .all();
  }

  createVehicle(input) {
    const row = db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(id, INSTR(id, '-') + 1) AS INTEGER)) as maxN FROM vehicles",
      )
      .get();
    const id = `veh-${(row.maxN || 0) + 1}`;
    db.prepare(
      `INSERT INTO vehicles (id, plate, model, color, capacity_tons, volume_m3, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.plate,
      input.model,
      input.color || "",
      Number(input.capacityTons || 0),
      Number(input.volumeM3 || 0),
      input.status || "available",
    );
    this.logAction("vehicle.created", "vehicle", id, input.plate);
    return {
      id,
      plate: input.plate,
      model: input.model,
      color: input.color || "",
      capacityTons: Number(input.capacityTons || 0),
      volumeM3: Number(input.volumeM3 || 0),
      status: input.status || "available",
    };
  }

  updateVehicle(id, input) {
    const row = db.prepare("SELECT id FROM vehicles WHERE id = ?").get(id);
    if (!row) return null;
    db.prepare(
      `UPDATE vehicles
         SET plate = ?, model = ?, color = ?, capacity_tons = ?, volume_m3 = ?, status = ?
       WHERE id = ?`,
    ).run(
      input.plate,
      input.model,
      input.color || "",
      Number(input.capacityTons || 0),
      Number(input.volumeM3 || 0),
      input.status,
      id,
    );
    this.logAction("vehicle.updated", "vehicle", id, input.plate);
    return {
      id,
      plate: input.plate,
      model: input.model,
      color: input.color || "",
      capacityTons: Number(input.capacityTons || 0),
      volumeM3: Number(input.volumeM3 || 0),
      status: input.status,
    };
  }

  deleteVehicle(id) {
    const row = db.prepare("SELECT id FROM vehicles WHERE id = ?").get(id);
    if (!row) return false;
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    this.logAction("vehicle.deleted", "vehicle", id, "");
    return true;
  }

  // ─── Maestros: Choferes ───────────────────────────────────────────────────

  listDrivers() {
    return db
      .prepare(
        `SELECT id, name,
                first_name    as firstName,
                last_name     as lastName,
                identity_card as identityCard,
                license,
                status
         FROM drivers ORDER BY name`,
      )
      .all();
  }

  createDriver(input) {
    const row = db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(id, INSTR(id, '-') + 1) AS INTEGER)) as maxN FROM drivers",
      )
      .get();
    const id = `drv-${(row.maxN || 0) + 1}`;
    const firstName = input.firstName || "";
    const lastName = input.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || input.name || id;
    db.prepare(
      `INSERT INTO drivers (id, name, first_name, last_name, identity_card, license, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      name,
      firstName,
      lastName,
      input.identityCard || "",
      input.license || "",
      input.status || "active",
    );
    this.logAction("driver.created", "driver", id, name);
    return {
      id,
      name,
      firstName,
      lastName,
      identityCard: input.identityCard || "",
      license: input.license || "",
      status: input.status || "active",
    };
  }

  updateDriver(id, input) {
    const row = db.prepare("SELECT id FROM drivers WHERE id = ?").get(id);
    if (!row) return null;
    const firstName = input.firstName || "";
    const lastName = input.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || input.name || id;
    db.prepare(
      `UPDATE drivers
       SET name = ?, first_name = ?, last_name = ?, identity_card = ?, license = ?, status = ?
       WHERE id = ?`,
    ).run(
      name,
      firstName,
      lastName,
      input.identityCard || "",
      input.license || "",
      input.status || "active",
      id,
    );
    this.logAction("driver.updated", "driver", id, name);
    return {
      id,
      name,
      firstName,
      lastName,
      identityCard: input.identityCard || "",
      license: input.license || "",
      status: input.status || "active",
    };
  }

  deleteDriver(id) {
    const row = db.prepare("SELECT id FROM drivers WHERE id = ?").get(id);
    if (!row) return false;
    db.prepare("DELETE FROM drivers WHERE id = ?").run(id);
    this.logAction("driver.deleted", "driver", id, "");
    return true;
  }
}

export const dataStore = new DataStore();
