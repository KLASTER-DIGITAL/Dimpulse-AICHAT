import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.setItem("isAuthenticated", "false");
    
    // Только если страница не является страницей логина, перенаправляем
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    
    throw new Error("Unauthorized: You need to login");
  }
  
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Получение токена авторизации из localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

// Создание заголовков с токеном авторизации
const createAuthHeaders = (hasContent: boolean = false): HeadersInit => {
  const headers: HeadersInit = {};
  
  if (hasContent) {
    headers["Content-Type"] = "application/json";
  }
  
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
};

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
  }
): Promise<any> {
  const method = options?.method || 'GET';
  const data = options?.data;
  const hasContent = !!data;
  
  const res = await fetch(url, {
    method,
    headers: createAuthHeaders(hasContent),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Fetching data from: ${queryKey[0]}`);
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: createAuthHeaders(),
    });
    console.log(`Response status: ${res.status}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log(`Response data:`, data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
