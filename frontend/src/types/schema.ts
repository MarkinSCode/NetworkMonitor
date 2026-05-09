export interface SchemaNode {
  id: string;
  type: 'computer' | 'image' | 'area';
  position: { x: number; y: number };
  data: {
    label: string;
    // Компьютер
    clientId?: number;
    owner?: string;
    programs?: string[];
    notes?: string;
    icon?: string;
    // Изображение
    imageUrl?: string;
    width?: number;
    height?: number;
    // Область
    points?: { x: number; y: number }[];
    color?: string;
    memberIds?: string[];
    viewRoles?: string[];
    manageRoles?: string[];
  };
}