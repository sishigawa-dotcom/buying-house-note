import React, { useState, useRef, useEffect } from 'react';
import { MediaNote } from '../types';
import { Play, Pause, X } from 'lucide-react';

interface StickerNoteProps {
  note: MediaNote;
  onDelete: () => void;
}

export const StickerNote: React.FC<StickerNoteProps> = ({ note, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (note.type === 'audio' && note.url) {
      audioRef.current = new Audio(note.url);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [note.url, note.type]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Dimensions for the peel effect based on the user's CSS logic
  const cornerSize = 22; 
  
  return (
    <div 
      className="relative group select-none transition-all duration-200 ease-out drop-shadow-sm hover:scale-105 hover:drop-shadow-md active:scale-105 active:drop-shadow-xl"
      style={{
        width: '120px',
        height: note.type === 'audio' ? '48px' : '120px',
        transform: `rotate(${note.rotation}deg)`,
      }}
    >
      {/* 
        Main Container with Cut Corner
        We use clip-path to cut the shape physically (essential for images).
        We use inset box-shadow to simulate the border that follows the clip-path (mostly).
      */}
      <div 
        className="absolute inset-0 bg-[#FAFAF9] overflow-hidden"
        style={{
          // Cut the bottom-right corner
          clipPath: `polygon(
            0 0, 
            100% 0, 
            100% calc(100% - ${cornerSize}px), 
            calc(100% - ${cornerSize}px) 100%, 
            0 100%
          )`,
          // User requested border: 1px solid #E5E5E5. 
          // Since clip-path cuts standard borders, we use an inset shadow which works well enough for flat design
          boxShadow: 'inset 0 0 0 1px #E5E5E5',
          borderRadius: '8px 8px 8px 0', // Rounded corners except bottom-right
        }}
      >
        {note.type === 'image' ? (
          <img 
            src={note.url} 
            className="w-full h-full object-cover pointer-events-none" 
            alt="sticker" 
          />
        ) : (
          /* Minimal Audio Player UI */
          <div className="w-full h-full flex items-center px-2 gap-2 bg-[#FAFAF9]">
            <button 
              onClick={togglePlay}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#E5E0D8] text-[#5C554B] hover:bg-[#D4AF37] hover:text-white transition-colors"
            >
              {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
            </button>
            
            {/* Minimalist Progress Line */}
            <div className="flex-1 h-[2px] bg-[#E5E0D8] relative rounded-full overflow-hidden">
               <div className={`h-full bg-[#2C5F2D] transition-all duration-300 ${isPlaying ? 'w-full animate-[progress_10s_linear]' : 'w-1/3'}`} />
            </div>
            
            <span className="text-[9px] font-sans-cn text-[#999] font-bold tabular-nums">
               {note.duration ? `${note.duration}"` : 'AUDIO'}
            </span>
          </div>
        )}
      </div>

      {/* 
        The "Peeling" Fold (User's Custom CSS)
        This is the ::after element logic converted to a React element
      */}
      <div 
        className="absolute bottom-0 right-0 pointer-events-none"
        style={{
          width: `${cornerSize}px`,
          height: `${cornerSize}px`,
          // The gradient creates the triangle shape for the fold
          // -45deg goes towards Top-Left. Transparent bottom-right half, color top-left half.
          background: 'linear-gradient(-45deg, transparent 50%, #F0F0F0 0)', 
          // Round the tip of the fold slightly
          borderRadius: '0 0 6px 0', 
          // Air shadow for the lift effect
          boxShadow: '-2px -2px 5px rgba(0, 0, 0, 0.05)',
          // Optional: A very subtle border on the fold edge to match the main border
          borderTop: '1px solid rgba(229, 229, 229, 0.8)',
          borderLeft: '1px solid rgba(229, 229, 229, 0.8)',
        }}
      >
      </div>

      {/* Delete Button (Floating outside, visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDelete();
        }}
        className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50 hover:bg-red-600 cursor-pointer scale-90 hover:scale-100"
      >
        <X size={12} strokeWidth={3} />
      </button>

    </div>
  );
};