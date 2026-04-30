"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

const TABS = [
  { key: "customers", label: "Clientes" },
  { key: "routes", label: "Rutas" },
  { key: "vehicles", label: "Vehículos" },
  { key: "drivers", label: "Conductores" },
  { key: "users", label: "Usuarios" },
];

const FIELDS = {
  customers: [
    { key: "name", label: "Nombre", required: true },
    { key: "taxId", label: "NIT/CI" },
    { key: "contact", label: "Contacto" },
    { key: "phone", label: "Teléfono" },
    { key: "email", label: "Email" },
    { key: "creditLimit", label: "Crédito (Bs.)", type: "number" },
  ],
  routes: [
    { key: "name", label: "Nombre", required: true },
    { key: "origin", label: "Origen", required: true },
    { key: "destination", label: "Destino", required: true },
    { key: "distanceKm", label: "Distancia (km)", type: "number" },
    { key: "estimatedHours", label: "Horas est.", type: "number" },
    { key: "baseRate", label: "Tarifa base", type: "number" },
  ],
  vehicles: [
    { key: "plate", label: "Placa", required: true },
    { key: "brand", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "year", label: "Año", type: "number" },
    { key: "capacity", label: "Capacidad (ton)", type: "number" },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: ["available", "in_trip", "maintenance", "inactive"],
    },
  ],
  drivers: [
    { key: "name", label: "Nombre", required: true },
    { key: "license", label: "N° Licencia" },
    { key: "licenseType", label: "Cat. Licencia" },
    { key: "phone", label: "Teléfono" },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: ["active", "inactive", "on_leave"],
    },
  ],
  users: [
    { key: "firstName", label: "Nombres", required: true, fullWidth: true },
    { key: "lastName", label: "Apellidos", required: true, fullWidth: true },
    {
      key: "username",
      label: "Nombre de usuario",
      required: true,
      fullWidth: true,
    },
  ],
};

function buildEmpty(entity) {
  return Object.fromEntries(FIELDS[entity].map((f) => [f.key, ""]));
}

function EntityTable({ entity }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fields = FIELDS[entity];

  const load = useCallback(() => {
    apiGet(`/api/masters/${entity}`)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(buildEmpty(entity));
    setError("");
    setShowCreate(true);
  }
  function openEdit(row) {
    setForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key] ?? ""])));
    setError("");
    setEditRow(row);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editRow) {
        await apiPut(`/api/masters/${entity}/${editRow.id}`, form);
        setEditRow(null);
      } else {
        await apiPost(`/api/masters/${entity}`, form);
        setShowCreate(false);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar este registro?")) return;
    await apiDelete(`/api/masters/${entity}/${id}`);
    load();
  }

  const f = (k) => (ev) => setForm((p) => ({ ...p, [k]: ev.target.value }));

  const EntityForm = (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((field) => (
          <div
            key={field.key}
            className={
              field.key === "name" || field.fullWidth ? "col-span-2" : ""
            }
          >
            <label className="form-label">
              {field.label}
              {field.required ? " *" : ""}
            </label>
            {field.type === "select" ? (
              <select
                className="form-select"
                value={form[field.key] ?? ""}
                onChange={f(field.key)}
              >
                <option value="">— Seleccione —</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type ?? "text"}
                className="form-input"
                value={form[field.key] ?? ""}
                onChange={f(field.key)}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setShowCreate(false);
            setEditRow(null);
          }}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );

  const nameField = fields[0].key;
  const extraField = fields[1]?.key;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button className="btn-primary" onClick={openCreate}>
          + Nuevo
        </button>
      </div>
      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                {fields.slice(0, 4).map((f) => (
                  <th key={f.key} className="th">
                    {f.label}
                  </th>
                ))}
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-row td">
                    Sin registros
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="tr-hover">
                    {fields.slice(0, 4).map((field) => (
                      <td key={field.key} className="td">
                        {field.type === "select" ? (
                          <Badge status={row[field.key]} />
                        ) : (
                          (row[field.key] ?? "—")
                        )}
                      </td>
                    ))}
                    <td className="td">
                      <div className="flex gap-1">
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => openEdit(row)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(row.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo registro"
      >
        {EntityForm}
      </Modal>
      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title="Editar registro"
      >
        {EntityForm}
      </Modal>
    </div>
  );
}

export default function MaestrosPage() {
  const [tab, setTab] = useState("customers");

  return (
    <div>
      <PageHeader
        title="Datos paramétricos"
        subtitle="Gestión de clientes, rutas, vehículos, conductores y usuarios"
      />

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <EntityTable key={tab} entity={tab} />
    </div>
  );
}
