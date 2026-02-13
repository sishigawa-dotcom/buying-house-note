import React, { useState, useRef } from 'react';
import { Property } from '../types';
import { Star, GripVertical, FolderOpen, Plus, MoreHorizontal, ArrowRight, BedDouble, Ruler, Tag } from 'lucide-react';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface PropertyListProps {
  properties: Property[];
  categories: string[];
  onUpdateCategories: (categories: string[]) => void;
  onSelect: (id: string) => void;
  onUpdate: (prop: Property) => void;
  onDelete: (id: string) => void;
  onReorder: (newOrder: Property[]) => void;
  selectedId: string | null;
}

interface PropertyItemProps {
  property: Property;
  isSelected: boolean;
  onSelect: (id: string) => void;
  categories: string[];
  onMoveCategory: (id: string, newCategory: string) => void;
  index: number;
}

// --- Visual Assets: Architectural Placeholder ---
const ArchitecturalPlaceholder = () => (
  <div className="w-full h-full bg-[#F2EFE9] flex items-center justify-center overflow-hidden relative opacity-80">
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 text-[#97764E]/20">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      {/* Abstract House Sketch */}
      <path d="M20 60 L50 30 L80 60" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M30 60 L30 80 L70 80 L70 60" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="30" x2="50" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
    </svg>
    <div className="z-10 bg-[#FAF9F6] px-2 py-1 border border-[#97764E]/30 text-[8px] uppercase tracking-widest text-[#97764E] font-sans-cn font-bold">
      No Image
    </div>
  </div>
);

// --- Component: Individual Property Card ---
const PropertyItem: React.FC<PropertyItemProps> = ({ 
  property, 
  isSelected, 
  onSelect,
  categories,
  onMoveCategory,
  index
}) => {
  const dragControls = useDragControls();
  const [showMenu, setShowMenu] = useState(false);
  
  // Ref to track if a drag is occurring
  const isDraggingRef = useRef(false);

  // Get the first image or use placeholder
  const coverImage = property.media.find(m => m.type === 'image')?.url;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    }
  };

  return (
    <Reorder.Item
      value={property}
      id={property.id}
      dragListener={false}
      dragControls={dragControls}
      variants={itemVariants}
      // Track drag state
      onDragStart={() => { isDraggingRef.current = true; }}
      onDragEnd={() => { 
        // Small delay to ensure click events fire after drag ends are ignored
        setTimeout(() => { isDraggingRef.current = false; }, 100); 
      }}
      whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
      className="relative mb-6 group"
    >
      <motion.div
        onClick={(e) => {
          // If dragging just finished, do not select
          if (isDraggingRef.current) {
            e.stopPropagation();
            return;
          }
          onSelect(property.id);
        }}
        className={`
          relative overflow-hidden rounded-[4px] border transition-all duration-300
          ${isSelected 
            ? 'bg-[#FAF9F6] border-[#2C5F2D] shadow-[0_4px_20px_-4px_rgba(44,95,45,0.15)]' 
            : 'bg-[#FAF9F6] border-[#E5E0D8] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#97764E]/30'
          }
        `}
      >
        <div className="flex h-32 sm:h-36">
          {/* Left: Image / Visual */}
          <div className="w-32 sm:w-40 flex-shrink-0 relative border-r border-[#E5E0D8]">
             {coverImage ? (
               <img src={coverImage} alt={property.name} className="w-full h-full object-cover grayscale-[0.1] contrast-[0.95]" />
             ) : (
               <ArchitecturalPlaceholder />
             )}
             {/* Rating Badge */}
             {property.rating > 0 && (
                <div className="absolute top-0 left-0 bg-[#2C5F2D] text-[#F7F5F0] px-2 py-1 text-[10px] font-bold font-sans-cn flex items-center gap-1 shadow-sm rounded-br-lg">
                   <span>{property.rating}.0</span>
                   <Star size={8} fill="currentColor" />
                </div>
             )}
          </div>

          {/* Right: Content */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0 relative">
             
             {/* Header */}
             <div className="flex justify-between items-start">
                <div className="min-w-0 pr-6">
                   <h3 className="font-serif-cn text-lg sm:text-xl font-bold text-[#2C5F2D] tracking-wide truncate leading-tight">
                     {property.name}
                   </h3>
                   <div className="flex items-center gap-2 mt-1.5">
                      {/* Price & Area Line */}
                      <div className="flex items-baseline gap-1 text-[#5C554B] font-sans-cn text-xs sm:text-sm">
                         <span className="font-bold text-[#2A2A2A]">{property.price ? `¥${property.price}` : '-'}</span>
                         <span className="text-[10px]">万</span>
                         <span className="mx-1 text-[#E5E0D8]">|</span>
                         <span className="font-bold text-[#2A2A2A]">{property.area ? property.area : '-'}</span>
                         <span className="text-[10px]">m²</span>
                      </div>
                   </div>
                </div>

                {/* Drag Handle */}
                <div 
                   className="absolute top-0 right-0 p-3 text-[#E5E0D8] hover:text-[#2C5F2D] cursor-grab active:cursor-grabbing transition-colors"
                   onPointerDown={(e) => dragControls.start(e)}
                >
                   <GripVertical size={16} />
                </div>
             </div>

             {/* Tags & Action */}
             <div className="flex justify-between items-end mt-2">
                <div className="flex flex-wrap gap-1.5 overflow-hidden h-6">
                   {/* Category Stamp */}
                   {property.category && (
                     <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] border border-[#97764E]/30 text-[9px] font-bold text-[#97764E] uppercase tracking-wider bg-[#97764E]/5">
                        {property.category}
                     </span>
                   )}
                   {/* Status Stamp */}
                   {property.hasViewed && (
                     <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] border border-[#2A2A2A]/30 text-[9px] font-bold text-[#2A2A2A] uppercase tracking-wider bg-[#2A2A2A]/5">
                        已看
                     </span>
                   )}
                   {property.listingType === 'off-plan' && (
                     <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] border border-blue-800/20 text-[9px] font-bold text-blue-800 uppercase tracking-wider bg-blue-50">
                        期房
                     </span>
                   )}
                </div>

                {/* More / Move Button */}
                <div className="relative">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                     className="p-1.5 rounded-full hover:bg-[#E5E0D8]/50 text-[#97764E] transition-colors"
                   >
                      <MoreHorizontal size={16} />
                   </button>

                   {/* Elegant Dropdown */}
                   <AnimatePresence>
                     {showMenu && (
                       <>
                         <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.95, y: 10 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95, y: 10 }}
                           className="absolute right-0 bottom-full mb-2 w-40 bg-[#F7F5F0] border border-[#E5E0D8] shadow-xl rounded-lg z-50 overflow-hidden py-1"
                         >
                            <div className="px-3 py-1.5 text-[9px] text-[#97764E] font-bold uppercase tracking-[0.1em] border-b border-[#E5E0D8]/50 mb-1 bg-[#F2EFE9]/50">
                               Move to Folder
                            </div>
                            {categories.filter(c => c !== '全部').map(cat => (
                              <button
                                key={cat}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveCategory(property.id, cat);
                                  setShowMenu(false);
                                }}
                                className={`
                                  w-full text-left px-4 py-2 text-xs font-sans-cn transition-colors flex items-center justify-between
                                  ${property.category === cat 
                                    ? 'text-[#2C5F2D] font-bold bg-[#2C5F2D]/5' 
                                    : 'text-[#5C554B] hover:bg-[#E5E0D8]/30'
                                  }
                                `}
                              >
                                {cat}
                                {property.category === cat && <div className="w-1.5 h-1.5 rounded-full bg-[#2C5F2D]"></div>}
                              </button>
                            ))}
                         </motion.div>
                       </>
                     )}
                   </AnimatePresence>
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
};

