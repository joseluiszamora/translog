"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import { apiGet } from "@/lib/api";
import { currency } from "@/lib/format";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="text-slate-400 py-16 text-center">Cargando…</div>;
  if (!data)
    return (
      <div className="text-red-500 py-8">Error al cargar el dashboard.</div>
    );

  const {
    overview = {},
    tripsByStatus = [],
    cashAccounts = [],
    topCustomers = [],
  } = data;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general del negocio" />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Viajes activos"
          value={overview.activeTrips ?? 0}
          accent
        />
        <StatCard
          title="Cuentas por cobrar"
          value={currency(overview.totalReceivable ?? 0)}
        />
        <StatCard
          title="Cuentas por pagar"
          value={currency(overview.totalPayable ?? 0)}
        />
        <StatCard
          title="Saldo en caja"
          value={currency(overview.totalCash ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Trips by status */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="section-title">Viajes por estado</p>
            </div>
          </div>
          <div className="card-body">
            {tripsByStatus.length === 0 ? (
              <p className="text-slate-400 text-sm">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {tripsByStatus.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between"
                  >
                    <Badge status={row.status} />
                    <span className="font-semibold text-slate-700">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Cash accounts */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="section-title">Cuentas de caja</p>
            </div>
          </div>
          <div className="card-body">
            {cashAccounts.length === 0 ? (
              <p className="text-slate-400 text-sm">Sin cuentas</p>
            ) : (
              <ul className="space-y-2">
                {cashAccounts.map((acc) => (
                  <li
                    key={acc.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">{acc.name}</span>
                    <span className="font-semibold text-slate-900">
                      {currency(acc.balance ?? acc.currentBalance ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Top customers */}
        <div className="card">
          <div className="card-header">
            <div>
              <p className="section-title">Clientes top</p>
            </div>
          </div>
          <div className="card-body">
            {topCustomers.length === 0 ? (
              <p className="text-slate-400 text-sm">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {topCustomers.slice(0, 6).map((c) => (
                  <li
                    key={c.id ?? c.customerId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700 truncate max-w-[60%]">
                      {c.name}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {currency(c.totalRevenue ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
