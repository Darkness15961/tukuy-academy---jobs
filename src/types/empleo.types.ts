export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  match: number;
  postedAt: string;
  /** Fecha ISO de cierre de la vacante. Usar formatDeadline() para presentar. */
  deadlineAt: string;
  tags: string[];
};

/** Formatea deadlineAt para presentación en la UI (ej: "20 jul 2026"). */
export function formatDeadline(deadlineAt: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(deadlineAt + "T00:00:00"))
    .replace(/\./g, "");
}
