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

function isOverdue(r) {
  return r.status !== "paid" && r.dueDate && r.dueDate < TODAY;
}

export default function CobrosPage() {
  const bootstrap = useBootstrap();
  const cashAccounts = bootstrap?.masters?.cashAccounts ?? [];

  const [receivables, setReceivables] = useState([]);
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
    apiGet("/api/receivables")
      .then(setReceivables)
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

  function openPay(r) {
    const outstanding = (r.totalAmount ?? 0) - (r.paidAmount ?? 0);
    setPayForm({
      amount: outstanding > 0 ? String(outstanding) : "",
      paidAt: TODAY,
      method: "cash",
      cashAccountId: cashAccounts[0]?.id ?? "",
      reference: "",
    });
    setPayError("");
    setPayTarget(r);
  }

  async function openHistory(r) {
    setHistTarget(r);
    setLoadingHist(true);
    setHistory([]);
    try {
      const data = await apiGet(`/api/receivables/${r.id}/payments`);
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
      await apiPost(`/api/receivables/${payTarget.id}/payments`, {
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

  const totalAmount = receivables.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const totalPaid = receivables.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
  const totalPending = totalAmount - totalPaid;
  const overdueItems = receivables.filter(isOverdue);
  const overdueAmount = overdueItems.reduce(
    (s, r) => s + ((r.totalAmount ?? 0) - (r.paidAmount ?? 0)),
    0,
  );

  const filtered = receivables.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter,
  );

  const outstanding = payTarget
    ? (payTarget.totalAmount ?? 0) - (payTarget.paidAmount ?? 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Cuentas por cobrar"
        subtitle="Control de cobros a clientes"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total emitido"
          value={currency(totalAmount)}
          sub={`${receivables.length} documentos`}
        />
        <StatCard
          title="Cobrado"
          value={currency(totalPaid)}
          sub={`${receivables.filter((r) => r.status === "paid").length} pagadas`}
          accent
        />
        <StatCard
          title="Pendiente de cobro"
          value={currency(totalPending)}
          sub={`${receivables.filter((r) => r.status !== "paid").length} sin cobrar`}
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
                ({receivables.filter((r) => r.status === t.key).length})
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
                <th className="th">N° Factura</th>
                <th className="th">Cliente</th>
                <th className="th">Viaje</th>
                <th className="th">Emisión</th>
                <th className="th">Vencimiento</th>
                <th className="th text-right">Total</th>
                <th className="th text-right">Cobrado</th>
                <th className="th text-right">Saldo</th>
                <th className="th">Estado</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-row td">
                    Sin registros
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const overdue = isOverdue(r);
                  const saldo = (r.totalAmount ?? 0) - (r.paidAmount ?? 0);
                  return (
                    <tr
                      key={r.id}
                      className={`tr-hover ${overdue ? "bg-red-50" : ""}`}
                    >
                      <td className="td font-mono text-xs">
                        {r.invoiceNumber}
                        {overdue && (
                          <span className="ml-1 text-xs font-bold text-red-500">
                            ⚠ VENCIDA
                          </span>
                        )}
                      </td>
                      <td className="td">{r.customerName ?? r.customerId}</td>
                      <td className="td font-mono text-xs">
                        {r.tripCode ?? r.tripId ?? "—"}
                      </td>
                      <td className="td text-slate-500 text-sm">
                        {r.issuedAt ?? "—"}
                      </td>
                      <td
                        className={`td text-sm font-medium ${overdue ? "text-red-600" : ""}`}
                      >
                        {r.dueDate ?? "—"}
                      </td>
                      <td className="td text-right">{currency(r.totalAmount)}</td>
                      <td className="td text-right text-emerald-600">
                        {currency(r.paidAmount ?? 0)}
                      </td>
                      <td className="td text-right font-semibold">
                        {currency(saldo)}
                      </td>
                      <td className="td">
                        <Badge status={r.status} />
                      </td>
                      <td className="td">
                        <div className="flex gap-1">
                          {r.status !== "paid" && (
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => openPay(r)}
                            >
                              Cobrar
                            </button>
                          )}
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => openHistory(r)}
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

      {/* Modal: Registrar cobro */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Registrar cobro"
        size="md"
      >
        {payTarget && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-500">Cliente</p>
                <p className="font-medium">{payTarget.customerName}</p>
              </div>
              <div>
                <p className="text-slate-500">Factura</p>
                <p className="font-mono font-medium">{payTarget.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-slate-500">Total factura</p>
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
                  <label className="form-label">Cuenta destino *</label>
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
                  <label className="form-label">Referencia / N° transacción</label>
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
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? "Registrando…" : "Confirmar cobro"}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Modal: Historial de cobros */}
      <Modal
        open={!!histTarget}
        onClose={() => setHistTarget(null)}
        title={`Historial — ${histTarget?.invoiceNumber ?? ""}`}
        size="lg"
      >
        {histTarget && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-2">
              <div>
                <p className="text-slate-500">Cliente</p>
                <p className="font-medium">{histTarget.customerName}</p>
              </div>
              <div>
                <p className="text-slate-500">Total</p>
                <p className="font-medium">{currency(histTarget.totalAmount)}</p>
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
                      Total cobrado
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
