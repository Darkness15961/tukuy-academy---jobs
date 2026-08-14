/**
 * Validación técnica de imagen de firma para certificados.
 * Cada chequeo se puede mostrar en progreso (paso a paso).
 */

export type EstadoChequeoFirma = "pendiente" | "revisando" | "ok" | "error";

export type IdChequeoFirma =
  | "formato"
  | "peso"
  | "dimensiones"
  | "fondo"
  | "color"
  | "recorte"
  | "nitidez";

export type ChequeoFirma = {
  id: IdChequeoFirma;
  titulo: string;
  detalle: string;
  estado: EstadoChequeoFirma;
  mensaje?: string;
};

export const REQUISITOS_FIRMA_TEXTO = [
  "Formato: PNG (recomendado) o JPG.",
  "Fondo: transparente (PNG) o blanco limpio.",
  "Tamaño: entre 300×100 y 1200×400 px (aprox.).",
  "Nitidez: firma clara, sin pixelado fuerte.",
  "Peso máximo: 1 MB.",
  "Color: tinta negra o azul.",
  "Recorte: poco espacio vacío alrededor de la firma.",
] as const;

export const CHEQUEOS_FIRMA_INICIALES: Array<
  Omit<ChequeoFirma, "estado" | "mensaje">
> = [
  {
    id: "formato",
    titulo: "Formato de archivo",
    detalle: "PNG o JPG",
  },
  {
    id: "peso",
    titulo: "Peso del archivo",
    detalle: "Máximo 1 MB",
  },
  {
    id: "dimensiones",
    titulo: "Dimensiones",
    detalle: "Entre 300×100 y 1200×400 px",
  },
  {
    id: "fondo",
    titulo: "Fondo",
    detalle: "Transparente o blanco limpio",
  },
  {
    id: "color",
    titulo: "Color de la tinta",
    detalle: "Negro o azul",
  },
  {
    id: "recorte",
    titulo: "Recorte",
    detalle: "Sin excesivo espacio vacío",
  },
  {
    id: "nitidez",
    titulo: "Nitidez",
    detalle: "Firma legible y definida",
  },
];

const PESO_MAX_BYTES = 1_000_000;
const ANCHO_MIN = 280;
const ANCHO_MAX = 1400;
const ALTO_MIN = 80;
const ALTO_MAX = 520;
const MIME_OK = new Set(["image/png", "image/jpeg", "image/jpg"]);

type AnalisisPixels = {
  ancho: number;
  alto: number;
  tieneAlfa: boolean;
  ratioAlfa: number;
  ratioFondoClaro: number;
  ratioTintaOscura: number;
  ratioTintaAzul: number;
  ocupacionTinta: number;
  nitidez: number;
};

function pausa(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen de la firma."));
    };
    img.src = url;
  });
}

function analizarPixels(img: HTMLImageElement): AnalisisPixels {
  const canvas = document.createElement("canvas");
  const ancho = img.naturalWidth || img.width;
  const alto = img.naturalHeight || img.height;
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("No se pudo analizar la imagen.");
  }
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, ancho, alto);
  const total = ancho * alto;

  let alfa = 0;
  let fondoClaro = 0;
  let tintaOscura = 0;
  let tintaAzul = 0;
  let tinta = 0;

  // Submuestreo para nitidez (gradiente simple).
  let sumaGrad = 0;
  let muestrasGrad = 0;

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const a = data[i + 3] ?? 255;
      if (a < 250) alfa += 1;

      const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const esFondo = a < 30 || (luminancia > 235 && a > 200);
      if (esFondo) {
        fondoClaro += 1;
        continue;
      }

      tinta += 1;

      if (luminancia < 110) tintaOscura += 1;
      // Azul institucional: canal B dominante y no demasiado claro.
      if (b > r + 15 && b > g + 10 && luminancia < 180) tintaAzul += 1;

      if (x > 0 && y > 0 && x % 3 === 0 && y % 3 === 0) {
        const j = (y * ancho + (x - 1)) * 4;
        const k = ((y - 1) * ancho + x) * 4;
        const lx =
          0.2126 * (data[j] ?? 0) +
          0.7152 * (data[j + 1] ?? 0) +
          0.0722 * (data[j + 2] ?? 0);
        const ly =
          0.2126 * (data[k] ?? 0) +
          0.7152 * (data[k + 1] ?? 0) +
          0.0722 * (data[k + 2] ?? 0);
        sumaGrad += Math.abs(luminancia - lx) + Math.abs(luminancia - ly);
        muestrasGrad += 1;
      }
    }
  }

  return {
    ancho,
    alto,
    tieneAlfa: alfa / total > 0.02,
    ratioAlfa: alfa / total,
    ratioFondoClaro: fondoClaro / total,
    ratioTintaOscura: tinta > 0 ? tintaOscura / tinta : 0,
    ratioTintaAzul: tinta > 0 ? tintaAzul / tinta : 0,
    ocupacionTinta: tinta / Math.max(total, 1),
    nitidez: muestrasGrad > 0 ? sumaGrad / muestrasGrad : 0,
  };
}

export type ResultadoValidacionFirma = {
  ok: boolean;
  chequeos: ChequeoFirma[];
  analisis?: AnalisisPixels;
};

