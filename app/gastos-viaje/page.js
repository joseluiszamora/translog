"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import StatCard from "@/components/StatCard";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { currency } from "@/lib/format";
import { useBootstrap } from "@/components/BootstrapProvider";

const CATEGORIES = [
  "combustible",
  "viáticos",
  "peaje",
  "mantenimiento",
  "seguro",
  "impuesto",
  "carga/descarga",
  "otros",
];
const STAGES = ["pre-viaje", "en viaje", "post-viaje", "liquidación"];
const PAY_STATUS = ["pending", "partial", "paid"];

const EMPTY = {
  tripId: "",
  description: "",
  amount: "",
  date: "",
  time: "",
  stage: "en viaje",
  paidBy: "empresa",
  paymentStatus: "paid",
  category: "",
};

export default function GastosViajePage() {
  const bootstrap = useBootstrap();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterTrip, setFilterTrip] = useState("");
  const [filterCat, setFilterCat] = useState("");

  const trips = bootstrap?.masters?.trips ?? [];

  // Fetch all expenses from all trips
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const tripsData = await apiGet("/api/trips");
      const results = await Promise.all(
        tripsData.map((t) =>
          apiGet(`/api/trips/${t.id}/expenses`)
            .then((exps) =>
              exps.map((e) => ({ ...e, tripCode: t.code, tripId: t.id })),
            )
            .catch(() => []),
        ),
      );
      setExpenses(results.flat());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const allTrips = (() => {
    const seen = new Set();
    return expenses
      .filter((e) => {
        if (seen.has(e.tripId)) return false;
        seen.add(e.tripId);
        return true;
      })
      .map((e) => ({ id: e.tripId, code: e.tripCode }));
  })();

  const filtered = expenses.filter((e) => {
    if (filterTrip && String(e.tripId) !== String(filterTrip)) return false;
    if (filterCat && e.category !== filterCat) return false;
    return true;
  });

  const totalAmt = filtered.reduce((s, e) => s + (e.amount ?? 0), 0);

  function openCreate() {
    setForm(EMPTY);
    setError("");
    setShowCreate(true);
  }
  function openEdit(e) {
    setForm({
      tripId: e.tripId,
      description: e.description,
      amount: e.amount,
      date: e.date,
      time: e.time ?? "",
      stage: e.stage ?? "en viaje",
      paidBy: e.paidBy ?? "empresa",
      paymentStatus: e.paymentStatus ?? "paid",
      category: e.category ?? "",
    });
    setError("");
    setEditExp(e);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { ...form, amount: Number(form.amount), tripId: undefined };
      if (editExp) {
        await apiPut(
          `/api/trips/${editExp.tripId}/expenses/${editExp.id}`,
          body,
        );
        setEditExp(null);
      } else {
        if (!form.tripId) throw new Error("Seleccione un viaje");
        await apiPost(`/api/trips/${form.tripId}/expenses`, body);
        setShowCreate(false);
      }
      loadExpenses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await apiDelete(`/api/trips/${e.tripId}/expenses/${e.id}`);
    loadExpenses();
  }

  function exportExcel() {
    if (!filtered.length) return;
    const header = [
      "Viaje",
      "Descripción",
      "Categoría",
      "Etapa",
      "Fecha",
      "Monto",
      "Pagado por",
      "Estado pago",
    ];
    const rows = filtered.map((e) => [
      e.tripCode,
      e.description,
      e.category,
      e.stage,
      e.date,
      e.amount,
      e.paidBy,
      e.paymentStatus,
    ]);
    const xml = [
      '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Gastos">',
      "<Table>",
      `<Row>${header.map((h) => `<Cell ss:StyleID="header"><Data ss:Type="String">${h}</Data></Cell>`).join("")}</Row>`,
      ...rows.map(
        (r) =>
          `<Row>${r.map((v, i) => `<Cell><Data ss:Type="${i === 5 ? "Number" : "String"}">${v ?? ""}</Data></Cell>`).join("")}</Row>`,
      ),
      `<Row><Cell ss:MergeAcross="4"><Data ss:Type="String">TOTAL</Data></Cell><Cell><Data ss:Type="Number">${totalAmt}</Data></Cell></Row>`,
      "</Table></Worksheet></Workbook>",
    ].join("");
    const blob = new Blob([xml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gastos-viaje.xls";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPDF() {
    if (!filtered.length) return;
    const rows = filtered
      .map(
        (e) =>
          `<tr><td>${e.tripCode}</td><td>${e.description}</td><td>${e.category}</td><td>${e.date}</td><td style="text-align:right">${currency(e.amount)}</td><td>${e.paymentStatus}</td></tr>`,
      )
      .join("");
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Gastos por viaje</title><style>
      body{font-family:sans-serif;font-size:12px;padding:20px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#166534;color:#fff}tfoot td{font-weight:bold}
    </style></head><body>
      <h2>Gastos por viaje</h2>
      <table><thead><tr><th>Viaje</th><th>Descripción</th><th>Categoría</th><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4">TOTAL</td><td style="text-align:right">${currency(totalAmt)}</td><td></td></tr></tfoot>
      </table></body></html>`);
    w.document.close();
    w.print();
  }

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const ExpForm = (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!editExp && (
        <div>
          <label className="form-label">Viaje *</label>
          <select
            className="form-select"
            value={form.tripId}
            onChange={f("tripId")}
            required
          >
            <option value="">— Seleccione —</option>
            {allTrips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="form-label">Descripción *</label>
          <input
            className="form-input"
            value={form.description}
            onChange={f("description")}
            required
          />
        </div>
        <div>
          <label className="form-label">Monto (Bs.) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={form.amount}
            onChange={f("amount")}
            required
          />
        </div>
        <div>
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            value={form.category}
            onChange={f("category")}
          >
            <option value="">— Seleccione —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Fecha *</label>
          <input
            type="date"
            className="form-input"
            value={form.date}
            onChange={f("date")}
            required
          />
        </div>
        <div>
          <label className="form-label">Hora</label>
          <input
            type="time"
            className="form-input"
            value={form.time}
            onChange={f("time")}
          />
        </div>
        <div>
          <label className="form-label">Etapa</label>
          <select
            className="form-select"
            value={form.stage}
            onChange={f("stage")}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Pagado por</label>
          <input
            className="form-input"
            value={form.paidBy}
            onChange={f("paidBy")}
          />
        </div>
        <div>
          <label className="form-label">Estado pago</label>
          <select
            className="form-select"
            value={form.paymentStatus}
            onChange={f("paymentStatus")}
          >
            {PAY_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setShowCreate(false);
            setEditExp(null);
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
      <PageHeader
        title="Gastos por viaje"
        subtitle="Control de gastos operativos por cada viaje"
      >
        <button className="btn-secondary btn-sm" onClick={exportExcel}>
          ↓ Excel
        </button>
        <button className="btn-secondary btn-sm" onClick={exportPDF}>
          ↓ PDF
        </button>
        <button className="btn-primary" onClick={openCreate}>
          + Nuevo gasto
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total gastos" value={currency(totalAmt)} accent />
        <StatCard title="Registros" value={filtered.length} />
        <StatCard title="Viajes con gasto" value={allTrips.length} />
        <StatCard
          title="Promedio/gasto"
          value={currency(filtered.length ? totalAmt / filtered.length : 0)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          className="form-select w-44"
          value={filterTrip}
          onChange={(e) => setFilterTrip(e.target.value)}
        >
          <option value="">Todos los viajes</option>
          {allTrips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code}
            </option>
          ))}
        </select>
        <select
          className="form-select w-44"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Viaje</th>
                <th className="th">Descripción</th>
                <th className="th">Categoría</th>
                <th className="th">Etapa</th>
                <th className="th">Fecha</th>
                <th className="th">Monto</th>
                <th className="th">Estado</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-row td">
                    Sin gastos registrados
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={`${e.tripId}-${e.id}`} className="tr-hover">
                    <td className="td font-mono text-xs">{e.tripCode}</td>
                    <td className="td">{e.description}</td>
                    <td className="td capitalize">{e.category}</td>
                    <td className="td capitalize">{e.stage}</td>
                    <td className="td">{e.date}</td>
                    <td className="td font-semibold">{currency(e.amount)}</td>
                    <td className="td">
                      <Badge status={e.paymentStatus} />
                    </td>
                    <td className="td">
                      <div className="flex gap-1">
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => openEdit(e)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(e)}
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
        title="Nuevo gasto"
      >
        {ExpForm}
      </Modal>
      <Modal
        open={!!editExp}
        onClose={() => setEditExp(null)}
        title={`Editar gasto #${editExp?.id ?? ""}`}
      >
        {ExpForm}
      </Modal>
    </div>
  );
}
