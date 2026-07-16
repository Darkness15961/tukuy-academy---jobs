import { jobs } from "@/data/academia.mock";
import type {
  ModalidadVacante,
  TipoContrato,
  Vacante,
} from "../types/vacante.types";

const modalidades: ModalidadVacante[] = ["Presencial", "Híbrido", "Remoto"];
const contratos: TipoContrato[] = [
  "Tiempo completo",
  "Por proyecto",
  "Prácticas",
  "Medio tiempo",
];

export const vacantesMock: Vacante[] = jobs.map((empleo, indice) => ({
  id: empleo.id,
  titulo: empleo.title,
  empresa: empleo.company,
  ubicacion: empleo.location,
  modalidad: modalidades[indice % modalidades.length] ?? "Presencial",
  tipoContrato: contratos[indice % contratos.length] ?? "Tiempo completo",
  compatibilidad: empleo.match,
  publicadaEn: empleo.postedAt,
  cierreEn: empleo.deadlineAt,
  cierreTexto: empleo.deadline,
  etiquetas: empleo.tags,
  descripcion:
    "Buscamos una persona comprometida con la mejora de la operación, capaz de trabajar con información técnica y coordinar con equipos de proyecto.",
  responsabilidades: [
    "Registrar y mantener información operativa actualizada.",
    "Coordinar entregables con el equipo responsable del proyecto.",
    "Preparar reportes y evidencias para la toma de decisiones.",
  ],
  requisitos: [
    `Experiencia o formación relacionada con ${empleo.tags[0] ?? "el puesto"}.`,
    "Comunicación efectiva y capacidad de organización.",
    "Disponibilidad para trabajar según las condiciones de la vacante.",
  ],
  salario: indice % 3 === 0 ? "S/ 2 800 – S/ 3 600" : undefined,
  destacada: empleo.match >= 88,
  estado: "publicada",
}));

