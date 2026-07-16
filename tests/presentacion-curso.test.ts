import { describe, expect, test } from "bun:test";

import {
  enrichCourse,
  formatCoursePrice,
  formatCourseRating,
} from "../src/lib/presentacion-curso";
import type { Course } from "../src/types/academia";

const cursoBase: Course = {
  id: "c-002",
  title: "Control de almacén",
  category: "Logística",
  duration: "8 horas",
  level: "Basico",
  mode: "Virtual",
  progress: 0,
  status: "Disponible",
  pricing: "paid",
  price: 129,
  imageTone: "from-blue-800 to-slate-900",
  image: "/img/curso.jpg",
};

describe("presentación de cursos", () => {
  test("completa datos comerciales sin sobrescribir los recibidos", () => {
    const presentado = enrichCourse({ ...cursoBase, rating: 4.9 });

    expect(presentado.rating).toBe(4.9);
    expect(presentado.instructor).toBeTruthy();
    expect(presentado.reviewCount).toBeGreaterThan(0);
  });

  test("formatea precio y calificación para Perú", () => {
    expect(formatCoursePrice(cursoBase)).toBe("129,00 S/");
    expect(formatCoursePrice({ ...cursoBase, pricing: "free" })).toBe("Gratis");
    expect(formatCourseRating(4.8)).toBe("4,8");
  });
});
