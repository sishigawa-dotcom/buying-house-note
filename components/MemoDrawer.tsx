import React, { useRef, useState } from 'react';
import { Property, NoteMedia } from '../types';
import { X, Star, Plus, Trash2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { compressImage } from '../utils/imageHelpers';
import { motion } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface MemoDrawerProps {
  property: Property;
  onClose: () => void;
  onUpdate: (prop: Property) => void;
  onDelete: (id: string) => void;
}

export const MemoDrawer: React.FC<MemoDrawerProps> = ({ property, onClose, onUpdate, onDelete }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Responsive check for animation direction
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const fileArray = Array.from(files);

    const readNormalFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    };

    const processFile = async (file: File): Promise<NoteMedia | null> => {
        let isValid = false;
        if (type === 'image') isValid = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
        else if (type === 'video') isValid = file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
        else if (type === 'audio') isValid = file.type.startsWith('audio/') || /\.(m4a|mp3|wav|aac|ogg|flac|wma)$/i.test(file.name);

        if (!isValid) {
          console.warn(`Skipped invalid file: ${file.name}`);
          return null;
        }

        try {
            let url: string;
            if (type === 'image') {
               url = await compressImage(file);
            } else {
               url = await readNormalFile(file);
            }

            if (type === 'audio' && (file.name.toLowerCase().endsWith('.m4a') || file.type === '')) {
                if (url.startsWith('data:application/octet-stream')) url = url.replace('data:application/octet-stream', 'data:audio/mp4');
                else if (url.startsWith('data:;base64')) url = url.replace('data:;base64', 'data:audio/mp4;base64');
            }

            return { 
                type, 
                url, 
                name: file.name, 
                timestamp: Date.now() + Math.random() 
            };
        } catch (error) {
            console.error("File processing failed:", error);
            return null;
        }
    };

    const results = await Promise.all(fileArray.map(processFile));
    const validMedia = results.filter((m): m is NoteMedia => m !== null);

    if (validMedia.length > 0) {
      onUpdate({ ...property, media: [...property.media, ...validMedia] });
    }
    
    setIsProcessing(false);
    e.target.value = '';
  };

  const removeTag = (e: React.MouseEvent, type: 'pros' | 'cons', index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
       e.nativeEvent.stopImmediatePropagation();
    }
    const newList = property[type].filter((_, i) => i !== index);
    onUpdate({ ...property, [type]: newList });
  };

  // Animation Variants
  // Crucial: Explicitly define both X and Y in all states to prevent residual transforms
  // when switching between mobile (Y-axis) and desktop (X-axis) animations.
  const drawerVariants = {
    hidden: isDesktop 
      ? { x: '100%', y: 0, opacity: 1 } 
      : { x: 0, y: '100%', opacity: 1 },
    visible: { x: 0, y: 0, opacity: 1 },
    exit: isDesktop 
      ? { x: '100%', y: 0, opacity: 1 } 
      : { x: 0, y: '100%', opacity: 1 },
  };

  return (
    <>
      <ConfirmationModal 
        isOpen={showDeleteModal}
        title="删除房源"
        message={`您确定要删除 "${property.name}" 吗？删除后所有相关的笔记和多媒体文件将无法恢复。`}
        confirmText="确认删除"
        isDanger={true}
        onConfirm={() => {
          onDelete(property.id);
          setShowDeleteModal(false);
        }}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[5000]" 
        onClick={onClose}
      />
      
      {/* 
          DRAWER CONTAINER 
          Premium Stationery Style
      */}
      <motion.div 
        variants={drawerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`
          fixed z-[5001] bg-[#F7F5F0] shadow-[-10px_0_40px_-10px_rgba(0,0,0,0.15)] flex flex-col
          /* Mobile Styles */
          w-full h-[85dvh] bottom-0 left-0 rounded-t-[32px] border-t border-[#E5E0D8]/50
          /* Desktop Styles */
          md:w-[400px] md:h-[100dvh] md:top-0 md:right-0 md:left-auto md:bottom-auto md:rounded-none md:rounded-l-[32px] md:border-t-0 md:border-l
        `}
      >
        
        {/* Mobile Pull Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 md:hidden cursor-pointer opacity-50" onClick={onClose}>
          <div className="w-12 h-1 bg-[#97764E]/40 rounded-full" />
        </div>

        {/* HEADER: Clean, Serif, Minimal */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div className="flex-1 mr-4">
             <label className="text-[10px] uppercase tracking-[0.2em] text-[#97764E] font-sans-cn font-bold mb-1 block">
                Project Name
             </label>
             <input
                value={property.name}
                onChange={(e) => onUpdate({ ...property, name: e.target.value })}
                className="text-3xl md:text-4xl font-bold font-serif-cn bg-transparent outline-none text-[#2C5F2D] placeholder-[#2C5F2D]/30 w-full leading-tight"
                placeholder="未命名房源"
              />
          </div>
          <div className="flex gap-1">
            <button onClick={onClose} className="p-2.5 hover:bg-[#E5E0D8]/50 rounded-full text-[#5C554B] transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto px-8 pb-24 space-y-10 scrollbar-hide">
          
          {/* 1. STAT CARDS (Price & Area) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Price Card */}
            <div className="bg-[#E5E0D8]/40 rounded-2xl p-5 flex flex-col items-center justify-center group hover:bg-[#E5E0D8]/60 transition-colors cursor-text relative">
              <label className="text-[10px] text-[#97764E] font-bold uppercase tracking-[0.15em] mb-1 font-sans-cn">Total Price</label>
              <div className="flex items-baseline gap-0.5">
                 <span className="text-lg font-serif text-[#2C5F2D] opacity-60">¥</span>
                 <input 
                    type="number" 
                    value={property.price || ''} 
                    onChange={(e) => onUpdate({ ...property, price: Number(e.target.value) })} 
                    className="w-24 text-4xl font-serif-cn font-bold text-[#2C5F2D] bg-transparent outline-none text-center placeholder-[#2C5F2D]/20" 
                    placeholder="0" 
                 />
                 <span className="text-xs font-serif text-[#5C554B] opacity-80">万</span>
              </div>
            </div>

            {/* Area Card */}
            <div className="bg-[#E5E0D8]/40 rounded-2xl p-5 flex flex-col items-center justify-center group hover:bg-[#E5E0D8]/60 transition-colors cursor-text relative">
              <label className="text-[10px] text-[#97764E] font-bold uppercase tracking-[0.15em] mb-1 font-sans-cn">Area Size</label>
              <div className="flex items-baseline gap-0.5">
                 <input 
                    type="number" 
                    value={property.area || ''} 
                    onChange={(e) => onUpdate({ ...property, area: Number(e.target.value) })} 
                    className="w-20 text-4xl font-serif-cn font-bold text-[#2A2A2A] bg-transparent outline-none text-center placeholder-[#2A2A2A]/20" 
                    placeholder="0" 
                 />
                 <span className="text-xs font-serif text-[#5C554B] opacity-80">m²</span>
              </div>
            </div>
          </div>

          {/* 2. RATING */}
          <div className="flex flex-col items-center gap-2">
             <div className="flex gap-2 p-2 bg-white/40 rounded-full border border-[#E5E0D8]/50">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => onUpdate({...property, rating: star})}
                  className="transition-transform active:scale-90 hover:scale-110 focus:outline-none"
                >
                  <Star 
                    size={22} 
                    fill={star <= property.rating ? "#D4AF37" : "transparent"} 
                    className={`${star <= property.rating ? "text-[#D4AF37]" : "text-[#D4AF37]/30"}`} 
                    strokeWidth={1.5}
                  />
                </button>
              ))}
             </div>
          </div>

          {/* 3. TAGS (Pros & Cons) */}
          <div className="space-y-6">
             {/* Pros */}
             <div>
                <div className="flex items-center gap-3 mb-3">
                   <div className="h-px flex-1 bg-[#2C5F2D]/10"></div>
                   <span className="text-xs font-bold text-[#2C5F2D] uppercase tracking-widest font-sans-cn">Highlights</span>
                   <div className="h-px flex-1 bg-[#2C5F2D]/10"></div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                   {property.pros.map((pro, idx) => (
                      <div key={idx} className="group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-[#2C5F2D]/5 border border-[#2C5F2D]/10 text-[#2C5F2D] text-xs font-medium font-sans-cn hover:bg-[#2C5F2D] hover:text-white transition-all cursor-default">
                         {pro}
                         <button onClick={(e) => removeTag(e, 'pros', idx)} className="p-0.5 rounded-full hover:bg-white/20 text-current opacity-50 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                      </div>
                   ))}
                   <div className="relative group">
                     <input 
                        className="w-20 text-xs text-center bg-transparent border-b border-dashed border-[#2C5F2D]/30 py-1 text-[#2C5F2D] placeholder-[#2C5F2D]/40 outline-none focus:border-[#2C5F2D] transition-all"
                        placeholder="+ Add"
                        onKeyDown={(e) => { if(e.key === 'Enter' && e.currentTarget.value) { onUpdate({...property, pros: [...property.pros, e.currentTarget.value]}); e.currentTarget.value = ''; }}}
                     />
                   </div>
                </div>
             </div>

             {/* Cons */}
             <div>
                <div className="flex items-center gap-3 mb-3">
                   <div className="h-px flex-1 bg-[#C0392B]/10"></div>
                   <span className="text-xs font-bold text-[#C0392B] uppercase tracking-widest font-sans-cn">Risks</span>
                   <div className="h-px flex-1 bg-[#C0392B]/10"></div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                   {property.cons.map((con, idx) => (
                      <div key={idx} className="group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-[#C0392B]/5 border border-[#C0392B]/10 text-[#C0392B] text-xs font-medium font-sans-cn hover:bg-[#C0392B] hover:text-white transition-all cursor-default">
                         {con}
                         <button onClick={(e) => removeTag(e, 'cons', idx)} className="p-0.5 rounded-full hover:bg-white/20 text-current opacity-50 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                      </div>
                   ))}
                   <div className="relative group">
                     <input 
                        className="w-20 text-xs text-center bg-transparent border-b border-dashed border-[#C0392B]/30 py-1 text-[#C0392B] placeholder-[#C0392B]/40 outline-none focus:border-[#C0392B] transition-all"
                        placeholder="+ Add"
                        onKeyDown={(e) => { if(e.key === 'Enter' && e.currentTarget.value) { onUpdate({...property, cons: [...property.cons, e.currentTarget.value]}); e.currentTarget.value = ''; }}}
                     />
                   </div>
                </div>
             </div>
          </div>

          {/* 4. NOTES (Field Note Style) */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#97764E]/20 rounded-full"></div>
            <div className="pl-6 pt-1">
                <label className="text-xs font-bold text-[#5C554B] uppercase tracking-widest mb-2 block font-sans-cn">Field Notes</label>
                <textarea
                  value={property.notes}
                  onChange={(e) => onUpdate({ ...property, notes: e.target.value })}
                  className="w-full h-48 bg-transparent border-none outline-none resize-none text-base leading-relaxed font-serif-cn text-[#2A2A2A] placeholder-[#97764E]/30"
                  placeholder="Record your observations here... (e.g., lighting, noise, neighborhood vibe)"
                />
            </div>
          </div>

          {/* 5. MEDIA ATTACHMENTS */}
          <div className="space-y-4 pt-4 border-t border-[#E5E0D8]/50">
             <label className="text-xs font-bold text-[#5C554B] uppercase tracking-widest block font-sans-cn">Attachments</label>
             <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 scrollbar-hide">
               
               {/* Upload Button */}
               <button onClick={() => imageInputRef.current?.click()} className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 bg-[#F2EFE9] border-2 border-dashed border-[#97764E]/30 rounded-xl text-[#97764E] hover:border-[#2C5F2D] hover:text-[#2C5F2D] hover:bg-white transition-all group">
                 {isProcessing ? <div className="w-5 h-5 border-2 border-[#E5E0D8] border-t-[#97764E] rounded-full animate-spin"></div> : <Plus size={24} className="group-hover:scale-110 transition-transform" />}
                 <span className="text-[10px] mt-1 font-bold uppercase tracking-wide">Add Photo</span>
               </button>
               <input type="file" ref={imageInputRef} accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />

               {/* Thumbnails */}
               {property.media.map((m, i) => (
                 <div key={i} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-[#E5E0D8] group cursor-pointer hover:shadow-md transition-all">
                   {m.type === 'image' && <img src={m.url} className="w-full h-full object-cover sepia-[0.1] group-hover:sepia-0 transition-all duration-500" />}
                   
                   {/* Overlay Gradient */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   
                   <button 
                      className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white transform scale-75 group-hover:scale-100" 
                      onClick={(e) => { e.stopPropagation(); onUpdate({...property, media: property.media.filter((_, midx) => midx !== i)}); }}
                   >
                     <X size={12} />
                   </button>
                 </div>
               ))}
             </div>
          </div>
          
           {/* Footer Delete */}
            <div className="flex justify-center pt-8 pb-4">
                <button 
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteModal(true);
                  }}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50/50 transition-all duration-300"
                >
                  <Trash2 size={14} className="group-hover:scale-110 transition-transform" /> 
                  <span className="text-xs font-bold uppercase tracking-widest">Delete Listing</span>
                </button>
            </div>
        </div>
      </motion.div>
    </>
  );
};