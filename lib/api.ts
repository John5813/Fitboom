const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
};

export async function apiRequest(
  path: string,
  method: string = "GET",
  body?: unknown
): Promise<any> {
  const url = `${getBaseUrl()}${path}`;
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    let msg = `Request failed: ${res.status}`;
    try {
      const json = JSON.parse(text);
      msg = json.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export function buildQueryKey(path: string): string[] {
  return [getBaseUrl() + path];
}
