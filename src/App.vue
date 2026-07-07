<script setup lang="ts">
import { computed, ref } from 'vue'

type ModuleId =
  | 'dashboard'
  | 'participants'
  | 'courses'
  | 'evaluations'
  | 'certificates'
  | 'cv'
  | 'jobs'
  | 'community'
  | 'communications'
  | 'settings'

type Participant = {
  id: string
  dni: string
  name: string
  location: string
  specialty: string
  trade: string
  phone: string
  email: string
  status: 'Incompleto' | 'Basico' | 'Completo' | 'Verificado' | 'Destacado'
  completeness: number
  salary: string
  availability: string
  courses: string[]
  certificates: number
  applications: number
}

type Course = {
  id: string
  title: string
  category: string
  mode: 'Virtual' | 'Presencial' | 'Mixto'
  level: 'Basico' | 'Intermedio' | 'Avanzado'
  instructor: string
  seats: number
  enrolled: number
  status: 'Publicado' | 'En curso' | 'Finalizado' | 'Borrador'
  minGrade: number
}

type Job = {
  id: string
  title: string
  company: string
  location: string
  source: string
  match: number
  status: 'Nueva' | 'Revisada' | 'Publicada' | 'Cerrada'
  deadline: string
}

const modules: { id: ModuleId; label: string; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Resumen operativo' },
  { id: 'participants', label: 'Participantes', description: 'Perfiles y datos' },
  { id: 'courses', label: 'Cursos', description: 'Academia y materiales' },
  { id: 'evaluations', label: 'Evaluaciones', description: 'Tareas y notas' },
  { id: 'certificates', label: 'Certificados', description: 'Emision y validacion' },
  { id: 'cv', label: 'CV inteligente', description: 'Perfil laboral' },
  { id: 'jobs', label: 'Oportunidades', description: 'Bolsa laboral' },
  { id: 'community', label: 'Comunidad', description: 'Sorteos e ideas' },
  { id: 'communications', label: 'Comunicaciones', description: 'Campanas y mensajes' },
  { id: 'settings', label: 'Configuracion', description: 'Roles e integraciones' },
]

const participants = ref<Participant[]>([
  {
    id: 'p-001',
    dni: '77000001',
    name: 'Carlos Alberto Quispe Huaman',
    location: 'Lima, Ate',
    specialty: 'Almacen y logistica',
    trade: 'Auxiliar de almacen',
    phone: '987 654 321',
    email: 'carlos.quispe@demo.pe',
    status: 'Verificado',
    completeness: 92,
    salary: 'S/ 1,800',
    availability: 'Inmediata',
    courses: ['Seguridad en obra', 'Excel operativo'],
    certificates: 3,
    applications: 4,
  },
  {
    id: 'p-002',
    dni: '77000002',
    name: 'Mariela Torres Cardenas',
    location: 'Callao, Ventanilla',
    specialty: 'Seguridad y salud',
    trade: 'Prevencionista SST',
    phone: '965 221 104',
    email: 'mariela.torres@demo.pe',
    status: 'Destacado',
    completeness: 98,
    salary: 'S/ 2,600',
    availability: '15 dias',
    courses: ['SST para obra', 'Primeros auxilios'],
    certificates: 5,
    applications: 2,
  },
  {
    id: 'p-003',
    dni: '77000003',
    name: 'Jorge Luis Mamani Flores',
    location: 'Arequipa, Cerro Colorado',
    specialty: 'Construccion civil',
    trade: 'Maestro de obra',
    phone: '988 430 556',
    email: 'jorge.mamani@demo.pe',
    status: 'Completo',
    completeness: 84,
    salary: 'S/ 3,200',
    availability: 'Inmediata',
    courses: ['Lectura de planos'],
    certificates: 2,
    applications: 6,
  },
  {
    id: 'p-004',
    dni: '77000004',
    name: 'Rosa Elena Salazar Poma',
    location: 'Cusco, Wanchaq',
    specialty: 'Administracion de obra',
    trade: 'Asistente administrativa',
    phone: '971 905 822',
    email: 'rosa.salazar@demo.pe',
    status: 'Basico',
    completeness: 57,
    salary: 'S/ 2,100',
    availability: '30 dias',
    courses: ['Gestion documental'],
    certificates: 1,
    applications: 1,
  },
  {
    id: 'p-005',
    dni: '77000005',
    name: 'Miguel Angel Rojas Soto',
    location: 'Lima, San Juan de Lurigancho',
    specialty: 'Electricidad',
    trade: 'Tecnico electricista',
    phone: '944 812 009',
    email: 'miguel.rojas@demo.pe',
    status: 'Incompleto',
    completeness: 38,
    salary: 'S/ 2,400',
    availability: 'Inmediata',
    courses: [],
    certificates: 0,
    applications: 0,
  },
])

