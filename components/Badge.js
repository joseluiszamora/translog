export default function Badge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-700",
    planned: "bg-blue-100 text-blue-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    partial: "bg-orange-100 text-orange-700",
    paid: "bg-emerald-100 text-emerald-700",
    liquidated: "bg-teal-100 text-teal-700",
    invoiced: "bg-cyan-100 text-cyan-700",
    available: "bg-green-100 text-green-700",
    in_trip: "bg-blue-100 text-blue-700",
    maintenance: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-600",
    on_leave: "bg-purple-100 text-purple-700",
    in: "bg-green-100 text-green-700",
    out: "bg-red-100 text-red-700",
  };
  const labels = {
    pending: "Pendiente",
    planned: "Planeado",
    in_progress: "En progreso",
    partial: "Parcial",
    paid: "Pagado",
    liquidated: "Liquidado",
    invoiced: "Facturado",
    available: "Disponible",
    in_trip: "En viaje",
    maintenance: "Mantenimiento",
    active: "Activo",
    inactive: "Inactivo",
    on_leave: "De licencia",
    in: "Entrada",
    out: "Salida",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
