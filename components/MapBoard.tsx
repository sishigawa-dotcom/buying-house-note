import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Property, MapPath, MapBoardMode, PencilColor, MediaNote, LifePin, YarnConnection } from '../types';
import { COLORS, MAP_DEFAULT_CENTER, MAP_ZOOM } from '../constants';
import { MapPin, Plus, PenTool, Eraser, MousePointer2, X, Trash2, Undo, Palette, Image as ImageIcon, Mic, Video, StopCircle, UserPlus, Pin, Check, Spline, Locate, Loader2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { MediaNoteLayer } from './MediaNoteLayer';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { VideoRecorderModal } from './VideoRecorderModal';
import { LifePinMarker } from './LifePinMarker';
import { YarnOverlay } from './YarnOverlay';
import { ConfirmationModal } from './ConfirmationModal';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Constants & Styles ---
const PENCIL_COLORS: { hex: PencilColor; label: string }[] = [
  { hex: '#50B748', label: '生态/安全' }, // Green
  { hex: '#F5A623', label: '关注/一般' }, // Yellow
  { hex: '#E65555', label: '噪音/风险' }, // Red
];

// Helper to create the basic pin element (for new pin preview only)
const createNewPinIcon = () => {
  return L.divIcon({
    className: 'custom-icon-container',
    html: `<div class="custom-marker-pin" style="transform: rotate(-45deg);"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 34],
    popupAnchor: [0, -36]
  });
};

interface MapBoardProps {
  properties: Property[];
  onPropertySelect: (id: string) => void;
  onAddProperty: (prop: Property) => void;
  onUpdateProperty: (prop: Property) => void;
  onDeleteProperty: (id: string) => void;
  selectedId: string | null;
}

// --- SUB-COMPONENT: Pin Name Modal (Replaces window.prompt) ---
const PinNameModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      // Delay focus slightly to ensure render
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-[#F7F5F0] w-full max-w-xs md:max-w-sm rounded-2xl shadow-2xl p-6 transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200 border border-[#E5E0D8]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#C0392B]/10 rounded-full flex items-center justify-center mx-auto mb-3 text-[#C0392B]">
             <Pin size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#2A2A2A] font-serif-cn">标记地点</h3>
          <p className="text-xs text-[#97764E] mt-1 font-sans-cn">为这个位置添加一个便于记忆的名称</p>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="例如：公司、父母家、地铁口..."
          className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-[#2A2A2A] placeholder-gray-400 focus:outline-none focus:border-[#C0392B] focus:ring-1 focus:ring-[#C0392B] transition-all font-sans-cn mb-6 text-center"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E5E0D8] text-[#5C554B] font-bold text-sm hover:bg-gray-50 transition-colors font-sans-cn"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#C0392B] text-white font-bold text-sm hover:bg-[#A93226] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-sans-cn"
          >
            确定添加
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Interactive Property Marker Component ---
// Memoized to prevent re-renders breaking dragging
const PropertyMarker = React.memo(({
  property,
  isSelected,
  onSelect,
  onUpdate,
  onRequestDelete, // CHANGED: Replaced direct onDelete with request
  onDrag,     // NEW: Real-time drag callback
  onDragEnd,  // NEW: Drag end callback
  hasYarn,
  isConnectMode, // Add mode prop to conditional styling
  isConnectStart // Is this the start node?
}: {
  property: Property;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (prop: Property) => void;
  onRequestDelete: (id: string) => void;
  onDrag: (id: string, lat: number, lng: number) => void; // Update signature
  onDragEnd: () => void;
  hasYarn: boolean;
  isConnectMode: boolean;
  isConnectStart: boolean;
}) => {
  const markerRef = useRef<L.Marker>(null);
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
  const rootRef = useRef<any>(null);
  const isDraggingRef = useRef(false); // Track dragging state
  
  // Use ref to access latest props in event handlers without re-binding
  const propsRef = useRef({ property, onSelect, onUpdate, onDrag, onDragEnd });
  useEffect(() => {
     propsRef.current = { property, onSelect, onUpdate, onDrag, onDragEnd };
  }, [property, onSelect, onUpdate, onDrag, onDragEnd]);

  // Stable Icon: Only created once. React Portal handles content updates.
  const icon = useMemo(() => L.divIcon({
    className: 'property-marker-wrapper',
    html: containerRef.current,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  }), []);

  useEffect(() => {
    if (!rootRef.current) {
      rootRef.current = createRoot(containerRef.current);
    }

    const handleMarkerClick = (e: React.MouseEvent) => {
       // Check if drag just happened
       if (isDraggingRef.current) return;

       // Stop native propagation to prevent map click
       e.nativeEvent.stopPropagation();
       e.stopPropagation();
       onSelect(property.id);
    };

    // --- Robust Delete Handler ---
    const handleDeleteClick = (e: React.MouseEvent | React.PointerEvent) => {
       e.stopPropagation();
       e.preventDefault();
       
       if (e.nativeEvent) {
         e.nativeEvent.stopImmediatePropagation();
         e.nativeEvent.stopPropagation();
       }

       // CHANGED: No more window.confirm here. Just request delete from parent.
       onRequestDelete(property.id);
    };

    const killEvent = (e: any) => {
       e.stopPropagation();
       if (e.nativeEvent) {
          e.nativeEvent.stopImmediatePropagation();
          e.nativeEvent.stopPropagation();
       }
    };

    rootRef.current.render(
      <div 
        className={`group relative flex flex-col items-center justify-end w-full h-full pointer-events-auto ${isConnectMode ? 'cursor-crosshair' : ''}`}
        onClick={handleMarkerClick}
      >
        {/* Only show delete button if NOT in connect mode */}
        {!isConnectMode && (
          <button
            type="button"
            onClick={handleDeleteClick}
            onPointerDown={killEvent}
            onMouseDown={killEvent}
            onDoubleClick={killEvent}
            className={`
              absolute -top-2 -left-2 z-[9999]
              w-5 h-5 rounded-full bg-[#E65555] text-white flex items-center justify-center border border-white
              shadow-md transform transition-all duration-200 cursor-pointer
              ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'}
              hover:bg-red-600 hover:scale-110 active:scale-95
            `}
            title="删除房源"
          >
            <X size={12} strokeWidth={3} className="pointer-events-none" />
          </button>
        )}

        {/* Connect Mode Highlight Ring */}
        {isConnectMode && (
          <div className={`absolute inset-0 rounded-full animate-ping ${isConnectStart ? 'bg-[#C0392B]/30' : 'bg-[#97BC62]/20'}`} />
        )}

        <div 
           className="custom-marker-pin transition-transform duration-300 ease-out shadow-lg"
           style={{
              backgroundColor: (isSelected || isConnectStart) ? '#97BC62' : undefined,
              transform: (isSelected || isConnectStart) ? 'scale(1.2) rotate(-45deg)' : 'scale(1) rotate(-45deg)',
              zIndex: (isSelected || isConnectStart) ? 50 : 10,
              border: (isSelected || isConnectStart) ? '3px solid #fff' : (hasYarn ? '2px solid #C0392B' : '2px solid #fff'),
              boxShadow: (isSelected || isConnectStart) || hasYarn ? '0 0 10px rgba(192, 57, 43, 0.4)' : undefined
           }}
        >
        </div>
        
        {/* Visual Cue for Connect Mode */}
        {isConnectMode && (
          <div className="absolute -bottom-6 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             {isConnectStart ? '起点' : '连接'}
          </div>
        )}
      </div>
    );
  }, [property, isSelected, onSelect, onRequestDelete, hasYarn, isConnectMode, isConnectStart]);

  useEffect(() => {
    return () => {
      if (rootRef.current) {
        setTimeout(() => rootRef.current.unmount(), 0);
      }
    };
  }, []);

  // Stable event handlers using refs to avoid re-binding
  const eventHandlers = useMemo(() => ({
    dragstart: () => {
      isDraggingRef.current = true;
    },
    drag: (e: any) => {
       // Real-time drag update
       const { lat, lng } = e.target.getLatLng();
       propsRef.current.onDrag(propsRef.current.property.id, lat, lng);
    },
    dragend: () => {
      if (isConnectMode) return; // Disable drag in connect mode
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        // Use latest from ref
        const { property, onUpdate, onDragEnd } = propsRef.current;
        onUpdate({ ...property, location: { lat, lng } });
        onDragEnd();
      }
      // Reset drag state after a small delay to ensure click events are skipped
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
    },
    click: (e: any) => {
       if (isDraggingRef.current) return;
       L.DomEvent.stopPropagation(e);
       const { property, onSelect } = propsRef.current;
       onSelect(property.id);
    }
  }), [isConnectMode]); // Only recreate if mode changes (dragging capability changes)

  return (
    <Marker
      ref={markerRef}
      position={[property.location.lat, property.location.lng]}
      icon={icon}
      draggable={!isConnectMode} // Disable drag in connect mode
      autoPan={!isConnectMode} // Disable auto pan in connect mode
      eventHandlers={eventHandlers}
      zIndexOffset={(isSelected || isConnectStart) ? 1000 : 0}
    />
  );
});


// --- Controller: Freehand Drawing Logic ---
const FreehandDrawController: React.FC<{
  mode: MapBoardMode;
  color: PencilColor;
  onPathFinish: (coords: { lat: number; lng: number }[]) => void;
}> = ({ mode, color, onPathFinish }) => {
  const map = useMap();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ lat: number; lng: number }[]>([]);
  const pointsRef = useRef<{ lat: number; lng: number }[]>([]); 

  useEffect(() => {
    if (mode === 'pencil') {
      map.dragging.disable();
      if ((map as any).tap) (map as any).tap.disable();
    } else {
      map.dragging.enable();
      if ((map as any).tap) (map as any).tap.enable();
    }
  }, [mode, map]);

  useMapEvents({
    mousedown: (e) => {
      if (mode !== 'pencil') return;
      setIsDrawing(true);
      pointsRef.current = [e.latlng];
      setCurrentPoints([e.latlng]);
    },
    mousemove: (e) => {
      if (mode !== 'pencil' || !isDrawing) return;
      pointsRef.current.push(e.latlng);
      setCurrentPoints([...pointsRef.current]);
    },
    mouseup: () => {
      if (mode !== 'pencil' || !isDrawing) return;
      setIsDrawing(false);
      if (pointsRef.current.length > 1) {
        onPathFinish(pointsRef.current);
      }
      pointsRef.current = [];
      setCurrentPoints([]);
    }
  });

  if (isDrawing && currentPoints.length > 0) {
    return (
      <Polyline
        positions={currentPoints}
        {...({ pathOptions: {
          color: color,
          weight: 4, 
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'pencil-stroke', 
        }} as any)}
      />
    );
  }

  return null;
};

// --- Controller: Unified Map Interaction & Cursor Handler ---
const MapInteractionHandler: React.FC<{
  mode: MapBoardMode;
  onMapClick: (lat: number, lng: number) => void;
  onMouseMove: (lat: number, lng: number) => void;
}> = ({ mode, onMapClick, onMouseMove }) => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    
    // Custom Cursors (SVG Data URIs)
    // 1. Red Push Pin for 'add_life_pin'
    const pinCursor = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.4))"><path d="M16 2C11.5 2 8 6.5 8 11C8 16 16 28 16 28C16 28 24 16 24 11C24 6.5 20.5 2 16 2Z" fill="%23C0392B" stroke="white" stroke-width="2"/><circle cx="16" cy="11" r="3.5" fill="white" fill-opacity="0.5"/></svg>') 16 28, auto`;

    // 2. Yellow Pencil for 'pencil'
    const pencilCursor = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.4))"><path d="M22 4L28 10L10 28L2 30L4 22L22 4Z" fill="%23F5A623" stroke="white" stroke-width="2"/><path d="M2 30L4 22L10 28L2 30Z" fill="%232A2A2A"/></svg>') 2 30, auto`;

    // 3. Green Property Pin for 'add_pin'
    const propertyCursor = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.4))"><path d="M16 2C11.5 2 8 6.5 8 11C8 16 16 28 16 28C16 28 24 16 24 11C24 6.5 20.5 2 16 2Z" fill="%232C5F2D" stroke="white" stroke-width="2"/><circle cx="16" cy="11" r="3.5" fill="white" fill-opacity="0.5"/></svg>') 16 28, auto`;

    // 4. Eraser for 'eraser'
    const eraserCursor = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.4))"><path d="M24 6L28 10L14 24L10 20L24 6Z" fill="%23F0F0F0" stroke="white" stroke-width="2"/><path d="M14 24L10 20L6 24L10 28L14 24Z" fill="%23E65555" stroke="white" stroke-width="2"/></svg>') 10 28, auto`;

    // 5. Ruler for 'connect-line'
    // Matches the app's secondary color #97764E
    // Icon: A small straight ruler segment.
    const connectCursor = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(1px 2px 2px rgba(0,0,0,0.25))"><path d="M1 27 L24 4 L28 8 L5 31 Z" fill="%2397764E" stroke="white" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 23 L7 25 M9 19 L10 20 M13 15 L15 17 M17 11 L18 12 M21 7 L23 9" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.9"/></svg>') 1 27, auto`;

    // 1. Centralized Cursor Logic
    switch (mode) {
      case 'add_pin':
        container.style.cursor = propertyCursor;
        break;
      case 'add_life_pin':
        container.style.cursor = pinCursor;
        break;
      case 'pencil':
        container.style.cursor = pencilCursor;
        break;
      case 'connect-line':
        container.style.cursor = connectCursor;
        break;
      case 'eraser':
        container.style.cursor = eraserCursor;
        break;
      default:
        container.style.cursor = 'grab';
        break;
    }

    // 2. Click Handler
    const handleClick = (e: L.LeafletMouseEvent) => {
      // Only intervene and stop propagation for "Add" modes
      if (mode === 'add_pin' || mode === 'add_life_pin') {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
        onMapClick(e.latlng.lat, e.latlng.lng);
      } else if (mode === 'connect-line') {
        // Also capture clicks in connect-line mode for empty space logic
        onMapClick(e.latlng.lat, e.latlng.lng);
      } else {
        // For browse mode, we pass through but can also detect clicks for closing UI elements
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    const handleMove = (e: L.LeafletMouseEvent) => {
      onMouseMove(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMove);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMove);
    };
  }, [map, mode, onMapClick, onMouseMove]);

  return null;
};