const fallbackParticipant: Participant = participants.value[0]!

const courses = ref<Course[]>([
  {
    id: 'c-001',
    title: 'Seguridad y salud en trabajos de obra',
    category: 'Seguridad y salud',
    mode: 'Mixto',
    level: 'Basico',
    instructor: 'Ing. Patricia Vidal',
    seats: 40,
    enrolled: 34,
    status: 'En curso',
    minGrade: 14,
  },
  {
    id: 'c-002',
    title: 'Almacen, Kardex y control de materiales',
    category: 'Almacen y logistica',
    mode: 'Virtual',
    level: 'Intermedio',
    instructor: 'Luis Herrera',
    seats: 35,
    enrolled: 27,
    status: 'Publicado',
    minGrade: 13,
  },
  {
    id: 'c-003',
    title: 'Lectura de planos para personal de campo',
    category: 'Construccion civil',
    mode: 'Presencial',
    level: 'Intermedio',
    instructor: 'Arq. Elena Prado',
    seats: 25,
    enrolled: 22,
    status: 'En curso',
    minGrade: 14,
  },
  {
    id: 'c-004',
    title: 'Empleabilidad y CV para perfiles de obra',
    category: 'Empleabilidad',
    mode: 'Virtual',
    level: 'Basico',
    instructor: 'Tukuy Academy',
    seats: 80,
    enrolled: 61,
    status: 'Publicado',
    minGrade: 12,
  },
])

const jobs = ref<Job[]>([
  {
    id: 'j-001',
    title: 'Auxiliar de almacen para proyecto multifamiliar',
    company: 'Constructora Andes',
    location: 'Lima',
    source: 'Empresa aliada',
    match: 91,
    status: 'Publicada',
    deadline: '2026-07-20',
  },
  {
    id: 'j-002',
    title: 'Prevencionista SST junior',
    company: 'Obras Norte SAC',
    location: 'Callao',
    source: 'Computrabajo',
    match: 88,
    status: 'Revisada',
    deadline: '2026-07-16',
  },
  {
    id: 'j-003',
    title: 'Maestro de obra con experiencia en casco',
    company: 'Tukuy Obra',
    location: 'Arequipa',
    source: 'Tukuy Obra',
    match: 84,
    status: 'Nueva',
    deadline: '2026-07-28',
  },
  {
    id: 'j-004',
    title: 'Tecnico electricista para mantenimiento',
    company: 'Energia Sur',
    location: 'Lima',
    source: 'LinkedIn',
    match: 76,
    status: 'Publicada',
    deadline: '2026-08-01',
  },
])

const selectedModule = ref<ModuleId>('dashboard')
const selectedParticipantId = ref('p-001')
const participantSearch = ref('')
const jobSearch = ref('')

const selectedParticipant = computed<Participant>(
  () => participants.value.find((participant) => participant.id === selectedParticipantId.value) ?? fallbackParticipant,
)

const filteredParticipants = computed(() => {
  const term = participantSearch.value.trim().toLowerCase()
  if (!term) return participants.value
  return participants.value.filter((participant) =>
    [participant.dni, participant.name, participant.specialty, participant.location].some((value) =>
      value.toLowerCase().includes(term),
    ),
  )
})

const filteredJobs = computed(() => {
  const term = jobSearch.value.trim().toLowerCase()
  if (!term) return jobs.value
  return jobs.value.filter((job) =>
    [job.title, job.company, job.location, job.source].some((value) => value.toLowerCase().includes(term)),
  )
})

