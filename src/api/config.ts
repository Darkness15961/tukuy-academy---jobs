import { env } from "@/lib/env";

export const apiConfig = {
  baseURL: env.apiUrl,
  useMock: env.useMock,
  mockDelayMs: env.useMock ? 600 : 0,
};
