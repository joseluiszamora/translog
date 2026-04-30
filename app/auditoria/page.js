"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { apiGet } from "@/lib/api";

const ENTITIES = [
  "trips",
  "receivables",
  "payables",
  "cash_movements",
  "customers",
  "vehicles",
  "drivers",
  "routes",
];

export default function AuditoriaPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entity, setEntity] = useState("");

  function load() {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (entity) qs.set("entityType", entity);
    apiGet(`/api/audit-logs?${qs}`)
      .then((data) => setLogs(Array.isArray(data) ? data : (data.logs ?? [])))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle="Registro de cambios y acciones en el sistema"
      >
        <input
          type="date"
          className="form-input w-40"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          className="form-input w-40"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <select
          className="form-select w-44"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        >
          <option value="">Todas las entidades</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={load}>
          Filtrar
        </button>
      </PageHeader>

      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th className="th">Fecha/Hora</th>
                <th className="th">Usuario</th>
                <th className="th">Entidad</th>
                <th className="th">Acción</th>
                <th className="th">ID Entidad</th>
                <th className="th">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-row td">
                    Cargando…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-row td">
                    Sin registros
                  </td>
                </tr>
              ) : (
                logs.map((l, i) => (
                  <tr key={i} className="tr-hover">
                    <td className="td text-xs text-slate-500">
                      {l.createdAt ?? l.timestamp}
                    </td>
                    <td className="td">{l.userName ?? l.userId}</td>
                    <td className="td">
                      <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-xs font-mono">
                        {l.entityType}
                      </span>
                    </td>
                    <td className="td">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          l.action === "delete"
                            ? "bg-red-100 text-red-700"
                            : l.action === "create"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="td font-mono text-xs">{l.entityId}</td>
                    <td className="td text-xs text-slate-500 max-w-xs truncate">
                      {l.description ?? l.details}
                    </td>
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
