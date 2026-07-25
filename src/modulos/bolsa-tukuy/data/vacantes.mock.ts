import { jobs } from "@/data/academia.mock";
import { formatDeadline } from "@/types/empleo.types";
import { resolverEmpleador } from "./empleadores.mock";
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

/** Algunas vacantes se reasignan a orgs internas de demo para variedad. */
const empresaOverride: Record<string, string> = {
  "j-004": "Colegio de Ingenieros CD Cusco",
};

export const vacantesMock: Vacante[] = jobs.map((empleo, indice) => {
  const empresa = empresaOverride[empleo.id] ?? empleo.company;
  const empleador = resolverEmpleador(empresa);
  const origenLabel =
    empleador.origen === "plataforma"
      ? "publicada por una organización de la plataforma Tukuy"
      : `agregada desde ${empleador.fuenteExterna ?? "un portal laboral externo"}`;

  return {
    id: empleo.id,
    titulo: empleo.title,
    empresa: empleador.nombre,
    empleador,
    ubicacion: empleo.location,
    modalidad: modalidades[indice % modalidades.length] ?? "Presencial",
    tipoContrato: contratos[indice % contratos.length] ?? "Tiempo completo",
    compatibilidad: empleo.match,
    publicadaEn: empleo.postedAt,
    cierreEn: empleo.deadlineAt,
    cierreTexto: formatDeadline(empleo.deadlineAt),
    etiquetas: empleo.tags,
    descripcion: `Buscamos una persona comprometida con la mejora de la operación, capaz de trabajar con información técnica y coordinar con equipos de proyecto. Esta vacante fue ${origenLabel}.`,
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
  };
});
