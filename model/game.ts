export interface games {
  id: number;
  title: string; 
  price: number; 
  category?: string;  // ประเภทเกม (Action, RPG, ฯลฯ)
  image_url?: string; 
  description?: string; 
  release_date?: Date; 
  bestseller_rank?: number;
}