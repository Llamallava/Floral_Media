export type Bouquet = {
  id: string;
  user_id: string;
  name: string | null;
  meaning: string | null;
  created_at: string;
};

export type BouquetEntry = {
  bouquet_id: string;
  garden_entry_id: string;
};

export interface BouquetRepository {
  getAllForUser(userId: string): Promise<Bouquet[]>;
  getById(id: string): Promise<Bouquet | null>;
  save(bouquet: Omit<Bouquet, 'created_at'>, gardenEntryIds: string[]): Promise<Bouquet>;
  delete(id: string): Promise<void>;
}
