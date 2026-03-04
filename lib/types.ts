export type OrderStatus = 'In queue' | 'ready' | 'delivered';

export type PupusaType = 'Queso' | 'Frijol con queso' | 'Chicharrón con queso' | 'Revueltas' | 'Frijol';

export interface OrderItem {
  id: string;
  type: PupusaType;
  quantity: number;
  addOns: ('Loroco' | 'Ayote')[];
  price: number;
}

export interface AddOns {
  loroco: boolean;
  ayote: boolean;
}

export interface Order {
  id: string;
  customerName: string;
  togo: boolean;
  notes: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  estimatedTime: number; // in minutes
}

export const MENU: Record<PupusaType, number> = {
  'Queso': 1.20,
  'Frijol con queso': 1.20,
  'Chicharrón con queso': 1.20,
  'Revueltas': 1.00,
  'Frijol': 1.00,
};
