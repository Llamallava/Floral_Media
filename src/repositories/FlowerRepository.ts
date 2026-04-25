export type Flower = {
  id: string;
  common_name: string;
  sci_name: string | null;
  summary: string | null;
  mythology: string | null;
  history: string | null;
  color_meanings: string | null;
  source: string;
  created_at: string;
};

export interface FlowerRepository {
  getAll(): Flower[];
  getById(id: string): Flower | null;
  search(query: string): Flower[];
  save(flower: Omit<Flower, 'id' | 'created_at'>): Flower;
}
