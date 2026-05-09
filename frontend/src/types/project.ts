export interface Project {
  id: number;
  name: string;
  is_active: boolean;
  created_by: number | null;
  created_at: string | null;
}

export interface ProjectCreate {
  name: string;
  password?: string;
  password_confirm?: string;
}