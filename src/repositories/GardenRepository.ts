export type GardenEntry = {
  id: string;
  user_id: string;
  flower_id: string | null;
  photo_path: string;
  detected_color: string | null;
  confidence: number | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string;
  created_at: string;
};

export interface GardenRepository {
  getAllForUser(userId: string): Promise<GardenEntry[]>;
  getById(id: string): Promise<GardenEntry | null>;
  save(entry: Omit<GardenEntry, 'created_at'>): Promise<GardenEntry>;
  delete(id: string): Promise<void>;
}
