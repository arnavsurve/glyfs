import type { ApiError } from "../types/auth.types";

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

interface RequestConfig extends RequestInit {
  url: string;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor(baseURL: string = "/api") {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  private async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const { url, headers, ...rest } = config;

    // Build full URL
    const fullUrl = url.startsWith("http") ? url : `${this.baseURL}${url}`;

    // Merge headers - no need for manual auth token since cookies are sent automatically
    const mergedHeaders: HeadersInit = {
      ...this.defaultHeaders,
      ...headers,
    };

    const csrfToken = getCookie('_csrf');
    const isStateChangingMethod = config.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method);

    if (csrfToken && isStateChangingMethod) {
      (mergedHeaders as Record<string, string>)['X-CSRF-Token'] = csrfToken;
    }

    try {
      const response = await fetch(fullUrl, {
        ...rest,
        headers: mergedHeaders,
        credentials: 'include', // Include cookies in requests
      });

      let data: T;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      if (!response.ok) {
        // If unauthorized, try to refresh token once
        if (response.status === 401 && !config.url.includes('/auth/refresh')) {
          try {
            console.log("Attempting to refresh token...");
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              credentials: 'include',
            });
            
            if (refreshResponse.ok) {
              console.log("Token refresh successful, retrying original request");
              // Retry the original request
              const retryResponse = await fetch(fullUrl, {
                ...rest,
                headers: mergedHeaders,
                credentials: 'include',
              });
              
              if (retryResponse.ok) {
                console.log("Retry request successful");
                const retryContentType = retryResponse.headers.get("content-type");
                let retryData: T;
                
                if (retryContentType && retryContentType.includes("application/json")) {
                  retryData = await retryResponse.json();
                } else {
                  retryData = (await retryResponse.text()) as unknown as T;
                }
                
                return {
                  data: retryData,
                  status: retryResponse.status,
                  statusText: retryResponse.statusText,
                };
              } else {
                console.error("Retry request failed:", retryResponse.status, retryResponse.statusText);
              }
            } else {
              console.error("Token refresh failed:", refreshResponse.status, refreshResponse.statusText);
            }
          } catch (refreshError) {
            console.error("Token refresh error:", refreshError);
            // If refresh fails, fall through to original error handling
          }
        }

        const errorMessage =
          typeof data === "object" && data !== null && "message" in data
            ? (data as any).message
            : `HTTP error! status: ${response.status}`;

        const apiError: ApiError = {
          message: errorMessage,
          status: response.status,
        };
        throw apiError;
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      if (error instanceof Error) {
        // Network or other fetch errors
        const apiError: ApiError = {
          message: error.message,
        };
        throw apiError;
      }
      // Re-throw API errors
      throw error;
    }
  }

  async get<T>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: "GET",
      ...config,
    });
  }

  async post<T>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async put<T>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async delete<T>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: "DELETE",
      ...config,
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing or custom instances
export { ApiClient };

