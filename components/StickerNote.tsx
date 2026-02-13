import React, { useState, useRef, useEffect } from 'react';
import { MediaNote } from '../types';
import { Play, Pause, X, Video } from 'lucide-react';

interface StickerNoteProps {
  note: MediaNote;
  onDelete: () => void;
  onPlay?: (url: string) => void;
}

export const StickerNote: React.FC<StickerNoteProps> = ({ note, onDelete, onPlay }) => {
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

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay && note.url) {
      onPlay(note.url);
    }
  };

  // Dimensions for the peel effect based on the user's CSS logic
  const cornerSize = 22; 
  
  // --- VIDEO STYLE ---
  if (note.type === 'video') {
    return (
      <div 
        className="relative group select-none transition-all duration-200 ease-out drop-shadow-md hover:scale-105 hover:drop-shadow-xl active:scale-95"
        style={{
          width: '100px',
          height: '100px',
          transform: `rotate(${note.rotation}deg)`,
          zIndex: 50
        }}
        onClick={handleVideoClick}
      >
        <div className="w-full h-full rounded-2xl border-2 border-white overflow-hidden bg-black relative shadow-sm">
           {/* Video Thumbnail (Muted, auto-load first frame) */}
           <video 
              src={note.url} 
              className="w-full h-full object-cover opacity-80" 
              muted 
              playsInline 
              preload="metadata"
           />
           
           {/* Play Overlay */}
           <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
              <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
                 <Play size={16} fill="#2C5F2D" className="text-[#2C5F2D] ml-0.5" />
              </div>
           </div>

           {/* Type Badge */}
           <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
             <Video size={10} className="text-white" />
           </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50 hover:bg-red-600 scale-90 hover:scale-110"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  // --- AUDIO & IMAGE STYLE (Paper Sticker) ---
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
      */}
      <div 
        className="absolute inset-0 bg-[#FAFAF9] overflow-hidden"
        style={{
          clipPath: `polygon(
            0 0, 
            100% 0, 
            100% calc(100% - ${cornerSize}px), 
            calc(100% - ${cornerSize}px) 100%, 
            0 100%
          )`,
          boxShadow: 'inset 0 0 0 1px #E5E5E5',
          borderRadius: '8px 8px 8px 0',
        }}
      >
        {note.type === 'image' ? (
          <img 
            src={note.url} 
            className="w-full h-full object-cover pointer-events-none" 
            alt="sticker" 
          />
        ) : (
          /* Audio Player UI */
          <div className="w-full h-full flex items-center px-2 gap-2 bg-[#FAFAF9]">
            <button 
              onClick={toggleAudio}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#E5E0D8] text-[#5C554B] hover:bg-[#D4AF37] hover:text-white transition-colors"
            >
              {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
            </button>
            
            <div className="flex-1 h-[2px] bg-[#E5E0D8] relative rounded-full overflow-hidden">
               <div className={`h-full bg-[#2C5F2D] transition-all duration-300 ${isPlaying ? 'w-full animate-[progress_10s_linear]' : 'w-1/3'}`} />
            </div>
            
            <span className="text-[9px] font-sans-cn text-[#999] font-bold tabular-nums">
               {note.duration ? `${note.duration}"` : 'AUDIO'}
            </span>
          </div>
        )}
      </div>

      {/* The "Peeling" Fold */}
      <div 
        className="absolute bottom-0 right-0 pointer-events-none"
        style={{
          width: `${cornerSize}px`,
          height: `${cornerSize}px`,
          background: 'linear-gradient(-45deg, transparent 50%, #F0F0F0 0)', 
          borderRadius: '0 0 6px 0', 
          boxShadow: '-2px -2px 5px rgba(0, 0, 0, 0.05)',
          borderTop: '1px solid rgba(229, 229, 229, 0.8)',
          borderLeft: '1px solid rgba(229, 229, 229, 0.8)',
        }}
      >
      </div>

      {/* Delete Button */}
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