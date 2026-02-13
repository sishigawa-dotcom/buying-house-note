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
  onPlayVideo: (url: string) => void;
}

// --- ReactMarker Helper Component ---
const ReactMarker: React.FC<{
  note: MediaNote;
  onDelete: () => void;
  onDragEnd: (lat: number, lng: number) => void;
  onPlay: (url: string) => void;
}> = ({ note, onDelete, onDragEnd, onPlay }) => {
  const markerRef = useRef<L.Marker>(null);
  const rootRef = useRef<any>(null); // React Root
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));

  // Video notes are smaller, square-ish. Others are rectangular.
  const size = note.type === 'video' ? [100, 100] : [120, 120];

  const icon = L.divIcon({
    className: 'sticker-marker-container',
    html: containerRef.current,
    iconSize: size as [number, number],
    iconAnchor: [size[0]/2, size[1]/2],
  });

  // Effect: Render React Content into the container
  useEffect(() => {
    if (!rootRef.current) {
      rootRef.current = createRoot(containerRef.current);
    }
    
    rootRef.current.render(
      <StickerNote note={note} onDelete={onDelete} onPlay={onPlay} />
    );
  }, [note, onDelete, onPlay]); // Re-render if note changes

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
    dragstart: () => {
       if (containerRef.current) {
         containerRef.current.style.zIndex = '1000';
       }
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

export const MediaNoteLayer: React.FC<MediaNoteLayerProps> = ({ notes, onDeleteNote, onUpdateNotePosition, onPlayVideo }) => {
  return (
    <>
      {notes.map(note => (
        <ReactMarker 
          key={note.id} 
          note={note} 
          onDelete={() => onDeleteNote(note.id)}
          onDragEnd={(lat, lng) => onUpdateNotePosition(note.id, lat, lng)}
          onPlay={onPlayVideo}
        />
      ))}
    </>
  );
};
