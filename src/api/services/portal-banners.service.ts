import { normalizarFiltroBanner } from "@/lib/filtro-banner";
import { supabasePrincipal } from "@/lib/supabase";

export type TipoBannerPortal = string;

export type CampoEsquemaBanner = {
  visible: boolean;
  requerido: boolean;
  label?: string;
  placeholder?: string;
  default?: string;
};

export type EsquemaCamposBanner = Record<string, CampoEsquemaBanner>;

export type CatalogoTipoBannerPortal = {
  codigo: string;
  nombre: string;
  descripcion: string;
  requiereCursoRef: boolean;
  orden: number;
  activo: boolean;
  esquemaCampos: EsquemaCamposBanner;
};

export type BannerPortalAlumno = {
  id: string;
  instalacionId?: string | null;
  orden: number;
  activo: boolean;
  tipo: TipoBannerPortal;
  etiqueta: string;
  titulo: string;
  subtitulo?: string | null;
  imagenUrl: string;
  filtroImagen?: string;
  badges: string[];
  ctaTexto: string;
  ctaUrl?: string | null;
  cursoRef?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type ImagenBannerPortal = {
  id: string;
  instalacionId: string;
  imagenUrl: string;
  nombre: string;
  creadoEn?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function esUuid(valor?: string | null): valor is string {
  return Boolean(valor && UUID_RE.test(valor.trim()));
}

function mapearCampoEsquema(raw: unknown): CampoEsquemaBanner {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    visible: obj.visible !== false,
    requerido: obj.requerido === true,
    label: typeof obj.label === "string" ? obj.label : undefined,
    placeholder:
      typeof obj.placeholder === "string" ? obj.placeholder : undefined,
    default: typeof obj.default === "string" ? obj.default : undefined,
  };
}

function mapearEsquemaCampos(raw: unknown): EsquemaCamposBanner {
  if (!raw || typeof raw !== "object") return {};
  const out: EsquemaCamposBanner = {};
  for (const [clave, valor] of Object.entries(raw as Record<string, unknown>)) {
    out[clave] = mapearCampoEsquema(valor);
  }
  return out;
}

function mapearTipo(raw: Record<string, unknown>): CatalogoTipoBannerPortal {
  return {
    codigo: String(raw.codigo ?? "").toUpperCase(),
    nombre: String(raw.nombre ?? raw.codigo ?? "Tipo"),
    descripcion: String(raw.descripcion ?? ""),
    requiereCursoRef:
      raw.requiereCursoRef === true || raw.requiere_curso_ref === true,
    orden: Number(raw.orden ?? 0),
    activo: raw.activo !== false,
    esquemaCampos: mapearEsquemaCampos(
      raw.esquemaCampos ?? raw.esquema_campos ?? {},
    ),
  };
}

function mapearBanner(raw: Record<string, unknown>): BannerPortalAlumno {
  const badgesRaw = raw.badges;
  const badges = Array.isArray(badgesRaw)
    ? badgesRaw.map((b) => String(b)).filter(Boolean)
    : [];
  return {
    id: String(raw.id ?? ""),
    instalacionId:
      (raw.instalacionId as string | null) ??
      (raw.instalacion_id as string | null) ??
      null,
    orden: Number(raw.orden ?? 0),
    activo: raw.activo !== false,
    tipo: String(raw.tipo ?? "").toUpperCase(),
    etiqueta: String(raw.etiqueta ?? ""),
    titulo: String(raw.titulo ?? "Banner"),
    subtitulo: (raw.subtitulo as string | null) ?? null,
    imagenUrl: String(raw.imagenUrl ?? raw.imagen_url ?? ""),
    filtroImagen: normalizarFiltroBanner(
      String(raw.filtroImagen ?? raw.filtro_imagen ?? ""),
    ),
    badges,
    ctaTexto: String(raw.ctaTexto ?? raw.cta_texto ?? "Ver más"),
    ctaUrl: (raw.ctaUrl as string | null) ?? (raw.cta_url as string | null) ?? null,
    cursoRef:
      (raw.cursoRef as string | null) ?? (raw.curso_ref as string | null) ?? null,
    vigenciaDesde:
      (raw.vigenciaDesde as string | null) ??
      (raw.vigencia_desde as string | null) ??
      null,
    vigenciaHasta:
      (raw.vigenciaHasta as string | null) ??
      (raw.vigencia_hasta as string | null) ??
      null,
    creadoEn: raw.creadoEn as string | undefined,
    actualizadoEn: raw.actualizadoEn as string | undefined,
  };
}

function mapearImagen(raw: Record<string, unknown>): ImagenBannerPortal {
  return {
    id: String(raw.id ?? ""),
    instalacionId: String(
      raw.instalacionId ?? raw.instalacion_id ?? "",
    ),
    imagenUrl: String(raw.imagenUrl ?? raw.imagen_url ?? ""),
    nombre: String(raw.nombre ?? "Imagen"),
    creadoEn: raw.creadoEn as string | undefined,
  };
}

async function rpcJson(nombre: string, args: Record<string, unknown> = {}) {
  const { data, error } = await supabasePrincipal().rpc(
    nombre as never,
    args as never,
  );
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

function exigirUuidInstalacion(instalacionId?: string | null): string {
  if (!esUuid(instalacionId)) {
    throw new Error(
      "Instalación inválida: se requiere un id real de organización en BD.",
    );
  }
  return instalacionId.trim();
}

export const portalBannersService = {
  /** Catálogo de tipos desde BD (portal_banner_tipo). */
  async listarTipos(): Promise<CatalogoTipoBannerPortal[]> {
    const data = await rpcJson("listar_tipos_banner_portal");
    const raw = Array.isArray(data.tipos) ? data.tipos : [];
    return raw
      .map((item) => mapearTipo(item as Record<string, unknown>))
      .filter((t) => t.codigo && t.activo)
      .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
  },

  async listarImagenes(instalacionId: string): Promise<ImagenBannerPortal[]> {
    const id = exigirUuidInstalacion(instalacionId);
    const data = await rpcJson("org_listar_imagenes_banners_portal", {
      p_instalacion_id: id,
    });
    const raw = Array.isArray(data.imagenes) ? data.imagenes : [];
    return raw
      .map((item) => mapearImagen(item as Record<string, unknown>))
      .filter((img) => img.imagenUrl.trim());
  },

  async registrarImagen(
    instalacionId: string,
    imagenUrl: string,
    nombre?: string,
  ): Promise<ImagenBannerPortal> {
    const id = exigirUuidInstalacion(instalacionId);
    const data = await rpcJson("org_registrar_imagen_banner_portal", {
      p_instalacion_id: id,
      p_imagen_url: imagenUrl,
      p_nombre: nombre ?? null,
    });
    return mapearImagen(
      (data.imagen as Record<string, unknown>) ?? {
        imagenUrl,
        nombre: nombre ?? "Imagen",
        instalacionId: id,
      },
    );
  },

  async listarOrg(instalacionId: string): Promise<BannerPortalAlumno[]> {
    const id = exigirUuidInstalacion(instalacionId);
    const data = await rpcJson("org_listar_banners_portal", {
      p_instalacion_id: id,
    });
    const raw = Array.isArray(data.banners) ? data.banners : [];
    return raw
      .map((item) => mapearBanner(item as Record<string, unknown>))
      .sort((a, b) => a.orden - b.orden);
  },

  async listarAlumno(instalacionId?: string | null): Promise<BannerPortalAlumno[]> {
    if (!instalacionId) return [];
    const id = exigirUuidInstalacion(instalacionId);
    const data = await rpcJson("alumno_listar_banners_portal", {
      p_instalacion_id: id,
    });
    const raw = Array.isArray(data.banners) ? data.banners : [];
    return raw
      .map((item) => mapearBanner(item as Record<string, unknown>))
      .slice(0, 8);
  },

  async upsert(
    instalacionId: string,
    entrada: Partial<BannerPortalAlumno> & { titulo: string },
  ): Promise<BannerPortalAlumno> {
    const id = exigirUuidInstalacion(instalacionId);
    const payload = {
      id: entrada.id,
      orden: entrada.orden ?? 0,
      activo: entrada.activo !== false,
      tipo: String(entrada.tipo ?? "").toUpperCase(),
      etiqueta: entrada.etiqueta ?? "",
      titulo: entrada.titulo,
      subtitulo: entrada.subtitulo ?? null,
      imagenUrl: entrada.imagenUrl ?? "",
      filtroImagen: normalizarFiltroBanner(entrada.filtroImagen),
      badges: entrada.badges ?? [],
      ctaTexto: entrada.ctaTexto ?? "Ver más",
      ctaUrl: entrada.ctaUrl ?? null,
      cursoRef: entrada.cursoRef ?? null,
      vigenciaDesde: entrada.vigenciaDesde ?? null,
      vigenciaHasta: entrada.vigenciaHasta ?? null,
    };
    if (!payload.tipo) {
      throw new Error("Tipo de banner requerido.");
    }
    const data = await rpcJson("org_upsert_banner_portal", {
      p_instalacion_id: id,
      p_banner: payload,
    });
    return mapearBanner((data.banner as Record<string, unknown>) ?? payload);
  },

  async eliminar(instalacionId: string, bannerId: string): Promise<void> {
    const id = exigirUuidInstalacion(instalacionId);
    await rpcJson("org_eliminar_banner_portal", {
      p_instalacion_id: id,
      p_banner_id: bannerId,
    });
  },

  async reordenar(
    instalacionId: string,
    ids: string[],
  ): Promise<BannerPortalAlumno[]> {
    const id = exigirUuidInstalacion(instalacionId);
    const data = await rpcJson("org_reordenar_banners_portal", {
      p_instalacion_id: id,
      p_ids: ids,
    });
    const raw = Array.isArray(data.banners) ? data.banners : [];
    return raw.map((item) => mapearBanner(item as Record<string, unknown>));
  },
};
