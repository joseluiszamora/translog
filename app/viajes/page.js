"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { currency } from "@/lib/format";
import { useBootstrap } from "@/components/BootstrapProvider";

const EMPTY = {
  customerId: "",
  routeId: "",
  vehicleId: "",
  driverId: "",
  serviceDate: "",
  expectedRevenue: "",
  advanceAmount: "",
  status: "planned",
  notes: "",
};

export default function ViajesPage() {
  const bootstrap = useBootstrap();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const customers = bootstrap?.masters?.customers ?? [];
  const routes = bootstrap?.masters?.routes ?? [];
  const vehicles = bootstrap?.masters?.vehicles ?? [];
  const drivers = bootstrap?.masters?.drivers ?? [];

  const loadTrips = useCallback(() => {
    const qs = filterStatus ? `?status=${filterStatus}` : "";
    apiGet(`/api/trips${qs}`)
      .then(setTrips)
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  function openCreate() {
    setForm(EMPTY);
    setError("");
    setShowCreate(true);
  }
  function openEdit(t) {
    setForm({
      customerId: t.customerId,
      routeId: t.routeId,
      vehicleId: t.vehicleId,
      driverId: t.driverId,
      serviceDate: t.serviceDate,
      expectedRevenue: t.expectedRevenue ?? "",
      advanceAmount: t.advanceAmount ?? "",
      status: t.status,
      notes: t.notes ?? "",
    });
    setError("");
    setEditTrip(t);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editTrip) {
        await apiPut(`/api/trips/${editTrip.id}`, form);
        setEditTrip(null);
      } else {
        await apiPost("/api/trips", form);
        setShowCreate(false);
      }
      loadTrips();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar este viaje?")) return;
    await apiDelete(`/api/trips/${id}`);
    loadTrips();
  }

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const TripForm = (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Cliente *</label>
          <select
            className="form-select"
            value={form.customerId}
            onChange={f("customerId")}
            required
          >
            <option value="">— Seleccione —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Ruta *</label>
          <select
            className="form-select"
            value={form.routeId}
            onChange={f("routeId")}
            required
          >
            <option value="">— Seleccione —</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Vehículo *</label>
          <select
            className="form-select"
            value={form.vehicleId}
            onChange={f("vehicleId")}
            required
          >
            <option value="">— Seleccione —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate ?? v.licensePlate}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Conductor *</label>
          <select
            className="form-select"
            value={form.driverId}
            onChange={f("driverId")}
            required
          >
            <option value="">— Seleccione —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Fecha de servicio *</label>
          <input
            type="date"
            className="form-input"
            value={form.serviceDate}
            onChange={f("serviceDate")}
            required
          />
        </div>
        <div>
          <label className="form-label">Estado</label>
          <select
            className="form-select"
            value={form.status}
            onChange={f("status")}
          >
            {["planned", "in_progress", "liquidated", "invoiced"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Ingreso esperado (Bs.)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={form.expectedRevenue}
            onChange={f("expectedRevenue")}
          />
        </div>
        <div>
          <label className="form-label">Anticipo (Bs.)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={form.advanceAmount}
            onChange={f("advanceAmount")}
          />
        </div>
      </div>
      <div>
        <label className="form-label">Notas</label>
        <textarea
          className="form-textarea"
          rows={2}
          value={form.notes}
          onChange={f("notes")}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setShowCreate(false);
            setEditTrip(null);
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

  return (
    <div>
      <PageHeader title="Viajes" subtitle="Gestión de viajes de transporte">
        <select
          className="form-select w-44"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {["planned", "in_progress", "liquidated", "invoiced"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={openCreate}>
          + Nuevo viaje
        </button>
      </PageHeader>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Cliente</th>
                <th className="th">Ruta</th>
                <th className="th">Fecha</th>
                <th className="th">Estado</th>
                <th className="th">Ingreso esp.</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-row td">
                    Sin viajes
                  </td>
                </tr>
              ) : (
                trips.map((t) => {
                  const customer = customers.find((c) => c.id === t.customerId);
                  const route = routes.find((r) => r.id === t.routeId);
                  return (
                    <tr key={t.id} className="tr-hover">
                      <td className="td font-mono text-xs">{t.code}</td>
                      <td className="td">{customer?.name ?? t.customerId}</td>
                      <td className="td">{route?.name ?? t.routeId}</td>
                      <td className="td">{t.serviceDate}</td>
                      <td className="td">
                        <Badge status={t.status} />
                      </td>
                      <td className="td">{currency(t.expectedRevenue)}</td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => openEdit(t)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDelete(t.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo viaje"
      >
        {TripForm}
      </Modal>
      <Modal
        open={!!editTrip}
        onClose={() => setEditTrip(null)}
        title={`Editar viaje ${editTrip?.code ?? ""}`}
      >
        {TripForm}
      </Modal>
    </div>
  );
}
