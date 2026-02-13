

export type ViewMode = 'map' | 'list' | 'compare';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface NoteMedia {
  type: 'image' | 'video' | 'audio';
  url: string; // Base64 or Blob URL
  name?: string;
  timestamp: number;
  // Scrapbook Mode Properties
  x?: number;
  y?: number;
  width?: number;
  rotation?: number;
  zIndex?: number;
}

// --- Sticker Note Types ---
export interface MediaNote {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string; // Base64 Data URL for persistence
  position: GeoLocation;
  rotation: number; // Random rotation -5 to 5 deg
  timestamp: number;
  duration?: number; // For audio, in seconds
}

// --- New Types for Floor Plan Manager ---
export interface FloorPlan {
  id: string;
  size: string; // e.g. "128"
  label: string; // e.g. "3室2厅" or "中间户"
  isFavorite: boolean;
}

export interface Property {
  id: string;
  name: string;
  location: GeoLocation;
  price?: number; // Total Price in Ten Thousand (Wan)
  priceUnit?: string; // Usually '万'
  area?: number; // sqm
  tags: string[]; // e.g., "Good Light", "Noisy", "Garden"
  rating: number; // 1-5
  notes: string;
  media: NoteMedia[];
  pros: string[];
  cons: string[];
  // New Fields
  category?: string; // User defined category (e.g., "Default", "Favorites")
  floorPlans?: FloorPlan[];
  discountPolicy?: string; // New: 优惠政策
  discountDeadline?: string; // New: 优惠时间
  createdAt: number;
  listingType?: 'existing' | 'off-plan'; // 现房 vs 期房
  hasViewed?: boolean; // 是否已看
}

// --- New Types for Life Circle ---
export interface LifePin {
  id: string;
  name: string;
  location: GeoLocation;
}

export interface YarnConnection {
  id: string;
  propertyId: string;
  pinId: string;
}

export interface DesignSystemColor {
  name: string;
  hex: string;
  usage: string;
}

// --- New Types for Painter Mode ---

export type MapBoardMode = 'browse' | 'add_pin' | 'pencil' | 'eraser' | 'add_life_pin' | 'connect-line';

// Pencil colors as specified
export type PencilColor = '#E65555' | '#F5A623' | '#50B748';

export interface MapPath {
  id: string;
  coords: GeoLocation[]; // Array of points forming the line
  color: PencilColor;
  timestamp: number;
}