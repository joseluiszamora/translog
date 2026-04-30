"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import { apiGet, apiPost } from "@/lib/api";
import { currency } from "@/lib/format";

const EMPTY_PAYMENT = {
  amount: "",
  paymentDate: "",
  paymentMethod: "cash",
  reference: "",
  notes: "",
};

export default function CobrosPage() {
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    apiGet("/api/receivables")
      .then(setReceivables)
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  function openPay(r) {
    setForm(EMPTY_PAYMENT);
    setError("");
    setSelected(r);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost(`/api/receivables/${selected.id}/payments`, {
        ...form,
        amount: Number(form.amount),
      });
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const total = receivables.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const collected = receivables.reduce((s, r) => s + (r.paidAmount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Cuentas por cobrar"
        subtitle="Control de cobros a clientes"
      >
        <div className="flex gap-4 text-sm">
          <span className="text-slate-500">
            Total: <strong>{currency(total)}</strong>
          </span>
          <span className="text-slate-500">
            Cobrado:{" "}
            <strong className="text-emerald-600">{currency(collected)}</strong>
          </span>
          <span className="text-slate-500">
            Pendiente:{" "}
            <strong className="text-red-500">
              {currency(total - collected)}
            </strong>
          </span>
        </div>
      </PageHeader>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">N° Factura</th>
                <th className="th">Cliente</th>
                <th className="th">Viaje</th>
                <th className="th">Fecha emisión</th>
                <th className="th">Vencimiento</th>
                <th className="th">Total</th>
                <th className="th">Pagado</th>
                <th className="th">Saldo</th>
                <th className="th">Estado</th>
                <th className="th">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : receivables.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-row td">
                    Sin cuentas por cobrar
                  </td>
                </tr>
              ) : (
                receivables.map((r) => (
                  <tr key={r.id} className="tr-hover">
                    <td className="td font-mono text-xs">{r.invoiceNumber}</td>
                    <td className="td">{r.customerName ?? r.customerId}</td>
                    <td className="td font-mono text-xs">
                      {r.tripCode ?? r.tripId}
                    </td>
                    <td className="td">{r.issuedAt}</td>
                    <td className="td">{r.dueDate}</td>
                    <td className="td">{currency(r.totalAmount)}</td>
                    <td className="td text-emerald-600">
                      {currency(r.paidAmount ?? 0)}
                    </td>
                    <td className="td font-semibold">
                      {currency((r.totalAmount ?? 0) - (r.paidAmount ?? 0))}
                    </td>
                    <td className="td">
                      <Badge status={r.status} />
                    </td>
                    <td className="td">
                      {r.status !== "paid" && (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => openPay(r)}
                        >
                          Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Pago — ${selected?.invoiceNumber ?? ""}`}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Monto (Bs.) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                value={form.amount}
                onChange={f("amount")}
                required
              />
            </div>
            <div>
              <label className="form-label">Fecha *</label>
              <input
                type="date"
                className="form-input"
                value={form.paymentDate}
                onChange={f("paymentDate")}
                required
              />
            </div>
            <div>
              <label className="form-label">Método</label>
              <select
                className="form-select"
                value={form.paymentMethod}
                onChange={f("paymentMethod")}
              >
                {["cash", "transfer", "check", "other"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Referencia</label>
              <input
                className="form-input"
                value={form.reference}
                onChange={f("reference")}
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
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelected(null)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
