import { inject, provide } from "vue";
import type { ComputedRef, InjectionKey, Ref } from "vue";

import type {
  Course,
  Job,
  UserProfile,
  ViewId,
  WorkExperience,
} from "@/types/academia";

export type PricingFilter = "all" | "free" | "paid";

export type PortalContext = {
  activeView: ComputedRef<ViewId>;
  navItems: Ref<{ id: ViewId; label: string }[]>;
  user: Readonly<Ref<UserProfile | null>>;
  courses: Ref<Course[]>;
  completedCourses: ComputedRef<Course[]>;
  enrolledCourses: ComputedRef<Course[]>;
  featuredCourses: ComputedRef<Course[]>;
  topCourses: ComputedRef<Course[]>;
  catalogCourses: ComputedRef<Course[]>;
  favoriteCourses: ComputedRef<Course[]>;
  workExperiences: Ref<WorkExperience[]>;
  jobs: Ref<Job[]>;
  filteredJobs: ComputedRef<Job[]>;
  forYouJobs: ComputedRef<Job[]>;
  searchTerm: Ref<string>;
  pricingFilter: Ref<PricingFilter>;
  jobSearchTerm: Ref<string>;
  scopeFilter: Ref<"all" | "for-you">;
  dateFilter: Ref<"all" | "recent" | "closing-soon" | "this-month">;
  coursesLoading: Ref<boolean>;
  jobsLoading: Ref<boolean>;
  contentLoading: Ref<boolean>;
  openingCertificateId: Ref<string | null>;
  mensajeAccesoCurso: Ref<string>;
  cartCount: Ref<number>;
  favoritesCount: Ref<number>;
  navigate: (view: ViewId) => void;
  logout: () => void | Promise<void>;
  handleAddToCart: (courseId: string) => void;
  isInCart: (courseId: string) => boolean;
  isFavorite: (courseId: string) => boolean;
  toggleFavorite: (courseId: string) => void;
  handleViewCertificate: (course: Course) => Promise<void>;
  handleDownloadCertificate: (course: Course) => Promise<void>;
  openSimuladorCurso: (course: Course) => void | Promise<void>;
  updateUserProfile?: (updates: Partial<UserProfile>) => void | Promise<void>;
};

const portalContextKey: InjectionKey<PortalContext> = Symbol("portal-context");

export function providePortalContext(context: PortalContext) {
  provide(portalContextKey, context);
}

export function usePortalContext() {
  const context = inject(portalContextKey);

  if (!context) {
    throw new Error("usePortalContext must be used inside PortalLayout");
  }

  return context;
}

export function usePortalContextOptional() {
  return inject(portalContextKey, null);
}
