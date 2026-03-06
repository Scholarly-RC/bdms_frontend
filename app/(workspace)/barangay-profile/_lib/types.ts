export type BarangayProfileRead = {
  province: string;
  municipality: string;
  barangay: string;
};

export type BarangayPersonnelRead = {
  id: string;
  full_name: string;
  position: string;
  sort_order: number;
};