// --- Main Component: Property List ---
export const PropertyList: React.FC<PropertyListProps> = ({ 
  properties, 
  onSelect, 
  selectedId, 
  onReorder,
  onUpdate,
  categories,
  onUpdateCategories
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      if (!categories.includes(newCategoryName.trim())) {
        onUpdateCategories([...categories, newCategoryName.trim()]);
        setActiveCategory(newCategoryName.trim());
      }
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(`确定删除分类 "${cat}" 吗？`)) {
      const newCats = categories.filter(c => c !== cat);
      onUpdateCategories(newCats);
      if (activeCategory === cat) setActiveCategory('全部');
    }
  };

  const filteredProperties = activeCategory === '全部' 
    ? properties 
    : properties.filter(p => p.category === activeCategory);

  const handleMoveCategory = (propId: string, newCat: string) => {
    const prop = properties.find(p => p.id === propId);
    if (prop) onUpdate({ ...prop, category: newCat });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  return (
    <div className="w-full min-h-full bg-[#F7F5F0]">
      
      {/* 1. Editorial Header */}
      <div className="pt-8 pb-6 px-6 max-w-3xl mx-auto">
         <div className="flex flex-col gap-1">
            <span className="font-display italic text-[#97764E] text-sm tracking-wider">
               The Collection
            </span>
            <h1 className="font-serif-cn text-4xl font-bold text-[#2C5F2D] tracking-tight leading-tight">
               置业清单
            </h1>
            <p className="font-sans-cn text-xs text-[#5C554B] opacity-80 mt-1 tracking-wide uppercase">
               {filteredProperties.length} Properties · {new Date().getFullYear()} Edition
            </p>
         </div>
      </div>

      {/* 2. Elegant Tabs (Scrollable) */}
      <div className="sticky top-0 z-20 bg-[#F7F5F0]/95 backdrop-blur-sm border-b border-[#E5E0D8]">
         <div className="max-w-3xl mx-auto px-4">
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide py-3 no-scrollbar">
               {categories.map(cat => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      onContextMenu={(e) => { e.preventDefault(); if(cat !== '全部') handleDeleteCategory(cat); }}
                      className={`
                        relative flex-shrink-0 text-sm font-sans-cn font-bold tracking-wide transition-colors py-1
                        ${isActive ? 'text-[#2C5F2D]' : 'text-[#97764E]/60 hover:text-[#97764E]'}
                      `}
                    >
                       {cat}
                       <span className="text-[10px] ml-1 opacity-60 font-serif">{cat === '全部' ? properties.length : properties.filter(p => p.category === cat).length}</span>
                       
                       {isActive && (
                         <motion.div 
                           layoutId="tabUnderline"
                           className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2C5F2D]"
                           transition={{ type: "spring", stiffness: 300, damping: 30 }}
                         />
                       )}
                    </button>
                  );
               })}

               {/* Add Category Trigger */}
               {isAddingCategory ? (
                  <div className="flex items-center border-b border-[#2C5F2D] pb-1 animate-in fade-in duration-200">
                     <input 
                       autoFocus
                       value={newCategoryName}
                       onChange={(e) => setNewCategoryName(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                       onBlur={() => { if(!newCategoryName) setIsAddingCategory(false); }}
                       className="w-20 text-xs bg-transparent outline-none font-bold text-[#2C5F2D] placeholder-[#2C5F2D]/30"
                       placeholder="New..."
                     />
                  </div>
               ) : (
                  <button 
                    onClick={() => setIsAddingCategory(true)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[#97764E]/40 hover:text-[#2C5F2D] hover:bg-[#E5E0D8]/50 transition-colors"
                  >
                     <Plus size={14} />
                  </button>
               )}
            </div>
         </div>
      </div>

      {/* 3. Property List Container */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#97764E]/40 border border-dashed border-[#E5E0D8] rounded-[4px] m-4">
            <FolderOpen size={32} strokeWidth={1} />
            <p className="font-serif-cn mt-4 text-sm">暂无收录</p>
            <p className="font-sans-cn text-xs mt-1 opacity-70">
               {activeCategory === '全部' ? '请在地图上添加房源' : `"${activeCategory}" 分类为空`}
            </p>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={filteredProperties} 
            onReorder={onReorder}
            className="list-none p-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredProperties.map((p, index) => (
              <PropertyItem 
                key={p.id}
                property={p}
                isSelected={selectedId === p.id}
                onSelect={onSelect}
                categories={categories}
                onMoveCategory={handleMoveCategory}
                index={index}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
};