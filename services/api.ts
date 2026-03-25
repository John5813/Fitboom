/// <reference lib="es2015.promise" />

import AsyncStorage from "@react-native-async-storage/async-storage";

const fallbackBaseUrl = "https://api.fitboom.uz";

const managedEnvBaseUrl =
  (globalThis as any)?.EXPO_PUBLIC_API_BASE_URL ||
  (globalThis as any)?.EXPO_PUBLIC_DOMAIN ||
  (globalThis as any)?.API_BASE_URL;

export const API_BASE_URL = managedEnvBaseUrl || fallbackBaseUrl;
export const TOKEN_STORAGE_KEY = "fitboom_jwt_token";

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: HTTPMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function request<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const token = await getToken();

  const fetchOptions: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const json = JSON.parse(text);
      if (json?.message) {
        errorMessage = json.message;
      }
    } catch {
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }

  return (await response.text()) as unknown as T;
}

export function buildQueryKey(path: string): string[] {
  return [API_BASE_URL + path];
}

export interface LoginPayload {
  phone?: string;
  code?: string;
  email?: string;
  password?: string;
}

export const loginApi = async (payload: LoginPayload) =>
  request<{ token: string; user?: any; }>("/api/auth/login", { method: "POST", body: payload });

export const getUser = async () => request<{ user: any }>("/api/user/me");
export const getGyms = async () => request<{ gyms: any[] }>("/api/gyms");
export const getGymById = async (gymId: string) =>
  request<{ gym: any }>(`/api/gyms/${gymId}`);
export const getGymSlots = async (gymId: string) =>
  request<{ slots: any[] }>(`/api/gyms/${gymId}/slots`);
export const bookGym = async (payload: {
  gymId: string;
  timeSlotId?: string | null;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
}) => request("/api/bookings", { method: "POST", body: payload });

export const getBookings = async () => request<{ bookings: any[] }>("/api/bookings");
export const getCreditHistory = async () =>
  request<{ creditHistory: any[] }>("/api/credits/history");
export const getTopupHistory = async () =>
  request<{ topupHistory: any[] }>("/api/credits/topups");
export const logoutApi = async () => request("/api/auth/logout", { method: "POST" });
export const updateProfile = async (payload: {
  name?: string;
  age?: number;
  gender?: string;
  profileImageUrl?: string;
}) => request("/api/user/me", { method: "PUT", body: payload });
export const updateUserProfile = async (payload: {
  name: string;
  age: number;
  gender: string;
}) => request("/api/user/profile", { method: "PATCH", body: payload });

export const uploadReceipt = async (formData: FormData) => {
  const url = `${API_BASE_URL}/api/payments/upload-receipt`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers: {
      ...(await getToken() ? { Authorization: `Bearer ${await getToken()}` } : {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json();
};
