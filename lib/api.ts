import { request } from "@/services/api";

export async function apiRequest(
  path: string,
  method: string = "GET",
  body?: unknown
): Promise<any> {
  return request(path, { method: method as any, body });
}

export function buildQueryKey(path: string): string[] {
  return [path];
}
