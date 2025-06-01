export interface BillOrder {
  id: string;
  created_at: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    variant_name?: string;
  }[];
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  restaurantName?: string;
  payment_mode?: string;
} 