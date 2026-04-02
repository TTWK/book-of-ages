/**
 * API 客户端封装
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiResponse } from '@book-of-ages/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response) {
          const data = error.response.data as ApiResponse<unknown>;
          if (data && !data.success) {
            console.error('API Error:', data.error);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 设置 API Key
   */
  setApiKey(key: string): void {
    this.client.defaults.headers.common['X-API-Key'] = key;
  }

  /**
   * 清除 API Key
   */
  clearApiKey(): void {
    delete this.client.defaults.headers.common['X-API-Key'];
  }

  /**
   * GET 请求
   */
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data.data as T;
  }

  /**
   * POST 请求
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    const config = {
      headers: data instanceof FormData 
        ? { 'Content-Type': 'multipart/form-data' } 
        : undefined,
    };
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  /**
   * PUT 请求
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    const config = {
      headers: data instanceof FormData 
        ? { 'Content-Type': 'multipart/form-data' } 
        : undefined,
    };
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  }

  /**
   * DELETE 请求
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data.data as T;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
