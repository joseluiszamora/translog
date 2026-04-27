import { seedData } from "../domain/seed-data.js";

function clone(value) {
  return structuredClone(value);
}

function calculateCollectionStatus(total, paid) {
  if (paid <= 0) {
    return "pending";
  }
  if (paid >= total) {
    return "paid";
  }
  return "partial";
}

class DataStore {
  constructor() {
    this.state = clone(seedData);
  }

  bootstrap() {
    return {
      currentUser: this.state.users[0],
      roles: this.state.roles,
      permissions: this.state.permissions,
      settings: this.state.settings,
      masters: {
        customers: this.state.customers,
        suppliers: this.state.suppliers,
        vehicles: this.state.vehicles,
        drivers: this.state.drivers,
        routes: this.state.routes,
        expenseCategories: this.state.expenseCategories,
        incomeCategories: this.state.incomeCategories,
        cashAccounts: this.getCashAccounts()
      }
    };
  }

  listTrips(filters = {}) {
    const withMetrics = this.state.trips.map((trip) => this.enrichTrip(trip));
    return withMetrics.filter((trip) => {
      if (filters.status && trip.status !== filters.status) {
        return false;
      }
      if (filters.customerId && trip.customerId !== filters.customerId) {
        return false;
      }
      if (filters.vehicleId && trip.vehicleId !== filters.vehicleId) {
        return false;
      }
      return true;
    });
  }

  getTripById(id) {
    const trip = this.state.trips.find((item) => item.id === id);
    return trip ? this.enrichTrip(trip) : null;
  }

  createTrip(input) {
    const nextIndex = this.state.trips.length + 1;
    const id = `trip-${nextIndex + 10}`;
    const trip = {
      id,
      code: input.code || `TRP-2026-${String(nextIndex + 10).padStart(3, "0")}`,
      customerId: input.customerId,
      routeId: input.routeId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      serviceDate: input.serviceDate,
      expectedRevenue: Number(input.expectedRevenue || 0),
      status: input.status || "planned",
      notes: input.notes || "",
      advanceAmount: Number(input.advanceAmount || 0)
    };

    this.state.trips.unshift(trip);
    this.logAction("trip.created", "trip", id, `Viaje ${trip.code} creado`);
    return this.enrichTrip(trip);
  }

  addTripExpense(tripId, input) {
    const trip = this.state.trips.find((item) => item.id === tripId);
    if (!trip) {
      return null;
    }

    const id = `trx-exp-${this.state.tripExpenses.length + 10}`;
    const expense = {
      id,
      tripId,
      supplierId: input.supplierId,
      categoryId: input.categoryId,
      description: input.description,
      amount: Number(input.amount || 0),
      date: input.date,
      paymentStatus: input.paymentStatus || "pending"
    };

    this.state.tripExpenses.unshift(expense);
    if (expense.paymentStatus === "paid") {
      this.registerCashMovement({
        accountId: input.cashAccountId || this.state.cashAccounts[0].id,
        type: "out",
        category: "Gasto de viaje",
        amount: expense.amount,
        date: expense.date,
        referenceType: "trip_expense",
        referenceId: expense.id
      });
    } else {
      this.createPayableFromExpense(expense);
    }

    this.logAction("trip.expense_added", "trip", tripId, expense.description);
    return this.enrichTrip(trip);
  }

  listReceivables() {
    return this.state.receivables.map((item) => this.enrichReceivable(item));
  }

  addReceivablePayment(receivableId, input) {
    const receivable = this.state.receivables.find((item) => item.id === receivableId);
    if (!receivable) {
      return null;
    }

    const payment = {
      id: `rec-pay-${this.state.receivablePayments.length + 10}`,
      receivableId,
      cashAccountId: input.cashAccountId,
      amount: Number(input.amount || 0),
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference || ""
    };

    this.state.receivablePayments.unshift(payment);
    const paid = this.getReceivablePaid(receivableId);
    receivable.status = calculateCollectionStatus(receivable.totalAmount, paid);
    this.registerCashMovement({
      accountId: payment.cashAccountId,
      type: "in",
      category: "Cobro cliente",
      amount: payment.amount,
      date: payment.paidAt,
      referenceType: "receivable_payment",
      referenceId: payment.id
    });
    this.logAction("receivable.payment_added", "receivable", receivableId, payment.reference);
    return this.enrichReceivable(receivable);
  }

  listPayables() {
    return this.state.payables.map((item) => this.enrichPayable(item));
  }

  addPayablePayment(payableId, input) {
    const payable = this.state.payables.find((item) => item.id === payableId);
    if (!payable) {
      return null;
    }

    const payment = {
      id: `pay-pay-${this.state.payablePayments.length + 10}`,
      payableId,
      cashAccountId: input.cashAccountId,
      amount: Number(input.amount || 0),
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference || ""
    };

    this.state.payablePayments.unshift(payment);
    const paid = this.getPayablePaid(payableId);
    payable.status = calculateCollectionStatus(payable.totalAmount, paid);
    this.registerCashMovement({
      accountId: payment.cashAccountId,
      type: "out",
      category: "Pago proveedor",
      amount: payment.amount,
      date: payment.paidAt,
      referenceType: "payable_payment",
      referenceId: payment.id
    });
    this.logAction("payable.payment_added", "payable", payableId, payment.reference);
    return this.enrichPayable(payable);
  }

  getCashAccounts() {
    return this.state.cashAccounts.map((account) => {
      const balance = this.computeAccountBalance(account.id);
      return { ...account, balance };
    });
  }

  listCashMovements() {
    return this.state.cashMovements.map((movement) => {
      const account = this.state.cashAccounts.find((item) => item.id === movement.accountId);
      return {
        ...movement,
        accountName: account ? account.name : "Cuenta desconocida"
      };
    });
  }

