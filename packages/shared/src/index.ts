export interface Event {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  status: 'draft' | 'confirmed' | 'archived' | 'deleted';
  event_date?: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}