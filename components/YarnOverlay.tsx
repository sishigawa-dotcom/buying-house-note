import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useMap, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Property, LifePin, YarnConnection } from '../types';
import { Trash2 } from 'lucide-react';

interface YarnOverlayProps {
  properties: Property[];
  pins: LifePin[];
  connections: YarnConnection[];
  draggingLocation?: { id: string; lat: number; lng: number } | null;
  onDeleteConnection: (id: string) => void;
}

// Helper to calculate offset LatLng from a base point + pixel offset
// This ensures the line ends exactly at a specific visual point (e.g. pin head) regardless of zoom
const getOffsetLatLng = (map: L.Map, latlng: L.LatLng, offsetPx: {x: number, y: number}) => {
  const point = map.latLngToLayerPoint(latlng);
  const newPoint = point.add(L.point(offsetPx.x, offsetPx.y));
  return map.layerPointToLatLng(newPoint);
};

interface YarnConnectionItemProps {
  id: string;
  property: Property;
  pin: LifePin;
  map: L.Map;
  filterId: string;
  overridePropertyLocation?: { lat: number; lng: number } | null;
  onDelete: (id: string) => void;
}

// --- Single Connection Component ---
const YarnConnectionItem: React.FC<YarnConnectionItemProps> = ({ 
  id,
  property, 
  pin, 
  map,
  filterId,
  overridePropertyLocation,
  onDelete
}) => {
  const [curvePath, setCurvePath] = useState<L.LatLngExpression[]>([]);
  const [midPoint, setMidPoint] = useState<L.LatLng | null>(null);
  const [distText, setDistText] = useState('');
  
  // Reference to the invisible polyline that holds the popup
  const hitBoxRef = useRef<L.Polyline>(null);

  // Re-calculate the curve geometry
  const updateGeometry = () => {
     if (!map) return;
     
     // Use override location if provided (during drag), otherwise source property location
     const p1 = overridePropertyLocation ? L.latLng(overridePropertyLocation) : L.latLng(property.location);
     const p2 = L.latLng(pin.location);

     // 1. Calculate Visual Offsets (Pixels -> LatLng)
     // We recalculate this on every zoom so the line always ends at the "Head" of the marker
     // Property Pin Head: ~26px up
     const start = getOffsetLatLng(map, p1, {x: 0, y: -26});
     
     // Life Pin Head: Rotated -15deg, center is roughly at -8px, -29px relative to anchor
     const end = getOffsetLatLng(map, p2, {x: -8, y: -29});

     // 2. Curve Control Point (Sag)
     // To maintain a "physical" sag look that scales naturally with the map,
     // we calculate the sag vector in pixels first, then convert to LatLng.
     
     const startPx = map.latLngToLayerPoint(start);
     const endPx = map.latLngToLayerPoint(end);
     const pixelDist = startPx.distanceTo(endPx);
     
     // Sag amount: 15% of distance, capped at 80px
     const sagPx = Math.min(pixelDist * 0.15, 80);
     
     // Find Midpoint in Pixels
     const midPx = startPx.add(endPx).divideBy(2);
     
     // Control point is Midpoint + Sag (downwards in Y)
     const controlPx = L.point(midPx.x, midPx.y + sagPx);
     const controlLatLng = map.layerPointToLatLng(controlPx);
     
     // 3. Generate Bezier Points (in LatLng space)
     const points: L.LatLng[] = [];
     const segments = 24; // Smoothness
     for(let t=0; t<=1; t+=1/segments) {
        // Quadratic Bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        const lat = (1-t)*(1-t)*start.lat + 2*(1-t)*t*controlLatLng.lat + t*t*end.lat;
        const lng = (1-t)*(1-t)*start.lng + 2*(1-t)*t*controlLatLng.lng + t*t*end.lng;
        points.push(L.latLng(lat, lng));
     }
     
     setCurvePath(points);

     // 4. Label Position (t=0.5)
     // The visual midpoint of the curve
     const labelLat = (1-0.5)*(1-0.5)*start.lat + 2*(1-0.5)*0.5*controlLatLng.lat + 0.5*0.5*end.lat;
     const labelLng = (1-0.5)*(1-0.5)*start.lng + 2*(1-0.5)*0.5*controlLatLng.lng + 0.5*0.5*end.lng;
     setMidPoint(L.latLng(labelLat, labelLng));

     // 5. Distance Text
     const d = map.distance(p1, p2);
     setDistText(d > 1000 ? `${(d/1000).toFixed(1)}km` : `${Math.round(d)}m`);
  };

  useEffect(() => {
    updateGeometry();
    // Re-calculate geometry on zoom end to fix the endpoints to the pin heads
    const handleZoom = () => updateGeometry();
    map.on('zoomend', handleZoom); 
    // Also need to listen to move if we want strict pixel perfection during pan, 
    // but usually points are latlng anchored so move is handled by Leaflet. 
    // Only zoom changes the relative pixel offsets of the 'heads'.
    return () => { map.off('zoomend', handleZoom); };
  }, [map, property, pin, overridePropertyLocation]);

  // Close popup if dragging starts
  useEffect(() => {
    if (overridePropertyLocation && hitBoxRef.current) {
      hitBoxRef.current.closePopup();
    }
  }, [overridePropertyLocation]);

  // Use Memo for the icon to avoid re-creation
  const labelIcon = useMemo(() => L.divIcon({
     className: 'yarn-label-container',
     html: `
       <div style="
          background: #F7F5F0; 
          padding: 2px 8px; 
          border-radius: 6px; 
          border: 1px solid #E5E0D8; 
          font-size: 10px; 
          font-weight: bold; 
          color: #97764E; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          white-space: nowrap; 
          transform: translate(-50%, 0); 
          display: inline-block;
       ">
         ${distText}
       </div>
     `,
     iconSize: [0, 0], 
     iconAnchor: [0, -6] // Slightly below the line
  }), [distText]);

  return (
    <>
       {/* 1. Shadow Layer (Visual Only) - Disabled interactions to prevent blocking */}
       <Polyline 
         positions={curvePath} 
         pathOptions={{ 
            color: '#802015', 
            weight: 5, 
            opacity: 0.15,
            lineCap: 'round',
            className: 'yarn-shadow-line' 
         }} 
         interactive={false}
       />
       
       {/* 2. Main Yarn Line (Visual Only) - Disabled interactions */}
       <Polyline 
         positions={curvePath} 
         pathOptions={{ 
            color: '#C0392B', 
            weight: 2.5, 
            opacity: 0.9,
            lineCap: 'round',
            className: 'yarn-main-line',
         }} 
         interactive={false}
       />

       {/* 3. Invisible HIT BOX (Interaction Only) - Extra thick (20px) to catch clicks easily */}
       <Polyline 
         ref={hitBoxRef}
         positions={curvePath} 
         pathOptions={{ 
            color: 'transparent', 
            weight: 20, 
            opacity: 0, 
         }} 
       >
          <Popup closeButton={false} className="custom-popup-clean">
            <div className="flex items-center justify-center p-1">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                 }}
                 className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors border border-red-100"
               >
                  <Trash2 size={12} /> 删除连线
               </button>
            </div>
         </Popup>
       </Polyline>

       {/* Distance Label */}
       {midPoint && <Marker position={midPoint} icon={labelIcon} interactive={false} zIndexOffset={-50} />}
    </>
  );
};

