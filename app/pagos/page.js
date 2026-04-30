"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import StatCard from "@/components/StatCard";
import { useBootstrap } from "@/components/BootstrapProvider";
import { apiGet, apiPost } from "@/lib/api";
import { currency } from "@/lib/format";

const TODAY = new Date().toISOString().slice(0, 10);

const METHOD_LABELS = {
  cash: "Efectivo",
  transfer: "Transferencia",
  check: "Cheque",
  other: "Otro",
};

const STATUS_TABS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendiente" },
  { key: "partial", label: "Parcial" },
  { key: "paid", label: "Pagado" },
];

function isOverdue(p) {
  return p.status !== "paid" && p.dueDate && p.dueDate < TODAY;
}

export default function PagosPage() {
  const bootstrap = useBootstrap();
  const cashAccounts = bootstrap?.masters?.cashAccounts ?? [];

  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState("");

  const [histTarget, setHistTarget] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiGet("/api/payables")
      .then(setPayables)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (cashAccounts.length && payTarget && !payForm.cashAccountId) {
      setPayForm((p) => ({ ...p, cashAccountId: cashAccounts[0].id }));
    }
  }, [cashAccounts, payTarget]);

  function openPay(p) {
    const outstanding = (p.totalAmount ?? 0) - (p.paidAmount ?? 0);
    setPayForm({
      amount: outstanding > 0 ? String(outstanding) : "",
      paidAt: TODAY,
      method: "cash",
      cashAccountId: cashAccounts[0]?.id ?? "",
      reference: "",
    });
    setPayError("");
    setPayTarget(p);
  }

  async function openHistory(p) {
    setHistTarget(p);
    setLoadingHist(true);
    setHistory([]);
    try {
      const data = await apiGet(`/api/payables/${p.id}/payments`);
      setHistory(data);
    } finally {
      setLoadingHist(false);
    }
  }

  async function handlePaySubmit(e) {
    e.preventDefault();
    setSaving(true);
    setPayError("");
    try {
      await apiPost(`/api/payables/${payTarget.id}/payments`, {
        ...payForm,
        amount: Number(payForm.amount),
      });
      setPayTarget(null);
      load();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const f = (k) => (e) => setPayForm((p) => ({ ...p, [k]: e.target.value }));

  const totalAmount = payables.reduce((s, p) => s + (p.totalAmount ?? 0), 0);
  const totalPaid = payables.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
  const totalPending = totalAmount - totalPaid;
  const overdueItems = payables.filter(isOverdue);
  const overdueAmount = overdueItems.reduce(
    (s, p) => s + ((p.totalAmount ?? 0) - (p.paidAmount ?? 0)),
    0,
  );

  const filtered = payables.filter((p) =>
    statusFilter === "all" ? true : p.status === statusFilter,
  );

  const outstanding = payTarget
    ? (payTarget.totalAmount ?? 0) - (payTarget.paidAmount ?? 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Cuentas por pagar"
        subtitle="Control de pagos a proveedores y acreedores"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total adeudado"
          value={currency(totalAmount)}
          sub={`${payables.length} documentos`}
        />
        <StatCard
          title="Pagado"
          value={currency(totalPaid)}
          sub={`${payables.filter((p) => p.status === "paid").length} canceladas`}
          accent
        />
        <StatCard
          title="Pendiente de pago"
          value={currency(totalPending)}
          sub={`${payables.filter((p) => p.status !== "paid").length} sin pagar`}
        />
        <StatCard
          title="Vencidas"
          value={currency(overdueAmount)}
          sub={`${overdueItems.length} documentos vencidos`}
        />
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.key !== "all" && (
              <span className="ml-1 text-xs text-slate-400">
                ({payables.filter((p) => p.status === t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Proveedor</th>
                <th className="th">Viaje</th>
                <th className="th">Descripción</th>
                <th className="th">Vencimiento</th>
                <th className="th text-right">Total</th>
                <th className="th text-right">Pagado</th>
                <th className="th text-right">Saldo</th>
                <th className="th">Estado</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row td">
                    Sin registros
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const overdue = isOverdue(p);
                  const saldo = (p.totalAmount ?? 0) - (p.paidAmount ?? 0);
                  return (
                    <tr
                      key={p.id}
                      className={`tr-hover ${overdue ? "bg-red-50" : ""}`}
                    >
                      <td className="td">
                        {p.supplierName ?? p.supplierId ?? "—"}
                      </td>
                      <td className="td font-mono text-xs">
                        {p.tripCode ?? "Administrativo"}
                      </td>
                      <td className="td text-slate-600 text-sm">
                        {p.description ?? "—"}
                      </td>
                      <td
                        className={`td text-sm font-medium ${overdue ? "text-red-600" : ""}`}
                      >
                        {p.dueDate ?? "—"}
                        {overdue && (
                          <span className="ml-1 text-xs font-bold text-red-500">
                            ⚠ VENCIDA
                          </span>
                        )}
                      </td>
                      <td className="td text-right">
                        {currency(p.totalAmount)}
                      </td>
                      <td className="td text-right text-emerald-600">
                        {currency(p.paidAmount ?? 0)}
                      </td>
                      <td className="td text-right font-semibold">
                        {currency(saldo)}
                      </td>
                      <td className="td">
                        <Badge status={p.status} />
                      </td>
                      <td className="td">
                        <div className="flex gap-1">
                          {p.status !== "paid" && (
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => openPay(p)}
                            >
                              Pagar
                            </button>
                          )}
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => openHistory(p)}
                          >
                            Historial
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

      {/* Modal: Registrar pago */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Registrar pago"
        size="md"
      >
        {payTarget && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-500">Proveedor</p>
                <p className="font-medium">
                  {payTarget.supplierName ?? payTarget.supplierId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Viaje / Referencia</p>
                <p className="font-mono font-medium">
                  {payTarget.tripCode ?? "Administrativo"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Total documento</p>
                <p className="font-medium">{currency(payTarget.totalAmount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Saldo pendiente</p>
                <p className="font-bold text-brand-700 text-lg">
                  {currency(outstanding)}
                </p>
              </div>
            </div>
            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Cuenta origen *</label>
                  <select
                    className="form-select"
                    value={payForm.cashAccountId}
                    onChange={f("cashAccountId")}
                    required
                  >
                    <option value="">— Seleccione cuenta —</option>
                    {cashAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — saldo: {currency(a.balance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Monto (Bs.) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-input"
                    value={payForm.amount}
                    onChange={f("amount")}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Fecha *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={payForm.paidAt}
                    onChange={f("paidAt")}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Método de pago</label>
                  <select
                    className="form-select"
                    value={payForm.method}
                    onChange={f("method")}
                  >
                    {Object.entries(METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Referencia / N° cheque</label>
                  <input
                    className="form-input"
                    placeholder="Opcional"
                    value={payForm.reference}
                    onChange={f("reference")}
                  />
                </div>
              </div>
              {payError && <p className="text-red-600 text-sm">{payError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPayTarget(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Registrando…" : "Confirmar pago"}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Modal: Historial de pagos */}
      <Modal
        open={!!histTarget}
        onClose={() => setHistTarget(null)}
        title={`Historial — ${histTarget?.supplierName ?? histTarget?.id ?? ""}`}
        size="lg"
      >
        {histTarget && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-2">
              <div>
                <p className="text-slate-500">Proveedor</p>
                <p className="font-medium">{histTarget.supplierName ?? "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Total</p>
                <p className="font-medium">
                  {currency(histTarget.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Estado</p>
                <Badge status={histTarget.status} />
              </div>
            </div>
            {loadingHist ? (
              <p className="text-center text-slate-400 text-sm py-6">
                Cargando…
              </p>
            ) : history.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">
                Sin pagos registrados
              </p>
            ) : (
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="th">Fecha</th>
                    <th className="th">Método</th>
                    <th className="th">Referencia</th>
                    <th className="th text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="tr-hover">
                      <td className="td">{h.paidAt}</td>
                      <td className="td">
                        {METHOD_LABELS[h.method] ?? h.method}
                      </td>
                      <td className="td text-slate-500">
                        {h.reference || "—"}
                      </td>
                      <td className="td text-right font-semibold text-emerald-600">
                        {currency(h.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={3} className="td text-right text-slate-600">
                      Total pagado
                    </td>
                    <td className="td text-right text-emerald-700 font-bold">
                      {currency(history.reduce((s, h) => s + h.amount, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
