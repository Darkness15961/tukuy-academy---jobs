import { jsPDF } from "jspdf";
import QRCode from "qrcode";

import type { Course, UserProfile } from "@/types/academia";

export type CertificateData = {
  holderName: string;
  courseTitle: string;
  category: string;
  duration: string;
  level: string;
  mode: string;
  issuedAt: string;
  certificateCode: string;
  verificationUrl?: string;
  issuerName?: string;
  issuerLogoUrl?: string;
};

const ISSUED_DATES: Record<string, string> = {
  "c-001": "15 jun 2026",
  "c-003": "28 may 2026",
  "c-008": "02 jul 2026",
};

async function loadImageAsDataUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function buildCertificateData(
  course: Course,
  user: UserProfile,
): CertificateData {
  const suffix = course.id.replace("c-", "").padStart(4, "0");

  return {
    holderName: user.name,
    courseTitle: course.title,
    category: course.category,
    duration: course.duration,
    level: course.level,
    mode: course.mode,
    issuedAt: ISSUED_DATES[course.id] ?? "07 jul 2026",
    certificateCode: `TA-2026-${suffix}`,
  };
}

async function createCertificateDocument(data: CertificateData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const navy = { r: 7, g: 21, b: 43 };
  const blue = { r: 11, g: 58, b: 120 };
  const teal = { r: 14, g: 116, b: 144 };
  const slate = { r: 71, g: 85, b: 105 };
  const yellow = { r: 245, g: 180, b: 0 };

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(teal.r, teal.g, teal.b);
  doc.setLineWidth(1);
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22);
  doc.setDrawColor(125, 170, 190);
  doc.setLineWidth(0.35);
  doc.rect(16, 16, pageWidth - 32, pageHeight - 32);

  doc.setFillColor(240, 247, 251);
  doc.rect(16.5, 16.5, pageWidth - 33, 23, "F");
  doc.setFillColor(blue.r, blue.g, blue.b);
  doc.rect(16.5, 16.5, 8, pageHeight - 33, "F");
  doc.setFillColor(yellow.r, yellow.g, yellow.b);
  doc.rect(24.5, 16.5, 2, pageHeight - 33, "F");

  try {
    const logo = await loadImageAsDataUrl("/img/iconoTukuyAcademy.png");
    doc.addImage(logo, "PNG", centerX - 26, 22.5, 12, 10);
  } catch {
    doc.setFillColor(blue.r, blue.g, blue.b);
    doc.roundedRect(centerX - 26, 22.5, 12, 10, 1.2, 1.2, "F");
  }

  if (data.issuerLogoUrl) {
    try {
      const logoEmisor = await loadImageAsDataUrl(data.issuerLogoUrl);
      doc.setFillColor(255, 255, 255);
      doc.rect(29, 19, 20, 18, "F");
      doc.addImage(logoEmisor, "PNG", 31, 20.5, 16, 15);
    } catch {
      // El nombre impreso conserva identificada a la entidad emisora.
    }
  }

  const verificationUrl =
    data.verificationUrl ??
    `${window.location.origin}/certificados/verificar/${encodeURIComponent(data.certificateCode)}`;
  try {
    const codigoQr = await QRCode.toDataURL(verificationUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#071F52", light: "#FFFFFF" },
    });
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - 48, 18.5, 28, 30.5, "F");
    doc.addImage(codigoQr, "PNG", pageWidth - 46, 20.5, 24, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(slate.r, slate.g, slate.b);
    doc.text("ESCANEA PARA VALIDAR", pageWidth - 34, 47, {
      align: "center",
    });
  } catch {
    // La URL y el código impresos mantienen disponible la verificación.
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.text("Tukuy", centerX - 12, 28.8);
  doc.setFont("helvetica", "normal");
  doc.text("Academy", centerX - 1.5, 28.8);
  doc.setFontSize(5.8);
  doc.setTextColor(slate.r, slate.g, slate.b);
  doc.text("Formación, certificación y empleabilidad", centerX - 12, 32.7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(teal.r, teal.g, teal.b);
  doc.text("CERTIFICADO DE RECONOCIMIENTO", centerX, 51, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(slate.r, slate.g, slate.b);
  doc.text(`${data.issuerName ?? "Tukuy Academy"} certifica que`, centerX, 64, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.text(data.holderName, centerX, 78.5, { align: "center" });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(centerX - 72, 84, centerX + 72, 84);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text("ha completado satisfactoriamente el curso", centerX, 96, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(navy.r, navy.g, navy.b);
  const titleLines = doc.splitTextToSize(data.courseTitle, pageWidth - 70);
  doc.text(titleLines, centerX, 106, { align: "center" });

  const detailsY = titleLines.length > 1 ? 122 : 116;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(slate.r, slate.g, slate.b);
  doc.text(
    `${data.category} · ${data.duration} · Nivel ${data.level} · Modalidad ${data.mode}`,
    centerX,
    detailsY,
    { align: "center" },
  );

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text(
    "Por su dedicación, desempeño y cumplimiento de los requisitos académicos del programa.",
    centerX,
    detailsY + 11,
    { align: "center" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Emitido el ${data.issuedAt} · Cusco, Perú`,
    centerX,
    detailsY + 24,
    { align: "center" },
  );

  const footerTop = pageHeight - 45;
  doc.setDrawColor(226, 232, 240);
  doc.line(30, footerTop, pageWidth - 30, footerTop);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.text("Dirección Académica", 52, footerTop + 15);
  doc.text("Tukuy Academy", pageWidth - 52, footerTop + 15, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Constancia verificable", 52, footerTop + 21);
  doc.text("Plataforma Tukuy Academy & Jobs", pageWidth - 52, footerTop + 21, {
    align: "right",
  });

  doc.setDrawColor(203, 213, 225);
  doc.line(52, footerTop + 8, 96, footerTop + 8);
  doc.line(pageWidth - 96, footerTop + 8, pageWidth - 52, footerTop + 8);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(centerX - 40, footerTop + 9, 80, 16, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(centerX - 40, footerTop + 9, 80, 16, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(teal.r, teal.g, teal.b);
  doc.text(`Código: ${data.certificateCode}`, centerX, footerTop + 15, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Verificación: academy.tukuyobra.com/verificar",
    centerX,
    footerTop + 21,
    { align: "center" },
  );

  return doc;
}

export async function openCertificatePdf(data: CertificateData) {
  const doc = await createCertificateDocument(data);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export async function downloadCertificatePdf(data: CertificateData) {
  const doc = await createCertificateDocument(data);
  const titular = data.holderName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`certificado-${titular}-${data.certificateCode}.pdf`);
}

export async function viewCourseCertificate(course: Course, user: UserProfile) {
  const data = buildCertificateData(course, user);
  await openCertificatePdf(data);
}

export async function downloadPortfolioPdf(
  courses: Course[],
  user: UserProfile,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const navy = { r: 7, g: 21, b: 43 };
  const blue = { r: 11, g: 58, b: 120 };
  const teal = { r: 14, g: 116, b: 144 };
  const slate = { r: 71, g: 85, b: 105 };
  const yellow = { r: 245, g: 180, b: 0 };

  // Draw Cover Page (Portrait)
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top header bar
  doc.setFillColor(blue.r, blue.g, blue.b);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setFillColor(yellow.r, yellow.g, yellow.b);
  doc.rect(0, 25, pageWidth, 2, "F");

  try {
    const logo = await loadImageAsDataUrl("/img/iconoTukuyAcademy.png");
    doc.addImage(logo, "PNG", 15, 6, 12, 10);
  } catch {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("TUKUY ACADEMY", 32, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 230, 242);
  doc.text("PORTAFOLIO PROFESIONAL DE CERTIFICACIONES", 32, 18);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.text("PORTAFOLIO DE COMPETENCIAS", centerX, 55, { align: "center" });

  // User Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(blue.r, blue.g, blue.b);
  doc.text(user.name, centerX, 75, { align: "center" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(30, 82, pageWidth - 30, 82);

  // User details / stats
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(slate.r, slate.g, slate.b);
  doc.text(
    `Identificación: ${user.name.toLowerCase().replace(/\s+/g, ".")}@tukuyobra.com`,
    centerX,
    90,
    { align: "center" },
  );
  doc.text(
    `Fecha de generación: ${new Date().toLocaleDateString("es-PE")}`,
    centerX,
    96,
    { align: "center" },
  );

  // Summary box
  doc.setFillColor(240, 247, 251);
  doc.roundedRect(20, 108, pageWidth - 40, 48, 3, 3, "F");
  doc.setDrawColor(blue.r, blue.g, blue.b);
  doc.setLineWidth(0.2);
  doc.roundedRect(20, 108, pageWidth - 40, 48, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.text("RESUMEN DEL PORTAFOLIO", 30, 118);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(slate.r, slate.g, slate.b);
  doc.text(`• Total de cursos certificados: ${courses.length}`, 30, 126);
  const totalHours = courses.reduce(
    (sum, c) => sum + Number.parseInt(c.duration, 10),
    0,
  );
  doc.text(
    `• Total de horas de capacitación técnica: ${totalHours} horas`,
    30,
    132,
  );
  doc.text(
    `• Nivel de perfil alcanzado: ${user.profileProgress ?? 80}% en el CV inteligente`,
    30,
    138,
  );
  doc.text(
    `• Código de autenticación global: TA-PORT-${user.name.substring(0, 3).toUpperCase()}`,
    30,
    144,
  );

  // Table of Certificates
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.text("PROGRAMAS CERTIFICADOS", 20, 172);

  let currentY = 182;
  courses.forEach((c, idx) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(navy.r, navy.g, navy.b);
    doc.text(`${idx + 1}. ${c.title}`, 20, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(slate.r, slate.g, slate.b);
    const suffix = c.id.replace("c-", "").padStart(4, "0");
    const certCode = `TA-2026-${suffix}`;
    doc.text(
      `Categoría: ${c.category}  |  Duración: ${c.duration}  |  Código: ${certCode}`,
      20,
      currentY + 5,
    );

    currentY += 15;
  });

  // Footnote
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Este portafolio consolida de forma digital las competencias verificadas del estudiante dentro de Tukuy Academy.",
    centerX,
    pageHeight - 15,
    { align: "center" },
  );

  // Now append each Certificate Page (Landscape A4)
  for (const c of courses) {
    doc.addPage("a4", "landscape");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const cX = pageW / 2;

    const certData = buildCertificateData(c, user);

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setDrawColor(teal.r, teal.g, teal.b);
    doc.setLineWidth(1);
    doc.rect(11, 11, pageW - 22, pageH - 22);
    doc.setDrawColor(125, 170, 190);
    doc.setLineWidth(0.35);
    doc.rect(16, 16, pageW - 32, pageH - 32);

    doc.setFillColor(240, 247, 251);
    doc.rect(16.5, 16.5, pageW - 33, 23, "F");
    doc.setFillColor(blue.r, blue.g, blue.b);
    doc.rect(16.5, 16.5, 8, pageH - 33, "F");
    doc.setFillColor(yellow.r, yellow.g, yellow.b);
    doc.rect(24.5, 16.5, 2, pageH - 33, "F");

    try {
      const logo = await loadImageAsDataUrl("/img/iconoTukuyAcademy.png");
      doc.addImage(logo, "PNG", cX - 26, 22.5, 12, 10);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(navy.r, navy.g, navy.b);
    doc.text("Tukuy", cX - 12, 28.8);
    doc.setFont("helvetica", "normal");
    doc.text("Academy", cX - 1.5, 28.8);
    doc.setFontSize(5.8);
    doc.setTextColor(slate.r, slate.g, slate.b);
    doc.text("Formación, certificación y empleabilidad", cX - 12, 32.7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text("CERTIFICADO DE RECONOCIMIENTO", cX, 51, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(slate.r, slate.g, slate.b);
    doc.text("Tukuy Academy certifica que", cX, 64, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(navy.r, navy.g, navy.b);
    doc.text(certData.holderName, cX, 78.5, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(cX - 72, 84, cX + 72, 84);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text("ha completado satisfactoriamente el curso", cX, 96, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(navy.r, navy.g, navy.b);
    const titleLines = doc.splitTextToSize(certData.courseTitle, pageW - 70);
    doc.text(titleLines, cX, 106, { align: "center" });

    const detailsY = titleLines.length > 1 ? 122 : 116;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(slate.r, slate.g, slate.b);
    doc.text(
      `${certData.category} · ${certData.duration} · Nivel ${certData.level} · Modalidad ${certData.mode}`,
      cX,
      detailsY,
      { align: "center" },
    );

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(
      "Por su dedicación, desempeño y cumplimiento de los requisitos académicos del programa.",
      cX,
      detailsY + 11,
      { align: "center" },
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Emitido el ${certData.issuedAt} · Cusco, Perú`,
      cX,
      detailsY + 24,
      { align: "center" },
    );

    const footerTop = pageH - 45;
    doc.setDrawColor(226, 232, 240);
    doc.line(30, footerTop, pageW - 30, footerTop);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(navy.r, navy.g, navy.b);
    doc.text("Dirección Académica", 52, footerTop + 15);
    doc.text("Tukuy Academy", pageW - 52, footerTop + 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Constancia verificable", 52, footerTop + 21);
    doc.text("Plataforma Tukuy Academy & Jobs", pageW - 52, footerTop + 21, {
      align: "right",
    });

    doc.setDrawColor(203, 213, 225);
    doc.line(52, footerTop + 8, 96, footerTop + 8);
    doc.line(pageW - 96, footerTop + 8, pageW - 52, footerTop + 8);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cX - 40, footerTop + 9, 80, 16, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cX - 40, footerTop + 9, 80, 16, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text(`Código: ${certData.certificateCode}`, cX, footerTop + 15, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Verificación: academy.tukuyobra.com/verificar",
      cX,
      footerTop + 21,
      { align: "center" },
    );
  }

  doc.save(
    `portafolio-certificados-${user.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
  );
}
