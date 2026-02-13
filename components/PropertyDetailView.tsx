import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Property, NoteMedia, FloorPlan } from '../types';
import { X, Image as ImageIcon, Download, Trash2, ArrowLeft, ZoomIn, Quote, Layout, Grid, Move, Maximize2, RotateCw, Printer, AlertCircle, Loader2, Tag, Clock } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { compressImage } from '../utils/imageHelpers';
import { FloorPlanManager } from './FloorPlanManager';
import html2pdf from 'html2pdf.js';

interface PropertyDetailViewProps {
  property: Property;
  onBack: () => void;
  onUpdate: (prop: Property) => void;
  onDelete: (id: string) => void;
}

// --- MATH HELPERS ---
const degreesToRads = (deg: number) => deg * (Math.PI / 180);

// Helper to determine the correct cursor based on handle position and rotation
const getCursorStyle = (handlePosition: 'tl' | 'tr' | 'bl' | 'br', rotation: number) => {
  const baseMap = {
    'tl': 3, // NWSE
    'tr': 1, // NESW
    'br': 3, // NWSE
    'bl': 1  // NESW
  };

  const cursors = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'];
  const steps = Math.round(rotation / 45);
  const baseIndex = baseMap[handlePosition];
  const shiftedIndex = (baseIndex + steps) % 4;
  const normalizedIndex = (shiftedIndex + 4) % 4;
  
  return cursors[normalizedIndex];
};

// Custom Green Rotate Cursor (Single Curved Arrow)
const ROTATE_CURSOR = `url('data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.2))"><path d="M22 12A8 8 0 1 1 14 4" stroke="%232C5F2D" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M22 6V12H16" stroke="%232C5F2D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>') 16 16, auto`;

