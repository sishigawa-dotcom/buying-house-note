import React, { useEffect, useRef } from 'react';
import { useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import { MediaNote } from '../types';
import { StickerNote } from './StickerNote';

interface MediaNoteLayerProps {
  notes: MediaNote[];
  onDeleteNote: (id: string) => void;
  onUpdateNotePosition: (id: string, lat: number, lng: number) => void;
}

// --- ReactMarker Helper Component ---
// Leaflet markers usually take an HTML string for divIcon.
// To render a fully interactive React component (Audio player state, hover effects),
// we need to mount a React Root into the element created by Leaflet.
const ReactMarker: React.FC<{
  note: MediaNote;
  onDelete: () => void;
  onDragEnd: (lat: number, lng: number) => void;
}> = ({ note, onDelete, onDragEnd }) => {
  const markerRef = useRef<L.Marker>(null);
  const rootRef = useRef<any>(null); // React Root
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));

  // Create the Leaflet Icon once. 
  // We use a clean div with no padding/border as the container.
  const icon = L.divIcon({
    className: 'sticker-marker-container', // We will add global styles for z-index
    html: containerRef.current,
    iconSize: [120, 120], // Matches the sticker size
    iconAnchor: [60, 60], // Center anchor
  });

  // Effect: Render React Content into the container
  useEffect(() => {
    if (!rootRef.current) {
      rootRef.current = createRoot(containerRef.current);
    }
    
    rootRef.current.render(
      <StickerNote note={note} onDelete={onDelete} />
    );
  }, [note, onDelete]); // Re-render if note changes

  // Cleanup
  useEffect(() => {
    return () => {
      if (rootRef.current) {
        // We defer unmount slightly to avoid conflicts during rapid removals
        setTimeout(() => rootRef.current.unmount(), 0);
      }
    };
  }, []);

  const eventHandlers = {
    dragend: () => {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(lat, lng);
      }
    },
    // Lift effect on drag start
    dragstart: () => {
       if (containerRef.current) {
         // We can manipulate the DOM directly for immediate feedback if needed, 
         // but CSS classes in StickerNote handle most of it.
         containerRef.current.style.zIndex = '1000';
       }
    },
    drag: () => {
       // Optional: Add shadow changes here
    }
  };

  return (
    <Marker
      ref={markerRef}
      position={[note.position.lat, note.position.lng]}
      icon={icon}
      draggable={true}
      eventHandlers={eventHandlers}
      zIndexOffset={100} // Stickers float above normal pins
    />
  );
};

export const MediaNoteLayer: React.FC<MediaNoteLayerProps> = ({ notes, onDeleteNote, onUpdateNotePosition }) => {
  return (
    <>
      {notes.map(note => (
        <ReactMarker 
          key={note.id} 
          note={note} 
          onDelete={() => onDeleteNote(note.id)}
          onDragEnd={(lat, lng) => onUpdateNotePosition(note.id, lat, lng)}
        />
      ))}
    </>
  );
};
