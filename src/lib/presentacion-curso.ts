import type { Course } from "@/types/academia";

const INSTRUCTORS = [
  "Ing. Marco Ruiz",
  "Lic. Ana Torres",
  "Arq. Luis Quispe",
  "Mg. Carla Mendoza",
  "Ing. Jorge Vargas",
  "Lic. Patricia Soto",
];

export function enrichCourse(course: Course): Course {
  const seed = Number.parseInt(course.id.replace("c-", ""), 10) || 0;

  return {
    ...course,
    instructor: course.instructor ?? INSTRUCTORS[seed % INSTRUCTORS.length],
    rating: course.rating ?? Number((4.4 + (seed % 6) * 0.1).toFixed(1)),
    reviewCount: course.reviewCount ?? 180 + seed * 137,
    bestseller:
      course.bestseller ??
      (seed % 3 === 0 || course.id === "c-002" || course.id === "c-007"),
  };
}

export function enrichCourses(courses: Course[]) {
  return courses.map(enrichCourse);
}

export function formatCourseRating(rating: number) {
  return rating.toFixed(1).replace(".", ",");
}

export function formatCoursePrice(course: Course) {
  if (course.pricing === "free") return "Gratis";
  return `${(course.price ?? 0).toFixed(2).replace(".", ",")} S/`;
}

export function formatReviewCount(count: number) {
  return count.toLocaleString("es-PE");
}
