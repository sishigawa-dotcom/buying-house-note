import React, { ReactNode } from 'react';
import { COLORS } from '../constants';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-screen h-screen flex flex-col overflow-hidden text-[#2A2A2A]"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Texture overlay is handled in global CSS, but we enforce container structure here */}
      <div className="w-full h-full relative z-10 flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};