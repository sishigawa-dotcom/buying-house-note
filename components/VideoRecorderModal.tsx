import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { X, Check, RefreshCw, Video, StopCircle, Camera, ArrowLeft } from 'lucide-react';

interface VideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
}

export const VideoRecorderModal: React.FC<VideoRecorderModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { 
    isRecording, 
    mediaUrl, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    clearMedia, 
    previewStream,
    error 
  } = useMediaRecorder();
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
       clearMedia();
    }
    return () => {
      if (isOpen) {
        stopRecording();
      }
    };
  }, [isOpen]); 

  useEffect(() => {
    if (videoPreviewRef.current && previewStream) {
      videoPreviewRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const handleStartCamera = () => {
    startRecording('video');
  };

  const handleStop = () => {
    stopRecording();
  };

  const handleRetake = () => {
    clearMedia();
    // Allow user to start again manually
  };

  const handleConfirm = () => {
    if (mediaUrl) {
      onConfirm(mediaUrl);
      clearMedia(); 
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-sans-cn">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20 safe-area-top">
        <div className="text-white font-mono bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
          {isRecording ? <span className="text-red-500 animate-pulse">● REC {formatTime(recordingTime)}</span> : (previewStream ? 'Ready' : 'Camera Off')}
        </div>
        <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full h-full relative flex items-center justify-center bg-gray-900">
        {error && (
           <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-center px-4 w-full max-w-sm">
              <div className="bg-gray-800/90 p-6 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl">
                <p className="mb-6 text-red-300 font-medium">{error}</p>
                <div className="flex gap-4 justify-center">
                   <button onClick={() => { clearMedia(); startRecording('video'); }} className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition">重试</button>
                   <button onClick={onClose} className="px-6 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition">关闭</button>
                </div>
              </div>
           </div>
        )}

        {/* Live Preview / Recording View */}
        {!mediaUrl && (
          <div className="relative w-full h-full">
            {previewStream ? (
               <video 
                  ref={videoPreviewRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
               />
            ) : (
               /* Start Screen */
               !error && (
                 <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gray-900 px-4">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                       <Camera size={40} />
                    </div>
                    <p className="text-gray-400 text-sm">点击下方按钮启动相机</p>
                 </div>
               )
            )}
          </div>
        )}

        {/* Review View */}
        {mediaUrl && (
          <video 
            src={mediaUrl} 
            controls 
            playsInline 
            className="w-full h-full object-contain bg-black" 
          />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-8 pb-16 bg-gradient-to-t from-black/80 to-transparent z-20 flex justify-center items-center gap-8 safe-area-bottom">
        {!mediaUrl ? (
          /* Recording Controls */
          previewStream ? (
              <div className="flex items-center gap-8 md:gap-12">
                {/* Back Button (Left of Shutter) */}
                <button 
                  onClick={onClose}
                  className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                >
                   <div className="p-3 bg-white/10 rounded-full backdrop-blur-md">
                     <ArrowLeft size={24} />
                   </div>
                </button>

                {/* Shutter Button (Center) */}
                {isRecording ? (
                  <button 
                    onClick={handleStop}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 transition-all scale-100 active:scale-95 shadow-[0_0_20px_rgba(255,0,0,0.5)]"
                  >
                    <div className="w-8 h-8 bg-red-500 rounded-sm"></div>
                  </button>
                ) : (
                  <button 
                    onClick={() => startRecording('video')}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-all shadow-lg"
                  >
                    <div className="w-16 h-16 bg-red-500 rounded-full"></div>
                  </button>
                )}

                {/* Spacer (Right of Shutter) to balance layout */}
                <div className="w-[48px]"></div>
              </div>
          ) : (
             /* Not Started yet */
             !error && (
               <div className="flex flex-col items-center gap-4">
                  <button 
                      onClick={handleStartCamera}
                      className="px-8 py-3 bg-[#2C5F2D] text-white rounded-full font-bold shadow-lg hover:bg-[#1F4420] transition flex items-center gap-2 transform active:scale-95"
                    >
                      <Camera size={20} />
                      启动相机
                  </button>
                  <button 
                      onClick={onClose}
                      className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors py-2 px-4"
                   >
                      <ArrowLeft size={14} /> 返回地图
                   </button>
               </div>
             )
          )
        ) : (
          /* Review Controls */
          <>
            <button 
              onClick={handleRetake}
              className="flex flex-col items-center gap-1 text-white hover:text-gray-300 transition-colors"
            >
              <div className="p-3 bg-gray-700 rounded-full">
                <RefreshCw size={24} />
              </div>
              <span className="text-xs">重拍</span>
            </button>

            <button 
              onClick={handleConfirm}
              className="flex flex-col items-center gap-1 text-white hover:text-[#97BC62] transition-colors"
            >
              <div className="p-4 bg-[#2C5F2D] rounded-full scale-110 shadow-lg">
                <Check size={32} />
              </div>
              <span className="text-xs font-bold">使用视频</span>
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};