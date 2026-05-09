export interface User {
  id: number;
  phone: string;
  full_name: string;
  department: string | null;
  is_approved: boolean;
  is_blocked: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterData {
  phone: string;
  full_name: string;
  department?: string;
  password: string;
  password_confirm: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}