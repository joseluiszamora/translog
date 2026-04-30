import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { seedData } from "../domain/seed-data.js";

const rootDir = process.cwd();
const dataDir = join(rootDir, "data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "financial.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS roles (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS permissions (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    credit_days      INTEGER NOT NULL DEFAULT 0,
    contact          TEXT,
    contact_name     TEXT,
    contact_phone    TEXT,
    nit              TEXT,
    business_name    TEXT
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id              TEXT PRIMARY KEY,
    plate           TEXT NOT NULL UNIQUE,
    model           TEXT NOT NULL,
    color           TEXT,
    capacity_tons   REAL NOT NULL DEFAULT 0,
    volume_m3       REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'available'
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    first_name    TEXT,
    last_name     TEXT,
    identity_card TEXT,
    license       TEXT,
    license_type  TEXT,
    status        TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS routes (
    id              TEXT PRIMARY KEY,
    origin          TEXT NOT NULL,
    destination     TEXT NOT NULL,
    kilometers      REAL NOT NULL DEFAULT 0,
    fuel_liters     REAL NOT NULL DEFAULT 0,
    tolls           REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expense_categories (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS income_categories (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cash_accounts (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    initial_balance REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trips (
    id               TEXT PRIMARY KEY,
    code             TEXT NOT NULL UNIQUE,
    customer_id      TEXT NOT NULL REFERENCES customers(id),
    route_id         TEXT NOT NULL REFERENCES routes(id),
    vehicle_id       TEXT NOT NULL REFERENCES vehicles(id),
    driver_id        TEXT NOT NULL REFERENCES drivers(id),
    service_date     TEXT NOT NULL,
    expected_revenue REAL NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'planned',
    notes            TEXT DEFAULT '',
    advance_amount   REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trip_expenses (
    id             TEXT PRIMARY KEY,
    trip_id        TEXT NOT NULL REFERENCES trips(id),
    supplier_id    TEXT NOT NULL REFERENCES suppliers(id),
    category_id    TEXT NOT NULL REFERENCES expense_categories(id),
    description    TEXT,
    amount         REAL NOT NULL DEFAULT 0,
    date           TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS receivables (
    id             TEXT PRIMARY KEY,
    trip_id        TEXT NOT NULL REFERENCES trips(id),
    customer_id    TEXT NOT NULL REFERENCES customers(id),
    invoice_number TEXT,
    issued_at      TEXT NOT NULL,
    due_date       TEXT NOT NULL,
    total_amount   REAL NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS receivable_payments (
    id              TEXT PRIMARY KEY,
    receivable_id   TEXT NOT NULL REFERENCES receivables(id),
    cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
    amount          REAL NOT NULL DEFAULT 0,
    method          TEXT NOT NULL,
    paid_at         TEXT NOT NULL,
    reference       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS payables (
    id           TEXT PRIMARY KEY,
    trip_id      TEXT REFERENCES trips(id),
    supplier_id  TEXT NOT NULL REFERENCES suppliers(id),
    due_date     TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'pending',
    description  TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS payable_payments (
    id              TEXT PRIMARY KEY,
    payable_id      TEXT NOT NULL REFERENCES payables(id),
    cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
    amount          REAL NOT NULL DEFAULT 0,
    method          TEXT NOT NULL,
    paid_at         TEXT NOT NULL,
    reference       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id             TEXT PRIMARY KEY,
    account_id     TEXT NOT NULL REFERENCES cash_accounts(id),
    type           TEXT NOT NULL CHECK(type IN ('in', 'out')),
    category       TEXT NOT NULL,
    amount         REAL NOT NULL DEFAULT 0,
    date           TEXT NOT NULL,
    reference_type TEXT,
    reference_id   TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id           TEXT PRIMARY KEY,
    action       TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    performed_at TEXT NOT NULL,
    notes        TEXT DEFAULT ''
  );
`);

// ─── Migraciones incrementales ────────────────────────────────────────────────
// ALTER TABLE IF NOT EXISTS no existe en SQLite; usamos try/catch por columna
const customerMigrations = [
  "ALTER TABLE customers ADD COLUMN contact_name  TEXT",
  "ALTER TABLE customers ADD COLUMN contact_phone TEXT",
  "ALTER TABLE customers ADD COLUMN nit           TEXT",
  "ALTER TABLE customers ADD COLUMN business_name TEXT",
];
for (const sql of customerMigrations) {
  try {
    db.exec(sql);
  } catch (_) {
    /* columna ya existe */
  }
}

const routeMigrations = [
  "ALTER TABLE routes ADD COLUMN fuel_liters REAL NOT NULL DEFAULT 0",
  "ALTER TABLE routes ADD COLUMN tolls       REAL NOT NULL DEFAULT 0",
];
for (const sql of routeMigrations) {
  try {
    db.exec(sql);
  } catch (_) {
    /* columna ya existe */
  }
}

const vehicleMigrations = [
  "ALTER TABLE vehicles ADD COLUMN color     TEXT",
  "ALTER TABLE vehicles ADD COLUMN volume_m3 REAL NOT NULL DEFAULT 0",
];
for (const sql of vehicleMigrations) {
  try {
    db.exec(sql);
  } catch (_) {
    /* columna ya existe */
  }
}

const driverMigrations = [
  "ALTER TABLE drivers ADD COLUMN first_name    TEXT",
  "ALTER TABLE drivers ADD COLUMN last_name     TEXT",
  "ALTER TABLE drivers ADD COLUMN identity_card TEXT",
  "ALTER TABLE drivers ADD COLUMN license       TEXT",
];
for (const sql of driverMigrations) {
  try {
    db.exec(sql);
  } catch (_) {
    /* columna ya existe */
  }
}

const tripMigrations = [
  "ALTER TABLE trips ADD COLUMN departure_time TEXT",
  "ALTER TABLE trips ADD COLUMN return_date    TEXT",
  "ALTER TABLE trips ADD COLUMN return_time    TEXT",
  "ALTER TABLE trips ADD COLUMN total_revenue  REAL NOT NULL DEFAULT 0",
  "ALTER TABLE trips ADD COLUMN expected_cost  REAL NOT NULL DEFAULT 0",
  "ALTER TABLE trips ADD COLUMN total_cost     REAL NOT NULL DEFAULT 0",
];
for (const sql of tripMigrations) {
  try {
    db.exec(sql);
  } catch (_) {
    /* columna ya existe */
  }
}

const expenseMigrations = [
  "ALTER TABLE trip_expenses ADD COLUMN stage    TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE trip_expenses ADD COLUMN paid_by  TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE trip_expenses ADD COLUMN time     TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE trip_expenses ADD COLUMN category TEXT NOT NULL DEFAULT ''",
];
for (const sql of expenseMigrations) {
  try {
    db.exec(sql);
  } catch (_) {
    /* columna ya existe */
  }
}

// ─── Seed inicial (solo si la base está vacía) ────────────────────────────────
const alreadySeeded =
  db.prepare("SELECT COUNT(*) as count FROM users").get().count > 0;

if (!alreadySeeded) {
  const runSeed = db.transaction(() => {
    for (const u of seedData.users) {
      db.prepare(
        "INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)",
      ).run(u.id, u.name, u.email, u.role);
    }

    for (const r of seedData.roles) {
      db.prepare("INSERT INTO roles (id, name) VALUES (?, ?)").run(
        r.id,
        r.name,
      );
    }

    for (const p of seedData.permissions) {
      db.prepare("INSERT INTO permissions (name) VALUES (?)").run(p);
    }

    const { settings } = seedData;
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "companyName",
      settings.companyName,
    );
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "currency",
      settings.currency,
    );
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "branches",
      JSON.stringify(settings.branches),
    );
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "paymentMethods",
      JSON.stringify(settings.paymentMethods),
    );

    for (const c of seedData.customers) {
      db.prepare(
        "INSERT INTO customers (id, name, credit_days, contact) VALUES (?, ?, ?, ?)",
      ).run(c.id, c.name, c.creditDays, c.contact);
    }

    for (const s of seedData.suppliers) {
      db.prepare(
        "INSERT INTO suppliers (id, name, category) VALUES (?, ?, ?)",
      ).run(s.id, s.name, s.category);
    }

    for (const v of seedData.vehicles) {
      db.prepare(
        "INSERT INTO vehicles (id, plate, model, capacity_tons, status) VALUES (?, ?, ?, ?, ?)",
      ).run(v.id, v.plate, v.model, v.capacityTons, v.status);
    }

    for (const d of seedData.drivers) {
      db.prepare(
        "INSERT INTO drivers (id, name, license_type, status) VALUES (?, ?, ?, ?)",
      ).run(d.id, d.name, d.licenseType, d.status);
    }

    for (const r of seedData.routes) {
      db.prepare(
        "INSERT INTO routes (id, origin, destination, kilometers) VALUES (?, ?, ?, ?)",
      ).run(r.id, r.origin, r.destination, r.kilometers);
    }

    for (const ec of seedData.expenseCategories) {
      db.prepare(
        "INSERT INTO expense_categories (id, name, type) VALUES (?, ?, ?)",
      ).run(ec.id, ec.name, ec.type);
    }

    for (const ic of seedData.incomeCategories) {
      db.prepare("INSERT INTO income_categories (id, name) VALUES (?, ?)").run(
        ic.id,
        ic.name,
      );
    }

    for (const ca of seedData.cashAccounts) {
      db.prepare(
        "INSERT INTO cash_accounts (id, name, type, initial_balance) VALUES (?, ?, ?, ?)",
      ).run(ca.id, ca.name, ca.type, ca.balance);
    }

    for (const trip of seedData.trips) {
      db.prepare(
        `
        INSERT INTO trips (id, code, customer_id, route_id, vehicle_id, driver_id, service_date, expected_revenue, status, notes, advance_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        trip.id,
        trip.code,
        trip.customerId,
        trip.routeId,
        trip.vehicleId,
        trip.driverId,
        trip.serviceDate,
        trip.expectedRevenue,
        trip.status,
        trip.notes,
        trip.advanceAmount,
      );
    }

    for (const te of seedData.tripExpenses) {
      db.prepare(
        `
        INSERT INTO trip_expenses (id, trip_id, supplier_id, category_id, description, amount, date, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        te.id,
        te.tripId,
        te.supplierId,
        te.categoryId,
        te.description,
        te.amount,
        te.date,
        te.paymentStatus,
      );
    }

    for (const rec of seedData.receivables) {
      db.prepare(
        `
        INSERT INTO receivables (id, trip_id, customer_id, invoice_number, issued_at, due_date, total_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        rec.id,
        rec.tripId,
        rec.customerId,
        rec.invoiceNumber,
        rec.issuedAt,
        rec.dueDate,
        rec.totalAmount,
        rec.status,
      );
    }

    for (const rp of seedData.receivablePayments) {
      db.prepare(
        `
        INSERT INTO receivable_payments (id, receivable_id, cash_account_id, amount, method, paid_at, reference)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        rp.id,
        rp.receivableId,
        rp.cashAccountId,
        rp.amount,
        rp.method,
        rp.paidAt,
        rp.reference,
      );
    }

    for (const pay of seedData.payables) {
      db.prepare(
        `
        INSERT INTO payables (id, trip_id, supplier_id, due_date, total_amount, status, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        pay.id,
        pay.tripId,
        pay.supplierId,
        pay.dueDate,
        pay.totalAmount,
        pay.status,
        pay.description,
      );
    }

    for (const pp of seedData.payablePayments) {
      db.prepare(
        `
        INSERT INTO payable_payments (id, payable_id, cash_account_id, amount, method, paid_at, reference)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        pp.id,
        pp.payableId,
        pp.cashAccountId,
        pp.amount,
        pp.method,
        pp.paidAt,
        pp.reference,
      );
    }

    for (const cm of seedData.cashMovements) {
      db.prepare(
        `
        INSERT INTO cash_movements (id, account_id, type, category, amount, date, reference_type, reference_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        cm.id,
        cm.accountId,
        cm.type,
        cm.category,
        cm.amount,
        cm.date,
        cm.referenceType,
        cm.referenceId,
      );
    }

    for (const al of seedData.auditLogs) {
      db.prepare(
        `
        INSERT INTO audit_logs (id, action, entity_type, entity_id, performed_by, performed_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        al.id,
        al.action,
        al.entityType,
        al.entityId,
        al.performedBy,
        al.performedAt,
        al.notes,
      );
    }
  });

  runSeed();
  console.log("[db] Base de datos inicializada con datos de prueba.");
}
