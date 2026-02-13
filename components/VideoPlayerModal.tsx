import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface VideoPlayerModalProps {
  videoUrl: string | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ videoUrl, onClose }) => {
  if (!videoUrl) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
      {/* Close Button Area */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-end z-20 safe-area-top">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-3 bg-white/20 rounded-full text-white backdrop-blur-md hover:bg-white/40 transition-colors shadow-lg"
        >
          <X size={24} />
        </button>
      </div>

      {/* Video Container */}
      <div 
        className="w-full h-full flex items-center justify-center" 
        onClick={onClose} // Clicking background closes it
      >
        <video 
          src={videoUrl} 
          controls 
          autoPlay 
          playsInline 
          className="max-w-full max-h-full object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()} // Clicking video does not close
        />
      </div>
    </div>,
    document.body
  );
};
