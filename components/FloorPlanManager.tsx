import React from 'react';
import { FloorPlan } from '../types';
import { Heart, Plus, X, LayoutTemplate } from 'lucide-react';

interface FloorPlanManagerProps {
  floorPlans: FloorPlan[];
  onChange: (plans: FloorPlan[]) => void;
}

export const FloorPlanManager: React.FC<FloorPlanManagerProps> = ({ floorPlans = [], onChange }) => {
  
  const handleAdd = () => {
    const newPlan: FloorPlan = {
      id: Date.now().toString(),
      size: '',
      label: '',
      isFavorite: false,
    };
    onChange([...floorPlans, newPlan]);
  };

  const handleUpdate = (id: string, field: keyof FloorPlan, value: any) => {
    const updated = floorPlans.map(p => p.id === id ? { ...p, [field]: value } : p);
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    const updated = floorPlans.filter(p => p.id !== id);
    onChange(updated);
  };

  const toggleFavorite = (id: string) => {
    const updated = floorPlans.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
    onChange(updated);
  };

  return (
    <div className="w-full mt-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-grow bg-[#97764E]/20"></div>
        <div className="flex items-center gap-2 text-[#97764E]">
            <LayoutTemplate size={14} />
            <span className="text-sm font-bold font-serif-cn tracking-widest uppercase">Floor Plans / 户型分布</span>
        </div>
        <div className="h-px flex-grow bg-[#97764E]/20"></div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 print:grid-cols-3 print:gap-4">
        {floorPlans.map((plan) => (
          <div 
            key={plan.id}
            className={`
               group relative flex flex-col p-4 rounded-xl transition-all duration-300
               border backdrop-blur-sm break-inside-avoid
               ${plan.isFavorite 
                 ? 'bg-white/80 border-[#C0392B]/30 shadow-sm print:border-[#C0392B] print:shadow-none' 
                 : 'bg-[#F2EFE9]/40 border-[#97764E]/20 hover:bg-white/60 hover:border-[#97764E]/40 print:bg-white print:border-[#97764E]/20'
               }
            `}
          >
            {/* Top Row: Favorite & Delete (Hidden in Print) */}
            <div className="flex justify-between items-start mb-1 print:hidden">
               <button 
                 onClick={() => toggleFavorite(plan.id)}
                 className="focus:outline-none transition-transform active:scale-90"
                 title={plan.isFavorite ? "取消心仪" : "设为心仪"}
               >
                 <Heart 
                   size={16} 
                   className={`transition-colors duration-300 ${plan.isFavorite ? 'fill-[#C0392B] text-[#C0392B]' : 'text-[#97764E]/30 hover:text-[#C0392B]/60'}`} 
                 />
               </button>

               <button 
                 onClick={() => handleDelete(plan.id)}
                 className="opacity-0 group-hover:opacity-100 text-[#97764E]/40 hover:text-red-500 transition-all transform hover:scale-110"
               >
                 <X size={14} />
               </button>
            </div>
            
            {/* Print-Only Favorite Indicator */}
            {plan.isFavorite && (
              <div className="hidden print:block absolute top-2 right-2">
                 <Heart size={12} className="fill-[#C0392B] text-[#C0392B]" />
              </div>
            )}

            {/* Middle: Size Input */}
            <div className="flex items-baseline justify-center gap-1 my-1">
                <input 
                  value={plan.size}
                  onChange={(e) => handleUpdate(plan.id, 'size', e.target.value)}
                  placeholder="0"
                  className="w-20 text-center bg-transparent text-3xl font-serif-cn font-bold text-[#2A2A2A] outline-none placeholder-[#97764E]/30 border-b border-transparent focus:border-[#97764E]/30 transition-colors p-0 print:border-none print:w-auto"
                />
                <span className="text-xs text-[#97764E] font-serif-cn">m²</span>
            </div>

            {/* Bottom: Label Input */}
            <input 
              value={plan.label}
              onChange={(e) => handleUpdate(plan.id, 'label', e.target.value)}
              placeholder="添加描述 (如: 3室2厅)"
              className="w-full text-center bg-transparent text-xs font-sans-cn text-[#5C554B] outline-none placeholder-[#97764E]/50 border-b border-[#97764E]/10 focus:border-[#97764E]/50 transition-colors pb-1 print:border-none"
            />
          </div>
        ))}

        {/* Add New Button (Hidden in Print) */}
        <button 
          onClick={handleAdd}
          className="flex flex-col items-center justify-center min-h-[120px] rounded-xl border border-dashed border-[#97764E]/30 text-[#97764E]/50 hover:text-[#2C5F2D] hover:border-[#2C5F2D]/50 hover:bg-[#2C5F2D]/5 transition-all duration-300 group print:hidden"
        >
           <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <Plus size={16} />
           </div>
           <span className="text-xs font-sans-cn font-bold tracking-wide">添加户型</span>
        </button>
      </div>
    </div>
  );
};