// --- HELPER: Transformable Image for Scrapbook Mode ---
const TransformableImage: React.FC<{
  media: NoteMedia;
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdate: (id: number, updates: Partial<NoteMedia>) => void;
  onSelect: () => void;
}> = ({ media, containerRef, onUpdate, onSelect }) => {
  const [isSelected, setIsSelected] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Interaction Modes: IDLE, DRAG (Move), RESIZE (Scale), ROTATE (Spin)
  const [interactionMode, setInteractionMode] = useState<'IDLE' | 'DRAG' | 'RESIZE' | 'ROTATE'>('IDLE');
  
  const elementRef = useRef<HTMLDivElement>(null);

  // Store initial state on pointer down to calculate deltas
  const startRef = useRef({
    x: 0, y: 0, w: 0, h: 0, rotation: 0,
    mx: 0, my: 0, // Mouse start X,Y
    cx: 0, cy: 0, // Center X,Y (for rotation)
    handle: '' as 'tl' | 'tr' | 'bl' | 'br' | '', // Track which handle is active
    startAngle: 0 // Track initial mouse angle relative to center
  });

  const handlePointerDown = (e: React.PointerEvent, mode: 'DRAG' | 'RESIZE' | 'ROTATE', handle: 'tl' | 'tr' | 'bl' | 'br' | '' = '') => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(); // Bring to front
    setIsSelected(true);
    setInteractionMode(mode);

    const el = elementRef.current;
    if (!el) return;

    // Capture initial metrics
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate start angle for rotation (Vector from Center to Mouse)
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    startRef.current = {
      x: media.x || 0,
      y: media.y || 0,
      w: media.width || 150,
      h: 0, 
      rotation: media.rotation || 0,
      mx: e.clientX,
      my: e.clientY,
      cx: centerX,
      cy: centerY,
      handle,
      startAngle
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interactionMode === 'IDLE') return;
    e.preventDefault();

    const dx = e.clientX - startRef.current.mx;
    const dy = e.clientY - startRef.current.my;

    if (interactionMode === 'DRAG') {
      const newX = startRef.current.x + dx;
      const newY = startRef.current.y + dy;
      if (elementRef.current) {
        elementRef.current.style.left = `${newX}px`;
        elementRef.current.style.top = `${newY}px`;
      }
    } 
    else if (interactionMode === 'RESIZE') {
      const rad = degreesToRads(-startRef.current.rotation);
      const rotatedDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const isLeft = startRef.current.handle === 'tl' || startRef.current.handle === 'bl';
      const deltaW = isLeft ? -rotatedDx : rotatedDx;
      const newWidth = Math.max(50, startRef.current.w + deltaW);

      if (elementRef.current) {
        const imgContainer = elementRef.current.querySelector('.img-container') as HTMLElement;
        if (imgContainer) imgContainer.style.width = `${newWidth}px`;
      }
    } 
    else if (interactionMode === 'ROTATE') {
      const { cx, cy, startAngle, rotation } = startRef.current;
      const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      
      // Calculate delta rotation
      let delta = currentAngle - startAngle;
      
      // Handle wrap-around (e.g. crossing from 180 to -180)
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      
      let degrees = rotation + delta;

      // Snap to 45 degree increments
      const snap = 45;
      const threshold = 5;
      const remainder = (degrees % snap + snap) % snap; 
      if (remainder < threshold) degrees -= remainder;
      if (remainder > snap - threshold) degrees += (snap - remainder);

      if (elementRef.current) {
        elementRef.current.style.transform = `rotate(${degrees}deg)`;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (interactionMode === 'IDLE') return;

    const dx = e.clientX - startRef.current.mx;
    const dy = e.clientY - startRef.current.my;

    if (interactionMode === 'DRAG') {
      onUpdate(media.timestamp, { 
        x: startRef.current.x + dx, 
        y: startRef.current.y + dy 
      });
    } else if (interactionMode === 'RESIZE') {
      const rad = degreesToRads(-startRef.current.rotation);
      const rotatedDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const isLeft = startRef.current.handle === 'tl' || startRef.current.handle === 'bl';
      const deltaW = isLeft ? -rotatedDx : rotatedDx;
      const newWidth = Math.max(50, startRef.current.w + deltaW);
      
      onUpdate(media.timestamp, { width: newWidth });
    } else if (interactionMode === 'ROTATE') {
       const { cx, cy, startAngle, rotation } = startRef.current;
       const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
       
       let delta = currentAngle - startAngle;
       if (delta > 180) delta -= 360;
       if (delta < -180) delta += 360;
       
       let degrees = rotation + delta;
       
       const snap = 45;
       const threshold = 5;
       const remainder = (degrees % snap + snap) % snap;
       if (remainder < threshold) degrees -= remainder;
       if (remainder > snap - threshold) degrees += (snap - remainder);

       onUpdate(media.timestamp, { rotation: degrees });
    }

    setInteractionMode('IDLE');
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Click outside listener to deselect
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (elementRef.current && !elementRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };
    if (isSelected) {
        window.addEventListener('pointerdown', handleGlobalClick);
    }
    return () => window.removeEventListener('pointerdown', handleGlobalClick);
  }, [isSelected]);

  const active = isSelected || isHovered;

  return (
    <div
      ref={elementRef}
      className="transformable-image absolute select-none touch-none group"
      style={{
        left: media.x,
        top: media.y,
        zIndex: active || interactionMode !== 'IDLE' ? 100 : (media.zIndex || 10),
        transform: `rotate(${media.rotation || 0}deg)`,
        cursor: interactionMode === 'DRAG' ? 'grabbing' : 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <div 
        className="img-container relative transition-shadow duration-300 rounded-xl"
        style={{ 
            width: media.width || 150,
            // Glow effect: Faint Gold instead of Green
            boxShadow: active 
              ? '0 0 0 2px rgba(212, 175, 55, 0.3), 0 10px 25px -5px rgba(212, 175, 55, 0.4)' 
              : 'none',
        }}
      >
        <img 
            src={media.url} 
            className="w-full h-auto pointer-events-none block select-none rounded-xl" 
            alt="scrapbook item" 
            draggable={false}
        />

        {/* 
            INTERACTION ZONES
            (Visuals removed, but hit areas persist for function)
        */}
        
        {/* 1. MOVE ZONE (Center) */}
        <div 
            className="absolute inset-0 cursor-move"
            onPointerDown={(e) => handlePointerDown(e, 'DRAG')}
        />

        {/* 
            2. RESIZE HANDLES (Corners) 
            Invisible but active
        */}
        {active && (
            <>
                {/* Hit Areas for Resize (10x10px) */}
                <div 
                  className="absolute -top-1.5 -left-1.5 w-4 h-4 z-30" 
                  style={{ cursor: getCursorStyle('tl', media.rotation || 0) }}
                  onPointerDown={(e) => handlePointerDown(e, 'RESIZE', 'tl')} 
                />
                <div 
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 z-30"
                  style={{ cursor: getCursorStyle('tr', media.rotation || 0) }} 
                  onPointerDown={(e) => handlePointerDown(e, 'RESIZE', 'tr')} 
                />
                <div 
                  className="absolute -bottom-1.5 -left-1.5 w-4 h-4 z-30" 
                  style={{ cursor: getCursorStyle('bl', media.rotation || 0) }}
                  onPointerDown={(e) => handlePointerDown(e, 'RESIZE', 'bl')} 
                />
                <div 
                  className="absolute -bottom-1.5 -right-1.5 w-4 h-4 z-30"
                  style={{ cursor: getCursorStyle('br', media.rotation || 0) }} 
                  onPointerDown={(e) => handlePointerDown(e, 'RESIZE', 'br')} 
                />
            </>
        )}

        {/* 
            3. ROTATE HANDLES (Edges)
            Invisible but active
        */}
        {active && (
            <>
                {/* Visual Rotate Handle REMOVED as requested */}

                {/* Invisible Hit Zones for Rotation (Outside Middle of Edges) */}
                
                {/* Top Edge Zone */}
                <div 
                  className="absolute -top-6 left-4 right-4 h-6 z-20"
                  style={{ cursor: ROTATE_CURSOR }}
                  onPointerDown={(e) => handlePointerDown(e, 'ROTATE')}
                />
                
                {/* Bottom Edge Zone */}
                <div 
                  className="absolute -bottom-6 left-4 right-4 h-6 z-20"
                  style={{ cursor: ROTATE_CURSOR }}
                  onPointerDown={(e) => handlePointerDown(e, 'ROTATE')}
                />
                
                {/* Left Edge Zone */}
                <div 
                  className="absolute top-4 bottom-4 -left-6 w-6 z-20"
                  style={{ cursor: ROTATE_CURSOR }}
                  onPointerDown={(e) => handlePointerDown(e, 'ROTATE')}
                />
                
                {/* Right Edge Zone */}
                <div 
                  className="absolute top-4 bottom-4 -right-6 w-6 z-20"
                  style={{ cursor: ROTATE_CURSOR }}
                  onPointerDown={(e) => handlePointerDown(e, 'ROTATE')}
                />
            </>
        )}

        {/* 
            4. FLOATING DELETE BUTTON
        */}
        {active && (
            <button
                className="absolute -top-4 -right-8 w-6 h-6 bg-white text-red-500 rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:scale-110 transition-transform cursor-pointer z-50 border border-gray-100"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onUpdate(media.timestamp, { _delete: true } as any);
                }}
            >
                <X size={14} />
            </button>
        )}

      </div>
    </div>
  );
};


