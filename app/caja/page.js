"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import StatCard from "@/components/StatCard";
import { apiGet } from "@/lib/api";
import { currency } from "@/lib/format";

export default function CajaPage() {
  const [data, setData] = useState({ accounts: [], movements: [] });
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");

  const load = (aid = "") => {
    const qs = aid ? `?accountId=${aid}` : "";
    apiGet(`/api/cash-movements${qs}`)
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  function handleAccountChange(e) {
    setAccountId(e.target.value);
    load(e.target.value);
  }

  const totalBalance = data.accounts.reduce(
    (s, a) => s + (a.balance ?? a.currentBalance ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Caja y bancos"
        subtitle="Saldos y movimientos de efectivo"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Balance total" value={currency(totalBalance)} accent />
        {data.accounts.slice(0, 3).map((a) => (
          <StatCard
            key={a.id}
            title={a.name}
            value={currency(a.balance ?? a.currentBalance ?? 0)}
          />
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <select
          className="form-select w-52"
          value={accountId}
          onChange={handleAccountChange}
        >
          <option value="">Todas las cuentas</option>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Fecha</th>
                <th className="th">Tipo</th>
                <th className="th">Descripción</th>
                <th className="th">Cuenta</th>
                <th className="th">Monto</th>
                <th className="th">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : data.movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-row td">
                    Sin movimientos
                  </td>
                </tr>
              ) : (
                data.movements.map((m, i) => (
                  <tr key={i} className="tr-hover">
                    <td className="td">{m.movementDate ?? m.date}</td>
                    <td className="td">
                      <Badge status={m.type ?? m.movementType} />
                    </td>
                    <td className="td">{m.description}</td>
                    <td className="td">{m.accountName ?? m.accountId}</td>
                    <td
                      className={`td font-semibold ${(m.type ?? m.movementType) === "in" ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {currency(m.amount)}
                    </td>
                    <td className="td text-xs text-slate-400">{m.reference}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
