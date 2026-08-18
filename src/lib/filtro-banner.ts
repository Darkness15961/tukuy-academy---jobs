export const FILTRO_BANNER_NINGUNO = "ninguno";
export const FILTRO_BANNER_DEFAULT = "clasico";

export type EstiloFiltroBanner = {
  id: string;
  nombre: string;
  /** Capas Tailwind completas (el compilador las tiene que ver enteras). */
  capas: string[];
};

export const ESTILOS_FILTRO_BANNER: EstiloFiltroBanner[] = [
  { id: FILTRO_BANNER_NINGUNO, nombre: "Sin filtro", capas: [] },
  {
    id: "clasico",
    nombre: "Clásico",
    capas: [
      "bg-linear-to-r from-[#07152B]/95 via-[#07152B]/72 to-[#0B3A78]/28",
      "bg-linear-to-t from-[#07152B]/85 via-transparent to-[#07152B]/35",
      "bg-linear-to-br from-transparent via-transparent to-[#020817]/40",
    ],
  },
  {
    id: "suave",
    nombre: "Suave",
    capas: [
      "bg-linear-to-r from-[#07152B]/55 via-[#07152B]/20 to-transparent",
      "bg-linear-to-t from-[#07152B]/45 via-transparent to-transparent",
    ],
  },
  {
    id: "contraste",
    nombre: "Contraste",
    capas: [
      "bg-linear-to-r from-black/90 via-black/45 to-transparent",
      "bg-linear-to-t from-black/50 via-transparent to-black/20",
    ],
  },
  {
    id: "oscuro",
    nombre: "Oscuro",
    capas: ["bg-black/55", "bg-linear-to-t from-black/70 via-transparent to-black/25"],
  },
  {
    id: "azul",
    nombre: "Azul",
    capas: [
      "bg-[#0B3A78]/45",
      "bg-linear-to-r from-[#07152B]/80 via-transparent to-[#0B3A78]/30",
    ],
  },
  {
    id: "ambar",
    nombre: "Ámbar",
    capas: [
      "bg-linear-to-r from-[#07152B]/88 via-[#3a2a10]/40 to-[#F5B400]/20",
      "bg-linear-to-t from-[#07152B]/70 via-transparent to-transparent",
    ],
  },
  {
    id: "vineta",
    nombre: "Viñeta",
    capas: [
      "bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,8,23,0.82)_100%)]",
    ],
  },
  {
    id: "inferior",
    nombre: "Inferior",
    capas: ["bg-linear-to-t from-[#07152B]/92 via-[#07152B]/25 to-transparent"],
  },
  {
    id: "cine",
    nombre: "Cine",
    capas: [
      "bg-linear-to-b from-black/70 via-transparent to-black/70",
      "bg-linear-to-r from-[#07152B]/50 via-transparent to-transparent",
    ],
  },
];

const IDS = new Set(ESTILOS_FILTRO_BANNER.map((item) => item.id));

export function normalizarFiltroBanner(valor?: string | null): string {
  const id = String(valor ?? "").trim().toLowerCase();
  if (!id) return FILTRO_BANNER_DEFAULT;
  return IDS.has(id) ? id : FILTRO_BANNER_DEFAULT;
}

export function capasFiltroBanner(valor?: string | null): string[] {
  const id = normalizarFiltroBanner(valor);
  return ESTILOS_FILTRO_BANNER.find((item) => item.id === id)?.capas ?? [];
}
