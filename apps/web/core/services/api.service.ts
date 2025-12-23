/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import axios from "axios";

export abstract class APIService {
  protected baseURL: string;
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const currentPath = window.location.pathname;
          // Don't redirect if already on a non-authenticated route (login, sign-up, etc.)
          // This prevents infinite reload loops when API calls fail on public pages
          const nonAuthRoutes = ["/", "/sign-up", "/sign-in", "/forgot-password", "/reset-password", "/onboarding"];
          const isNonAuthRoute = nonAuthRoutes.some(
            (route) => currentPath === route || currentPath === `${route}/` || currentPath.startsWith(`${route}?`)
          );
          if (!isNonAuthRoute) {
            window.location.replace(`/${currentPath ? `?next_path=${currentPath}` : ``}`);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  get(url: string, params = {}, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.get(url, {
      ...params,
      ...config,
    });
  }

  post(url: string, data = {}, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.post(url, data, config);
  }

  put(url: string, data = {}, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.put(url, data, config);
  }

  patch(url: string, data = {}, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.patch(url, data, config);
  }

  delete(url: string, data?: any, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.delete(url, { data, ...config });
  }

  request(config = {}) {
    return this.axiosInstance(config);
  }
}