// Helper Component for Segmented Control / Sliding Switch (Refined for Brochure Look)
const SegmentedControl = ({ 
  options, 
  value, 
  onChange 
}: { 
  options: { value: string, label: string }[], 
  value: string, 
  onChange: (val: any) => void 
}) => {
  const selectedIndex = options.findIndex(o => o.value === value);
  const activeIndex = selectedIndex === -1 ? 0 : selectedIndex; 

  return (
    <div className="relative flex bg-[#F0EBE0] p-0.5 rounded-full h-8 w-full cursor-pointer select-none border border-[#D8D0C0]">
      {/* Sliding Indicator */}
      <div 
        className="absolute top-0.5 bottom-0.5 bg-white rounded-full shadow-sm transition-all duration-300 ease-out border border-[#E5E0D8]"
        style={{ 
          width: `calc((100% - 4px) / ${options.length})`, 
          left: `calc(2px + (100% - 4px) / ${options.length} * ${activeIndex})`
        }}
      />
      
      {options.map((opt) => (
         <div 
           key={opt.value}
           onClick={(e) => { e.stopPropagation(); onChange(opt.value); }}
           className={`flex-1 z-10 flex items-center justify-center text-[11px] font-bold tracking-wider font-sans-cn transition-colors duration-300 ${value === opt.value ? 'text-[#2C5F2D]' : 'text-[#97764E]/60'}`}
         >
            {opt.label}
         </div>
      ))}
    </div>
  );
};

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({ property, onBack, onUpdate, onDelete }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrapbookContainerRef = useRef<HTMLDivElement>(null);
  
  // Ref for main content to capture PDF
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // New State for Scrapbook Mode
  const [isScrapbookMode, setIsScrapbookMode] = useState(false);

  // Use the first image as the cover header if available
  const coverImage = property.media.find(m => m.type === 'image')?.url;

  // Initialize positions for images that don't have them yet when entering Scrapbook Mode
  useEffect(() => {
    if (isScrapbookMode && scrapbookContainerRef.current) {
       const containerW = scrapbookContainerRef.current.offsetWidth;
       const containerH = scrapbookContainerRef.current.offsetHeight || 600;
       
       let hasUpdates = false;
       const newMedia = property.media.map((m, i) => {
         if (m.type === 'image' && (m.x === undefined || m.y === undefined)) {
            hasUpdates = true;
            // Random scatter but STRAIGHT (no rotation) for clean architectural look
            return {
              ...m,
              x: Math.random() * (containerW - 200) + 20,
              y: Math.random() * (containerH - 200) + 20,
              width: 160,
              rotation: 0, // Clean alignment
              zIndex: i + 10
            };
         }
         return m;
       });

       if (hasUpdates) {
          onUpdate({ ...property, media: newMedia });
       }
    }
  }, [isScrapbookMode, property.media.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const fileArray = Array.from(files);
    
    // Helper to read non-image files (Video/Audio) normally
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

            // Init props for new item
            const timestamp = Date.now() + Math.random();
            const baseProps = { type, url, name: file.name, timestamp };
            
            // If we are already in scrapbook mode, give it a random position immediately
            if (isScrapbookMode) {
               return {
                  ...baseProps,
                  x: 50 + Math.random() * 50,
                  y: window.scrollY + 100 + Math.random() * 50, // drop near top of view
                  width: 160,
                  rotation: 0, // Clean alignment
                  zIndex: 100
               };
            }

            return baseProps;

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

  // --- Scrapbook Item Updater ---
  const updateMediaItem = (timestamp: number, updates: Partial<NoteMedia> & { _delete?: boolean }) => {
     if (updates._delete) {
        onUpdate({ ...property, media: property.media.filter(m => m.timestamp !== timestamp) });
        return;
     }
     
     const newMedia = property.media.map(m => {
        if (m.timestamp === timestamp) {
           return { ...m, ...updates };
        }
        return m;
     });
     onUpdate({ ...property, media: newMedia });
  };

  const bringToFront = (timestamp: number) => {
     // Find max Z
     const maxZ = Math.max(...property.media.map(m => m.zIndex || 10), 10);
     updateMediaItem(timestamp, { zIndex: maxZ + 1 });
  };

  const removeTag = (e: React.MouseEvent, type: 'pros' | 'cons', index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const newList = property[type].filter((_, i) => i !== index);
    onUpdate({ ...property, [type]: newList });
  };
  
  const handleDownloadPDF = async () => {
    if (!mainContentRef.current) return;
    setIsDownloading(true);

    // 1. Container setup: Fixed width (1024px) off-screen
    // This forces the browser to layout contents for an A4-like width, preventing squash/shift.
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '-9999px';
    container.style.width = '1024px'; 
    document.body.appendChild(container);

    try {
        const original = mainContentRef.current;
        const clone = original.cloneNode(true) as HTMLElement;

        // --- 2. HARD RESET LAYOUT (The Fix) ---
        // Strip all positioning/centering styles that cause offset
        clone.style.margin = '0';
        clone.style.padding = '40px'; // Consistent print padding
        clone.style.width = '100%';
        clone.style.maxWidth = 'none';
        clone.style.height = 'auto';
        clone.style.minHeight = '0';
        clone.style.position = 'static';
        clone.style.transform = 'none';
        clone.style.overflow = 'visible';
        clone.style.backgroundColor = '#ffffff';
        
        // Remove problematic Tailwind classes
        clone.classList.remove('mx-auto', 'max-w-5xl', 'h-full', 'min-h-full', 'pb-32', 'fixed', 'absolute', 'shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]');

        // Reset inner containers that might be centered
        const innerCard = clone.querySelector('.max-w-5xl');
        if (innerCard) {
            (innerCard as HTMLElement).style.maxWidth = 'none';
            (innerCard as HTMLElement).style.margin = '0';
            (innerCard as HTMLElement).style.boxShadow = 'none';
            (innerCard as HTMLElement).classList.remove('mx-auto', 'max-w-5xl', 'shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]');
        }

        // --- 3. FORCE DESKTOP LAYOUT ---
        // Ensure flex rows don't collapse
        const header = clone.querySelector('.lg\\:flex-row');
        if (header) {
            (header as HTMLElement).style.display = 'flex';
            (header as HTMLElement).style.flexDirection = 'row';
            (header as HTMLElement).style.alignItems = 'flex-end';
            (header as HTMLElement).style.justifyContent = 'space-between';
            (header as HTMLElement).style.gap = '20px';
        }

        // NEW: Fix Status Badge Container
        const badgeWrapper = clone.querySelector('.status-badge-wrapper');
        if (badgeWrapper) {
            const el = badgeWrapper as HTMLElement;
            el.style.display = 'flex';
            el.style.flexDirection = 'row';
            el.style.gap = '20px';
            el.style.marginTop = '15px';
            el.style.marginBottom = '20px'; // Push content below down
            el.style.flexWrap = 'nowrap';
            el.style.alignItems = 'center';
            
            // Fix individual badges
            Array.from(el.children).forEach((child) => {
                const badge = child as HTMLElement;
                badge.style.whiteSpace = 'nowrap';
                badge.style.flexShrink = '0';
                badge.style.border = '1px solid #97764E';
                // padding/rounded are likely handled by tailwind classes preserved or I can force them
                badge.style.padding = '4px 10px';
                badge.style.fontSize = '10px';
                badge.style.lineHeight = '1.2';
            });
        }

        // --- 4. CONVERT INPUTS TO TEXT ---
        const originalInputs = original.querySelectorAll('input');
        const cloneInputs = clone.querySelectorAll('input');
        
        originalInputs.forEach((inp, i) => {
            if (!cloneInputs[i]) return;
            const cloneInp = cloneInputs[i];
            
            // Remove placeholders
            if (inp.placeholder && (inp.placeholder.includes('Add') || inp.placeholder.includes('添加'))) {
                cloneInp.remove();
                return;
            }

            const isTitle = cloneInp.classList.contains('text-4xl');
            const isPrice = cloneInp.classList.contains('text-5xl');
            const val = inp.value;

            if (cloneInp.type !== 'checkbox' && cloneInp.type !== 'radio' && cloneInp.type !== 'file') {
                const span = document.createElement('span'); 
                span.textContent = val;
                span.className = cloneInp.className;
                
                // Reset input styles
                span.style.border = 'none';
                span.style.background = 'transparent';
                span.style.display = 'inline-block';
                span.style.width = 'auto';
                span.style.padding = '0';
                
                if (isTitle) {
                   span.style.fontSize = '36px'; // Adjusted for A4
                   span.style.lineHeight = '1.2';
                   span.style.fontWeight = 'bold';
                   span.style.color = '#2C5F2D';
                   span.style.whiteSpace = 'normal'; // Allow wrapping if super long
                   span.style.display = 'block'; // Ensure it takes width to push things down
                   span.style.marginBottom = '20px'; // Add margin
                }
                
                if (isPrice) {
                    span.style.textAlign = 'right';
                }

                cloneInp.replaceWith(span);
            } else if (cloneInp.type === 'checkbox' || cloneInp.type === 'radio') {
                (cloneInp as HTMLInputElement).checked = inp.checked;
            }
        });

        // --- 5. CONVERT TEXTAREAS ---
        const originalTextareas = original.querySelectorAll('textarea');
        const cloneTextareas = clone.querySelectorAll('textarea');
        originalTextareas.forEach((txt, i) => {
            if (cloneTextareas[i]) {
                const p = document.createElement('p');
                p.textContent = txt.value;
                p.className = txt.className;
                p.style.height = 'auto';
                p.style.whiteSpace = 'pre-wrap';
                p.style.overflow = 'visible';
                p.style.fontSize = '12px'; // Readable print size
                cloneTextareas[i].replaceWith(p);
            }
        });

        // --- 6. CLEAN UP GARBAGE ---
        const selectorsToRemove = [
            '.no-pdf',
            '.print\\:hidden',
            'button', 
            '.leaflet-control-container', 
            'input[type="file"]',
            '.group:hover'
        ];
        clone.querySelectorAll(selectorsToRemove.join(',')).forEach(el => el.remove());
        
        // Remove empty dashed boxes
        clone.querySelectorAll('div').forEach(div => {
             if (div.classList.contains('border-dashed')) {
                 div.style.display = 'none';
             }
        });

        // Show PDF Only elements
        clone.querySelectorAll('.only-pdf').forEach(el => {
            (el as HTMLElement).style.display = 'block';
        });

        container.appendChild(clone);

        // --- 7. GENERATE PDF ---
        const opt = {
            margin: [10, 10, 10, 10], // mm
            filename: `${property.name}_Note.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                scrollY: 0,
                windowWidth: 1024 // Hint the viewport width to match our container
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        // Use imported library
        await html2pdf().from(clone).set(opt).save();
        setNotification("PDF 下载成功！");

    } catch (e) {
        console.error(e);
        setNotification("导出 PDF 失败，请重试");
    } finally {
        document.body.removeChild(container);
        setIsDownloading(false);
        setTimeout(() => setNotification(null), 3000);
    }
  };

  // --- Grid Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const newMedia = [...property.media];
    const [draggedItem] = newMedia.splice(draggedIndex, 1);
    newMedia.splice(dropIndex, 0, draggedItem);
    onUpdate({ ...property, media: newMedia });
    setDraggedIndex(null);
  };
  const handleDragEnd = () => { setDraggedIndex(null); };

  const unitPrice = property.price && property.area ? Math.round((property.price * 10000) / property.area).toLocaleString() : null;

  return (
    <div className="min-h-full w-full bg-[#F7F5F0] pb-32 print:pb-0 print:bg-white print:h-auto" ref={mainContentRef}>
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

        {/* Header Image Section - HIDDEN IN PDF */}
        {coverImage ? (
          <div className="relative w-full h-[55vh] min-h-[450px] no-pdf print:hidden">
             <img src={coverImage} className="w-full h-full object-cover" alt="Cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 print:hidden" />
             <div className="absolute bottom-36 left-0 w-full px-6 md:px-12 flex justify-between z-30 pointer-events-none print:hidden">
                 <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="pointer-events-auto flex items-center gap-2 bg-white/80 hover:bg-white text-[#2C5F2D] px-5 py-2.5 rounded-full shadow-lg backdrop-blur-md transition-all border border-white/50">
                    <ArrowLeft size={18} /> <span className="font-bold font-serif-cn text-sm">返回</span>
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(); }} disabled={isDownloading} className="pointer-events-auto flex items-center gap-2 bg-[#2C5F2D]/80 hover:bg-[#2C5F2D] text-white px-5 py-2.5 rounded-full shadow-lg backdrop-blur-md transition-all border border-[#2C5F2D]/50 disabled:opacity-50 disabled:cursor-wait">
                    {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 
                    <span className="font-bold font-serif-cn text-sm">{isDownloading ? '生成中...' : '下载 PDF'}</span>
                 </button>
             </div>
          </div>
        ) : (
          <div className="pt-24 px-6 md:px-12 mb-4 no-pdf print:hidden">
               <div className="max-w-5xl mx-auto flex items-center justify-between">
                   <button onClick={onBack} className="flex items-center gap-2 bg-white text-[#5C554B] hover:text-[#2C5F2D] px-5 py-2 rounded-full shadow-sm border border-[#E5E0D8] transition-all font-serif-cn font-bold text-sm">
                      <ArrowLeft size={16} /> <span>返回</span>
                   </button>
                   <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center gap-2 bg-[#2C5F2D] text-white px-5 py-2 rounded-full shadow-md hover:bg-[#1F4420] transition-all font-serif-cn font-bold text-sm disabled:opacity-50 disabled:cursor-wait">
                      {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      <span>{isDownloading ? '生成中...' : '下载 PDF'}</span>
                   </button>
               </div>
           </div>
        )}

        {/* MAIN BROCHURE CARD */}
        <div className={`px-4 md:px-8 relative ${coverImage ? '-mt-32 z-20 print:mt-0 print:px-0 pdf-reset-margin' : 'print:px-0'}`}>
           <div className="max-w-5xl mx-auto relative bg-[#FDFBF7] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-[4px] print:shadow-none print:bg-transparent print:w-full">
                 
                 {/* Decorative Double Border Frame - Hidden in Print/PDF */}
                 <div className="absolute inset-4 border-[3px] border-double border-[#97764E]/20 pointer-events-none z-0 rounded-sm no-pdf print:hidden"></div>

                 <div className="relative z-10 p-8 md:p-16 print:p-0">
                     
                     {/* HERO SECTION (Static) */}
                     <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-10 mb-12 border-b border-[#97764E]/10 pb-10 print:border-[#97764E]/30 print:pb-4 print:mb-8 print:flex-row print:items-end">
                        {/* Left: Property Name */}
                        <div className="flex-1 w-full lg:w-auto flex flex-col items-center lg:items-start print:items-start">
                           <div className="flex items-center gap-3 mb-4">
                              <span className="h-px w-8 bg-[#97764E]"></span>
                              <span className="text-[10px] font-bold text-[#97764E] uppercase tracking-[0.2em] font-sans-cn">Residence</span>
                           </div>
                           <input
                                value={property.name}
                                onChange={(e) => onUpdate({ ...property, name: e.target.value })}
                                className="w-full text-4xl md:text-5xl lg:text-6xl font-serif-cn font-bold bg-transparent outline-none text-[#2C5F2D] placeholder-gray-200 tracking-tight leading-tight text-center lg:text-left print:text-left print:text-[#2C5F2D] print:p-0 print:border-none print:w-auto"
                                placeholder="房源名称"
                            />
                            <div className="flex gap-4 mt-6 justify-center lg:justify-start print:mt-2">
                                <div className="w-32 no-pdf print:hidden">
                                  <SegmentedControl options={[{value: 'existing', label: '现房'}, {value: 'off-plan', label: '期房'}]} value={property.listingType || 'existing'} onChange={(val) => onUpdate({...property, listingType: val})} />
                                </div>
                                <div className="w-32 no-pdf print:hidden">
                                  <SegmentedControl options={[{value: 'false', label: '未看'}, {value: 'true', label: '已看'}]} value={String(!!property.hasViewed)} onChange={(val) => onUpdate({...property, hasViewed: val === 'true'})} />
                                </div>
                                {/* Print/PDF Only Text for Type/Status */}
                                <div className="hidden only-pdf print:flex status-badge-wrapper gap-4 text-xs font-sans-cn font-bold text-[#97764E] tracking-widest uppercase">
                                   <span className="border border-[#97764E] px-2 py-1 rounded">{property.listingType === 'off-plan' ? '期房' : '现房'}</span>
                                   <span className="border border-[#97764E] px-2 py-1 rounded">{property.hasViewed ? '已看' : '未看'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: The Data Focal Point */}
                        <div className="flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-16 items-center md:items-baseline w-full lg:w-auto mt-6 lg:mt-0 print:mt-0 print:flex-row print:gap-8 print:w-auto">
                           <div className="flex flex-col items-center md:items-end group cursor-text relative print:items-end">
                              <label className="text-[10px] text-[#97764E] font-bold uppercase tracking-widest mb-1 font-sans-cn">Total Price</label>
                              <div className="flex items-baseline relative justify-center md:justify-end">
                                 <span className="text-xl md:text-2xl font-display text-[#2C5F2D] mr-1 italic">¥</span>
                                 <input type="number" value={property.price || ''} onChange={(e) => onUpdate({ ...property, price: Number(e.target.value) })} className="w-32 md:w-40 text-5xl md:text-7xl font-display text-[#2A2A2A] bg-transparent outline-none text-center md:text-right font-medium placeholder-gray-100 border-b-2 border-transparent hover:border-[#2C5F2D]/20 focus:border-[#2C5F2D] transition-colors print:text-[#2A2A2A] print:border-none print:w-auto print:text-right" placeholder="0" />
                                 <span className="text-base md:text-lg font-serif-cn text-[#5C554B] ml-1">万</span>
                              </div>
                              {unitPrice && <div className="mt-2 bg-[#F2EFE9] text-[#5C554B] px-3 py-1 rounded-full text-xs font-sans-cn tracking-wide border border-[#E5E0D8] print:bg-transparent print:border-none print:p-0 print:text-[#666]">单价 ≈ <span className="font-bold text-[#2C5F2D]">{unitPrice}</span> 元/m²</div>}
                           </div>
                           <div className="w-12 h-px bg-[#97764E]/20 md:hidden no-pdf print:hidden"></div>
                           <div className="flex flex-col items-center md:items-end group cursor-text print:items-end">
                              <label className="text-[10px] text-[#97764E] font-bold uppercase tracking-widest mb-1 font-sans-cn">Area Size</label>
                              <div className="flex items-baseline border-b-2 border-transparent hover:border-[#2C5F2D]/20 focus-within:border-[#2C5F2D] transition-colors justify-center md:justify-end">
                                 <input type="number" value={property.area || ''} onChange={(e) => onUpdate({ ...property, area: Number(e.target.value) })} className="w-24 md:w-32 text-5xl md:text-7xl font-display text-[#2A2A2A] bg-transparent outline-none text-center md:text-right font-medium placeholder-gray-100 print:text-[#2A2A2A] print:border-none print:w-auto print:text-right" placeholder="0" />
                                 <span className="text-base md:text-lg font-serif-cn text-[#5C554B] ml-1">㎡</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* 
                         CANVAS CONTAINER FOR SCRAPBOOK MODE 
                         We make this `relative` so absolute sticker images can float over the text content below.
                     */}
                     <div className="relative min-h-[600px] print:min-h-0" ref={scrapbookContainerRef}>
                        
                        {/* --- CONTENT GRID (Background for Stickers) --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 relative z-0 print:grid-cols-12 print:gap-8 print:mb-8">
                            {/* Left Column: Tags */}
                            <div className="lg:col-span-5 space-y-10 print:col-span-4 print:space-y-6">
                                {/* Pros */}
                                <div className="print:break-inside-avoid">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-px flex-grow bg-[#2C5F2D]/20"></div>
                                        <span className="text-sm font-bold text-[#2C5F2D] font-serif-cn tracking-widest uppercase">核心优势</span>
                                        <div className="h-px flex-grow bg-[#2C5F2D]/20"></div>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {property.pros.map((pro, idx) => (
                                            <div key={idx} className="group flex items-center gap-2 bg-[#2C5F2D]/5 border border-[#2C5F2D]/20 px-4 py-1.5 rounded-full text-[#1F4420] text-sm hover:bg-[#2C5F2D] hover:text-white transition-all cursor-default print:border-[#2C5F2D] print:bg-white">
                                                <span className="font-medium tracking-wide font-serif-cn">{pro}</span>
                                                <button onClick={(e) => removeTag(e, 'pros', idx)} className="opacity-0 group-hover:opacity-100 transition-opacity no-pdf print:hidden"><X size={12}/></button>
                                            </div>
                                        ))}
                                        <input className="text-sm text-center px-3 py-1.5 bg-transparent outline-none placeholder-gray-400 border-b border-transparent focus:border-[#2C5F2D] transition-colors min-w-[80px] no-pdf print:hidden" placeholder="+ 添加" onKeyDown={(e) => { if(e.key === 'Enter' && e.currentTarget.value) { onUpdate({...property, pros: [...property.pros, e.currentTarget.value]}); e.currentTarget.value = ''; }}} />
                                    </div>
                                </div>
                                {/* Cons */}
                                <div className="print:break-inside-avoid">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-px flex-grow bg-[#E65555]/20"></div>
                                        <span className="text-sm font-bold text-[#E65555] font-serif-cn tracking-widest uppercase">劣势风险</span>
                                        <div className="h-px flex-grow bg-[#E65555]/20"></div>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {property.cons.map((con, idx) => (
                                            <div key={idx} className="group flex items-center gap-2 bg-[#E65555]/5 border border-[#E65555]/20 px-4 py-1.5 rounded-full text-[#8B0000] text-sm hover:bg-[#E65555] hover:text-white transition-all cursor-default print:border-[#E65555] print:bg-white">
                                                <span className="font-medium tracking-wide font-serif-cn">{con}</span>
                                                <button onClick={(e) => removeTag(e, 'cons', idx)} className="opacity-0 group-hover:opacity-100 transition-opacity no-pdf print:hidden"><X size={12}/></button>
                                            </div>
                                        ))}
                                        <input className="text-sm text-center px-3 py-1.5 bg-transparent outline-none placeholder-gray-400 border-b border-transparent focus:border-[#E65555] transition-colors min-w-[80px] no-pdf print:hidden" placeholder="+ 添加" onKeyDown={(e) => { if(e.key === 'Enter' && e.currentTarget.value) { onUpdate({...property, cons: [...property.cons, e.currentTarget.value]}); e.currentTarget.value = ''; }}} />
                                    </div>
                                </div>

                                {/* Floor Plan Manager (Added Here) */}
                                <div className="print:break-inside-avoid">
                                  <FloorPlanManager 
                                    floorPlans={property.floorPlans || []} 
                                    onChange={(plans) => onUpdate({...property, floorPlans: plans})} 
                                  />
                                </div>
                            </div>

                            {/* Right Column: Notes */}
                            <div className="lg:col-span-7 pl-0 lg:pl-8 border-l-0 lg:border-l border-[#E5E0D8] print:col-span-8 print:pl-8 print:border-l print:border-[#E5E0D8]">
                                <div className="relative flex flex-col h-full min-h-[500px] print:min-h-0 print:h-auto">
                                    <Quote size={48} className="absolute -top-4 -left-4 text-[#97764E]/10 pointer-events-none" />
                                    <div className="flex-shrink-0 flex items-center gap-2 mb-2">
                                      <div className="w-1 h-4 bg-[#97764E]"></div>
                                      <label className="text-sm font-bold text-[#5C554B] uppercase tracking-widest font-sans-cn">Inspector's Note</label>
                                    </div>

                                    {/* --- NEW DISCOUNT SECTION (GOLD/BRONZE) --- */}
                                    <div className="flex-shrink-0 mb-6 bg-[#F7F5F0] p-5 rounded-xl border border-[#97764E]/20 relative group hover:border-[#D4AF37]/50 transition-colors no-pdf print:hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37] rounded-l-xl"></div>
                                        
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-[#D4AF37]/10 rounded-md text-[#B08D55]">
                                                <Tag size={14} />
                                            </div>
                                            <span className="text-xs font-bold text-[#97764E] uppercase tracking-widest font-sans-cn">
                                                优惠政策 &amp; 时效
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Policy */}
                                            <div className="relative">
                                                <label className="text-[10px] text-[#5C554B]/60 font-bold uppercase block mb-1.5 flex items-center gap-1">
                                                    优惠内容 <span className="text-[#D4AF37]">*</span>
                                                </label>
                                                <input 
                                                    value={property.discountPolicy || ''} 
                                                    onChange={(e) => onUpdate({ ...property, discountPolicy: e.target.value })} 
                                                    className="w-full bg-transparent border-b border-[#97764E]/20 text-sm font-serif-cn font-bold text-[#B08D55] placeholder-[#B08D55]/30 focus:border-[#D4AF37] outline-none transition-colors py-1.5"
                                                    placeholder="例如: 98折, 送产权车位..."
                                                />
                                            </div>
                                            
                                            {/* Deadline */}
                                            <div className="relative">
                                                <label className="text-[10px] text-[#5C554B]/60 font-bold uppercase block mb-1.5 flex items-center gap-1">
                                                    <Clock size={10} /> 截止时间
                                                </label>
                                                <input 
                                                    value={property.discountDeadline || ''} 
                                                    onChange={(e) => onUpdate({ ...property, discountDeadline: e.target.value })} 
                                                    className="w-full bg-transparent border-b border-[#97764E]/20 text-sm font-serif-cn text-[#2A2A2A] placeholder-gray-400 focus:border-[#D4AF37] outline-none transition-colors py-1.5"
                                                    placeholder="例如: 2024/05/01 或 开盘前"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Editable Textarea (Hidden in Print/PDF) */}
                                    <textarea
                                        value={property.notes}
                                        onChange={(e) => onUpdate({ ...property, notes: e.target.value })}
                                        className="w-full flex-1 min-h-[300px] p-0 bg-transparent outline-none resize-none text-lg leading-[2.5rem] font-serif-cn text-[#2A2A2A] placeholder-gray-300 lined-paper relative z-10 bg-transparent no-pdf print:hidden"
                                        placeholder="在此记录楼层状况、采光时间段、噪音来源、物业服务感受..."
                                    />

                                    {/* Print-Only Div for clean text flow */}
                                    <div className="hidden only-pdf print:block flex-1 w-full text-lg leading-[2rem] font-serif-cn text-[#2A2A2A] whitespace-pre-wrap text-justify">
                                        {property.discountPolicy && (
                                           <div className="mb-4 p-4 border border-[#D4AF37] rounded bg-white relative overflow-hidden">
                                              <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
                                              <p className="text-[#B08D55] font-bold text-sm mb-1 pl-2">【优惠政策】 {property.discountPolicy}</p>
                                              {property.discountDeadline && <p className="text-gray-500 text-xs pl-2">截止日期: {property.discountDeadline}</p>}
                                           </div>
                                        )}
                                        {property.notes || "暂无笔记..."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- GALLERY / SCRAPBOOK HEADER (HIDDEN IN PRINT/PDF) --- */}
                        <div className="border-t border-[#97764E]/10 pt-10 relative z-20 no-pdf print:hidden">
                            <div className="flex items-center justify-between mb-6 print:mb-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-[#97764E] uppercase tracking-widest font-sans-cn">Visual Gallery</span>
                                    
                                    {/* Toggle Mode Slider */}
                                    <div className="w-32 print:hidden">
                                        <SegmentedControl 
                                            options={[{value: 'grid', label: '对齐'}, {value: 'scrapbook', label: '手账'}]} 
                                            value={isScrapbookMode ? 'scrapbook' : 'grid'} 
                                            onChange={(val) => setIsScrapbookMode(val === 'scrapbook')} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 print:hidden">
                                    {isProcessing && <span className="text-xs text-[#97764E] animate-pulse">正在压缩...</span>}
                                    <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 text-[#2C5F2D] hover:text-[#1F4420] text-sm font-bold font-sans-cn transition-colors">
                                        <ImageIcon size={16} /> 添加照片
                                    </button>
                                </div>
                                <input type="file" ref={imageInputRef} accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                            </div>

                            {/* --- CONDITIONAL LAYOUTS --- */}
                            
                            {/* 1. INTERACTIVE GRID LAYOUT (Hidden in Print) */}
                            {!isScrapbookMode && (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 print:hidden">
                                    {property.media.map((m, i) => (
                                    <div 
                                        key={i} 
                                        className={`
                                            relative w-full aspect-square bg-gray-100 cursor-move transition-all duration-300 group
                                            ${draggedIndex === i ? 'opacity-40 scale-90' : 'hover:-translate-y-1 shadow-md hover:shadow-xl'}
                                        `}
                                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%)' }} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, i)}
                                        onDragOver={(e) => handleDragOver(e, i)}
                                        onDrop={(e) => handleDrop(e, i)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => m.type === 'image' && setPreviewImage(m.url)}
                                    >
                                        {m.type === 'image' && <img src={m.url} className="w-full h-full object-cover filter sepia-[0.1] hover:sepia-0 transition-all duration-500" />}
                                        
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>

                                        <button 
                                            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-gray-500 rounded-full hover:bg-[#E65555] hover:text-white transition-all shadow-md z-20 border border-gray-200 hover:border-[#E65555] opacity-0 group-hover:opacity-100" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdate({...property, media: property.media.filter((_, midx) => midx !== i)});
                                            }}
                                            title="删除"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    ))}
                                    
                                    {property.media.length === 0 && (
                                    <div onClick={() => imageInputRef.current?.click()} className="w-full aspect-square border border-dashed border-[#D8D0C0] flex flex-col items-center justify-center text-[#D8D0C0] hover:text-[#97764E] hover:border-[#97764E] cursor-pointer transition-colors">
                                        <ImageIcon size={24} className="mb-2"/>
                                        <span className="text-xs">No Images</span>
                                    </div>
                                    )}
                                </div>
                            )}

                            {/* 2. INTERACTIVE SCRAPBOOK LAYOUT (Hidden in Print) */}
                            {isScrapbookMode && (
                                <div className="print:hidden">
                                  {property.media.map((m) => {
                                    if (m.type !== 'image') return null;
                                    return (
                                        <TransformableImage
                                            key={m.timestamp}
                                            media={m}
                                            containerRef={scrapbookContainerRef}
                                            onUpdate={updateMediaItem}
                                            onSelect={() => bringToFront(m.timestamp)}
                                        />
                                    );
                                  })}
                                </div>
                            )}

                            {isScrapbookMode && property.media.length === 0 && (
                                <div className="h-40 flex items-center justify-center text-[#97764E]/40 border-2 border-dashed border-[#E5E0D8] rounded-xl print:hidden">
                                    <p className="font-sans-cn text-sm">暂无照片。点击右上角“添加照片”开始拼贴！</p>
                                </div>
                            )}
                        </div>
                     </div>

                  {/* Footer Delete (Hidden in Print) */}
                  <div className="flex justify-center mt-12 pt-8 border-t border-[#97764E]/10 no-pdf print:hidden">
                      <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }} className="text-gray-400 hover:text-red-800 hover:bg-red-50 px-6 py-2 rounded-full transition-all text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                          <Trash2 size={14} /> Remove Listing
                      </button>
                  </div>

                  {/* Print Footer */}
                  <div className="hidden only-pdf print:flex justify-between mt-12 pt-4 border-t border-[#97764E]/30 text-[9px] text-[#97764E] font-serif-cn uppercase tracking-widest">
                      <span>Generated by 买房人笔记</span>
                      <span>{new Date().toLocaleDateString()}</span>
                  </div>
                 </div>
           </div>
        </div>
        
        {/* Error Notification Toast */}
        {notification && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] bg-red-50 text-red-600 px-6 py-3 rounded-full shadow-2xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                <AlertCircle size={20} />
                <span className="text-sm font-bold font-sans-cn">{notification}</span>
                <button onClick={() => setNotification(null)} className="ml-2 hover:bg-red-100 p-1 rounded-full"><X size={14}/></button>
            </div>
        )}

        {/* Lightbox */}
        {previewImage && (
          <div className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-500 no-pdf print:hidden" onClick={() => setPreviewImage(null)}>
             <button className="absolute top-8 right-8 text-black/50 hover:text-black transition-colors" onClick={() => setPreviewImage(null)}><X size={32} /></button>
             <img src={previewImage} className="max-w-full max-h-[85vh] object-contain shadow-2xl ring-8 ring-white" onClick={(e) => e.stopPropagation()} alt="Full size preview" />
          </div>
        )}
    </div>
  );
};