import React, { useState, useEffect } from 'react';
import { Settings2, Zap } from 'lucide-react';

const PREFERENCE_KEYWORDS = [
  '学区强', '近地铁', '得房率高', '大阳台', 
  '物业好', '低密度', '人车分流', '朝南', 
  '落地窗', '自带商业', '安静', '精装修',
  '车位充足', '升值潜力', '总价低', '拎包入住',
  '三水分离', '视野开阔', '成熟社区', '现房'
];

interface PreferenceMatrixProps {
  onChange: (selected: string[]) => void;
}

export const PreferenceMatrix: React.FC<PreferenceMatrixProps> = ({ onChange }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleKeyword = (keyword: string) => {
    let newSelected;
    if (selected.includes(keyword)) {
      newSelected = selected.filter(k => k !== keyword);
    } else {
      if (selected.length >= 5) {
        // Optional: limit max choices to keep AI focused, or allow unlimited. 
        // Let's allow unlimited but visual feedback could be nice.
        newSelected = [...selected, keyword];
      } else {
        newSelected = [...selected, keyword];
      }
    }
    setSelected(newSelected);
    onChange(newSelected);
  };

  return (
    <div className="w-full bg-white/40 backdrop-blur-md border border-[#E5E0D8] rounded-2xl p-6 mb-8 shadow-sm transition-all duration-500 hover:shadow-md hover:bg-white/60">
      
      {/* Header with Tech feel */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#E5E0D8]/50 pb-3">
        <div className="p-1.5 bg-[#2C5F2D]/10 rounded-md">
          <Settings2 size={18} className="text-[#2C5F2D]" />
        </div>
        <h3 className="font-serif-cn text-lg font-bold text-[#2C5F2D] tracking-wide">
          您最关心
        </h3>
        <span className="text-xs text-[#97764E] font-sans-cn ml-auto px-3 py-1 bg-[#F2EFE9] rounded-full border border-[#E5E0D8]">
          已选核心关注点: {selected.length}
        </span>
      </div>

      {/* Tag Cloud Grid */}
      <div className="flex flex-wrap gap-3">
        {PREFERENCE_KEYWORDS.map((keyword) => {
          const isSelected = selected.includes(keyword);
          return (
            <button
              key={keyword}
              onClick={() => toggleKeyword(keyword)}
              className={`
                relative px-4 py-2 rounded-full text-sm font-sans-cn font-medium transition-all duration-300 ease-out
                border select-none overflow-hidden group
                ${isSelected 
                  ? 'bg-[#2C5F2D] border-[#2C5F2D] text-white shadow-[0_4px_12px_rgba(44,95,45,0.3)] scale-105' 
                  : 'bg-white/60 border-[#E5E0D8] text-[#5C554B] hover:border-[#97BC62] hover:bg-white hover:scale-105'
                }
              `}
            >
              {/* Glow Effect Container */}
              {isSelected && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-white/10 pointer-events-none"></div>
              )}
              
              <div className="flex items-center gap-1.5 relative z-10">
                {isSelected && <Zap size={10} className="text-[#97BC62] fill-current" />}
                {keyword}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Helper Text */}
      <div className="mt-4 text-xs text-gray-400 font-sans-cn flex items-center gap-2">
         <div className="w-1 h-1 rounded-full bg-gray-300"></div>
         AI 将根据选中的标签，为您重新计算房源的匹配度权重。
      </div>
    </div>
  );
};