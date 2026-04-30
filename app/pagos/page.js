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

export default function PagosPage() {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    apiGet("/api/payables")
      .then(setPayables)
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  function openPay(p) {
    setForm(EMPTY_PAYMENT);
    setError("");
    setSelected(p);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiPost(`/api/payables/${selected.id}/payments`, {
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
  const total = payables.reduce((s, p) => s + (p.totalAmount ?? 0), 0);
  const paid = payables.reduce((s, p) => s + (p.paidAmount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Cuentas por pagar"
        subtitle="Control de pagos a proveedores"
      >
        <div className="flex gap-4 text-sm">
          <span className="text-slate-500">
            Total: <strong>{currency(total)}</strong>
          </span>
          <span className="text-slate-500">
            Pagado:{" "}
            <strong className="text-emerald-600">{currency(paid)}</strong>
          </span>
          <span className="text-slate-500">
            Pendiente:{" "}
            <strong className="text-red-500">{currency(total - paid)}</strong>
          </span>
        </div>
      </PageHeader>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Proveedor</th>
                <th className="th">Descripción</th>
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
                  <td colSpan={8} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : payables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-row td">
                    Sin cuentas por pagar
                  </td>
                </tr>
              ) : (
                payables.map((p) => (
                  <tr key={p.id} className="tr-hover">
                    <td className="td">{p.supplierName ?? p.supplierId}</td>
                    <td className="td">{p.description}</td>
                    <td className="td">{p.dueDate}</td>
                    <td className="td">{currency(p.totalAmount)}</td>
                    <td className="td text-emerald-600">
                      {currency(p.paidAmount ?? 0)}
                    </td>
                    <td className="td font-semibold">
                      {currency((p.totalAmount ?? 0) - (p.paidAmount ?? 0))}
                    </td>
                    <td className="td">
                      <Badge status={p.status} />
                    </td>
                    <td className="td">
                      {p.status !== "paid" && (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => openPay(p)}
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
        title={`Pago — ${selected?.supplierName ?? selected?.id ?? ""}`}
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
