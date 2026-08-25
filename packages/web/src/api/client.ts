/**
 * API 客户端封装
 */

import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@book-of-ages/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export class ApiError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function formatError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    const message = data?.error?.message || error.message || '请求失败';
    const code = data?.error?.code || error.code || 'HTTP_ERROR';
    const status = error.response?.status || 0;
    return new ApiError(message, code, status);
  }
  if (error instanceof Error) {
    return new ApiError(error.message, 'UNKNOWN', 0);
  }
  return new ApiError('未知错误', 'UNKNOWN', 0);
}

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

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('[API] 请求错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response) {
          const data = error.response.data;
          if (data && !data.success && data.error) {
            console.error('[API] 业务错误:', data.error);
            return Promise.reject(
              new ApiError(data.error.message, data.error.code, error.response.status)
            );
          }
        } else if (error.code === 'ECONNABORTED') {
          console.error('[API] 请求超时');
          return Promise.reject(new ApiError('请求超时，请稍后重试', 'TIMEOUT', 408));
        } else if (error.message === 'Network Error') {
          console.error('[API] 网络错误');
          return Promise.reject(new ApiError('网络连接失败，请检查网络', 'NETWORK_ERROR', 0));
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
  async get<T>(url: string, params?: object): Promise<T> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, { params });
      if (!response.data.success) {
        throw new ApiError(
          response.data.error?.message || '请求失败',
          response.data.error?.code || 'UNKNOWN',
          response.status
        );
      }
      return response.data.data as T;
    } catch (error) {
      throw formatError(error);
    }
  }

  /**
   * POST 请求
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    try {
      const config = {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      };
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      if (!response.data.success) {
        throw new ApiError(
          response.data.error?.message || '请求失败',
          response.data.error?.code || 'UNKNOWN',
          response.status
        );
      }
      return response.data.data as T;
    } catch (error) {
      throw formatError(error);
    }
  }

  /**
   * PUT 请求
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    try {
      const config = {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      };
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      if (!response.data.success) {
        throw new ApiError(
          response.data.error?.message || '请求失败',
          response.data.error?.code || 'UNKNOWN',
          response.status
        );
      }
      return response.data.data as T;
    } catch (error) {
      throw formatError(error);
    }
  }

  /**
   * DELETE 请求
   */
  async delete<T>(url: string): Promise<T> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url);
      if (!response.data.success) {
        throw new ApiError(
          response.data.error?.message || '请求失败',
          response.data.error?.code || 'UNKNOWN',
          response.status
        );
      }
      return response.data.data as T;
    } catch (error) {
      throw formatError(error);
    }
  }

  /**
   * GET 请求（返回完整响应）
   */
  async getFullResponse<T>(
    url: string,
    params?: object,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, { params, ...config });
      return response.data;
    } catch (error) {
      throw formatError(error);
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
