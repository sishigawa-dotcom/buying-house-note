import React, { useState } from 'react';
import { Property } from '../types';
import { analyzeProperties } from '../services/geminiService';
import { Check, X, ArrowRight, Download, ArrowLeft, Settings2 } from 'lucide-react';
import { PreferenceMatrix } from './PreferenceMatrix';

interface ComparisonViewProps {
  properties: Property[];
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ properties }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<string[]>([]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      if (selectedIds.length >= 4) {
        alert("最多只能对比4个房源");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedProperties = properties.filter(p => selectedIds.includes(p.id));

  const handleAnalyze = async () => {
    setLoading(true);
    // Pass user preferences to the service
    const result = await analyzeProperties(selectedProperties, userPreferences);
    setAnalysis(result);
    setLoading(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["属性", ...selectedProperties.map(p => p.name)].join(",");
    
    // Rows (Rating removed)
    const rows = [
      ["总价 (万)", ...selectedProperties.map(p => p.price || 0)],
      ["面积 (m²)", ...selectedProperties.map(p => p.area || 0)],
      ["单价 (元/m²)", ...selectedProperties.map(p => p.price && p.area ? (p.price * 10000 / p.area).toFixed(0) : 0)],
      ["优点", ...selectedProperties.map(p => `"${p.pros.join('; ')}"` )],
      ["缺点", ...selectedProperties.map(p => `"${p.cons.join('; ')}"` )],
      ["笔记摘要", ...selectedProperties.map(p => `"${p.notes.replace(/\n/g, ' ')}"` )]
    ];

    const csvContent = "\uFEFF" + [headers, ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "房源对比表.csv";
    link.click();
  };

  // --- View: Selection Screen ---
  if (!isComparing) {
    return (
      <div className="pt-10 pb-24 max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-serif-cn text-[#2C5F2D] mb-3 font-bold tracking-tight">选择对比房源</h2>
        <p className="text-base text-[#5C554B] mb-10 font-sans-cn">请勾选 2-4 个房源生成详细对比表。</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {properties.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400 border border-dashed border-[#E5E0D8] rounded-xl">暂无房源</div>}
          {properties.map(p => (
            <div 
              key={p.id}
              onClick={() => toggleSelection(p.id)}
              className={`
                p-5 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200
                ${selectedIds.includes(p.id) 
                  ? 'bg-[#2C5F2D]/5 border-[#2C5F2D] shadow-sm' 
                  : 'bg-white border-[#E5E0D8] hover:border-[#97BC62] hover:bg-white/80'}
              `}
            >
              <div>
                <div className="font-bold text-[#2A2A2A] font-serif-cn text-lg">{p.name}</div>
                <div className="text-sm text-[#666] mt-1 font-sans-cn">
                  {p.price ? `¥${p.price}万` : '价格未填'} <span className="text-gray-300 mx-1">|</span> {p.area ? `${p.area}m²` : '面积未填'}
                </div>
              </div>
              <div className={`
                w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                ${selectedIds.includes(p.id) ? 'bg-[#2C5F2D] border-transparent' : 'border-gray-300 bg-white'}
              `}>
                {selectedIds.includes(p.id) && <Check size={14} className="text-white" />}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
            <button 
              disabled={selectedIds.length < 2}
              onClick={() => setIsComparing(true)}
              className={`
                px-10 py-4 rounded-full font-bold text-white flex items-center gap-3 font-sans-cn transition-all shadow-xl
                ${selectedIds.length < 2 ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-[#2C5F2D] hover:bg-[#1F4420] hover:scale-105 active:scale-95'}
              `}
            >
              开始对比 <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{selectedIds.length}</span> <ArrowRight size={20} />
            </button>
        </div>
      </div>
    );
  }

  // --- View: Comparison Table (Minimalist & Expanded) ---
  return (
    <div className="pt-6 pb-24 w-full flex flex-col max-w-[1600px] mx-auto">
      {/* Header Actions */}
      <div className="px-6 mb-8 flex justify-between items-center">
        <button 
          onClick={() => { setIsComparing(false); setAnalysis(''); }}
          className="text-[#666666] flex items-center gap-2 hover:text-[#2C5F2D] font-sans-cn transition-colors"
        >
          <div className="p-2 rounded-full hover:bg-[#E5E0D8]/50 transition">
             <ArrowLeft size={20} /> 
          </div>
          <span className="font-medium">重新选择</span>
        </button>
        <button 
          onClick={handleExportCSV}
          className="text-[#2C5F2D] flex items-center gap-2 bg-[#F2EFE9] border border-[#E5E0D8] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#E5E0D8] transition-colors shadow-sm"
        >
          <Download size={16} /> 导出表格
        </button>
      </div>

      <div className="px-6 mb-6">
          <h2 className="text-3xl font-serif-cn text-[#2C5F2D] font-bold tracking-tight">深度对比分析</h2>
      </div>

      {/* Comparison Table Container - Expanded */}
      <div className="overflow-x-auto pb-6 w-full px-6">
        <div className="inline-block min-w-full align-top">
            <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-[#F2EFE9] w-24 md:w-32 border-b-2 border-[#D4AF37]/20">
                    {/* Empty corner */}
                  </th>
                  {selectedProperties.map(p => (
                    <th key={p.id} className="px-8 py-6 text-left min-w-[260px] bg-transparent border-b-2 border-[#D4AF37]/20">
                      <div className="text-2xl font-serif-cn text-[#2C5F2D] font-medium tracking-wide">
                        {p.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="">
                {/* Price */}
                <tr>
                  <td className="sticky left-0 z-10 bg-[#F2EFE9] px-4 py-8 text-xs font-bold text-[#97764E]/80 uppercase font-sans-cn tracking-widest border-b border-[#E5E0D8]/50 align-top pt-10">
                    总价
                  </td>
                  {selectedProperties.map(p => (
                    <td key={p.id} className="px-8 py-8 border-b border-[#E5E0D8]/50 align-top group hover:bg-white/30 transition-colors">
                       <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-serif-cn text-[#2A2A2A] font-medium">{p.price || '-'}</span>
                          <span className="text-base text-[#666] font-light">万</span>
                       </div>
                       <div className="text-xs text-[#999] mt-2 font-sans-cn tracking-wide">
                          {p.price && p.area ? `≈ ${(p.price * 10000 / p.area).toFixed(0)} 元/m²` : '-'}
                       </div>
                    </td>
                  ))}
                </tr>

                {/* Area */}
                <tr>
                  <td className="sticky left-0 z-10 bg-[#F2EFE9] px-4 py-8 text-xs font-bold text-[#97764E]/80 uppercase font-sans-cn tracking-widest border-b border-[#E5E0D8]/50 align-top pt-9">
                    面积
                  </td>
                  {selectedProperties.map(p => (
                    <td key={p.id} className="px-8 py-8 border-b border-[#E5E0D8]/50 align-top group hover:bg-white/30 transition-colors">
                       <span className="text-xl text-[#2A2A2A] font-sans-cn">{p.area || '-'} m²</span>
                    </td>
                  ))}
                </tr>

                {/* Pros */}
                 <tr>
                  <td className="sticky left-0 z-10 bg-[#F2EFE9] px-4 py-8 text-xs font-bold text-[#97764E]/80 uppercase font-sans-cn tracking-widest border-b border-[#E5E0D8]/50 align-top pt-9">
                    核心优势
                  </td>
                  {selectedProperties.map(p => (
                    <td key={p.id} className="px-8 py-8 border-b border-[#E5E0D8]/50 align-top group hover:bg-white/30 transition-colors">
                      <ul className="space-y-3">
                        {p.pros.map((pro, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-[#1F4420] font-sans-cn bg-[#2C5F2D]/5 p-3 rounded-xl border border-[#2C5F2D]/5">
                                <Check size={16} className="mt-0.5 opacity-60 flex-shrink-0 text-[#2C5F2D]"/> 
                                <span className="leading-relaxed">{pro}</span>
                            </li>
                        ))}
                        {p.pros.length === 0 && <span className="text-gray-300 text-sm italic font-serif-cn">-</span>}
                      </ul>
                    </td>
                  ))}
                </tr>

                 {/* Cons */}
                 <tr>
                  <td className="sticky left-0 z-10 bg-[#F2EFE9] px-4 py-8 text-xs font-bold text-[#97764E]/80 uppercase font-sans-cn tracking-widest border-b border-[#E5E0D8]/50 align-top pt-9">
                    劣势/风险
                  </td>
                  {selectedProperties.map(p => (
                    <td key={p.id} className="px-8 py-8 border-b border-[#E5E0D8]/50 align-top group hover:bg-white/30 transition-colors">
                       <ul className="space-y-3">
                        {p.cons.map((con, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-[#8B0000] font-sans-cn bg-red-50 p-3 rounded-xl border border-red-100/50">
                                <X size={16} className="mt-0.5 opacity-60 flex-shrink-0 text-red-800"/> 
                                <span className="leading-relaxed">{con}</span>
                            </li>
                        ))}
                        {p.cons.length === 0 && <span className="text-gray-300 text-sm italic font-serif-cn">-</span>}
                      </ul>
                    </td>
                  ))}
                </tr>

                 {/* Notes */}
                 <tr>
                  <td className="sticky left-0 z-10 bg-[#F2EFE9] px-4 py-8 text-xs font-bold text-[#97764E]/80 uppercase font-sans-cn tracking-widest border-b-0 align-top pt-9">
                    笔记摘要
                  </td>
                  {selectedProperties.map(p => (
                    <td key={p.id} className="px-8 py-8 border-b-0 align-top group hover:bg-white/30 transition-colors">
                      <p className="text-sm text-[#5C554B] font-serif-cn leading-7 whitespace-pre-line">
                         {p.notes || <span className="text-gray-300 italic">-</span>}
                      </p>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
        </div>
      </div>

      {/* AI Analysis Section - Minimalist & Textured */}
      <div className="px-6 mt-4 pb-12 w-full max-w-5xl mx-auto">
         <div className="border-t border-[#D4AF37]/20 pt-10">
             <div className="flex items-center gap-2 mb-6">
               <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-[#2C5F2D]">
                 <path d="M12 2C13.3137 7.25483 16.7452 10.6863 22 12C16.7452 13.3137 13.3137 16.7452 12 22C10.6863 16.7452 7.25483 13.3137 2 12C7.25483 10.6863 10.6863 7.25483 12 2Z" />
               </svg>
               <h3 className="text-lg font-serif-cn tracking-wide text-[#2C5F2D] font-bold">AI 决策建议</h3>
             </div>

             {/* Preference Matrix */}
             {!analysis && !loading && (
               <PreferenceMatrix onChange={setUserPreferences} />
             )}

             {!analysis && !loading && (
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-white/40 p-6 rounded-2xl border border-[#E5E0D8]/60 shadow-sm backdrop-blur-sm">
                 <p className="text-[#5C554B] font-sans-cn text-sm flex-1 leading-relaxed">
                    基于 <b>{selectedProperties.length}</b> 套房源的各项指标与您的私人笔记，结合您上方的核心需求配置，生成客观的决策辅助报告。
                 </p>
                 <button 
                  onClick={handleAnalyze}
                  className="px-8 py-3 bg-[#2C5F2D] text-[#F7F5F0] rounded-xl font-bold hover:bg-[#1F4420] transition-all font-sans-cn text-sm shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
                 >
                   开始分析
                 </button>
               </div>
             )}

             {loading && (
               <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-white/40 rounded-2xl border border-[#E5E0D8]/60 backdrop-blur-sm">
                 <div className="w-6 h-6 border-2 border-[#E5E0D8] border-t-[#2C5F2D] rounded-full animate-spin"></div>
                 <p className="text-xs text-[#97764E] animate-pulse font-sans-cn tracking-widest uppercase font-bold">Thinking...</p>
               </div>
             )}

             {analysis && (
               <div className="prose prose-sm max-w-none font-sans-cn text-[#2A2A2A] bg-white/60 p-8 rounded-2xl border border-[#E5E0D8]/60 leading-relaxed shadow-sm backdrop-blur-sm">
                 <div className="whitespace-pre-wrap">{analysis}</div>
                 
                 <div className="mt-10 flex justify-center border-t border-[#E5E0D8]/50 pt-6">
                    <button 
                      onClick={() => { setAnalysis(''); }} 
                      className="group flex items-center gap-2 px-8 py-3 bg-white border border-[#2C5F2D] text-[#2C5F2D] rounded-full font-bold font-sans-cn shadow-sm hover:bg-[#2C5F2D] hover:text-white hover:shadow-md transition-all duration-300"
                    >
                      <Settings2 size={18} className="group-hover:rotate-180 transition-transform duration-500"/>
                      重新配置需求
                    </button>
                 </div>
               </div>
             )}
         </div>
      </div>
    </div>
  );
};
