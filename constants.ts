import { Property } from './types';

export const COLORS = {
  bg: '#F2EFE9', // Deeper Warm Rice Paper (more texture visible)
  primary: '#2C5F2D', // Deep Forest Green
  primaryHover: '#1F4420',
  secondary: '#97764E', // Earthy Clay
  accent: '#97BC62', // Soft Moss
  gold: '#D4AF37', // Champagne Gold
  goldBorder: 'rgba(212, 175, 55, 0.4)', // Semi-transparent gold for borders
  textMain: '#2A2A2A', // Softer Dark Gray
  textMuted: '#666666', // Warm Gray
  whiteOverlay: 'rgba(255, 255, 255, 0.85)',
  border: '#E5E0D8',
};

// Start empty for real users
export const MOCK_PROPERTIES: Property[] = [];

export const MAP_DEFAULT_CENTER = { lat: 39.1355, lng: 117.2008 }; // Tianjin City Center
export const MAP_ZOOM = 13;