export interface Order {
  id: number;
  user_id: number;
  total_price: number;
  discount_code?: string;
  final_price: number;
  order_date: Date;
  status: "pending" | "paid" | "cancelled";
}
