let _currency = "BOB";

export function setCurrency(c) {
  _currency = c || "BOB";
}

export function currency(value) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: _currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function date(value) {
  if (!value) return "—";
  return value;
}

export const STATUS_LABELS = {
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
