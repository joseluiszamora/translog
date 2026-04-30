"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBootstrap } from "@/components/BootstrapProvider";

const navLinks = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/viajes", label: "Viajes", icon: "◈" },
  { href: "/gastos-viaje", label: "Gastos por viaje", icon: "◉" },
  { href: "/cobros", label: "Cuentas por cobrar", icon: "↙" },
  { href: "/pagos", label: "Cuentas por pagar", icon: "↗" },
  { href: "/caja", label: "Caja y bancos", icon: "⬡" },
  { href: "/rentabilidad", label: "Rentabilidad", icon: "↑" },
  { href: "/auditoria", label: "Auditoría", icon: "☰" },
  { href: "/maestros", label: "Datos paramétricos", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const bootstrap = useBootstrap();
  const user = bootstrap?.currentUser;
  const company = bootstrap?.settings?.companyName ?? "TransLog";

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-brand-950 text-green-100 shrink-0">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 border-b border-brand-900">
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
          MVP Transporte
        </p>
        <h1 className="text-xl font-bold text-white">{company}</h1>
        <p className="text-xs text-brand-400 mt-1 leading-relaxed">
          Control operativo y financiero
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navLinks.map(({ href, label, icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-700 text-white"
                  : "text-brand-300 hover:bg-brand-900 hover:text-white"
              }`}
            >
              <span className="text-base leading-none opacity-75">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-brand-900">
        {user ? (
          <>
            <p className="text-sm font-semibold text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-brand-400 truncate">{user.email}</p>
            <p className="text-xs text-brand-500 mt-1">
              <span className="bg-brand-800 text-brand-300 rounded px-1.5 py-0.5 font-mono uppercase text-[10px]">
                {user.role}
              </span>
            </p>
          </>
        ) : (
          <div className="h-8 rounded bg-brand-900 animate-pulse" />
        )}
      </div>
    </aside>
  );
}
