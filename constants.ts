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

export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    name: '云端花苑',
    location: { lat: 39.1380, lng: 117.2000 }, // Tianjin
    price: 850,
    priceUnit: '万',
    area: 128,
    rating: 5,
    tags: ['垂直森林', '安静', '全南向'],
    notes: '阳台非常大，种满了植物，感觉像在公园里一样。虽然是高层，但空气感觉很清新，没有城市的喧嚣。',
    media: [
      { type: 'image', url: 'https://picsum.photos/400/300?random=1', timestamp: Date.now() }
    ],
    pros: ['超大露台', '靠近地铁'],
    cons: ['物业费较高'],
    discountPolicy: '开盘前认筹享98折，按时签约再减5万',
    discountDeadline: '2024-10-01',
    createdAt: Date.now()
  },
  {
    id: '2',
    name: '滨江悦府',
    location: { lat: 39.1280, lng: 117.2100 }, // Tianjin
    price: 720,
    priceUnit: '万',
    area: 98,
    rating: 3,
    tags: ['一线江景', '老小区'],
    notes: '景色无敌，可以看到海河。但是小区楼龄有点老，大堂光线一般，电梯速度比较慢，需要考虑装修成本。',
    media: [],
    pros: ['景观好', '价格适中'],
    cons: ['装修老旧', '车位紧张'],
    createdAt: Date.now() - 100000
  }
];

export const MAP_DEFAULT_CENTER = { lat: 39.1355, lng: 117.2008 }; // Tianjin City Center
export const MAP_ZOOM = 13;