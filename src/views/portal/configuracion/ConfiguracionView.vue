<script setup lang="ts">
import {
  Bell,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Palette,
  Phone,
  Shield,
  UserRound,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { authService } from "@/api/services/auth.service";
import {
  cuentaAlumnoService,
  preferenciasPorDefecto,
  type PreferenciasCuenta,
} from "@/api/services/cuenta-alumno.service";
import {
  googleCalendarService,
  type EstadoGoogleCalendar,
} from "@/api/services/google-calendar.service";
import PortalSection from "@/components/shared/PortalSection.vue";
import SelectorTema from "@/components/shared/SelectorTema.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { usePortalContext } from "../composables/usePortalContext";
import EditorNombreCuenta from "@/components/shared/EditorNombreCuenta.vue";

const portal = usePortalContext();
const route = useRoute();

const email = ref(portal.user.value?.email || "");
const phone = ref(portal.user.value?.phone || "");
const birthDate = ref(portal.user.value?.birthDate || "");
const preferencias = ref<PreferenciasCuenta>(preferenciasPorDefecto());
const proveedor = ref(portal.user.value?.authProvider || "email");
const cargando = ref(true);
const guardando = ref("");

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);

const googleCalendar = ref<EstadoGoogleCalendar>({ conectado: false });
const googleCalendarCargando = ref(false);
const googleCalendarAccion = ref("");

const cuentaGoogle = computed(
  () =>
    proveedor.value.includes("google") || proveedor.value.includes("oauth"),
);

const etiquetaProveedor = computed(() => {
  if (cuentaGoogle.value) return "Google";
  if (proveedor.value === "email") return "Correo y contraseña";
  return proveedor.value || "Correo";
});

const avisos = [
  {
    clave: "courses" as const,
    titulo: "Nuevos cursos y contenidos",
    detalle: "Avisos de publicaciones en tus cursos y en el catálogo.",
  },
  {
    clave: "jobs" as const,
    titulo: "Oportunidades laborales",
    detalle: "Alertas de vacantes cuando esté activa la bolsa Tukuy.",
  },
  {
    clave: "certificates" as const,
    titulo: "Certificados y logros",
    detalle: "Confirmaciones cuando se emita una constancia.",
  },
  {
    clave: "marketing" as const,
    titulo: "Novedades y promociones",
    detalle: "Ofertas y noticias de Tukuy Academy.",
  },
];

async function cargarCuenta() {
  cargando.value = true;
  try {
    const cuenta = await cuentaAlumnoService.obtener();
    email.value = cuenta.correo || portal.user.value?.email || "";
    phone.value = cuenta.telefono || portal.user.value?.phone || "";
    birthDate.value =
      cuenta.fechaNacimiento || portal.user.value?.birthDate || "";
    preferencias.value = cuenta.preferencias;
    proveedor.value = cuenta.proveedor || portal.user.value?.authProvider || "email";
  } catch {
    email.value = portal.user.value?.email || "";
    phone.value = portal.user.value?.phone || "";
    birthDate.value = portal.user.value?.birthDate || "";
    proveedor.value = portal.user.value?.authProvider || "email";
  } finally {
    cargando.value = false;
  }
}

async function persistirPreferencias() {
  preferencias.value = await cuentaAlumnoService
    .guardar({ preferencias: preferencias.value })
    .then((cuenta) => cuenta.preferencias);
}

async function guardarCorreo() {
  if (cuentaGoogle.value) {
    toast.info("El correo de una cuenta Google se cambia en Google, no aquí.");
    return;
  }
  guardando.value = "correo";
  try {
    await authService.cambiarCorreo(email.value);
    toast.success("Revisa tu bandeja: confirma el correo nuevo para aplicarlo.");
  } catch (causa) {
    toast.error(causa instanceof Error ? causa.message : "No se pudo cambiar el correo.");
  } finally {
    guardando.value = "";
  }
}

async function guardarTelefono() {
  guardando.value = "telefono";
  try {
    if (portal.updateUserProfile) {
      await portal.updateUserProfile({ phone: phone.value });
      phone.value = portal.user.value?.phone || phone.value;
    } else {
      const cuenta = await cuentaAlumnoService.guardar({
        telefono: phone.value,
      });
      phone.value = cuenta.telefono;
    }
    toast.success("Teléfono actualizado.");
  } catch (causa) {
    toast.error(causa instanceof Error ? causa.message : "No se pudo guardar el teléfono.");
  } finally {
    guardando.value = "";
  }
}

