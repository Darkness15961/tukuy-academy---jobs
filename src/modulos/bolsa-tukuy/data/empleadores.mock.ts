import type { EmpleadorVacante } from "../types/vacante.types";

/**
 * Catálogo simulado de empleadores para Bolsa Tukuy.
 * Internos = orgs de la plataforma; externos = datos “scraped” de portales.
 */
export const empleadoresPorEmpresa: Record<string, EmpleadorVacante> = {
  "Constructora Andes": {
    nombre: "Constructora Andes",
    origen: "plataforma",
    organizacionId: "org-andina-constructora",
    logoUrl: "/img/logo-andina-constructora.png",
    colorMarca: "#0B3A78",
  },
  "Tukuy Obra": {
    nombre: "Tukuy Obra",
    origen: "plataforma",
    organizacionId: "org-academia-tukuy",
    logoUrl: "/img/tukuyAcademia.png",
    colorMarca: "#0B3A78",
  },
  "Colegio de Ingenieros CD Cusco": {
    nombre: "Colegio de Ingenieros CD Cusco",
    origen: "plataforma",
    organizacionId: "org-empresa-abc",
    logoUrl: "/img/LogoColegioING.png",
    colorMarca: "#B87A00",
  },
  "Grupo Norte": {
    nombre: "Grupo Norte",
    origen: "externa",
    fuenteExterna: "Computrabajo",
    logoUrl: "/img/bolsa/logo-grupo-norte.svg",
    colorMarca: "#1D4ED8",
  },
  "Municipalidad Provincial Demo": {
    nombre: "Municipalidad Provincial Demo",
    origen: "externa",
    fuenteExterna: "Portal Empleo Público",
    logoUrl: "/img/bolsa/logo-muni-demo.svg",
    colorMarca: "#0F766E",
  },
  "Consorcio Vial Sur": {
    nombre: "Consorcio Vial Sur",
    origen: "externa",
    fuenteExterna: "Bumeran",
    logoUrl: "/img/bolsa/logo-consorcio-vial.svg",
    colorMarca: "#B45309",
  },
  "Consorcio Salud Lima": {
    nombre: "Consorcio Salud Lima",
    origen: "externa",
    fuenteExterna: "LinkedIn",
    logoUrl: "/img/bolsa/logo-consorcio-salud.svg",
    colorMarca: "#047857",
  },
  "Inmobiliaria Pacífico": {
    nombre: "Inmobiliaria Pacífico",
    origen: "externa",
    fuenteExterna: "Indeed",
    logoUrl: "/img/bolsa/logo-inmobiliaria-pacifico.svg",
    colorMarca: "#0369A1",
  },
  "Estudio Técnico Integral": {
    nombre: "Estudio Técnico Integral",
    origen: "externa",
    fuenteExterna: "Jooble",
    logoUrl: "/img/bolsa/logo-estudio-tecnico.svg",
    colorMarca: "#6D28D9",
  },
};

export function resolverEmpleador(empresa: string): EmpleadorVacante {
  const conocido = empleadoresPorEmpresa[empresa];
  if (conocido) return { ...conocido };

  return {
    nombre: empresa,
    origen: "externa",
    fuenteExterna: "Agregador laboral",
    colorMarca: "#0B3A78",
  };
}
