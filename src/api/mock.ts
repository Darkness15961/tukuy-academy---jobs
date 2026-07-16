import { apiConfig } from "@/api/config";
import { delay } from "@/lib/delay";

export async function resolveMock<T>(data: T): Promise<T> {
  if (apiConfig.mockDelayMs > 0) {
    await delay(apiConfig.mockDelayMs);
  }
  return data;
}
