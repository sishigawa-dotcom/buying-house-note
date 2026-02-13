import React from 'react';
import { Map, List, GitCompare, Download } from 'lucide-react';
import { ViewMode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingNavProps {
  currentMode: ViewMode;
  onChangeMode: (mode: ViewMode) => void;
  itemCount: number;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({ currentMode, onChangeMode, itemCount }) => {
  
  const navItems = [
    { id: 'map', icon: Map, label: '地图' },
    { id: 'list', icon: List, label: '笔记' },
    { id: 'compare', icon: GitCompare, label: '对比' },
  ];

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem('hb_notes_properties') || "[]");
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "property_notes.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    // Fixed bottom, with high Z-index to float over map. pb-6 md:pb-8 plus safe area handling.
    <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 pb-6 md:pb-8 flex justify-center w-full z-50 pointer-events-none safe-area-bottom">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full shadow-2xl border border-white/20 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(44, 95, 45, 0.95)' }} // High opacity forest green
      >
        {navItems.map((item) => {
          const isActive = currentMode === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => onChangeMode(item.id as ViewMode)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`
                relative flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200 z-10
                ${isActive ? 'text-[#1F4420]' : 'text-[#F7F5F0] hover:bg-[#FFFFFF]/10'}
              `}
              title={item.label}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavBackground"
                  className="absolute inset-0 bg-[#97BC62] rounded-full -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              
              {item.id === 'list' && itemCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full border border-[#2C5F2D]"></span>
              )}
            </motion.button>
          );
        })}
        
        <div className="w-px h-6 bg-white/20 mx-1"></div>

        <motion.button
          onClick={handleExport}
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
          className="flex items-center justify-center w-12 h-12 rounded-full text-[#F7F5F0] hover:bg-[#FFFFFF]/10 transition-colors"
          title="导出数据"
        >
          <Download size={20} />
        </motion.button>
      </motion.div>
    </div>
  );
};