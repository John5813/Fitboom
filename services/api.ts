import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://fitboom--moydinovjavlon4.replit.app/api/mobile/v1";

export function fixImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace("https://fitboom--moydinovjavlon4.replit.app/api/images/", "https://fitboom--moydinovjavlon4.replit.app/images/");
}

const ACCESS_TOKEN_KEY = "fitboom_access_token";
const REFRESH_TOKEN_KEY = "fitboom_refresh_token";

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

export async function getToken(): Promise<string | null> {
  return getAccessToken();
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    await clearTokens();
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const json = await res.json();
      const newToken = json?.data?.accessToken || json?.accessToken;
      if (newToken) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newToken);
        return newToken;
      }
      await clearTokens();
      return null;
    } catch {
      await clearTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: HTTPMethod;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

async function rawRequest(
  path: string,
  options: ApiRequestOptions = {},
  token?: string | null
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
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
  return fetch(url, fetchOptions);
}

export async function request<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  let token = options.skipAuth ? null : await getAccessToken();
  console.log(`[API] ${options.method || "GET"} ${path} | token: ${token ? "yes(" + token.slice(0,8) + "...)" : "NO"}`);

  let response: Response;
  try {
    response = await rawRequest(path, options, token);
  } catch (fetchErr) {
    console.error(`[API] Network error for ${path}:`, fetchErr);
    throw new Error("Internet aloqasi yo'q yoki server javob bermayapti");
  }

  console.log(`[API] ${options.method || "GET"} ${path} => HTTP ${response.status}`);

  if (response.status === 401 && !options.skipAuth) {
    console.log("[API] 401 — refreshing token...");
    const newToken = await tryRefreshToken();
    if (newToken) {
      try {
        response = await rawRequest(path, options, newToken);
        console.log(`[API] Retry => HTTP ${response.status}`);
      } catch (retryErr) {
        console.error("[API] Retry network error:", retryErr);
        throw new Error("Internet aloqasi yo'q yoki server javob bermayapti");
      }
    } else {
      console.error("[API] Token refresh failed — session expired");
      throw new Error("Sessiya tugadi. Qayta tizimga kiring.");
    }
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  console.log(`[API] ${options.method || "GET"} ${path} body:`, text.slice(0, 300));

  if (!text || text.trim() === "") {
    if (!response.ok) throw new Error(`Server xatosi (HTTP ${response.status})`);
    return null as T;
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    if (!response.ok) throw new Error(`Server xatosi (HTTP ${response.status})`);
    if (!contentType.includes("application/json")) return null as T;
    throw new Error("Server noto'g'ri javob qaytardi");
  }

  if (!response.ok) {
    const msg =
      json?.error ||
      json?.message ||
      json?.data?.message ||
      `Server xatosi (HTTP ${response.status})`;
    throw new Error(msg);
  }

  if (json?.success === false) {
    throw new Error(json?.error || "Xatolik yuz berdi");
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

async function multipartRequest<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = await getAccessToken();
  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch {
    throw new Error("API ishlamadi");
  }

  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${newToken}` },
          body: formData,
        });
      } catch {
        throw new Error("API ishlamadi");
      }
    } else {
      throw new Error("SESSION_EXPIRED");
    }
  }

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("API ishlamadi");
  }

  if (!response.ok) {
    const msg = json?.error || json?.message || json?.data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  if (json?.success === false) {
    throw new Error(json?.error || "Xatolik yuz berdi");
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

export interface LoginPayload {
  phone?: string;
  code?: string;
}

export const sendSmsCode = async (phone: string) => {
  try {
    const result = await request<{ message: string }>("/auth/sms/send", {
      method: "POST",
      body: { phone },
      skipAuth: true,
    });
    console.log("[SMS send] success:", result);
    return result;
  } catch (err) {
    console.log("[SMS send] error:", err);
    throw err;
  }
};

export interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  user: {
    id: string;
    phone: string;
    name: string | null;
    profileCompleted: boolean;
    credits: number;
  };
}

export const verifySmsCode = async (phone: string, code: string) =>
  request<VerifyResponse>("/auth/sms/verify", {
    method: "POST",
    body: { phone, code },
    skipAuth: true,
  });

export const verifyTelegramCode = async (code: string) =>
  request<VerifyResponse>("/auth/telegram/verify", {
    method: "POST",
    body: { code },
    skipAuth: true,
  });

export const refreshAuthToken = async (refreshToken: string) =>
  request<{ accessToken: string; user: any }>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuth: true,
  });

export const logoutApi = async () =>
  request("/auth/logout", { method: "POST" });

export const loginApi = async (payload: LoginPayload) =>
  request<{ token: string; user?: any }>("/auth/login", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });

export const adminLogin = async (payload: { password: string }) =>
  request<{ token: string; user: any }>("/auth/admin-login", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });

export const getUser = async () =>
  request<{ user: any }>("/user/me");

export const updateProfile = async (payload: {
  name?: string;
  age?: number;
  gender?: string;
  profileImageUrl?: string;
}) => request("/user/me", { method: "PUT", body: payload });

export const completeProfile = async (payload: {
  name: string;
  age: number;
  gender: "Erkak" | "Ayol";
}) =>
  request<{ user: any }>("/auth/complete-profile", {
    method: "POST",
    body: payload,
  });

export const updateUserProfile = async (payload: {
  name: string;
  age: number;
  gender: string;
}) => request("/user/profile", { method: "PATCH", body: payload });

export const uploadAvatar = async (imageUri: string): Promise<{ imageUrl: string; user: any }> => {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "avatar.jpg",
  } as any);
  return multipartRequest<{ imageUrl: string; user: any }>("/user/avatar", formData);
};

export const getCategories = async (): Promise<{ categories: any[] }> =>
  request<{ categories: any[] }>("/categories");

export const getGyms = async (category?: string) =>
  request<{ gyms: any[] }>(`/gyms${category ? `?category=${category}` : ""}`);

export const getGymById = async (gymId: string) =>
  request<{ gym: any }>(`/gyms/${gymId}`);

export const getGymSlots = async (gymId: string, date?: string) =>
  request<{
    date: string;
    dayOfWeek: string;
    dayNum: number;
    is_day_off: boolean;
    isClosed: boolean;
    slots: any[];
    message?: string;
  }>(`/gyms/${gymId}/slots${date ? `?date=${date}` : ""}`);

export const getBookings = async (): Promise<{ bookings: any[]; total: number }> => {
  const result: any = await request("/bookings");
  const inner = result?.bookings !== undefined ? result : (result?.data ?? result);
  return {
    bookings: inner?.bookings ?? [],
    total: inner?.total ?? 0,
  };
};

export const bookGym = async (payload: {
  gymId: string;
  timeSlotId?: string | null;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
}) => request("/bookings", { method: "POST", body: payload });

export async function cancelBooking(bookingId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || "Bronni bekor qilishda xatolik");
  }

  return json.data;
}

export async function verifyQr(rawQrString: string, accessToken?: string) {
  const token = accessToken || (await getAccessToken());
  if (!token) throw new Error("Sessiya tugadi. Qayta tizimga kiring.");

  const response = await fetch(`${BASE_URL}/bookings/verify-qr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ qrData: rawQrString }),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || "QR tekshirishda xatolik");
  }

  return json.data as {
    message: string;
    gym: { id: string; name: string; imageUrl: string };
    booking: {
      id: string;
      gymId: string;
      date: string;
      scheduledStartTime: string;
      scheduledEndTime: string;
      isCompleted: boolean;
      status: string;
    };
    visitRecorded: boolean;
  };
}

