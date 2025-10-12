export interface DiscountCode {
  id: number;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  expire_date: Date;
}