  listAuditLogs() {
    return [...this.state.auditLogs].sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  }

  dashboard() {
    const receivables = this.listReceivables();
    const payables = this.listPayables();
    const trips = this.listTrips();
    const cashAccounts = this.getCashAccounts();

    const totalRevenue = trips.reduce((sum, trip) => sum + trip.expectedRevenue, 0);
    const totalCosts = trips.reduce((sum, trip) => sum + trip.totalCost, 0);
    const receivableBalance = receivables.reduce((sum, item) => sum + item.outstandingAmount, 0);
    const payableBalance = payables.reduce((sum, item) => sum + item.outstandingAmount, 0);
    const projectedCash = cashAccounts.reduce((sum, item) => sum + item.balance, 0) + receivableBalance - payableBalance;

    const tripStatusBreakdown = ["planned", "in_progress", "liquidated", "invoiced", "paid"].map((status) => ({
      status,
      count: trips.filter((trip) => trip.status === status).length
    }));

    const customerRanking = this.state.customers
      .map((customer) => {
        const customerTrips = trips.filter((trip) => trip.customerId === customer.id);
        const profit = customerTrips.reduce((sum, trip) => sum + trip.profit, 0);
        return {
          customerId: customer.id,
          customerName: customer.name,
          trips: customerTrips.length,
          profit
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
        projectedCash
      },
      tripStatusBreakdown,
      customerRanking,
      accounts: cashAccounts
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
        margin: trip.expectedRevenue > 0 ? Number(((trip.profit / trip.expectedRevenue) * 100).toFixed(1)) : 0,
        status: trip.status
      }))
      .sort((a, b) => b.profit - a.profit);
  }

  enrichTrip(trip) {
    const customer = this.state.customers.find((item) => item.id === trip.customerId);
    const route = this.state.routes.find((item) => item.id === trip.routeId);
    const vehicle = this.state.vehicles.find((item) => item.id === trip.vehicleId);
    const driver = this.state.drivers.find((item) => item.id === trip.driverId);
    const expenses = this.state.tripExpenses.filter((item) => item.tripId === trip.id);
    const receivable = this.state.receivables.find((item) => item.tripId === trip.id);
    const totalCost = expenses.reduce((sum, item) => sum + item.amount, 0) + Number(trip.advanceAmount || 0);
    const profit = Number(trip.expectedRevenue || 0) - totalCost;

    return {
      ...trip,
      customerName: customer ? customer.name : "Cliente desconocido",
      routeName: route ? `${route.origin} -> ${route.destination}` : "Ruta desconocida",
      vehicleLabel: vehicle ? `${vehicle.plate} / ${vehicle.model}` : "Unidad desconocida",
      driverName: driver ? driver.name : "Conductor desconocido",
      expenses,
      receivableId: receivable ? receivable.id : null,
      totalCost,
      profit
    };
  }

  enrichReceivable(receivable) {
    const customer = this.state.customers.find((item) => item.id === receivable.customerId);
    const trip = this.state.trips.find((item) => item.id === receivable.tripId);
    const paidAmount = this.getReceivablePaid(receivable.id);
    return {
      ...receivable,
      customerName: customer ? customer.name : "Cliente desconocido",
      tripCode: trip ? trip.code : "Sin viaje",
      paidAmount,
      outstandingAmount: Math.max(receivable.totalAmount - paidAmount, 0)
    };
  }

  enrichPayable(payable) {
    const supplier = this.state.suppliers.find((item) => item.id === payable.supplierId);
    const trip = payable.tripId ? this.state.trips.find((item) => item.id === payable.tripId) : null;
    const paidAmount = this.getPayablePaid(payable.id);
    return {
      ...payable,
      supplierName: supplier ? supplier.name : "Proveedor desconocido",
      tripCode: trip ? trip.code : "Administrativo",
      paidAmount,
      outstandingAmount: Math.max(payable.totalAmount - paidAmount, 0)
    };
  }

  getReceivablePaid(receivableId) {
    return this.state.receivablePayments
      .filter((item) => item.receivableId === receivableId)
      .reduce((sum, item) => sum + item.amount, 0);
  }

  getPayablePaid(payableId) {
    return this.state.payablePayments
      .filter((item) => item.payableId === payableId)
      .reduce((sum, item) => sum + item.amount, 0);
  }

  createPayableFromExpense(expense) {
    const payable = {
      id: `pay-${this.state.payables.length + 10}`,
      tripId: expense.tripId,
      supplierId: expense.supplierId,
      dueDate: expense.date,
      totalAmount: expense.amount,
      status: "pending",
      description: expense.description
    };
    this.state.payables.unshift(payable);
  }

  registerCashMovement(movement) {
    const item = {
      id: `mov-${this.state.cashMovements.length + 10}`,
      ...movement
    };
    this.state.cashMovements.unshift(item);
    return item;
  }

  computeAccountBalance(accountId) {
    const account = this.state.cashAccounts.find((item) => item.id === accountId);
    const base = account ? account.balance : 0;
    return this.state.cashMovements.reduce((sum, item) => {
      if (item.accountId !== accountId) {
        return sum;
      }
      return sum + (item.type === "in" ? item.amount : -item.amount);
    }, base);
  }

  logAction(action, entityType, entityId, notes = "") {
    this.state.auditLogs.unshift({
      id: `audit-${this.state.auditLogs.length + 10}`,
      action,
      entityType,
      entityId,
      performedBy: this.state.users[0].id,
      performedAt: new Date().toISOString(),
      notes
    });
  }
}

export const dataStore = new DataStore();
