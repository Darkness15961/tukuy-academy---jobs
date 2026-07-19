<script setup lang="ts">
import { GitBranch, UsersRound } from "lucide-vue-next";

export interface NodoOrganigramaEntidad {
  id: string;
  nombre: string;
  codigo?: string;
  tipo: string;
  responsable: string;
  responsableIniciales?: string;
  miembros: number;
  color: string;
  permiteSubunidades: boolean;
  editable: boolean;
  puedeAgregarSubunidad: boolean;
  puedeAgregarMismoNivel: boolean;
  hijos: NodoOrganigramaEntidad[];
}

defineProps<{
  nodo: NodoOrganigramaEntidad;
}>();

const emit = defineEmits<{
  seleccionar: [nodo: NodoOrganigramaEntidad];
  agregarSubnivel: [nodo: NodoOrganigramaEntidad];
  agregarMismoNivel: [
    nodo: NodoOrganigramaEntidad,
    lado: "IZQUIERDA" | "DERECHA",
  ];
}>();

function iniciales(nombre: string, fallback?: string) {
  if (fallback?.trim()) return fallback.trim().slice(0, 3).toUpperCase();
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length || nombre === "Sin responsable") return "—";
  return partes
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase();
}
</script>

<template>
  <li class="nodo-rama">
    <div class="nodo-contenido">
      <button
        type="button"
      class="nodo-tarjeta"
      :class="{ 'nodo-tarjeta-bloqueada': !nodo.editable }"
      :style="{ '--color-unidad': nodo.color }"
      :disabled="!nodo.editable"
        :aria-label="`Editar ${nodo.nombre}`"
        @click="emit('seleccionar', nodo)"
      >
        <div class="nodo-tipo">
          <GitBranch class="h-3.5 w-3.5" />
          <span>{{ nodo.tipo }}</span>
          <small v-if="nodo.codigo">{{ nodo.codigo }}</small>
        </div>
        <h3>{{ nodo.nombre }}</h3>
        <div class="nodo-perfil">
          <span class="nodo-avatar" aria-hidden="true">
            {{ iniciales(nodo.responsable, nodo.responsableIniciales) }}
          </span>
          <div>
            <small>Responsable</small>
            <p>{{ nodo.responsable }}</p>
          </div>
        </div>
        <div class="nodo-miembros">
          <UsersRound class="h-3.5 w-3.5" />
          {{ nodo.miembros }} {{ nodo.miembros === 1 ? "miembro" : "miembros" }}
        </div>
      </button>
      <button
        v-if="nodo.permiteSubunidades && nodo.puedeAgregarSubunidad"
        type="button"
        class="nodo-agregar nodo-agregar-inferior"
        :aria-label="`Agregar subnivel a ${nodo.nombre}`"
        :title="`Agregar subnivel debajo de ${nodo.nombre}`"
        @click.stop="emit('agregarSubnivel', nodo)"
      >
        +
      </button>
      <button
        v-if="nodo.puedeAgregarMismoNivel"
        type="button"
        class="nodo-agregar nodo-agregar-lateral nodo-agregar-izquierda"
        :aria-label="`Agregar unidad a la izquierda de ${nodo.nombre}`"
        :title="`Agregar al mismo nivel, a la izquierda de ${nodo.nombre}`"
        @click.stop="emit('agregarMismoNivel', nodo, 'IZQUIERDA')"
      >
        +
      </button>
      <button
        v-if="nodo.puedeAgregarMismoNivel"
        type="button"
        class="nodo-agregar nodo-agregar-lateral nodo-agregar-derecha"
        :aria-label="`Agregar unidad a la derecha de ${nodo.nombre}`"
        :title="`Agregar al mismo nivel, a la derecha de ${nodo.nombre}`"
        @click.stop="emit('agregarMismoNivel', nodo, 'DERECHA')"
      >
        +
      </button>
    </div>

    <ul v-if="nodo.hijos.length" class="nivel-hijos">
      <NodoOrganigrama
        v-for="hijo in nodo.hijos"
        :key="hijo.id"
        :nodo="hijo"
        @seleccionar="emit('seleccionar', $event)"
        @agregar-subnivel="emit('agregarSubnivel', $event)"
        @agregar-mismo-nivel="
          (nodoHermano, lado) => emit('agregarMismoNivel', nodoHermano, lado)
        "
      />
    </ul>
  </li>
</template>

<style scoped>
.nodo-rama {
  position: relative;
  list-style: none;
  padding: 1.75rem 0.5rem 0;
  text-align: center;
}

