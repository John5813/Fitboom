/// <reference lib="es2015.promise" />

import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_API_PATH = "/api/mobile/v1";

function resolveBaseUrl(): string {
  const domain =
    (globalThis as any)?.EXPO_PUBLIC_API_BASE_URL ||
    (globalThis as any)?.EXPO_PUBLIC_DOMAIN ||
    (globalThis as any)?.API_BASE_URL;

  if (!domain) return "https://fitboom.replit.app";

  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain.replace(/\/$/, "");
  }

  return `https://${domain}`;
}

export const API_BASE_URL = resolveBaseUrl();
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
}

export const sendSmsCode = async (phone: string) =>
  request<{ message: string; expiresIn: number }>(`${BASE_API_PATH}/auth/sms/send`, {
    method: "POST",
    body: { phone },
  });

export const verifySmsCode = async (phone: string, code: string) =>
  request<{ token: string; user: any }>(`${BASE_API_PATH}/auth/sms/verify`, {
    method: "POST",
    body: { phone, code },
  });

export const loginApi = async (payload: LoginPayload) =>
  request<{ token: string; user?: any }>(`${BASE_API_PATH}/auth/login`, {
    method: "POST",
    body: payload,
  });

export const logoutApi = async () =>
  request(`${BASE_API_PATH}/auth/logout`, { method: "POST" });

export const getUser = async () =>
  request<{ user: any }>(`${BASE_API_PATH}/user/me`);

export const updateProfile = async (payload: {
  name?: string;
  age?: number;
  gender?: string;
  profileImageUrl?: string;
}) => request(`${BASE_API_PATH}/user/me`, { method: "PUT", body: payload });

export const updateUserProfile = async (payload: {
  name: string;
  age: number;
  gender: string;
}) => request(`${BASE_API_PATH}/user/profile`, { method: "PATCH", body: payload });

export const getGyms = async () =>
  request<{ gyms: any[] }>(`${BASE_API_PATH}/gyms`);

export const getGymById = async (gymId: string) =>
  request<{ gym: any }>(`${BASE_API_PATH}/gyms/${gymId}`);

export const getGymSlots = async (gymId: string, date?: string) =>
  request<{ slots: any[] }>(`${BASE_API_PATH}/gyms/${gymId}/slots${date ? `?date=${date}` : ""}`);

export const getBookings = async () =>
  request<{ bookings: any[] }>(`${BASE_API_PATH}/bookings`);

export const bookGym = async (payload: {
  gymId: string;
  timeSlotId?: string | null;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
}) => request(`${BASE_API_PATH}/bookings`, { method: "POST", body: payload });

export const cancelBooking = async (bookingId: string) =>
  request(`${BASE_API_PATH}/bookings/${bookingId}`, { method: "DELETE" });

export const getCreditHistory = async () =>
  request<{ creditHistory: any[] }>(`${BASE_API_PATH}/credits/history`);

export const getTopupHistory = async () =>
  request<{ topupHistory: any[] }>(`${BASE_API_PATH}/credits/topups`);

export const getCreditPackages = async () =>
  request<{ packages: any[] }>(`${BASE_API_PATH}/payments/packages`);

export const getPaymentConfig = async () =>
  request<{ cardNumber: string; packages: any[] }>(`${BASE_API_PATH}/payments/config`);

export const uploadReceipt = async (payload: {
  amountCredits: number;
  amountUzs: number;
  receiptUrl?: string;
}) =>
  request(`${BASE_API_PATH}/payments/upload-receipt`, {
    method: "POST",
    body: payload,
  });

export const adminLogin = async (payload: { password: string }) =>
  request<{ token: string; user: any }>(`${BASE_API_PATH}/auth/admin-login`, {
    method: "POST",
    body: payload,
  });
