export default function StatCard({ title, value, sub, accent = false }) {
  return (
    <div
      className={`card card-body flex flex-col gap-1 ${accent ? "border-brand-200 bg-brand-50" : ""}`}
    >
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p
        className={`text-xl font-bold ${accent ? "text-brand-700" : "text-slate-900"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