const kpis = computed(() => [
  {
    label: 'Participantes',
    value: participants.value.length.toString().padStart(2, '0'),
    detail: `${participants.value.filter((item) => item.completeness >= 80).length} perfiles listos para bolsa`,
    tone: 'blue',
  },
  {
    label: 'Cursos activos',
    value: courses.value.filter((course) => course.status === 'Publicado' || course.status === 'En curso').length,
    detail: `${courses.value.reduce((total, course) => total + course.enrolled, 0)} inscripciones simuladas`,
    tone: 'teal',
  },
  {
    label: 'Certificados',
    value: participants.value.reduce((total, participant) => total + participant.certificates, 0),
    detail: 'Con codigo de validacion y QR simulado',
    tone: 'green',
  },
  {
    label: 'Oportunidades',
    value: jobs.value.length,
    detail: `${jobs.value.filter((job) => job.match >= 85).length} con alta compatibilidad`,
    tone: 'amber',
  },
])

const roadmap = [
  'Base del sistema: login mock, roles, layout, participantes y formularios.',
  'Formacion completa: cursos, materiales, tareas, examenes, notas y certificados.',
  'Empleabilidad: historial laboral, CV inteligente, oportunidades y postulaciones.',
  'IA simulada: resumen profesional, habilidades sugeridas, mensajes y matching.',
  'Comunidad: sorteos, lluvia de ideas, cumpleanos y campanas automatizadas.',
  'Integracion Tukuy Obra: historial laboral real, certificados y bolsa de personal.',
]

function activateModule(moduleId: ModuleId) {
  selectedModule.value = moduleId
}