/**
 * Ejecuta validaciones en serie con pausa entre pasos (UX de progreso).
 * `onPaso` se llama en cada transición de estado.
 */
export async function validarFirmaImagenProgresiva(
  archivo: File,
  onPaso?: (chequeos: ChequeoFirma[]) => void,
  delayMs = 480,
): Promise<ResultadoValidacionFirma> {
  const chequeos: ChequeoFirma[] = CHEQUEOS_FIRMA_INICIALES.map((item) => ({
    ...item,
    estado: "pendiente" as const,
  }));

  const emitir = () => onPaso?.(chequeos.map((c) => ({ ...c })));

  const marcar = async (
    id: IdChequeoFirma,
    estado: "ok" | "error",
    mensaje: string,
  ) => {
    const item = chequeos.find((c) => c.id === id);
    if (!item) return;
    item.estado = "revisando";
    emitir();
    await pausa(delayMs);
    item.estado = estado;
    item.mensaje = mensaje;
    emitir();
    await pausa(140);
  };

  // 1) Formato
  const mime = (archivo.type || "").toLowerCase();
  const okMime =
    MIME_OK.has(mime) ||
    /\.(png|jpe?g)$/i.test(archivo.name);
  await marcar(
    "formato",
    okMime ? "ok" : "error",
    okMime
      ? mime.includes("png")
        ? "PNG detectado (ideal para fondo transparente)."
        : "JPG detectado. Preferible PNG con transparencia."
      : "Solo se aceptan PNG o JPG.",
  );
  if (!okMime) return { ok: false, chequeos };

  // 2) Peso
  const okPeso = archivo.size <= PESO_MAX_BYTES;
  await marcar(
    "peso",
    okPeso ? "ok" : "error",
    okPeso
      ? `Peso ${(archivo.size / 1024).toFixed(0)} KB.`
      : `Pesa ${(archivo.size / 1024 / 1024).toFixed(2)} MB; el máximo es 1 MB.`,
  );
  if (!okPeso) return { ok: false, chequeos };

  let analisis: AnalisisPixels;
  try {
    const img = await cargarImagen(archivo);
    analisis = analizarPixels(img);
  } catch (causa) {
    await marcar(
      "dimensiones",
      "error",
      causa instanceof Error ? causa.message : "No se pudo analizar la imagen.",
    );
    return { ok: false, chequeos };
  }

  // 3) Dimensiones
  const okDim =
    analisis.ancho >= ANCHO_MIN &&
    analisis.ancho <= ANCHO_MAX &&
    analisis.alto >= ALTO_MIN &&
    analisis.alto <= ALTO_MAX &&
    analisis.ancho >= analisis.alto;
  await marcar(
    "dimensiones",
    okDim ? "ok" : "error",
    okDim
      ? `${analisis.ancho} × ${analisis.alto} px.`
      : `Medida ${analisis.ancho} × ${analisis.alto} px. Usa aprox. 300×100 a 1200×400 px (horizontal).`,
  );
  if (!okDim) return { ok: false, chequeos };

  // 4) Fondo
  const okFondo =
    analisis.tieneAlfa || analisis.ratioFondoClaro >= 0.55;
  await marcar(
    "fondo",
    okFondo ? "ok" : "error",
    okFondo
      ? analisis.tieneAlfa
        ? "Fondo transparente detectado."
        : "Fondo claro/blanco aceptable."
      : "El fondo no es transparente ni blanco limpio. Exporta PNG con transparencia.",
  );
  if (!okFondo) return { ok: false, chequeos };

  // 5) Color
  const okColor =
    analisis.ocupacionTinta > 0.01 &&
    (analisis.ratioTintaOscura >= 0.45 || analisis.ratioTintaAzul >= 0.35);
  await marcar(
    "color",
    okColor ? "ok" : "error",
    okColor
      ? analisis.ratioTintaAzul >= analisis.ratioTintaOscura
        ? "Tinta azul detectada."
        : "Tinta oscura/negra detectada."
      : "La tinta debe ser negra o azul (evita firmas a color o muy claras).",
  );
  if (!okColor) return { ok: false, chequeos };

  // 6) Recorte
  const okRecorte =
    analisis.ocupacionTinta >= 0.04 && analisis.ocupacionTinta <= 0.55;
  await marcar(
    "recorte",
    okRecorte ? "ok" : "error",
    okRecorte
      ? "El recorte deja poco espacio vacío alrededor."
      : analisis.ocupacionTinta < 0.04
        ? "Hay demasiado espacio vacío; recorta cerca de la firma."
        : "La firma ocupa demasiado el lienzo; deja un margen limpio.",
  );
  if (!okRecorte) return { ok: false, chequeos };

  // 7) Nitidez
  const okNitidez = analisis.nitidez >= 8;
  await marcar(
    "nitidez",
    okNitidez ? "ok" : "error",
    okNitidez
      ? "La firma se ve nítida."
      : "La imagen se ve borrosa o pixelada. Sube un escaneo o captura más nítida.",
  );
  if (!okNitidez) return { ok: false, chequeos };

  return { ok: true, chequeos, analisis };
}