// --- Controller: FlyTo ---
const MapFlyTo: React.FC<{ coords: { lat: number; lng: number } | null; disabled: boolean }> = ({ coords, disabled }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && !disabled) {
      map.flyTo(coords, 16, { duration: 1.5 });
    }
  }, [coords, map, disabled]);
  return null;
};

// --- User Location Marker with Auto FlyTo ---
const UserLocationMarker: React.FC<{ location: { lat: number, lng: number, accuracy: number } | null }> = ({ location }) => {
  const map = useMap();
  
  // Handle FlyTo side-effect when location is first found or updated manually
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 15, { duration: 1.5 });
    }
  }, [location, map]);

  if (!location) return null;

  const userIcon = L.divIcon({
    className: 'user-location-marker',
    html: `<div class="relative w-4 h-4 flex items-center justify-center">
             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A90E2] opacity-75"></span>
             <span class="relative inline-flex rounded-full h-4 w-4 bg-[#4A90E2] border-2 border-white shadow-sm"></span>
           </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  return (
    <>
       <Circle 
         center={[location.lat, location.lng]} 
         radius={location.accuracy} 
         pathOptions={{ color: '#4A90E2', fillColor: '#4A90E2', fillOpacity: 0.1, weight: 1 }} 
         interactive={false}
       />
       <Marker 
         position={[location.lat, location.lng]} 
         icon={userIcon} 
         interactive={false}
         zIndexOffset={1000}
       />
    </>
  );
};

// --- Controller: Capture Center for Stickers ---
const StickerPlacementController: React.FC<{
  onRegisterGetCenter: (getter: () => { lat: number, lng: number }) => void;
}> = ({ onRegisterGetCenter }) => {
  const map = useMap();
  useEffect(() => {
    onRegisterGetCenter(() => map.getCenter());
  }, [map, onRegisterGetCenter]);
  return null;
};

// --- Helper Components for Toolbar ---
const ToolButton: React.FC<{
  active?: boolean;
  onClick?: () => void;
  icon: React.ElementType;
  title?: string;
  activeColorClass?: string;
  children?: React.ReactNode; // For nested elements like the color indicator
}> = ({ active, onClick, icon: Icon, title, activeColorClass = 'bg-[#2C5F2D]/10 text-[#2C5F2D]', children }) => (
  <button 
    onClick={onClick} 
    className={`
      group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out
      ${active 
        ? `${activeColorClass} shadow-sm ring-1 ring-[#2C5F2D]/20 scale-100` 
        : 'text-[#5C554B] hover:bg-white/60 hover:text-[#2A2A2A] hover:scale-105 hover:shadow-sm'
      }
    `}
    title={title}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    {children}
  </button>
);

const ToolbarDivider = () => <div className="w-4 h-px bg-[#97764E]/15 my-1" />;


// --- MAIN COMPONENT ---
export const MapBoard: React.FC<MapBoardProps> = ({ properties, onPropertySelect, onAddProperty, onUpdateProperty, onDeleteProperty, selectedId }) => {
  const [mode, setMode] = useState<MapBoardMode>('browse');
  const [pencilColor, setPencilColor] = useState<PencilColor>('#50B748');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // --- New State for Pin Naming Modal ---
  const [showPinNameModal, setShowPinNameModal] = useState(false);
  const [tempLifePinCoords, setTempLifePinCoords] = useState<{lat: number, lng: number} | null>(null);

  // --- New State for Connect Mode ---
  // Tracks the first clicked node (start point)
  const [connectStartNode, setConnectStartNode] = useState<{ id: string, type: 'property' | 'pin', lat: number, lng: number } | null>(null);
  const [mouseLatLng, setMouseLatLng] = useState<{lat: number, lng: number} | null>(null);

  // --- New State for Dragging Visuals ---
  const [draggingLocation, setDraggingLocation] = useState<{ id: string, lat: number, lng: number } | null>(null);

  // --- New State for Delete Confirmation ---
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'property' | 'pin' } | null>(null);
  
  // --- New State for Geolocation ---
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number, accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // --- New State for Auto-Hiding Toolbar ---
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const getMapCenterRef = useRef<() => { lat: number, lng: number }>(() => MAP_DEFAULT_CENTER);

  // Audio Recording Hook
  const { 
    isRecording: isAudioRecording, 
    mediaUrl: audioUrl, 
    recordingTime: audioTime, 
    startRecording: startAudio, 
    stopRecording: stopAudio, 
    clearMedia: clearAudio
  } = useMediaRecorder();

  // Lazy init paths
  const [paths, setPaths] = useState<MapPath[]>(() => {
    try {
      const savedPaths = localStorage.getItem('hb_notes_paths');
      return savedPaths ? JSON.parse(savedPaths) : [];
    } catch (e) {
      return [];
    }
  });

  // Lazy init Media Stickers
  const [stickers, setStickers] = useState<MediaNote[]>(() => {
    try {
      const savedStickers = localStorage.getItem('hb_notes_stickers');
      return savedStickers ? JSON.parse(savedStickers) : [];
    } catch (e) {
      return [];
    }
  });

  // --- Life Circle State ---
  const [lifePins, setLifePins] = useState<LifePin[]>(() => {
    try {
      const saved = localStorage.getItem('hb_notes_life_pins');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [yarnConnections, setYarnConnections] = useState<YarnConnection[]>(() => {
    try {
      const saved = localStorage.getItem('hb_notes_yarns');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // --- Auto-cleanup zombie connections if a property is deleted ---
  useEffect(() => {
    setYarnConnections(prev => {
      const valid = prev.filter(c => properties.some(p => p.id === c.propertyId));
      if (valid.length !== prev.length) {
        return valid;
      }
      return prev;
    });
  }, [properties]);

  const [newPinCoords, setNewPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'pencil') {
      setShowColorPicker(false);
    }
    // Clean up connect state when switching modes
    if (mode !== 'connect-line') {
      setConnectStartNode(null);
    }
  }, [mode]);

  // --- Persistence ---
  const savePaths = (newPaths: MapPath[]) => {
    localStorage.setItem('hb_notes_paths', JSON.stringify(newPaths));
    setPaths(newPaths);
  };

  const saveStickers = (newStickers: MediaNote[]) => {
    localStorage.setItem('hb_notes_stickers', JSON.stringify(newStickers));
    setStickers(newStickers);
  };

  useEffect(() => {
    localStorage.setItem('hb_notes_life_pins', JSON.stringify(lifePins));
  }, [lifePins]);

  useEffect(() => {
    localStorage.setItem('hb_notes_yarns', JSON.stringify(yarnConnections));
  }, [yarnConnections]);


  // --- Audio/Video Handlers ---
  useEffect(() => {
    if (audioUrl) {
       const center = getMapCenterRef.current();
       const newSticker: MediaNote = {
          id: Date.now().toString(),
          type: 'audio',
          url: audioUrl, // Blob URL
          position: center,
          rotation: (Math.random() * 10) - 5,
          timestamp: Date.now(),
          duration: audioTime 
       };
       
       fetch(audioUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
             const base64data = reader.result as string;
             saveStickers([...stickers, { ...newSticker, url: base64data }]);
             clearAudio(); // Reset hook state
          };
          reader.readAsDataURL(blob);
        });
    }
  }, [audioUrl]);

  const handleVideoConfirm = (videoUrl: string) => {
      const center = getMapCenterRef.current();
      const newSticker: MediaNote = {
        id: Date.now().toString(),
        type: 'image', 
        url: videoUrl, 
        position: center,
        rotation: (Math.random() * 10) - 5,
        timestamp: Date.now()
      };

      fetch(videoUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
             const base64data = reader.result as string;
             saveStickers([...stickers, { ...newSticker, url: base64data }]);
             setShowVideoModal(false);
          };
          reader.readAsDataURL(blob);
        });
  };

  const updateStickerPosition = (id: string, lat: number, lng: number) => {
    const updated = stickers.map(s => s.id === id ? { ...s, position: { lat, lng } } : s);
    saveStickers(updated);
  };

  const deleteSticker = (id: string) => {
    const updated = stickers.filter(s => s.id !== id);
    saveStickers(updated);
  };

  const handlePathFinish = (coords: { lat: number; lng: number }[]) => {
    const newPath: MapPath = {
      id: Date.now().toString(),
      coords,
      color: pencilColor,
      timestamp: Date.now()
    };
    savePaths([...paths, newPath]);
  };

  const deletePath = (id: string) => {
    const newPaths = paths.filter(p => p.id !== id);
    savePaths(newPaths);
  };

  const handleDeleteConnection = (id: string) => {
     setYarnConnections(prev => prev.filter(c => c.id !== id));
  };

  // --- Geolocation Handler ---
  const handleLocateMe = () => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
       setLocationError("您的浏览器不支持地理定位");
       setIsLocating(false);
       // Auto-dismiss
       setTimeout(() => setLocationError(null), 3000);
       return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Creates a new object reference to trigger useEffect inside UserLocationMarker
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        let msg = "无法获取位置";
        if (err.code === 1) msg = "请允许访问位置权限"; // PERMISSION_DENIED
        else if (err.code === 2) msg = "位置获取失败"; // POSITION_UNAVAILABLE
        else if (err.code === 3) msg = "定位超时"; // TIMEOUT
        
        setLocationError(msg);
        setIsLocating(false);
        
        // Auto-dismiss error after 3s
        setTimeout(() => setLocationError(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // --- Map Interactions (Pins & Life Pins) ---
  const handleMapClick = useCallback((lat: number, lng: number) => {
    // Close toolbar on map interaction
    setIsToolbarOpen(false);

    if (mode === 'add_pin') {
      setNewPinCoords({ lat, lng });
    } else if (mode === 'add_life_pin') {
      setTempLifePinCoords({ lat, lng });
      setShowPinNameModal(true);
    } else if (mode === 'connect-line') {
      // Logic for canceling selection or exiting mode
      if (connectStartNode) {
        setConnectStartNode(null);
      } else {
        setMode('browse');
      }
    }
  }, [mode, connectStartNode]);

  const handleConfirmPinName = (name: string) => {
    if (tempLifePinCoords && name) {
       const newPin: LifePin = {
          id: Date.now().toString(),
          name,
          location: tempLifePinCoords
       };
       setLifePins(prev => [...prev, newPin]);
    }
    setTempLifePinCoords(null);
    setShowPinNameModal(false);
    setMode('browse'); 
  };

  const handleCancelPinName = () => {
    setTempLifePinCoords(null);
    setShowPinNameModal(false);
    setMode('browse'); 
  };

  const confirmAddPin = () => {
    if (!newPinCoords) return;
    const newProp: Property = {
      id: Date.now().toString(),
      name: '新房源',
      location: newPinCoords,
      tags: [],
      rating: 0,
      notes: '',
      media: [],
      pros: [],
      cons: [],
      createdAt: Date.now()
    };
    onAddProperty(newProp);
    setNewPinCoords(null);
    setMode('browse');
  };

  // --- Optimized Mouse Move Handler ---
  // Only update state when strictly necessary (e.g., connect-line ghost)
  // to avoid re-rendering the whole map (which kills drag events).
  const handleMouseMove = useCallback((lat: number, lng: number) => {
     if (mode === 'connect-line') {
        setMouseLatLng({lat, lng});
     }
  }, [mode]);

  // --- Dragging Handlers for Real-time Yarn Updates ---
  // Memoize these to prevent re-renders of child components
  const handleMarkerDrag = useCallback((id: string, lat: number, lng: number) => {
      setDraggingLocation({ id, lat, lng });
  }, []);

  const handleMarkerDragEnd = useCallback(() => {
      setDraggingLocation(null);
  }, []);

  // --- Updated Connection Logic (Explicit Tool) ---
  // WRAPPED in useCallback to be a stable dependency
  const handleNodeClick = useCallback((id: string, type: 'property' | 'pin', lat: number, lng: number) => {
    if (mode === 'eraser') {
      // Eraser Mode: Trigger delete confirmation instead of window.confirm
      setDeleteTarget({ id, type });
      return;
    }

    if (mode === 'connect-line') {
      // Step 1: Select Start Node
      if (!connectStartNode) {
        setConnectStartNode({ id, type, lat, lng });
        return;
      }

      // Step 2: Select End Node & Validate
      // Must be one property and one pin
      if (connectStartNode.id === id) {
         // Clicked same node, cancel selection
         setConnectStartNode(null);
         return;
      }

      let propId, pinId;
      if (connectStartNode.type === 'property' && type === 'pin') {
         propId = connectStartNode.id;
         pinId = id;
      } else if (connectStartNode.type === 'pin' && type === 'property') {
         propId = id;
         pinId = connectStartNode.id;
      } else {
         alert("请连接【房源】与【生活圈图钉】。");
         setConnectStartNode(null); // Reset to allow retry
         return;
      }

      // Toggle Connection
      const existing = yarnConnections.find(y => y.propertyId === propId && y.pinId === pinId);
      if (existing) {
        setYarnConnections(prev => prev.filter(y => y.id !== existing.id));
      } else {
        const newYarn: YarnConnection = {
          id: Date.now().toString(),
          propertyId: propId!,
          pinId: pinId!
        };
        setYarnConnections(prev => [...prev, newYarn]);
      }
      
      // Reset start node so user can make another connection immediately
      setConnectStartNode(null);
      return;
    }

    // Default Browser Mode Behavior
    if (type === 'property') {
       onPropertySelect(id);
    }
    // Pins don't have a default click action in browse mode other than maybe centering
  }, [mode, connectStartNode, yarnConnections, onPropertySelect]);

  // --- Wrapper Callbacks for Markers (Stable Refs) ---
  // These wrappers lookup the coordinates dynamically so we don't need to pass
  // an inline arrow function `(id) => handleNodeClick(id, ..., lat, lng)` in the render loop.
  // This preserves React.memo on PropertyMarker.
  const handlePropertyMarkerSelect = useCallback((id: string) => {
     const p = properties.find(prop => prop.id === id);
     if(p) handleNodeClick(id, 'property', p.location.lat, p.location.lng);
  }, [properties, handleNodeClick]);

  const handlePinMarkerSelect = useCallback((id: string) => {
     const p = lifePins.find(pin => pin.id === id);
     if(p) handleNodeClick(id, 'pin', p.location.lat, p.location.lng);
  }, [lifePins, handleNodeClick]);

  // --- NEW: Handle Pin Rename ---
  const handlePinRename = (id: string, newName: string) => {
    setLifePins(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const selectedProp = properties.find(p => p.id === selectedId);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- UNDO Logic ---
  const handleUndo = () => {
    const lastPath = paths[paths.length - 1];
    const lastSticker = stickers[stickers.length - 1];

    if (!lastPath && !lastSticker) return;

    if (lastPath && (!lastSticker || lastPath.timestamp > lastSticker.timestamp)) {
       const newPaths = paths.slice(0, -1);
       savePaths(newPaths);
    } else {
       const newStickers = stickers.slice(0, -1);
       saveStickers(newStickers);
    }
  };

  // --- Final Delete Confirmation Logic ---
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'pin') {
      setLifePins(prev => prev.filter(p => p.id !== deleteTarget.id));
      setYarnConnections(prev => prev.filter(y => y.pinId !== deleteTarget.id));
    } else if (deleteTarget.type === 'property') {
      onDeleteProperty(deleteTarget.id);
    }

    setDeleteTarget(null);
  };

  // Request Delete handler passed to PropertyMarker
  const handleRequestDeleteProperty = useCallback((id: string) => {
    setDeleteTarget({ id, type: 'property' });
  }, []);

  return (
    <div className="w-full h-full relative z-0">
      <ConfirmationModal 
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'property' ? "删除房源" : "删除生活圈图钉"}
        message={deleteTarget?.type === 'property' 
           ? "确定要删除此房源吗？相关笔记将无法恢复。" 
           : "确定要移除此标记点吗？"}
        confirmText="确认删除"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <MapContainer
        center={MAP_DEFAULT_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '100%', width: '100%', outline: 'none', background: 'transparent' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* --- Layers --- */}
        {/* Yarn Overlay: Placed early to be below markers but above tiles */}
        <YarnOverlay 
           properties={properties} 
           pins={lifePins} 
           connections={yarnConnections} 
           draggingLocation={draggingLocation} // PASS DRAG STATE
           onDeleteConnection={handleDeleteConnection}
        />

        <StickerPlacementController onRegisterGetCenter={(fn) => getMapCenterRef.current = fn} />
        <FreehandDrawController mode={mode} color={pencilColor} onPathFinish={handlePathFinish} />
        
        <MapInteractionHandler 
           mode={mode} 
           onMapClick={handleMapClick} 
           onMouseMove={handleMouseMove}
        />
        
        {/* Only fly to location if NOT in connect mode to avoid disorientation */}
        <MapFlyTo coords={selectedProp ? selectedProp.location : null} disabled={mode === 'connect-line'} />

        {/* User Location Layer */}
        <UserLocationMarker location={userLocation} />

        {/* Ghost Line (Connection Preview) */}
        {mode === 'connect-line' && connectStartNode && mouseLatLng && (
           <Polyline 
             positions={[
               [connectStartNode.lat, connectStartNode.lng], 
               [mouseLatLng.lat, mouseLatLng.lng]
             ]}
             pathOptions={{ color: '#C0392B', weight: 2, dashArray: '5, 10', opacity: 0.6 }}
           />
        )}

        <MediaNoteLayer 
          notes={stickers} 
          onDeleteNote={deleteSticker}
          onUpdateNotePosition={updateStickerPosition}
        />

        {paths.map(path => {
          const isHovered = hoveredPathId === path.id;
          const isEraser = mode === 'eraser';
          return (
            <Polyline
              key={`${path.id}-${isEraser}`}
              positions={path.coords}
              interactive={isEraser}
              {...({ pathOptions: {
                color: isEraser && isHovered ? '#ff0000' : path.color, 
                weight: isHovered ? 6 : 4, 
                opacity: isEraser && isHovered ? 0.9 : 0.8,
                lineCap: 'round',
                lineJoin: 'round',
                className: `pencil-stroke ${isEraser ? 'cursor-pointer' : ''} ${isEraser && isHovered ? '' : 'pencil-stroke'}`
              }} as any)}
              {...({ eventHandlers: {
                mouseover: () => { if (mode === 'eraser') setHoveredPathId(path.id); },
                mouseout: () => { setHoveredPathId(null); },
                click: () => { if (mode === 'eraser') deletePath(path.id); }
              }} as any)}
            />
          );
        })}

        {/* Life Pins */}
        {lifePins.map(pin => (
          <LifePinMarker 
            key={pin.id} 
            pin={pin} 
            onDelete={(id) => setDeleteTarget({ id, type: 'pin' })} // Request delete modal
            onRename={handlePinRename} // Pass the new handler
            // Pass the stable wrapper instead of inline arrow func
            onClick={handlePinMarkerSelect}
            isConnected={yarnConnections.some(y => y.pinId === pin.id)}
          />
        ))}

        {properties.map(prop => (
          <PropertyMarker
            key={prop.id}
            property={prop}
            isSelected={prop.id === selectedId}
            isConnectMode={mode === 'connect-line'}
            isConnectStart={connectStartNode?.id === prop.id}
            // Pass the stable wrapper instead of inline arrow func
            onSelect={handlePropertyMarkerSelect}
            onUpdate={onUpdateProperty}
            onRequestDelete={handleRequestDeleteProperty} // Request modal
            onDrag={handleMarkerDrag}      // Stable callback
            onDragEnd={handleMarkerDragEnd} // Stable callback
            hasYarn={yarnConnections.some(y => y.propertyId === prop.id)}
          />
        ))}

        {newPinCoords && (
          <Marker
            position={[newPinCoords.lat, newPinCoords.lng]}
            opacity={0.6}
            icon={createNewPinIcon()}
          />
        )}
      </MapContainer>
      
      {/* ... Rest of UI ... */}
      <VideoRecorderModal 
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onConfirm={handleVideoConfirm}
      />

      <PinNameModal 
        isOpen={showPinNameModal}
        onClose={handleCancelPinName}
        onConfirm={handleConfirmPinName}
      />

      {/* 
        NOTIFICATIONS & CONFIRMATIONS AREA 
      */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[400] flex flex-col gap-3 items-center w-full px-4 pointer-events-none">
        
        {/* Error Toast for Location */}
        {locationError && (
           <div className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-sans-cn shadow-lg opacity-90 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 pointer-events-auto">
             <AlertCircle size={14} /> {locationError}
           </div>
        )}

        {/* Mode Toasts */}
        {mode === 'pencil' && (
           <div className="bg-[#2C5F2D] text-white px-3 py-1.5 rounded-full text-xs font-sans-cn shadow-lg opacity-90 animate-in fade-in slide-in-from-bottom-2">
              ✏️ 在地图上自由绘制
           </div>
        )}
        {mode === 'add_life_pin' && !showPinNameModal && (
           <div className="bg-[#C0392B] text-white px-3 py-1.5 rounded-full text-xs font-sans-cn shadow-lg opacity-90 animate-in fade-in slide-in-from-bottom-2">
              📍 点击地图添加生活圈坐标
           </div>
        )}
        {mode === 'connect-line' && (
           <div className="bg-[#97764E] text-white px-3 py-1.5 rounded-full text-xs font-sans-cn shadow-lg opacity-95 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
              <Spline size={14} />
              {connectStartNode 
                 ? `请点击目标${connectStartNode.type === 'property' ? '图钉' : '房源'}以连接，点击空白处取消` 
                 : '请点击任意房源或图钉作为起点，点击空白处退出'
              }
           </div>
        )}
        
        {/* Audio Recording Toast */}
        {isAudioRecording && (
           <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-sans-cn shadow-lg opacity-90 animate-pulse flex items-center gap-2 pointer-events-auto">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              录音中 {formatTime(audioTime)}
              <button onClick={() => { stopAudio(); clearAudio(); }} className="ml-2 bg-white/20 p-1 rounded-full hover:bg-white/30"><X size={12} /></button>
           </div>
        )}

        {/* New Pin Confirmation */}
        {newPinCoords && (
          <div className="pointer-events-auto flex gap-2 animate-in slide-in-from-bottom-4">
             <button
              onClick={() => setNewPinCoords(null)}
              className="p-3 bg-white text-gray-600 rounded-full shadow-xl hover:bg-gray-100 font-bold"
            >
              <X size={20} />
            </button>
            <button
              onClick={confirmAddPin}
              className="flex items-center gap-2 px-6 py-3 bg-[#2C5F2D] text-white rounded-full shadow-xl hover:bg-[#1F4420] transition-transform font-sans-cn font-bold tracking-wide"
            >
              <MapPin size={20} />
              <span>确认添加此处</span>
            </button>
          </div>
        )}
      </div>

      {/* 
        INDEPENDENT LOCATE BUTTON (TOP LEFT)
      */}
      {!newPinCoords && (
        <div className="absolute left-4 top-24 md:top-6 z-[400] pointer-events-none">
            <button 
              onClick={handleLocateMe}
              className={`
                pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full shadow-xl transition-all duration-300 ease-out border
                ${isLocating 
                   ? 'bg-white text-[#4A90E2] border-[#4A90E2]/20 cursor-wait' 
                   : 'bg-white/95 text-[#2C5F2D] border-white/50 hover:bg-[#2C5F2D] hover:text-white hover:border-[#2C5F2D] hover:scale-105 active:scale-95'
                }
              `}
              title="定位我的位置"
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Locate size={18} strokeWidth={2.5} />
              )}
              <span className="font-bold text-sm tracking-wide font-sans-cn">
                 {isLocating ? '定位中...' : '我的位置'}
              </span>
            </button>
        </div>
      )}

      {/* 
        MAIN TOOLBAR - AUTO-HIDING IMMERSIVE MODE 
      */}
      
      {/* 1. Desktop Hot Zone (Hover trigger) */}
      {isDesktop && !newPinCoords && (
        <div 
           className="fixed top-0 left-0 w-6 h-full z-[399]"
           onMouseEnter={() => setIsToolbarOpen(true)}
        />
      )}

      {/* 2. Toolbar Container (Sliding) */}
      {!newPinCoords && (
        <div 
           className={`
              fixed left-0 top-1/2 -translate-y-1/2 z-[400] pl-4 transition-transform duration-300 ease-out
              ${isToolbarOpen ? 'translate-x-0' : '-translate-x-full'}
           `}
           onMouseLeave={() => isDesktop && setIsToolbarOpen(false)}
        >
           {/* The Glass Pill Content */}
           <div className="pointer-events-auto bg-[#F7F5F0]/85 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-2xl shadow-black/5 flex flex-col items-center gap-1.5 relative">
              
              {/* Group 1: Browse */}
              <ToolButton 
                active={mode === 'browse'} 
                onClick={() => setMode('browse')}
                icon={MousePointer2}
                title="浏览模式"
              />
              
              <ToolbarDivider />
              
              {/* Group 2: Create */}
              <div className="flex flex-col gap-1.5">
                <ToolButton 
                  active={mode === 'add_pin'} 
                  onClick={() => setMode(mode === 'add_pin' ? 'browse' : 'add_pin')}
                  icon={MapPin}
                  title="添加房源"
                />
                <ToolButton 
                  active={mode === 'add_life_pin'}
                  activeColorClass="bg-[#C0392B]/10 text-[#C0392B] ring-[#C0392B]/20" 
                  onClick={() => setMode(mode === 'add_life_pin' ? 'browse' : 'add_life_pin')}
                  icon={Pin}
                  title="添加生活圈图钉"
                />
                <ToolButton 
                  active={mode === 'connect-line'}
                  activeColorClass="bg-[#97764E]/10 text-[#97764E] ring-[#97764E]/20" 
                  onClick={() => setMode(mode === 'connect-line' ? 'browse' : 'connect-line')}
                  icon={Spline}
                  title="连线模式"
                />
              </div>

              <ToolbarDivider />
              
              {/* Group 3: Edit (Pencil & Eraser) */}
              <div className="flex flex-col gap-1.5">
                 {/* Color Picker / Pencil */}
                 <div className="relative">
                     {showColorPicker && (
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md border border-[#E5E0D8] p-2 rounded-full shadow-xl flex gap-2 animate-in slide-in-from-left-2 fade-in duration-200 z-[500]">
                           {PENCIL_COLORS.map((c) => (
                              <button key={c.hex} onClick={() => { setPencilColor(c.hex); setShowColorPicker(false); }} className={`w-7 h-7 rounded-full border border-gray-100 transition-transform ${pencilColor === c.hex ? 'scale-110 ring-2 ring-offset-1 ring-gray-300 shadow-md' : 'hover:scale-110'}`} style={{ backgroundColor: c.hex }} />
                           ))}
                           <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-l border-b border-[#E5E0D8] transform rotate-45"></div>
                        </div>
                     )}
                     <ToolButton 
                        active={mode === 'pencil'}
                        onClick={() => { if (mode === 'pencil') { setShowColorPicker(!showColorPicker); } else { setMode('pencil'); setShowColorPicker(true); } }}
                        icon={PenTool}
                        title="画笔工具"
                     >
                        <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: pencilColor }} />
                     </ToolButton>
                 </div>
                 
                 <ToolButton 
                    active={mode === 'eraser'}
                    activeColorClass="bg-red-500/10 text-red-500 ring-red-500/20"
                    onClick={() => setMode(mode === 'eraser' ? 'browse' : 'eraser')}
                    icon={Eraser}
                    title="橡皮擦"
                 />
              </div>
              
              <ToolbarDivider />
              
              {/* Group 4: Media */}
              <div className="flex flex-col gap-1.5">
                 <ToolButton 
                    onClick={() => setShowVideoModal(true)}
                    icon={Video}
                    title="拍摄视频/照片"
                 />
                 <ToolButton 
                    active={isAudioRecording}
                    activeColorClass="bg-red-500/10 text-red-500 ring-red-500/20"
                    onClick={() => isAudioRecording ? stopAudio() : startAudio('audio')}
                    icon={Mic}
                    title="现场录音"
                 >
                    {isAudioRecording && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></div>}
                 </ToolButton>
              </div>

              {/* Undo Group */}
              {(paths.length > 0 || stickers.length > 0) && (
                <>
                <ToolbarDivider />
                <ToolButton 
                   onClick={handleUndo}
                   icon={Undo}
                   title="撤回上一步"
                />
                </>
              )}
           </div>

           {/* 
              3. Mobile Handle (Visible when closed)
              Attached to the container but sticking out to the right
           */}
           <button
              onClick={() => setIsToolbarOpen(!isToolbarOpen)}
              className={`
                absolute top-1/2 -translate-y-1/2 -right-6
                w-8 h-12 rounded-r-xl flex items-center justify-center
                bg-white/80 backdrop-blur-md shadow-md border border-white/50 border-l-0
                text-[#5C554B] hover:bg-white hover:text-[#2C5F2D]
                transition-all duration-300
                ${isToolbarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}
              title="展开工具栏"
            >
              <ChevronRight size={16} />
            </button>
        </div>
      )}
    </div>
  );
};