export const getCredits = async () =>
  request<{ credits: number; creditExpiryDate?: string; daysUntilExpiry?: number; packages: any[] }>("/credits");

export const getCreditHistory = async () => getCredits();
export const getTopupHistory = async () => getCredits();
export const getCreditPackages = async () => getCredits();
export const getPaymentConfig = async () => getCredits();

export interface PurchaseResponse {
  paymentId: string;
  credits: number;
  price: number;
  message: string;
}

export const purchaseCredits = async (
  credits: number,
  receiptUri: string,
  price?: number
): Promise<PurchaseResponse> => {
  const formData = new FormData();
  formData.append("receipt", {
    uri: receiptUri,
    type: "image/jpeg",
    name: "receipt.jpg",
  } as any);
  formData.append("credits", String(credits));
  if (price !== undefined) {
    formData.append("price", String(price));
  }
  return multipartRequest<PurchaseResponse>("/credits/purchase", formData);
};

export interface PaymentStatusResponse {
  paymentId: string;
  status: "pending" | "approved" | "rejected" | "partial";
  credits: number;
  price: number;
  remainingAmount: number;
  currentBalance: number;
  creditExpiryDate?: string;
}

export const getPaymentStatus = async (paymentId: string): Promise<PaymentStatusResponse> =>
  request<PaymentStatusResponse>(`/credits/payment/${paymentId}/status`);

export const uploadReceipt = async (payload: {
  amountCredits: number;
  amountUzs: number;
  receiptUrl?: string;
}) =>
  request("/payments/upload-receipt", {
    method: "POST",
    body: payload,
  });
