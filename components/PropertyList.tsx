import React from 'react';
import { Property } from '../types';
import { Star, ChevronRight, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

interface PropertyListProps {
  properties: Property[];
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
}

// Sub-component for individual items to isolate DragControls hook
const PropertyItem: React.FC<PropertyItemProps> = ({ 
  property, 
  isSelected, 
  onSelect 
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={property}
      id={property.id}
      dragListener={false} // Disable default drag everywhere (to allow scrolling)
      dragControls={dragControls} // Enable drag only via controls
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileDrag={{ 
        scale: 1.03, 
        boxShadow: "0px 15px 25px -5px rgba(0, 0, 0, 0.1), 0px 8px 10px -6px rgba(0, 0, 0, 0.1)",
        zIndex: 50,
        cursor: "grabbing"
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`
        relative group mb-4 select-none
        bg-white/60 backdrop-blur-sm border rounded-xl shadow-sm transition-colors flex items-center
        ${isSelected ? 'border-[#2C5F2D] ring-1 ring-[#2C5F2D] bg-white' : 'border-[#E5E0D8]'}
      `}
    >
        {/* Drag Handle (iOS Grip Style) - The only interactive area for dragging */}
        <div 
          className="pl-3 pr-2 py-6 cursor-grab touch-none flex items-center justify-center text-[#97764E]/40 hover:text-[#2C5F2D] active:cursor-grabbing active:text-[#2C5F2D]"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical size={20} />
        </div>

        {/* Content Area - Click to Select */}
        <div 
          className="flex-1 py-4 pr-4 flex justify-between items-center cursor-pointer min-w-0"
          onClick={() => onSelect(property.id)}
        >
          <div className="min-w-0">
              <h3 className="font-bold font-serif-cn text-[#2A2A2A] text-lg tracking-wide truncate">{property.name}</h3>
              <div className="flex items-center gap-2 text-sm text-[#666666] mt-1 font-sans-cn whitespace-nowrap overflow-hidden">
                <span className="font-medium shrink-0">{property.price ? `¥${property.price}万` : '价格待定'}</span>
                <span className="text-gray-300">•</span>
                <span className="shrink-0">{property.area ? `${property.area}m²` : '面积待定'}</span>
                <span className="text-gray-300">•</span>
                <div className="flex text-yellow-500 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} fill={i < property.rating ? "currentColor" : "none"} />
                  ))}
                </div>
              </div>
              {(property.pros.length > 0 || property.notes) && (
                 <div className="mt-2 text-xs text-gray-500 truncate">
                    {property.notes || property.pros.join(' ')}
                 </div>
              )}
          </div>
          <ChevronRight className="text-[#97764E] opacity-50 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
        </div>
    </Reorder.Item>
  );
};

export const PropertyList: React.FC<PropertyListProps> = ({ properties, onSelect, selectedId, onReorder }) => {
  return (
    <div className="pt-6 space-y-4 max-w-2xl mx-auto px-4 pb-32">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-serif-cn text-[#2C5F2D] tracking-wide font-bold">我的笔记 ({properties.length})</h2>
      </div>
      
      {properties.length === 0 ? (
        <div className="text-center py-20 opacity-50 border-2 border-dashed border-[#E5E0D8] rounded-xl font-sans-cn">
          <p>暂无记录，请在地图上添加房源</p>
        </div>
      ) : (
        <Reorder.Group 
          axis="y" 
          values={properties} 
          onReorder={onReorder}
          className="list-none p-0"
        >
          {properties.map(p => (
            <PropertyItem 
              key={p.id}
              property={p}
              isSelected={selectedId === p.id}
              onSelect={onSelect}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
};