import { jsPDF } from 'jspdf'

import type { Course, UserProfile } from '@/types/academy'

export type CertificateData = {
  holderName: string
  courseTitle: string
  category: string
  duration: string
  level: string
  mode: string
  issuedAt: string
  certificateCode: string
}

const ISSUED_DATES: Record<string, string> = {
  'c-001': '15 jun 2026',
  'c-003': '28 may 2026',
  'c-008': '02 jul 2026',
}

async function loadImageAsDataUrl(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function buildCertificateData(course: Course, user: UserProfile): CertificateData {
  const suffix = course.id.replace('c-', '').padStart(4, '0')

  return {
    holderName: user.name,
    courseTitle: course.title,
    category: course.category,
    duration: course.duration,
    level: course.level,
    mode: course.mode,
    issuedAt: ISSUED_DATES[course.id] ?? '07 jul 2026',
    certificateCode: `TA-2026-${suffix}`,
  }
}

async function createCertificateDocument(data: CertificateData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const centerX = pageWidth / 2
  const navy = { r: 7, g: 21, b: 43 }
  const blue = { r: 11, g: 58, b: 120 }
  const teal = { r: 14, g: 116, b: 144 }
  const slate = { r: 71, g: 85, b: 105 }
  const yellow = { r: 245, g: 180, b: 0 }

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  doc.setDrawColor(teal.r, teal.g, teal.b)
  doc.setLineWidth(1)
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22)
  doc.setDrawColor(125, 170, 190)
  doc.setLineWidth(0.35)
  doc.rect(16, 16, pageWidth - 32, pageHeight - 32)

  doc.setFillColor(240, 247, 251)
  doc.rect(16.5, 16.5, pageWidth - 33, 23, 'F')
  doc.setFillColor(blue.r, blue.g, blue.b)
  doc.rect(16.5, 16.5, 8, pageHeight - 33, 'F')
  doc.setFillColor(yellow.r, yellow.g, yellow.b)
  doc.rect(24.5, 16.5, 2, pageHeight - 33, 'F')

  try {
    const logo = await loadImageAsDataUrl('/img/iconoTukuyAcademy.png')
    doc.addImage(logo, 'PNG', centerX - 26, 22.5, 12, 10)
  } catch {
    doc.setFillColor(blue.r, blue.g, blue.b)
    doc.roundedRect(centerX - 26, 22.5, 12, 10, 1.2, 1.2, 'F')
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(navy.r, navy.g, navy.b)
  doc.text('Tukuy', centerX - 12, 28.8)
  doc.setFont('helvetica', 'normal')
  doc.text('Academy', centerX - 1.5, 28.8)
  doc.setFontSize(5.8)
  doc.setTextColor(slate.r, slate.g, slate.b)
  doc.text('Formación, certificación y empleabilidad', centerX - 12, 32.7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(teal.r, teal.g, teal.b)
  doc.text('CERTIFICADO DE RECONOCIMIENTO', centerX, 51, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(slate.r, slate.g, slate.b)
  doc.text('Tukuy Academy certifica que', centerX, 64, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(navy.r, navy.g, navy.b)
  doc.text(data.holderName, centerX, 78.5, { align: 'center' })

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.3)
  doc.line(centerX - 72, 84, centerX + 72, 84)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(51, 65, 85)
  doc.text('ha completado satisfactoriamente el curso', centerX, 96, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(navy.r, navy.g, navy.b)
  const titleLines = doc.splitTextToSize(data.courseTitle, pageWidth - 70)
  doc.text(titleLines, centerX, 106, { align: 'center' })

  const detailsY = titleLines.length > 1 ? 122 : 116
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(slate.r, slate.g, slate.b)
  doc.text(
    `${data.category} · ${data.duration} · Nivel ${data.level} · Modalidad ${data.mode}`,
    centerX,
    detailsY,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.text(
    'Por su dedicación, desempeño y cumplimiento de los requisitos académicos del programa.',
    centerX,
    detailsY + 11,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Emitido el ${data.issuedAt} · Cusco, Perú`, centerX, detailsY + 24, { align: 'center' })

  const footerTop = pageHeight - 45
  doc.setDrawColor(226, 232, 240)
  doc.line(30, footerTop, pageWidth - 30, footerTop)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(navy.r, navy.g, navy.b)
  doc.text('Dirección Académica', 52, footerTop + 15)
  doc.text('Tukuy Academy', pageWidth - 52, footerTop + 15, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Constancia verificable', 52, footerTop + 21)
  doc.text('Plataforma Tukuy Academy & Jobs', pageWidth - 52, footerTop + 21, { align: 'right' })

  doc.setDrawColor(203, 213, 225)
  doc.line(52, footerTop + 8, 96, footerTop + 8)
  doc.line(pageWidth - 96, footerTop + 8, pageWidth - 52, footerTop + 8)

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(centerX - 40, footerTop + 9, 80, 16, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(centerX - 40, footerTop + 9, 80, 16, 2, 2, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(teal.r, teal.g, teal.b)
  doc.text(`Código: ${data.certificateCode}`, centerX, footerTop + 15, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Verificación: academy.tukuyobra.com/verificar', centerX, footerTop + 21, { align: 'center' })

  return doc
}

export async function openCertificatePdf(data: CertificateData) {
  const doc = await createCertificateDocument(data)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

export async function downloadCertificatePdf(data: CertificateData) {
  const doc = await createCertificateDocument(data)
  doc.save(`certificado-tukuy-${data.certificateCode}.pdf`)
}

export async function viewCourseCertificate(course: Course, user: UserProfile) {
  const data = buildCertificateData(course, user)
  await openCertificatePdf(data)
}
