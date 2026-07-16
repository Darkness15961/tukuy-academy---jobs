export type WorkExperience = {
  id: string;
  source: "Tukuy Obra" | "SIADEG" | "Manual";
  project: string;
  role: string;
  location: string;
  period: string;
  modules: string[];
  status: "Importado" | "Declarado" | "Verificado";
  summary: string;
};

export type UserProfile = {
  name: string;
  initials: string;
  trade: string;
  specialty: string;
  location: string;
  profileProgress: number;
  employabilityScore: number;
  certificates: number;
  applications: number;
  birthDate?: string;
};