.nodo-rama::before,
.nodo-rama::after {
  position: absolute;
  top: 0;
  width: 50%;
  height: 1.75rem;
  border-top: 2px solid color-mix(in srgb, var(--color-primary) 55%, #94a3b8);
  content: "";
}

.nodo-rama::before {
  right: 50%;
}

.nodo-rama::after {
  left: 50%;
  border-left: 2px solid color-mix(in srgb, var(--color-primary) 55%, #94a3b8);
}

.nodo-rama:first-child::before,
.nodo-rama:last-child::after {
  border: 0;
}

.nodo-rama:last-child::before {
  border-right: 2px solid color-mix(in srgb, var(--color-primary) 55%, #94a3b8);
  border-radius: 0 4px 0 0;
}

.nodo-rama:only-child {
  padding-top: 1.25rem;
}

.nodo-rama:only-child::before {
  display: none;
}

.nodo-rama:only-child::after {
  left: 50%;
  width: 0;
  height: 1.25rem;
  border-top: 0;
  border-left: 2px solid color-mix(in srgb, var(--color-primary) 55%, #94a3b8);
  transform: translateX(-50%);
}

.nodo-tarjeta {
  display: inline-grid;
  width: 15.5rem;
  min-height: 10rem;
  border: 1px solid var(--color-border);
  border-top: 4px solid var(--color-unidad);
  background: var(--color-card);
  padding: 1rem;
  text-align: left;
  box-shadow: 0 12px 30px rgb(15 38 71 / 8%);
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.nodo-contenido {
  position: relative;
  display: inline-block;
}

.nodo-tarjeta:hover,
.nodo-tarjeta:focus-visible {
  border-color: var(--color-unidad);
  box-shadow: 0 18px 38px rgb(15 38 71 / 16%);
  outline: none;
  transform: translateY(-2px);
}

.nodo-tarjeta-bloqueada,
.nodo-tarjeta-bloqueada:hover {
  border-right-color: var(--color-border);
  border-bottom-color: var(--color-border);
  border-left-color: var(--color-border);
  box-shadow: 0 12px 30px rgb(15 38 71 / 8%);
  cursor: default;
  transform: none;
}

.nodo-tipo {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-unidad);
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nodo-tipo small {
  margin-left: auto;
  color: var(--color-muted-foreground);
  font-size: 0.6rem;
}

.nodo-tarjeta h3 {
  margin-top: 0.8rem;
  color: var(--color-foreground);
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1.25;
}

.nodo-perfil {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.nodo-avatar {
  display: grid;
  width: 2.15rem;
  height: 2.15rem;
  flex: none;
  place-items: center;
  background: color-mix(in srgb, var(--color-unidad) 16%, transparent);
  color: var(--color-unidad);
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.nodo-perfil small {
  display: block;
  color: var(--color-muted-foreground);
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nodo-perfil p {
  margin: 0.1rem 0 0;
  color: var(--color-foreground);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.25;
}

.nodo-miembros {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  align-self: end;
  margin-top: 0.85rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.65rem;
  color: var(--color-muted-foreground);
  font-size: 0.68rem;
  font-weight: 700;
}

.nodo-agregar {
  position: absolute;
  z-index: 3;
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  place-items: center;
  border: 2px solid var(--color-card);
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 5px 14px rgb(15 38 71 / 22%);
  opacity: 0;
  pointer-events: none;
  transition:
    background 160ms ease,
    transform 160ms ease;
}

.nodo-contenido:hover .nodo-agregar,
.nodo-contenido:focus-within .nodo-agregar {
  opacity: 1;
  pointer-events: auto;
}

.nodo-agregar:hover,
.nodo-agregar:focus-visible {
  background: var(--color-accent);
  color: #082f66;
  outline: none;
  transform: scale(1.08);
}

.nodo-agregar-inferior {
  bottom: -0.9rem;
  left: 50%;
  transform: translateX(-50%);
}

.nodo-agregar-inferior:hover,
.nodo-agregar-inferior:focus-visible {
  transform: translateX(-50%) scale(1.08);
}

.nodo-agregar-lateral {
  top: 50%;
  transform: translateY(-50%);
}

.nodo-agregar-derecha {
  right: -0.9rem;
}

.nodo-agregar-izquierda {
  left: -0.9rem;
}

.nodo-agregar-lateral:hover,
.nodo-agregar-lateral:focus-visible {
  transform: translateY(-50%) scale(1.08);
}

.nivel-hijos {
  position: relative;
  display: flex;
  justify-content: center;
  margin: 0;
  list-style: none;
  padding: 1.75rem 0 0;
}

.nivel-hijos::before {
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 1.75rem;
  border-left: 2px solid color-mix(in srgb, var(--color-primary) 55%, #94a3b8);
  content: "";
  transform: translateX(-50%);
}
</style>