async function guardarFechaNacimiento() {
  guardando.value = "nacimiento";
  try {
    if (portal.updateUserProfile) {
      await portal.updateUserProfile({ birthDate: birthDate.value });
      birthDate.value = portal.user.value?.birthDate || birthDate.value;
    } else {
      const cuenta = await cuentaAlumnoService.guardar({
        fechaNacimiento: birthDate.value,
      });
      birthDate.value = cuenta.fechaNacimiento;
    }
    toast.success("Fecha de nacimiento actualizada.");
  } catch (causa) {
    toast.error(
      causa instanceof Error ? causa.message : "No se pudo guardar la fecha.",
    );
  } finally {
    guardando.value = "";
  }
}

async function guardarPassword() {
  if (cuentaGoogle.value) {
    toast.info("Esta cuenta entra con Google. La clave se gestiona allí.");
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error("La confirmación no coincide con la nueva contraseña.");
    return;
  }
  guardando.value = "password";
  try {
    await authService.cambiarPassword(currentPassword.value, newPassword.value);
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    toast.success("Contraseña actualizada.");
  } catch (causa) {
    toast.error(
      causa instanceof Error ? causa.message : "No se pudo cambiar la contraseña.",
    );
  } finally {
    guardando.value = "";
  }
}

async function guardarNotificacion(
  clave: keyof PreferenciasCuenta["notificaciones"],
) {
  const anterior = preferencias.value;
  preferencias.value = {
    ...preferencias.value,
    notificaciones: {
      ...preferencias.value.notificaciones,
      [clave]: !preferencias.value.notificaciones[clave],
    },
  };
  try {
    await persistirPreferencias();
    toast.success("Preferencias de aviso actualizadas.");
  } catch (causa) {
    preferencias.value = anterior;
    toast.error(
      causa instanceof Error ? causa.message : "No se pudieron guardar los avisos.",
    );
  }
}

async function cargarGoogleCalendar() {
  googleCalendarCargando.value = true;
  try {
    googleCalendar.value = await googleCalendarService.estado();
  } catch {
    googleCalendar.value = { conectado: false };
  } finally {
    googleCalendarCargando.value = false;
  }
}

async function conectarGoogleCalendar() {
  googleCalendarAccion.value = "conectar";
  try {
    await googleCalendarService.iniciarConexion("/tukuy-academy/configuracion");
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo conectar Google Calendar.",
    );
    googleCalendarAccion.value = "";
  }
}

async function desconectarGoogleCalendar() {
  googleCalendarAccion.value = "desconectar";
  try {
    await googleCalendarService.desconectar();
    googleCalendar.value = { conectado: false };
    toast.success("Google Calendar desconectado.");
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo desconectar Google Calendar.",
    );
  } finally {
    googleCalendarAccion.value = "";
  }
}

onMounted(() => {
  void cargarCuenta();
  void cargarGoogleCalendar();

  const resultado = route.query.googleCalendar;
  if (resultado === "ok") {
    toast.success("Google Calendar conectado. Las clases en vivo se guardarán en tu agenda.");
    void cargarGoogleCalendar();
  } else if (typeof resultado === "string" && resultado !== "ok") {
    const detalle =
      typeof route.query.googleCalendarMsg === "string"
        ? route.query.googleCalendarMsg
        : "No se pudo completar la autorización.";
    toast.error(`Google Calendar: ${detalle}`);
  }
});

function alGuardarNombre(nombre: string) {
  void portal.updateUserProfile?.({ name: nombre });
}
</script>


