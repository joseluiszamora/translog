const today = new Date();

function daysFromToday(days) {
  const value = new Date(today);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export const seedData = {
  users: [
    {
      id: "user-admin",
      name: "Mariana Rojas",
      email: "admin@translog.local",
      role: "admin"
    },
    {
      id: "user-finance",
      name: "Luis Herrera",
      email: "finanzas@translog.local",
      role: "finance"
    }
  ],
  roles: [
    { id: "admin", name: "Administrador" },
    { id: "finance", name: "Finanzas" },
    { id: "operations", name: "Operaciones" },
    { id: "manager", name: "Gerencia" },
    { id: "viewer", name: "Consulta" }
  ],
  permissions: [
    "trips.read",
    "trips.write",
    "receivables.read",
    "receivables.write",
    "payables.read",
    "payables.write",
    "cash.read",
    "cash.write",
    "reports.read",
    "admin.read"
  ],
  settings: {
    companyName: "TransLog Carga",
    currency: "USD",
    branches: ["Central", "Santa Cruz"],
    paymentMethods: ["Transferencia", "Efectivo", "Tarjeta", "Cheque"]
  },
  customers: [
    { id: "cust-1", name: "AgroAndes", creditDays: 30, contact: "compras@agroandes.com" },
    { id: "cust-2", name: "Mineral Norte", creditDays: 15, contact: "tesoreria@mineralnorte.com" },
    { id: "cust-3", name: "Supermercados Viva", creditDays: 21, contact: "pagos@viva.com" }
  ],
  suppliers: [
    { id: "sup-1", name: "Combustibles Ruta", category: "Combustible" },
    { id: "sup-2", name: "Peajes del Sur", category: "Peajes" },
    { id: "sup-3", name: "Servicios Taller 24", category: "Mantenimiento" }
  ],
  vehicles: [
    { id: "veh-1", plate: "TRK-4012", model: "Volvo FH", capacityTons: 30, status: "available" },
    { id: "veh-2", plate: "TRK-9921", model: "Scania R450", capacityTons: 28, status: "in_trip" }
  ],
  drivers: [
    { id: "drv-1", name: "Carlos Mena", licenseType: "C", status: "active" },
    { id: "drv-2", name: "Ana Quispe", licenseType: "C", status: "active" }
  ],
  routes: [
    { id: "route-1", origin: "La Paz", destination: "Santa Cruz", kilometers: 860 },
    { id: "route-2", origin: "Santa Cruz", destination: "Cochabamba", kilometers: 480 },
    { id: "route-3", origin: "El Alto", destination: "Oruro", kilometers: 230 }
  ],
  expenseCategories: [
    { id: "exp-1", name: "Combustible", type: "operational" },
    { id: "exp-2", name: "Peajes", type: "operational" },
    { id: "exp-3", name: "Viaticos", type: "operational" },
    { id: "exp-4", name: "Mantenimiento", type: "operational" },
    { id: "exp-5", name: "Administrativo", type: "administrative" }
  ],
  incomeCategories: [
    { id: "inc-1", name: "Flete nacional" },
    { id: "inc-2", name: "Servicio prioritario" }
  ],
  cashAccounts: [
    { id: "cash-1", name: "Caja General", type: "cash", balance: 6200 },
    { id: "bank-1", name: "Banco Principal", type: "bank", balance: 18250 }
  ],
  trips: [
    {
      id: "trip-1",
      code: "TRP-2026-001",
      customerId: "cust-1",
      routeId: "route-1",
      vehicleId: "veh-2",
      driverId: "drv-1",
      serviceDate: daysFromToday(-7),
      expectedRevenue: 5400,
      status: "invoiced",
      notes: "Carga de granos",
      advanceAmount: 650
    },
    {
      id: "trip-2",
      code: "TRP-2026-002",
      customerId: "cust-2",
      routeId: "route-2",
      vehicleId: "veh-1",
      driverId: "drv-2",
      serviceDate: daysFromToday(-2),
      expectedRevenue: 3900,
      status: "in_progress",
      notes: "Mineral fraccionado",
      advanceAmount: 400
    },
    {
      id: "trip-3",
      code: "TRP-2026-003",
      customerId: "cust-3",
      routeId: "route-3",
      vehicleId: "veh-1",
      driverId: "drv-2",
      serviceDate: daysFromToday(2),
      expectedRevenue: 1800,
      status: "planned",
      notes: "Reposicion semanal",
      advanceAmount: 0
    }
  ],
  tripExpenses: [
    {
      id: "trx-exp-1",
      tripId: "trip-1",
      supplierId: "sup-1",
      categoryId: "exp-1",
      description: "Carga de diesel",
      amount: 970,
      date: daysFromToday(-7),
      paymentStatus: "paid"
    },
    {
      id: "trx-exp-2",
      tripId: "trip-1",
      supplierId: "sup-2",
      categoryId: "exp-2",
      description: "Peajes ruta central",
      amount: 140,
      date: daysFromToday(-6),
      paymentStatus: "paid"
    },
    {
      id: "trx-exp-3",
      tripId: "trip-2",
      supplierId: "sup-1",
      categoryId: "exp-1",
      description: "Combustible ida",
      amount: 620,
      date: daysFromToday(-2),
      paymentStatus: "pending"
    }
  ],
  receivables: [
    {
      id: "rec-1",
      tripId: "trip-1",
      customerId: "cust-1",
      invoiceNumber: "FAC-1001",
      issuedAt: daysFromToday(-5),
      dueDate: daysFromToday(25),
      totalAmount: 5400,
      status: "partial"
    }
  ],
  receivablePayments: [
    {
      id: "rec-pay-1",
      receivableId: "rec-1",
      cashAccountId: "bank-1",
      amount: 2400,
      method: "Transferencia",
      paidAt: daysFromToday(-1),
      reference: "TRX88912"
    }
  ],
  payables: [
    {
      id: "pay-1",
      tripId: "trip-2",
      supplierId: "sup-1",
      dueDate: daysFromToday(10),
      totalAmount: 620,
      status: "pending",
      description: "Combustible pendiente trip-2"
    },
    {
      id: "pay-2",
      tripId: null,
      supplierId: "sup-3",
      dueDate: daysFromToday(6),
      totalAmount: 300,
      status: "partial",
      description: "Reparacion electrica"
    }
  ],
  payablePayments: [
    {
      id: "pay-pay-1",
      payableId: "pay-2",
      cashAccountId: "cash-1",
      amount: 100,
      method: "Efectivo",
      paidAt: daysFromToday(-1),
      reference: "REC-414"
    }
  ],
  cashMovements: [
    {
      id: "mov-1",
      accountId: "bank-1",
      type: "in",
      category: "Cobro cliente",
      amount: 2400,
      date: daysFromToday(-1),
      referenceType: "receivable_payment",
      referenceId: "rec-pay-1"
    },
    {
      id: "mov-2",
      accountId: "cash-1",
      type: "out",
      category: "Pago proveedor",
      amount: 100,
      date: daysFromToday(-1),
      referenceType: "payable_payment",
      referenceId: "pay-pay-1"
    }
  ],
  auditLogs: [
    {
      id: "audit-1",
      action: "seed.bootstrap",
      entityType: "system",
      entityId: "bootstrap",
      performedBy: "user-admin",
      performedAt: today.toISOString(),
      notes: "Carga inicial del sistema"
    }
  ]
};
