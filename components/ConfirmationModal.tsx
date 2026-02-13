import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans-cn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative bg-[#F7F5F0] w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-[#E5E0D8] transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50 text-[#C0392B]' : 'bg-[#2C5F2D]/10 text-[#2C5F2D]'}`}>
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-xl font-bold text-[#2A2A2A] font-serif-cn mb-2 tracking-wide">
            {title}
          </h3>
          
          <p className="text-sm text-[#5C554B] mb-8 leading-relaxed px-4">
            {message}
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl border border-[#E5E0D8] text-[#5C554B] font-bold text-sm hover:bg-white hover:border-[#D4AF37] transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`
                flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-95
                ${isDanger 
                  ? 'bg-[#C0392B] hover:bg-[#A93226]' 
                  : 'bg-[#2C5F2D] hover:bg-[#1F4420]'}
              `}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};