<script setup lang="ts">
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Presentation,
  ShieldCheck,
  UsersRound,
} from "lucide-vue-next";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/composables/useAuth";
import { useContextoSesion } from "@/composables/useContextoSesion";

const router = useRouter();
const { contextoActivo } = useContextoSesion();
const { logout } = useAuth();

const contenido = computed(() => {
  if (contextoActivo.value?.portal === "docente") {
    return {
      titulo: "Portal del docente",
      descripcion:
        "La base de acceso está lista. El siguiente módulo será el constructor y la gestión de cursos.",
      icono: Presentation,
    };
  }
  if (contextoActivo.value?.portal === "organizacion") {
    return {
      titulo: "Portal de la organización",
      descripcion:
        "La base de acceso está lista. Aquí se incorporarán usuarios, asignaciones, reportes y licencias.",
      icono: Building2,
    };
  }
  if (contextoActivo.value?.portal === "admin") {
    return {
      titulo: "Administración Tukuy",
      descripcion:
        "La base de acceso está lista para administrar organizaciones, planes, licencias y auditoría.",
      icono: ShieldCheck,
    };
  }
  return {
    titulo: "Portal del estudiante",
    descripcion: "Accede al catálogo y continúa tu aprendizaje.",
    icono: GraduationCap,
  };
});
</script>

<template>
  <main
    class="relative grid min-h-screen place-items-center overflow-hidden bg-background p-5 text-foreground"
  >
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-80 bg-linear-to-b from-[#EAF2FF] to-transparent"
    />
    <div
      class="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl"
    />
    <Card
      class="relative w-full max-w-2xl border-border bg-white shadow-[0_20px_60px_rgba(15,45,85,0.10)]"
    >
      <CardContent
        class="grid justify-items-center gap-6 p-8 text-center sm:p-12"
      >
        <img
          class="h-12 w-auto"
          src="/img/iconoTukuyAcademy.png"
          alt="Tukuy Academy"
        />
        <div
          class="grid h-16 w-16 place-items-center rounded-xl bg-primary/10 text-primary"
        >
          <component :is="contenido.icono" class="h-8 w-8" />
        </div>
        <div>
          <p class="text-sm font-semibold text-primary">
            {{ contextoActivo?.organizacionNombre }}
          </p>
          <h1 class="mt-2 text-3xl font-black">{{ contenido.titulo }}</h1>
          <p class="mt-4 leading-7 text-[#64748B]">
            {{ contenido.descripcion }}
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-3">
          <Button
            class="bg-[#0B3A78] text-white hover:bg-[#072D5E]"
            @click="router.push('/bolsa-tukuy')"
          >
            <BriefcaseBusiness class="h-4 w-4" />
            Bolsa Tukuy
          </Button>
          <Button
            class="bg-[#0B3A78] text-white hover:bg-[#072D5E]"
            @click="router.push('/comunidad')"
          >
            <UsersRound class="h-4 w-4" />
            Comunidad Tukuy
          </Button>
          <Button
            variant="outline"
            @click="router.push('/seleccionar-contexto')"
          >
            <ArrowLeftRight class="h-4 w-4" />
            Cambiar perfil
          </Button>
          <Button
            variant="outline"
            class="border-border bg-white text-muted-foreground"
            @click="logout"
          >
            Cerrar sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  </main>
</template>
