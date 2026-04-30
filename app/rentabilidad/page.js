"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { apiGet } from "@/lib/api";
import { currency } from "@/lib/format";

export default function RentabilidadPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function load() {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    apiGet(`/api/reports/profitability?${qs}`)
      .then((data) => setRows(Array.isArray(data) ? data : (data.rows ?? [])))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  const totRevenue = rows.reduce(
    (s, r) => s + (r.revenue ?? r.totalRevenue ?? 0),
    0,
  );
  const totCost = rows.reduce((s, r) => s + (r.cost ?? r.totalCost ?? 0), 0);
  const totProfit = rows.reduce((s, r) => s + (r.profit ?? r.margin ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Rentabilidad"
        subtitle="Informe de rentabilidad por viaje"
      >
        <input
          type="date"
          className="form-input w-40"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Desde"
        />
        <input
          type="date"
          className="form-input w-40"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Hasta"
        />
        <button className="btn-primary" onClick={load}>
          Filtrar
        </button>
      </PageHeader>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Viaje</th>
                <th className="th">Cliente</th>
                <th className="th">Ruta</th>
                <th className="th">Fecha</th>
                <th className="th">Ingresos</th>
                <th className="th">Costos</th>
                <th className="th">Utilidad</th>
                <th className="th">Margen %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-row td">
                    Sin datos
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const rev = r.revenue ?? r.totalRevenue ?? 0;
                  const cost = r.cost ?? r.totalCost ?? 0;
                  const prof = r.profit ?? r.margin ?? rev - cost;
                  const pct = rev ? ((prof / rev) * 100).toFixed(1) : "—";
                  return (
                    <tr key={i} className="tr-hover">
                      <td className="td font-mono text-xs">
                        {r.tripCode ?? r.code}
                      </td>
                      <td className="td">{r.customerName ?? r.customerId}</td>
                      <td className="td">{r.routeName ?? r.routeId}</td>
                      <td className="td">{r.serviceDate}</td>
                      <td className="td">{currency(rev)}</td>
                      <td className="td">{currency(cost)}</td>
                      <td
                        className={`td font-semibold ${prof >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {currency(prof)}
                      </td>
                      <td
                        className={`td ${prof >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {pct}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="td" colSpan={4}>
                    TOTALES
                  </td>
                  <td className="td">{currency(totRevenue)}</td>
                  <td className="td">{currency(totCost)}</td>
                  <td
                    className={`td ${totProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {currency(totProfit)}
                  </td>
                  <td
                    className={`td ${totProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {totRevenue
                      ? ((totProfit / totRevenue) * 100).toFixed(1)
                      : "—"}
                    %
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