// --- Main Overlay Component ---
export const YarnOverlay: React.FC<YarnOverlayProps> = ({ properties, pins, connections, draggingLocation, onDeleteConnection }) => {
  const map = useMap();
  const filterId = "yarn-shadow-filter-global"; 

  // Inject a global SVG filter definition if it doesn't exist
  // We place this in a hidden Portal-like manner via plain DOM append if needed,
  // but for simplicity we rely on the shadow Polyline method which is more performant in Leaflet.
  // The 'yarn-main-line' class can be targeted in CSS for extra 'filter: url(...)' if we want texture.

  return (
    <>
      {/* 
        We use a Fragment to render individual connections.
        Each connection manages its own geometry updates via Leaflet events.
      */}
      {connections.map(conn => {
         const prop = properties.find(p => p.id === conn.propertyId);
         const pin = pins.find(p => p.id === conn.pinId);
         
         if (!prop || !pin) return null;

         // Check if this connection involves the property currently being dragged
         const isDraggingThis = draggingLocation?.id === prop.id;
         const overrideLoc = isDraggingThis ? draggingLocation : null;

         return (
            <YarnConnectionItem 
               key={conn.id} 
               id={conn.id}
               property={prop} 
               pin={pin} 
               map={map}
               filterId={filterId}
               overridePropertyLocation={overrideLoc}
               onDelete={onDeleteConnection}
            />
         );
      })}
    </>
  );
};