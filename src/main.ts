import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";

import App from "@/App.vue";
import { inicializarTema } from "@/composables/useTema";
import { env } from "@/lib/env";
import router from "@/router";
import "@/style.css";

inicializarTema();

if (import.meta.env.DEV) {
  console.info(`[Tukuy Academy] API: ${env.apiUrl} · mock: ${env.useMock}`);
}

createApp(App)
  .use(PrimeVue, {
    locale: {
      firstDayOfWeek: 1,
      dayNames: [
        "domingo",
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
      ],
      dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
      dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
      monthNames: [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ],
      monthNamesShort: [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
      ],
      fileSizeTypes: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
      dateFormat: "dd/mm/yy",
      today: "Hoy",
      clear: "Limpiar",
      chooseDate: "Elegir fecha",
      prevMonth: "Mes anterior",
      nextMonth: "Mes siguiente",
      prevYear: "Año anterior",
      nextYear: "Año siguiente",
      emptyMessage: "No hay resultados disponibles",
      emptySearchMessage: "No se encontraron resultados",
      firstPageLabel: "Primera página",
      lastPageLabel: "Última página",
      nextPageLabel: "Página siguiente",
      prevPageLabel: "Página anterior",
      rowsPerPageLabel: "Filas por página",
      currentPageReportTemplate: "{first} a {last} de {totalRecords}",
    },
    theme: {
      preset: Aura,
      options: {
        // Activo solo en portales autenticados (useTema añade .dark en <html>).
        darkModeSelector: ".dark",
        cssLayer: {
          name: "primevue",
          order: "theme, base, primevue, utilities",
        },
      },
    },
  })
  .use(router)
  .mount("#app");
