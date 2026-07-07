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

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  doc.setDrawColor(14, 116, 144)
  doc.setLineWidth(1.2)
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24)
  doc.setLineWidth(0.4)
  doc.rect(16, 16, pageWidth - 32, pageHeight - 32)

  try {
    const logo = await loadImageAsDataUrl('/img/logotukuyAcademyF.png')
    doc.addImage(logo, 'PNG', centerX - 22, 22, 44, 18)
  } catch {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(7, 21, 43)
    doc.text('Tukuy Academy', centerX, 30, { align: 'center' })
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(14, 116, 144)
  doc.text('CERTIFICADO DE RECONOCIMIENTO', centerX, 52, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text('Tukuy Academy certifica que', centerX, 64, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(15, 23, 42)
  doc.text(data.holderName, centerX, 78, { align: 'center' })

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.3)
  doc.line(centerX - 70, 82, centerX + 70, 82)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(51, 65, 85)
  doc.text('ha completado satisfactoriamente el curso', centerX, 92, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(7, 21, 43)
  const titleLines = doc.splitTextToSize(data.courseTitle, pageWidth - 70)
  doc.text(titleLines, centerX, 102, { align: 'center' })

  const detailsY = titleLines.length > 1 ? 118 : 112
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
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
    detailsY + 10,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Emitido el ${data.issuedAt} · Cusco, Perú`, centerX, detailsY + 22, { align: 'center' })

  doc.setDrawColor(226, 232, 240)
  doc.line(30, pageHeight - 42, pageWidth - 30, pageHeight - 42)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text('Dirección Académica', 52, pageHeight - 28)
  doc.text('Tukuy Academy', pageWidth - 52, pageHeight - 28, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Constancia verificable', 52, pageHeight - 22)
  doc.text('Plataforma Tukuy Academy & Jobs', pageWidth - 52, pageHeight - 22, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(14, 116, 144)
  doc.text(`Código: ${data.certificateCode}`, centerX, pageHeight - 16, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Verificación: academy.tukuyobra.com/verificar', centerX, pageHeight - 10, { align: 'center' })

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
