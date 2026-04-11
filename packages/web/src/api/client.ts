/**
 * API 客户端封装
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
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
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
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
        console.log(`[API] ${response.status} ${response.config.url}`);
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
  async get<T>(url: string, params?: any): Promise<T> {
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
      if (error instanceof ApiError) throw error;
      throw new ApiError('未知错误', 'UNKNOWN', 0);
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
      if (error instanceof ApiError) throw error;
      throw new ApiError('未知错误', 'UNKNOWN', 0);
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
      if (error instanceof ApiError) throw error;
      throw new ApiError('未知错误', 'UNKNOWN', 0);
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
      if (error instanceof ApiError) throw error;
      throw new ApiError('未知错误', 'UNKNOWN', 0);
    }
  }

  /**
   * GET 请求（返回完整响应）
   */
  async getFullResponse<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('未知错误', 'UNKNOWN', 0);
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
