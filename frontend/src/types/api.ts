export interface BaseResponse<T> {
  success: boolean;
  message: string;
  data: T;
  [key: string]: any;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface PaginationResponse {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}