<template>
  <PortalSection v-if="portal.user.value" wide :centered="false">
    <section class="grid gap-7">
      <!-- Hero header -->
      <div
        class="rounded-xl border border-border bg-muted/60 p-6 shadow-sm lg:p-8"
      >
        <div
          class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <Badge
              class="border-border/60 bg-muted text-foreground"
              variant="outline"
            >
              Configuración
            </Badge>
            <h1
              class="mt-4 text-3xl font-black tracking-normal text-foreground sm:text-4xl"
            >
              Ajustes de tu cuenta
            </h1>
            <p
              class="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base"
            >
              Gestiona tu correo, contraseña, notificaciones y preferencias de
              seguridad para mantener tu cuenta protegida.
            </p>
          </div>

          <div
            class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
          >
            <div
              class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0B3A78] text-white"
            >
              <UserRound class="h-5 w-5" />
            </div>
            <div class="text-sm">
              <strong class="block text-foreground">{{
                portal.user.value.name
              }}</strong>
              <span class="text-muted-foreground">{{ email }}</span>
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="cargando"
        class="text-sm text-muted-foreground"
      >
        Cargando los datos de tu cuenta…
      </p>

      <div class="grid gap-6 xl:grid-cols-[1fr_0.55fr]">
        <!-- Left column: Main settings -->
        <div class="grid gap-6">
          <EditorNombreCuenta @guardado="alGuardarNombre" />

          <!-- Email -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Mail class="h-5 w-5 text-primary" />
                Correo electrónico
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  for="settings-email"
                >
                  Dirección de correo
                </label>
                <Input
                  id="settings-email"
                  v-model="email"
                  type="email"
                  class="h-11"
                  :disabled="cuentaGoogle || Boolean(guardando)"
                />
                <p class="mt-1.5 text-xs text-muted-foreground">
                  {{
                    cuentaGoogle
                      ? "Esta cuenta entra con Google. El correo se cambia en tu cuenta de Google."
                      : "Se usa para iniciar sesión. Te enviaremos un enlace para confirmar el cambio."
                  }}
                </p>
              </div>
              <div v-if="!cuentaGoogle" class="flex justify-end">
                <Button
                  size="sm"
                  :disabled="guardando === 'correo'"
                  @click="guardarCorreo"
                >
                  {{
                    guardando === "correo" ? "Guardando…" : "Guardar correo"
                  }}
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Phone -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Phone class="h-5 w-5 text-primary" />
                Teléfono
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  for="settings-phone"
                >
                  Número de celular
                </label>
                <Input
                  id="settings-phone"
                  v-model="phone"
                  type="tel"
                  class="h-11"
                />
                <p class="mt-1.5 text-xs text-muted-foreground">
                  Contacto de tu cuenta. No se publica en el catálogo.
                </p>
              </div>
              <div class="flex justify-end">
                <Button
                  size="sm"
                  :disabled="guardando === 'telefono'"
                  @click="guardarTelefono"
                >
                  {{
                    guardando === "telefono"
                      ? "Guardando…"
                      : "Guardar teléfono"
                  }}
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Birth Date -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <UserRound class="h-5 w-5 text-primary" />
                Fecha de nacimiento
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  for="settings-birthdate"
                >
                  Fecha de nacimiento
                </label>
                <Input
                  id="settings-birthdate"
                  v-model="birthDate"
                  type="date"
                  class="h-11"
                />
                <p class="mt-1.5 text-xs text-muted-foreground">
                  Opcional. Sirve para completar tu perfil laboral cuando
                  postules.
                </p>
              </div>
              <div class="flex justify-end">
                <Button
                  size="sm"
                  :disabled="guardando === 'nacimiento'"
                  @click="guardarFechaNacimiento"
                >
                  {{
                    guardando === "nacimiento"
                      ? "Guardando…"
                      : "Guardar fecha de nacimiento"
                  }}
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Password -->
          <Card v-if="cuentaGoogle" class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <KeyRound class="h-5 w-5 text-primary" />
                Contraseña
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">
                Entras con Google. No hay contraseña de Tukuy que cambiar aquí.
              </p>
            </CardContent>
          </Card>

          <Card v-else class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <KeyRound class="h-5 w-5 text-primary" />
                Cambiar contraseña
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  for="current-password"
                >
                  Contraseña actual
                </label>
                <div class="relative">
                  <Input
                    id="current-password"
                    v-model="currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    class="h-11 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    @click="showCurrentPassword = !showCurrentPassword"
                  >
                    <Eye v-if="!showCurrentPassword" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                    for="new-password"
                  >
                    Nueva contraseña
                  </label>
                  <div class="relative">
                    <Input
                      id="new-password"
                      v-model="newPassword"
                      :type="showNewPassword ? 'text' : 'password'"
                      class="h-11 pr-10"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      @click="showNewPassword = !showNewPassword"
                    >
                      <Eye v-if="!showNewPassword" class="h-4 w-4" />
                      <EyeOff v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                    for="confirm-password"
                  >
                    Confirmar contraseña
                  </label>
                  <Input
                    id="confirm-password"
                    v-model="confirmPassword"
                    type="password"
                    class="h-11"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>

              <div class="flex justify-end">
                <Button
                  size="sm"
                  :disabled="guardando === 'password'"
                  @click="guardarPassword"
                >
                  {{
                    guardando === "password"
                      ? "Actualizando…"
                      : "Actualizar contraseña"
                  }}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <CalendarDays class="h-5 w-5 text-primary" />
                Google Calendar
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <p class="text-sm text-muted-foreground">
                Conecta tu agenda de Google para que las clases en vivo queden
                guardadas automáticamente (fecha, hora y enlace Meet).
                {{ cuentaGoogle ? "Recomendado si entras con Google." : "" }}
              </p>

              <div
                v-if="googleCalendarCargando"
                class="text-sm text-muted-foreground"
              >
                Consultando estado de Google Calendar…
              </div>

              <template v-else-if="googleCalendar.conectado">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Conectado</Badge>
                  <span
                    v-if="googleCalendar.googleEmail"
                    class="text-sm text-foreground"
                  >
                    {{ googleCalendar.googleEmail }}
                  </span>
                </div>
                <div class="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="googleCalendarAccion === 'desconectar'"
                    @click="desconectarGoogleCalendar"
                  >
                    {{
                      googleCalendarAccion === "desconectar"
                        ? "Desconectando…"
                        : "Desconectar"
                    }}
                  </Button>
                </div>
              </template>

              <template v-else>
                <p class="text-sm text-muted-foreground">
                  Sin permiso de Calendar aún. Al conectar, Google te pedirá
                  autorizar que Tukuy agregue tus sesiones.
                </p>
                <div class="flex justify-end">
                  <Button
                    size="sm"
                    :disabled="googleCalendarAccion === 'conectar'"
                    @click="conectarGoogleCalendar"
                  >
                    {{
                      googleCalendarAccion === "conectar"
                        ? "Redirigiendo…"
                        : "Conectar Google Calendar"
                    }}
                  </Button>
                </div>
              </template>
            </CardContent>
          </Card>

          <!-- Notifications -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Bell class="h-5 w-5 text-primary" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-1">
              <button
                v-for="aviso in avisos"
                :key="aviso.clave"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition hover:bg-muted"
                @click="guardarNotificacion(aviso.clave)"
              >
                <div>
                  <strong class="block text-sm text-foreground">
                    {{ aviso.titulo }}
                  </strong>
                  <span class="text-xs text-muted-foreground">
                    {{ aviso.detalle }}
                  </span>
                </div>
                <div class="relative ml-3" aria-hidden="true">
                  <div
                    class="h-6 w-11 rounded-full transition-colors"
                    :class="
                      preferencias.notificaciones[aviso.clave]
                        ? 'bg-[#0B3A78]'
                        : 'bg-muted'
                    "
                  />
                  <div
                    class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform"
                    :class="
                      preferencias.notificaciones[aviso.clave]
                        ? 'translate-x-5'
                        : ''
                    "
                  />
                </div>
              </button>
            </CardContent>
          </Card>
        </div>

        <!-- Right column: Sidebar settings -->
        <div class="grid content-start gap-6">
          <!-- Security -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Shield class="h-5 w-5 text-primary" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-3">
              <div
                class="rounded-lg border border-border p-4"
              >
                <strong class="block text-sm text-foreground"
                  >Inicio de sesión</strong
                >
                <p class="mt-1 text-xs text-muted-foreground">
                  Método actual: {{ etiquetaProveedor }}.
                  {{
                    cuentaGoogle
                      ? "La verificación extra se gestiona en tu cuenta de Google."
                      : "Usa una contraseña de al menos 8 caracteres y no la compartas."
                  }}
                </p>
              </div>
            </CardContent>
          </Card>

          <!-- Preferences -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Palette class="h-5 w-5 text-primary" />
                Preferencias
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label
                  class="mb-2 block text-xs font-semibold uppercase text-muted-foreground"
                >
                  Tema visual
                </label>
                <p class="mb-3 text-xs text-muted-foreground">
                  Por defecto sigue el tema del sistema. Al elegir Claro u Oscuro
                  se guarda tu preferencia. La vista de inicio pública permanece
                  siempre en modo claro.
                </p>
                <SelectorTema variante="full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  </PortalSection>
</template>