function selectParticipant(id: string) {
  selectedParticipantId.value = id
  selectedModule.value = 'participants'
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(' ', '-')
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="Navegacion principal">
      <div class="brand">
        <div class="brand-mark">TA</div>
        <div>
          <strong>Tukuy Academy</strong>
          <span>& Jobs</span>
        </div>
      </div>

      <nav class="module-list">
        <button
          v-for="module in modules"
          :key="module.id"
          class="module-button"
          :class="{ active: selectedModule === module.id }"
          type="button"
          @click="activateModule(module.id)"
        >
          <span>{{ module.label }}</span>
          <small>{{ module.description }}</small>
        </button>
      </nav>

      <div class="sidebar-footer">
        <span>Demo operativo</span>
        <strong>Bun + Vue + TypeScript</strong>
      </div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">Sistema simulado de formacion y empleabilidad</p>
          <h1>Tukuy Academy & Jobs</h1>
        </div>
        <div class="topbar-actions">
          <label class="global-search">
            <span>Buscar</span>
            <input v-model="participantSearch" type="search" placeholder="DNI, nombre, especialidad..." />
          </label>
          <button class="icon-button" type="button" title="Notificaciones">3</button>
          <div class="user-chip">
            <span>AD</span>
            <div>
              <strong>Admin Demo</strong>
              <small>Superadmin</small>
            </div>
          </div>
        </div>
      </header>

      <section v-if="selectedModule === 'dashboard'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Panel principal</p>
            <h2>Operacion academica y laboral</h2>
          </div>
          <button class="primary-button" type="button">+ Nueva inscripcion</button>
        </div>

        <div class="kpi-grid">
          <article v-for="kpi in kpis" :key="kpi.label" class="kpi-card" :class="`tone-${kpi.tone}`">
            <span>{{ kpi.label }}</span>
            <strong>{{ kpi.value }}</strong>
            <small>{{ kpi.detail }}</small>
          </article>
        </div>

        <div class="dashboard-grid">
          <article class="panel large">
            <div class="panel-header">
              <h3>Participantes recientes</h3>
              <button class="secondary-button" type="button" @click="activateModule('participants')">Ver todos</button>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Especialidad</th>
                    <th>Perfil</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="participant in participants.slice(0, 4)" :key="participant.id">
                    <td>
                      <strong>{{ participant.name }}</strong>
                      <small>{{ participant.dni }} · {{ participant.location }}</small>
                    </td>
                    <td>{{ participant.specialty }}</td>
                    <td>
                      <div class="progress">
                        <span :style="{ width: `${participant.completeness}%` }"></span>
                      </div>
                      <small>{{ participant.completeness }}%</small>
                    </td>
                    <td><span class="badge" :class="statusClass(participant.status)">{{ participant.status }}</span></td>
                    <td>
                      <button class="link-button" type="button" @click="selectParticipant(participant.id)">Abrir</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="panel">
            <div class="panel-header">
              <h3>Alertas</h3>
            </div>
            <ul class="activity-list">
              <li><strong>8</strong><span>tareas pendientes por calificar</span></li>
              <li><strong>5</strong><span>cumpleanos del mes listos para saludo</span></li>
              <li><strong>12</strong><span>perfiles requieren actualizar datos</span></li>
              <li><strong>4</strong><span>ofertas nuevas importadas desde fuentes externas</span></li>
            </ul>
          </article>
        </div>

        <article class="panel">
          <div class="panel-header">
            <h3>Fases de construccion recomendadas</h3>
          </div>
          <div class="roadmap">
            <div v-for="(item, index) in roadmap" :key="item" class="roadmap-item">
              <span>{{ index + 1 }}</span>
              <p>{{ item }}</p>
            </div>
          </div>
        </article>
      </section>

      <section v-else-if="selectedModule === 'participants'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Modulo de personas</p>
            <h2>Participantes y perfil laboral</h2>
          </div>
          <div class="button-row">
            <button class="secondary-button" type="button">Exportar</button>
            <button class="primary-button" type="button">+ Nuevo participante</button>
          </div>
        </div>

        <div class="split-grid">
          <article class="panel large">
            <div class="panel-header">
              <h3>Base de participantes</h3>
              <input v-model="participantSearch" class="table-search" type="search" placeholder="Filtrar tabla..." />
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Nombres</th>
                    <th>Oficio</th>
                    <th>Ubicacion</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="participant in filteredParticipants"
                    :key="participant.id"
                    class="selectable"
                    @click="selectParticipant(participant.id)"
                  >
                    <td>{{ participant.dni }}</td>
                    <td>
                      <strong>{{ participant.name }}</strong>
                      <small>{{ participant.email }}</small>
                    </td>
                    <td>{{ participant.trade }}</td>
                    <td>{{ participant.location }}</td>
                    <td><span class="badge" :class="statusClass(participant.status)">{{ participant.status }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="panel profile-panel">
            <div class="profile-header">
              <div class="avatar">{{ selectedParticipant.name.slice(0, 2).toUpperCase() }}</div>
              <div>
                <h3>{{ selectedParticipant.name }}</h3>
                <p>{{ selectedParticipant.trade }} · {{ selectedParticipant.location }}</p>
              </div>
            </div>
            <div class="profile-completeness">
              <div>
                <span>Completitud del perfil</span>
                <strong>{{ selectedParticipant.completeness }}%</strong>
              </div>
              <div class="progress large-progress">
                <span :style="{ width: `${selectedParticipant.completeness}%` }"></span>
              </div>
            </div>
            <dl class="detail-list">
              <div><dt>Telefono</dt><dd>{{ selectedParticipant.phone }}</dd></div>
              <div><dt>Pretension</dt><dd>{{ selectedParticipant.salary }}</dd></div>
              <div><dt>Disponibilidad</dt><dd>{{ selectedParticipant.availability }}</dd></div>
              <div><dt>Certificados</dt><dd>{{ selectedParticipant.certificates }}</dd></div>
            </dl>
            <div class="mini-tabs">
              <span>Perfil</span>
              <span>Historial laboral</span>
              <span>Cursos</span>
              <span>CV</span>
            </div>
            <div class="timeline">
              <div><strong>Constructora demo</strong><span>Experiencia verificada como {{ selectedParticipant.trade }}</span></div>
              <div><strong>Tukuy Academy</strong><span>{{ selectedParticipant.courses.length }} cursos registrados</span></div>
              <div><strong>Bolsa laboral</strong><span>{{ selectedParticipant.applications }} postulaciones simuladas</span></div>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="selectedModule === 'courses'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">LMS simulado</p>
            <h2>Cursos, materiales y avance</h2>
          </div>
          <button class="primary-button" type="button">+ Nuevo curso</button>
        </div>

        <div class="course-grid">
          <article v-for="course in courses" :key="course.id" class="course-card">
            <div class="course-topline">
              <span class="badge primary">{{ course.status }}</span>
              <small>{{ course.mode }}</small>
            </div>
            <h3>{{ course.title }}</h3>
            <p>{{ course.category }} · {{ course.level }}</p>
            <dl class="course-meta">
              <div><dt>Instructor</dt><dd>{{ course.instructor }}</dd></div>
              <div><dt>Inscritos</dt><dd>{{ course.enrolled }} / {{ course.seats }}</dd></div>
              <div><dt>Nota minima</dt><dd>{{ course.minGrade }}</dd></div>
            </dl>
            <div class="progress">
              <span :style="{ width: `${Math.round((course.enrolled / course.seats) * 100)}%` }"></span>
            </div>
            <div class="button-row">
              <button class="secondary-button" type="button">Materiales</button>
              <button class="secondary-button" type="button">Evaluaciones</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="selectedModule === 'evaluations'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Evaluacion academica</p>
            <h2>Tareas, examenes y calificacion</h2>
          </div>
          <button class="primary-button" type="button">+ Crear evaluacion</button>
        </div>
        <div class="three-column">
          <article class="panel metric-panel">
            <span>Pendientes</span>
            <strong>08</strong>
            <p>Tareas por revisar manualmente.</p>
          </article>
          <article class="panel metric-panel">
            <span>Automatizadas</span>
            <strong>24</strong>
            <p>Preguntas cerradas calificadas.</p>
          </article>
          <article class="panel metric-panel">
            <span>IA simulada</span>
            <strong>12</strong>
            <p>Retroalimentaciones generadas.</p>
          </article>
        </div>
        <article class="panel">
          <div class="panel-header">
            <h3>Cola de calificacion</h3>
          </div>
          <div class="kanban">
            <div><strong>Pendiente</strong><span>Examen SST - 5 entregas</span></div>
            <div><strong>Entregado</strong><span>Caso practico de almacen - 3 archivos</span></div>
            <div><strong>Observado</strong><span>Lectura de planos - 2 reenvios</span></div>
            <div><strong>Aprobado</strong><span>Empleabilidad - certificados listos</span></div>
          </div>
        </article>
      </section>

      <section v-else-if="selectedModule === 'certificates'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Validacion publica</p>
            <h2>Certificados verificables</h2>
          </div>
          <button class="primary-button" type="button">Emitir certificado</button>
        </div>
        <div class="certificate-preview">
          <article class="certificate">
            <span>Tukuy Academy</span>
            <h3>Certificado de aprobacion</h3>
            <p>Otorgado a</p>
            <strong>{{ selectedParticipant.name }}</strong>
            <p>Por aprobar el curso de Seguridad y salud en trabajos de obra con nota aprobatoria.</p>
            <div class="certificate-footer">
              <span>Codigo: TA-2026-0001</span>
              <div class="qr">QR</div>
            </div>
          </article>
          <article class="panel">
            <h3>Datos de validacion</h3>
            <dl class="detail-list">
              <div><dt>Estado</dt><dd><span class="badge completo">Emitido</span></dd></div>
              <div><dt>DNI</dt><dd>{{ selectedParticipant.dni.slice(0, 2) }}****{{ selectedParticipant.dni.slice(-2) }}</dd></div>
              <div><dt>Horas</dt><dd>24 academicas</dd></div>
              <div><dt>Fecha</dt><dd>07/07/2026</dd></div>
            </dl>
            <button class="secondary-button full" type="button">Validar codigo publico</button>
          </article>
        </div>
      </section>

      <section v-else-if="selectedModule === 'cv'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">IA simulada</p>
            <h2>Generador de CV inteligente</h2>
          </div>
          <button class="primary-button" type="button">Generar CV</button>
        </div>
        <div class="cv-layout">
          <article class="panel">
            <h3>Datos detectados</h3>
            <dl class="detail-list">
              <div><dt>Participante</dt><dd>{{ selectedParticipant.name }}</dd></div>
              <div><dt>Especialidad</dt><dd>{{ selectedParticipant.specialty }}</dd></div>
              <div><dt>Certificados</dt><dd>{{ selectedParticipant.certificates }}</dd></div>
              <div><dt>Datos faltantes</dt><dd>{{ selectedParticipant.completeness < 80 ? 'Referencias y foto' : 'Sin criticos' }}</dd></div>
            </dl>
            <div class="template-list">
              <button type="button">Operario de obra</button>
              <button type="button">Tecnico</button>
              <button type="button">Administrativo</button>
              <button type="button">Logistica</button>
            </div>
          </article>
          <article class="cv-preview">
            <div class="cv-header">
              <div class="avatar">{{ selectedParticipant.name.slice(0, 2).toUpperCase() }}</div>
              <div>
                <h3>{{ selectedParticipant.name }}</h3>
                <p>{{ selectedParticipant.trade }}</p>
              </div>
            </div>
            <h4>Resumen profesional</h4>
            <p>
              Profesional con experiencia en {{ selectedParticipant.specialty.toLowerCase() }}, participacion en
              proyectos de obra y capacidad para trabajar con equipos operativos. Perfil orientado a cumplimiento,
              seguridad y mejora continua.
            </p>
            <h4>Habilidades sugeridas</h4>
            <div class="skill-list">
              <span>Trabajo en equipo</span>
              <span>Control documentario</span>
              <span>Seguridad en obra</span>
              <span>Comunicacion</span>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="selectedModule === 'jobs'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Bolsa de oportunidades</p>
            <h2>Matching laboral y postulaciones</h2>
          </div>
          <button class="primary-button" type="button">Importar fuentes mock</button>
        </div>
        <article class="panel">
          <div class="panel-header">
            <h3>Oportunidades capturadas</h3>
            <input v-model="jobSearch" class="table-search" type="search" placeholder="Filtrar oportunidades..." />
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Puesto</th>
                  <th>Empresa</th>
                  <th>Fuente</th>
                  <th>Compatibilidad</th>
                  <th>Estado</th>
                  <th>Fecha limite</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in filteredJobs" :key="job.id">
                  <td>
                    <strong>{{ job.title }}</strong>
                    <small>{{ job.location }}</small>
                  </td>
                  <td>{{ job.company }}</td>
                  <td>{{ job.source }}</td>
                  <td>
                    <div class="match-pill">{{ job.match }}%</div>
                  </td>
                  <td><span class="badge primary">{{ job.status }}</span></td>
                  <td>{{ job.deadline }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section v-else-if="selectedModule === 'community'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Participacion</p>
            <h2>Sorteos, ideas y cumpleanos</h2>
          </div>
          <button class="primary-button" type="button">Crear sorteo</button>
        </div>
        <div class="three-column">
          <article class="panel metric-panel"><span>Sorteos activos</span><strong>05</strong><p>Incluye perfiles completos y cumpleaneros.</p></article>
          <article class="panel metric-panel"><span>Ideas recibidas</span><strong>12</strong><p>Ranking por votos y categorias.</p></article>
          <article class="panel metric-panel"><span>Cumpleanos</span><strong>05</strong><p>Mensajes listos para WhatsApp simulado.</p></article>
        </div>
        <article class="panel">
          <div class="live-draw">
            <div>
              <span>Sorteo en vivo simulado</span>
              <strong>{{ selectedParticipant.name }}</strong>
              <p>Ganador entre participantes con perfil completo y curso aprobado.</p>
            </div>
            <button class="secondary-button" type="button">Ejecutar sorteo</button>
          </div>
        </article>
      </section>

      <section v-else-if="selectedModule === 'communications'" class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Automatizacion</p>
            <h2>Campanas y plantillas</h2>
          </div>
          <button class="primary-button" type="button">Nueva campana</button>
        </div>
        <div class="message-grid">
          <article class="panel">
            <h3>Plantilla WhatsApp</h3>
            <p class="message-box">
              Hola {{ selectedParticipant.name.split(' ')[0] }}, encontramos una oportunidad laboral para
              {{ selectedParticipant.trade }}. Tu perfil coincide en 91%.
            </p>
            <button class="secondary-button" type="button">Simular envio</button>
          </article>
          <article class="panel">
            <h3>Segmentos</h3>
            <div class="skill-list">
              <span>Perfil incompleto</span>
              <span>Curso activo</span>
              <span>Certificado emitido</span>
              <span>Cumpleanos del mes</span>
              <span>Alta compatibilidad</span>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="page">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Administracion</p>
            <h2>Configuracion, roles e integraciones</h2>
          </div>
        </div>
        <div class="settings-grid">
          <article class="panel">
            <h3>Roles</h3>
            <ul class="check-list">
              <li>Superadmin</li>
              <li>Administrador Academy</li>
              <li>Instructor</li>
              <li>Evaluador</li>
              <li>Reclutador</li>
              <li>Empresa aliada</li>
            </ul>
          </article>
          <article class="panel">
            <h3>Integraciones previstas</h3>
            <ul class="check-list">
              <li>Tukuy Obra para historial laboral.</li>
              <li>WhatsApp y correo para campanas.</li>
              <li>Fuentes externas de oportunidades.</li>
              <li>Validacion publica de certificados.</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  background: #f8fafc;
  color: #111827;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 292px minmax(0, 1fr);
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid #dfe5ee;
  background: #ffffff;
  padding: 22px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 800;
}

.brand strong,
.brand span {
  display: block;
}

.brand span {
  color: #64748b;
  font-size: 13px;
}

.module-list {
  display: grid;
  gap: 6px;
}

.module-button {
  display: grid;
  gap: 3px;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 11px 12px;
  text-align: left;
}

.module-button span {
  color: #111827;
  font-weight: 700;
}

.module-button small {
  color: #6b7280;
}

.module-button.active,
.module-button:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.sidebar-footer {
  display: grid;
  gap: 4px;
  margin-top: auto;
  border-top: 1px solid #e5e7eb;
  padding-top: 18px;
  color: #6b7280;
  font-size: 13px;
}

.sidebar-footer strong {
  color: #111827;
}

.workspace {
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid #dfe5ee;
  background: rgba(248, 250, 252, 0.94);
  padding: 16px 28px;
  backdrop-filter: blur(14px);
}

.topbar h1,
.section-heading h2 {
  margin: 0;
  color: #0f172a;
  letter-spacing: 0;
}

.topbar h1 {
  font-size: 25px;
}

.eyebrow {
  margin: 0 0 5px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.global-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 330px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  padding: 9px 12px;
}

.global-search span {
  color: #6b7280;
  font-size: 13px;
}

.global-search input,
.table-search {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
}

.table-search {
  max-width: 250px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 9px 11px;
}

.icon-button {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 800;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-chip > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: #0f766e;
  color: #ffffff;
  font-weight: 800;
}

.user-chip strong,
.user-chip small {
  display: block;
}

.user-chip small {
  color: #6b7280;
}

.page {
  display: grid;
  gap: 22px;
  padding: 28px;
}

.section-heading,
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.section-heading h2 {
  font-size: 28px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary-button,
.secondary-button,
.link-button {
  border-radius: 8px;
  font-weight: 800;
}

.primary-button {
  border: 1px solid #1d4ed8;
  background: #2563eb;
  color: #ffffff;
  padding: 10px 15px;
}

.secondary-button {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
  padding: 9px 13px;
}

.link-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  padding: 6px 0;
}

.full {
  width: 100%;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi-card,
.panel,
.course-card,
.cv-preview,
.certificate {
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
}

.kpi-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.kpi-card span,
.metric-panel span {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.kpi-card strong {
  font-size: 34px;
}

.kpi-card small {
  color: #64748b;
}

.tone-blue {
  border-top: 4px solid #2563eb;
}

.tone-teal {
  border-top: 4px solid #0f766e;
}

.tone-green {
  border-top: 4px solid #16a34a;
}

.tone-amber {
  border-top: 4px solid #f59e0b;
}

.dashboard-grid,
.split-grid,
.certificate-preview,
.cv-layout,
.message-grid,
.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.8fr);
  gap: 18px;
}

.panel,
.course-card,
.cv-preview,
.certificate {
  padding: 18px;
}

.panel h3,
.course-card h3,
.cv-preview h3,
.certificate h3 {
  margin: 0;
  color: #0f172a;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 13px 12px;
  text-align: left;
  vertical-align: middle;
}

th {
  color: #64748b;
  font-size: 12px;
  text-transform: uppercase;
}

td strong,
td small {
  display: block;
}

td small {
  margin-top: 3px;
  color: #64748b;
}

.selectable {
  cursor: pointer;
}

.selectable:hover {
  background: #f8fafc;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 9px;
}

.badge.verificado,
.badge.destacado,
.badge.completo {
  background: #dcfce7;
  color: #166534;
}

.badge.basico {
  background: #fef3c7;
  color: #92400e;
}

.badge.incompleto {
  background: #fee2e2;
  color: #991b1b;
}

.badge.primary {
  background: #dbeafe;
  color: #1d4ed8;
}

.progress {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
}

.progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.activity-list,
.check-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-list li {
  display: grid;
  grid-template-columns: 44px 1fr;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #eef2f7;
  padding-bottom: 12px;
}

.activity-list strong {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
}

.roadmap {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.roadmap-item {
  display: flex;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 13px;
}

.roadmap-item span {
  display: grid;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: #0f766e;
  color: #ffffff;
  font-weight: 800;
}

.roadmap-item p {
  margin: 0;
  color: #334155;
}

.profile-panel {
  display: grid;
  align-content: start;
  gap: 18px;
}

.profile-header,
.cv-header {
  display: flex;
  align-items: center;
  gap: 13px;
}

.profile-header p {
  margin: 4px 0 0;
  color: #64748b;
}

.avatar {
  display: grid;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 900;
}

.profile-completeness {
  display: grid;
  gap: 9px;
}

.profile-completeness > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.large-progress {
  height: 11px;
}

.detail-list {
  display: grid;
  gap: 11px;
  margin: 0;
}

.detail-list div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid #eef2f7;
  padding-bottom: 10px;
}

dt {
  color: #64748b;
  font-weight: 700;
}

dd {
  margin: 0;
  text-align: right;
  font-weight: 800;
}

.mini-tabs,
.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mini-tabs span,
.skill-list span {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #ffffff;
  padding: 7px 10px;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
}

.timeline {
  display: grid;
  gap: 12px;
  border-left: 2px solid #bfdbfe;
  padding-left: 14px;
}

.timeline div {
  display: grid;
  gap: 3px;
}

.timeline span {
  color: #64748b;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.course-card {
  display: grid;
  gap: 14px;
}

.course-card p,
.metric-panel p,
.live-draw p,
.cv-preview p,
.message-box {
  color: #64748b;
}

.course-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.course-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.course-meta div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
}

.course-meta dd {
  text-align: left;
}

.three-column {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.metric-panel {
  display: grid;
  gap: 8px;
}

.metric-panel strong {
  font-size: 32px;
}

.kanban {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kanban div {
  display: grid;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.kanban span {
  color: #64748b;
}

.certificate-preview {
  align-items: start;
}

.certificate {
  display: grid;
  min-height: 430px;
  place-items: center;
  border: 8px solid #dbeafe;
  text-align: center;
}

.certificate > span {
  color: #0f766e;
  font-weight: 900;
  text-transform: uppercase;
}

.certificate h3 {
  font-size: 34px;
}

.certificate strong {
  color: #1d4ed8;
  font-size: 28px;
}

.certificate-footer {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.qr {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 2px solid #111827;
  font-weight: 900;
}

.template-list {
  display: grid;
  gap: 9px;
  margin-top: 16px;
}

.template-list button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
  text-align: left;
  font-weight: 800;
}

.cv-preview {
  display: grid;
  gap: 16px;
  border-left: 5px solid #2563eb;
}

.cv-preview h4 {
  margin: 0;
}

.match-pill {
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-weight: 900;
  padding: 6px 10px;
}

.live-draw {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.live-draw span,
.live-draw strong {
  display: block;
}

.live-draw strong {
  margin-top: 6px;
  color: #1d4ed8;
  font-size: 24px;
}

.message-box {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 14px;
}

.check-list li {
  border-bottom: 1px solid #eef2f7;
  padding-bottom: 10px;
}

@media (max-width: 1180px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
  }

  .module-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .topbar {
    position: static;
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .global-search {
    min-width: min(100%, 330px);
  }

  .kpi-grid,
  .roadmap,
  .three-column,
  .kanban {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid,
  .split-grid,
  .certificate-preview,
  .cv-layout,
  .message-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page,
  .topbar,
  .sidebar {
    padding: 18px;
  }

  .module-list,
  .kpi-grid,
  .course-grid,
  .roadmap,
  .three-column,
  .kanban,
  .course-meta {
    grid-template-columns: 1fr;
  }

  .section-heading,
  .panel-header,
  .live-draw {
    align-items: stretch;
    flex-direction: column;
  }

  .section-heading h2 {
    font-size: 24px;
  }

  .table-search {
    max-width: none;
  }
}
</style>
