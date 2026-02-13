import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { MapBoard } from './components/MapBoard';
import { PropertyList } from './components/PropertyList';
import { ComparisonView } from './components/ComparisonView';
import { FloatingNav } from './components/FloatingNav';
import { MemoDrawer } from './components/MemoDrawer';
import { PropertyDetailView } from './components/PropertyDetailView';
import { Property, ViewMode } from './types';
import { MOCK_PROPERTIES } from './constants';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  
  // Initialize properties from LocalStorage or use empty array
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const saved = localStorage.getItem('hb_notes_properties');
      return saved ? JSON.parse(saved) : []; // Default to empty
    } catch (e) {
      console.error("Failed to load properties from storage", e);
      return [];
    }
  });

  // Initialize Categories
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hb_notes_categories');
      return saved ? JSON.parse(saved) : ['全部', '意向', '已看']; 
    } catch (e) {
      return ['全部', '意向', '已看'];
    }
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  // Check for empty state on mount to show welcome message
  useEffect(() => {
    if (properties.length === 0) {
      const timer = setTimeout(() => setShowWelcomeToast(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync properties to localStorage with Safety Guard
  useEffect(() => {
    try {
      localStorage.setItem('hb_notes_properties', JSON.stringify(properties));
    } catch (e: any) {
      // Handle Quota Exceeded Error
      if (
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 || 
        e.code === 1014
      ) {
         alert("存储空间已满。图片可能过多或过大，无法保存更多更改。请尝试删除一些旧图片或房源。");
         console.error("LocalStorage Quota Exceeded: Failed to save properties.");
      } else {
         console.error("Failed to save properties to localStorage", e);
      }
    }
  }, [properties]);

  // Sync categories to localStorage
  useEffect(() => {
    localStorage.setItem('hb_notes_categories', JSON.stringify(categories));
  }, [categories]);

  const handleAddProperty = useCallback((newProp: Property) => {
    setProperties(prev => [...prev, newProp]);
    setSelectedPropertyId(newProp.id);
    setShowWelcomeToast(false); // Hide welcome toast once user interacts
  }, []);

  const handleUpdateProperty = useCallback((updatedProp: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
  }, []);

  // --- CORE FIX: Robust Delete Handler ---
  const handleDeleteProperty = useCallback((id: string) => {
    // 1. Update the data source
    setProperties(prev => prev.filter(p => p.id !== id));
    
    // 2. State synchronization: If the deleted item is currently selected, clear the selection.
    setSelectedPropertyId(currentId => (currentId === id ? null : currentId));
  }, []);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  return (
    <Layout>
      <div className="relative w-full h-[100dvh] flex flex-col overflow-hidden">
        
        {/* 
           Header - Fully Immersive & Safe Area Aware
           Only show in MAP mode now. List view has its own "Collection" header.
        */}
        {viewMode === 'map' && (
          <header className="absolute top-0 left-0 w-full z-30 pointer-events-none">
            {/* The gradient background container that bleeds into status bar */}
            <div className="w-full bg-gradient-to-b from-[#F7F5F0] via-[#F7F5F0]/90 to-transparent pt-[env(safe-area-inset-top)] pb-6 px-4 md:px-6 md:bg-[#F7F5F0] md:border-b md:border-[#E5E0D8]/50 md:pt-4">
               <div className="pointer-events-auto flex justify-between items-center mt-2">
                  <div>
                    <h1 className="text-2xl md:text-3xl text-[#2C5F2D] font-bold tracking-tight font-serif-cn drop-shadow-sm md:drop-shadow-none">
                      买房人笔记
                    </h1>
                    <p className="text-xs md:text-sm text-[#5C554B] mt-1 tracking-wider opacity-90 uppercase font-serif-cn font-semibold">
                      第四代住宅 &middot; 垂直森林 &middot; 理想居所
                    </p>
                  </div>
               </div>
            </div>
          </header>
        )}

        {/* Welcome Toast for New Users - Optimized for Mobile */}
        <AnimatePresence>
          {showWelcomeToast && viewMode === 'map' && properties.length === 0 && (
            <motion.div
               initial={{ opacity: 0, y: -20, x: '-50%' }}
               animate={{ opacity: 1, y: 0, x: '-50%' }}
               exit={{ opacity: 0, y: -20, x: '-50%' }}
               className="absolute top-36 left-1/2 z-[100] w-[92%] max-w-sm"
               onClick={() => setShowWelcomeToast(false)}
            >
               <div className="bg-white/95 backdrop-blur-md border border-[#2C5F2D]/20 shadow-2xl rounded-2xl px-5 py-4 flex items-start gap-4 text-[#2C5F2D]">
                  <div className="bg-[#2C5F2D]/10 p-2 rounded-full shrink-0 animate-bounce mt-1">
                    <MapPin size={20} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-base font-bold font-serif-cn mb-1">欢迎使用！</span>
                    <span className="text-sm text-[#5C554B] font-sans-cn leading-snug break-words">
                      点击地图任意位置，<br/>即可标记并添加您的第一个房源。
                    </span>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`
          transition-all duration-300 ease-in-out w-full
          ${viewMode === 'map' 
            ? 'fixed inset-0 z-0 h-[100dvh] w-screen md:static md:h-auto md:flex-grow md:w-full' 
            : 'flex-grow relative h-full overflow-hidden md:w-full'
          }
        `}>
          {viewMode === 'map' && (
            <MapBoard 
              properties={properties} 
              onPropertySelect={setSelectedPropertyId}
              onAddProperty={handleAddProperty}
              onUpdateProperty={handleUpdateProperty}
              onDeleteProperty={handleDeleteProperty}
              selectedId={selectedPropertyId}
            />
          )}

          {viewMode === 'list' && (
             // List View Router Logic: Detail View OR List View
             <div className="h-full w-full overflow-y-auto md:px-0">
                {selectedPropertyId && selectedProperty ? (
                   <PropertyDetailView 
                      property={selectedProperty}
                      onBack={() => setSelectedPropertyId(null)}
                      onUpdate={handleUpdateProperty}
                      onDelete={handleDeleteProperty}
                   />
                ) : (
                   // Wrapper - Cleaned up padding since header is gone.
                   // Use env(safe-area-inset-top) to respect notch on iOS.
                   <div className="h-full pt-[env(safe-area-inset-top)] md:pt-10">
                     <PropertyList 
                        properties={properties} 
                        categories={categories}
                        onUpdateCategories={setCategories}
                        onSelect={setSelectedPropertyId}
                        onUpdate={handleUpdateProperty}
                        onDelete={handleDeleteProperty}
                        onReorder={setProperties}
                        selectedId={selectedPropertyId}
                     />
                   </div>
                )}
             </div>
          )}

          {viewMode === 'compare' && (
            // Adjusted padding for compare view since global header is gone
            <div className="h-full w-full overflow-y-auto pt-[env(safe-area-inset-top)] pb-32 px-4 md:px-0 mt-8">
              <ComparisonView properties={properties} />
            </div>
          )}
        </main>

        {/* --- Memo Drawer (Restricted to Map Mode Only) --- */}
        <AnimatePresence>
          {selectedProperty && viewMode === 'map' && (
            <MemoDrawer 
              key="memo-drawer"
              property={selectedProperty}
              onClose={() => setSelectedPropertyId(null)}
              onUpdate={handleUpdateProperty}
              onDelete={handleDeleteProperty}
            />
          )}
        </AnimatePresence>

        {/* Floating Nav */}
        <FloatingNav 
          currentMode={viewMode} 
          onChangeMode={setViewMode} 
          itemCount={properties.length}
        />

      </div>
    </Layout>
  );
};

export default App;