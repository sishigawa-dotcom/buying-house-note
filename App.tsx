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
import { AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  
  // Initialize properties from LocalStorage
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const saved = localStorage.getItem('hb_notes_properties');
      return saved ? JSON.parse(saved) : MOCK_PROPERTIES;
    } catch (e) {
      console.error("Failed to load properties from storage", e);
      return MOCK_PROPERTIES;
    }
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Sync to localStorage with Safety Guard
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

  const handleAddProperty = useCallback((newProp: Property) => {
    setProperties(prev => [...prev, newProp]);
    setSelectedPropertyId(newProp.id);
  }, []);

  const handleUpdateProperty = useCallback((updatedProp: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProp.id ? updatedProp : p));
  }, []);

  // --- CORE FIX: Robust Delete Handler ---
  const handleDeleteProperty = useCallback((id: string) => {
    console.log("App: handleDeleteProperty called for ID:", id);
    
    // 1. Update the data source
    setProperties(prev => prev.filter(p => p.id !== id));
    
    // 2. State synchronization: If the deleted item is currently selected, clear the selection.
    setSelectedPropertyId(currentId => (currentId === id ? null : currentId));
  }, []);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  return (
    <Layout>
      <div className="relative w-full h-[100dvh] md:h-screen flex flex-col overflow-hidden">
        
        {/* Header - Only visible in Map mode or when Detail view is NOT active in List mode */}
        {!(viewMode === 'list' && selectedPropertyId) && (
          <header className="absolute top-0 left-0 w-full z-30 p-4 md:static md:w-full md:p-6 md:bg-[#F7F5F0] md:border-b md:border-[#E5E0D8]/50 pointer-events-none md:pointer-events-auto">
            <div className="pointer-events-auto bg-gradient-to-b from-[#F7F5F0]/90 to-transparent pb-4 md:bg-none md:pb-0 pt-safe-top md:pt-0 pl-2 md:flex md:justify-between md:items-center">
              <div>
                <h1 className="text-2xl md:text-3xl text-[#2C5F2D] font-bold tracking-tight font-serif-cn drop-shadow-sm md:drop-shadow-none">
                  买房人笔记
                </h1>
                <p className="text-xs md:text-sm text-[#5C554B] mt-1 tracking-wider opacity-90 uppercase font-serif-cn font-semibold">
                  第四代住宅 &middot; 垂直森林 &middot; 理想居所
                </p>
              </div>
            </div>
          </header>
        )}

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
                   // Wrapper to match previous layout
                   <div className="h-full pt-24 md:pt-0">
                     <PropertyList 
                        properties={properties} 
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
            <div className="h-full w-full overflow-y-auto pt-24 pb-32 px-4 md:pt-0 md:px-0">
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