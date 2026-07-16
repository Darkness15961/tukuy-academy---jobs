export type PlanEmpresarial = {
  id: string;
  nombre: string;
  descripcion: string;
  precioMensual: number | null;
  recomendado?: boolean;
  usuarios: string;
  docentes: string;
  cursos: string;
  almacenamiento: string;
  caracteristicas: string[];
};

export const planesEmpresariales: PlanEmpresarial[] = [
  {
    id: "empresa-basica",
    nombre: "Empresa Básica",
    descripcion:
      "Para equipos que necesitan ordenar y medir su capacitación desde un solo lugar.",
    precioMensual: 690,
    usuarios: "Hasta 200",
    docentes: "Hasta 20",
    cursos: "Hasta 100",
    almacenamiento: "200 GB",
    caracteristicas: [
      "Portal propio para la organización",
      "Usuarios, equipos y áreas",
      "Asignación de cursos",
      "Certificados verificables",
      "Reportes de progreso",
      "Soporte por correo",
    ],
  },
  {
    id: "empresa-pro",
    nombre: "Empresa Pro",
    descripcion:
      "Para organizaciones que gestionan formación continua, rutas y resultados a escala.",
    precioMensual: 1890,
    recomendado: true,
    usuarios: "Hasta 1,000",
    docentes: "Ilimitados",
    cursos: "Ilimitados",
    almacenamiento: "1 TB",
    caracteristicas: [
      "Todo lo incluido en Empresa Básica",
      "Rutas de aprendizaje",
      "Reportes avanzados y exportación",
      "Bolsa Tukuy para la organización",
      "Comunidad privada por equipos",
      "Soporte prioritario",
    ],
  },
  {
    id: "corporativo",
    nombre: "Corporativo",
    descripcion:
      "Una operación diseñada a medida para grupos empresariales e instituciones complejas.",
    precioMensual: null,
    usuarios: "A medida",
    docentes: "Ilimitados",
    cursos: "Ilimitados",
    almacenamiento: "A medida",
    caracteristicas: [
      "Todo lo incluido en Empresa Pro",
      "Múltiples organizaciones o sedes",
      "Integraciones y API",
      "Inicio de sesión corporativo",
      "Acompañamiento de implementación",
      "Acuerdos de servicio personalizados",
    ],
  },
];
