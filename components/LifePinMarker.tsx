import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { LifePin } from '../types';
import { Trash2, Edit2 } from 'lucide-react';

interface LifePinMarkerProps {
  pin: LifePin;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onClick: (id: string) => void;
  isConnected: boolean;
}

export const LifePinMarker: React.FC<LifePinMarkerProps> = ({ pin, onDelete, onRename, onClick, isConnected }) => {
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
  const rootRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input to ensure focus
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(pin.name);

  // Sync tempName with prop changes
  useEffect(() => {
    setTempName(pin.name);
  }, [pin.name]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Small delay to ensure render is complete and browser is ready
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isEditing]);

  const handleSave = () => {
    if (tempName.trim() && tempName !== pin.name) {
       onRename(pin.id, tempName.trim());
    } else {
       setTempName(pin.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
       e.preventDefault();
       e.stopPropagation(); // Prevent map interaction keys
       handleSave();
    }
  };

  // Memoize icon to prevent Marker re-instantiation on re-renders
  const icon = useMemo(() => L.divIcon({
    className: 'life-pin-wrapper',
    html: containerRef.current,
    iconSize: [48, 48], 
    iconAnchor: [24, 44], 
    popupAnchor: [0, -50]
  }), []);

  // Memoize handlers to ensure stability
  const eventHandlers = useMemo(() => ({
    click: (e: L.LeafletMouseEvent) => {
       // Stop propagation to map
       L.DomEvent.stopPropagation(e.originalEvent);
       
       onClick(pin.id);
       
       // Only close popup if we clicked the MARKER (pin), not the popup content.
       // Note: Leaflet handles popup content click propagation separately usually,
       // but React synthetic events can be tricky.
       e.target.closePopup();
    },
    dblclick: (e: L.LeafletMouseEvent) => {
       L.DomEvent.stopPropagation(e.originalEvent);
       
       // Reset state before opening to ensure fresh view
       setIsEditing(false);
       setTempName(pin.name);
       
       e.target.openPopup();
    }
  }), [pin.id, pin.name, onClick]);

  useEffect(() => {
    if (!rootRef.current) {
      rootRef.current = createRoot(containerRef.current);
    }

    rootRef.current.render(
      <div 
        className="relative group cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-1"
        style={{
          filter: isConnected ? 'drop-shadow(0 0 4px rgba(192, 57, 43, 0.4))' : 'none',
          zIndex: 10 
        }}
        title={`图钉：${pin.name} (双击管理)`}
      >
        {/* Label */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-1">
           <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-[0_4px_10px_rgba(0,0,0,0.15)] border border-[#E5E0D8] text-xs font-bold text-[#2C5F2D] whitespace-nowrap">
              {pin.name}
           </div>
           <div className="w-2 h-2 bg-white/95 border-b border-r border-[#E5E0D8] transform rotate-45 -mt-1 shadow-sm"></div>
        </div>

        {/* The Premium Pin SVG */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible filter drop-shadow-sm">
            <defs>
                <radialGradient id={`grad-head-${pin.id}`} cx="0.35" cy="0.35" r="0.6">
                    <stop offset="0%" stopColor="#ff7066" /> 
                    <stop offset="100%" stopColor="#b91c1c" /> 
                </radialGradient>
            </defs>
            <ellipse cx="24" cy="44" rx="2" ry="1" fill="#000" opacity="0.3" filter="blur(0.5px)" />
            <g transform="rotate(-15, 24, 44)">
                <line x1="24" y1="44" x2="24" y2="15" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
                <circle cx="24" cy="14" r="9" fill={`url(#grad-head-${pin.id})`} stroke="#7f1d1d" strokeWidth="0.5"/>
                <ellipse cx="20" cy="10" rx="3.5" ry="2" fill="white" opacity="0.4" transform="rotate(-45, 20, 10)" />
            </g>
        </svg>
      </div>
    );
  }, [pin, isConnected]);

  useEffect(() => {
    return () => {
      if (rootRef.current) {
        setTimeout(() => rootRef.current.unmount(), 0);
      }
    };
  }, []);

  return (
    <Marker 
      position={[pin.location.lat, pin.location.lng]} 
      icon={icon}
      eventHandlers={eventHandlers}
    >
      <Popup closeButton={false} className="bg-transparent border-none shadow-none">
         {/* CRITICAL: Stop propagation wrapper to prevent clicks inside popup from closing it via Marker's click handler */}
         <div 
           className="flex flex-col items-center gap-1 min-w-[100px]"
           onClick={(e) => {
             e.stopPropagation();
             e.nativeEvent.stopImmediatePropagation();
           }}
           onDoubleClick={(e) => {
             e.stopPropagation();
             e.nativeEvent.stopImmediatePropagation();
           }}
           onMouseDown={(e) => {
             e.stopPropagation();
             // Prevent drag start on map when clicking input
             e.nativeEvent.stopImmediatePropagation(); 
           }}
         >
            {isEditing ? (
              <input 
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="font-bold text-sm text-center text-gray-700 border-b border-[#2C5F2D] outline-none bg-transparent w-full py-0.5"
              />
            ) : (
              <div 
                className="group/name w-full flex items-center justify-center gap-1.5 cursor-pointer hover:bg-black/5 rounded px-1.5 py-1 transition-colors"
                onClick={(e) => {
                  e.stopPropagation(); // Extra safety
                  setIsEditing(true);
                }}
                title="点击重命名"
              >
                <span className="font-bold text-sm text-gray-700 text-center truncate max-w-[120px]">{pin.name}</span>
                <Edit2 size={10} className="text-gray-300 group-hover/name:text-[#2C5F2D] transition-colors" />
              </div>
            )}
            
            <div className="w-full h-px bg-gray-100" />
            
            <button 
              onClick={(e) => {
                 e.stopPropagation();
                 onDelete(pin.id);
              }}
              className="flex items-center justify-center gap-1 text-red-500/80 text-xs hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition w-full"
            >
               <Trash2 size={10} /> 
               <span>删除</span>
            </button>
         </div>
      </Popup>
    </Marker>
  );
};