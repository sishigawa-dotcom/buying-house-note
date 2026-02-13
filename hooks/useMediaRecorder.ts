import { useState, useRef, useCallback, useEffect } from 'react';

interface UseMediaRecorderReturn {
  isRecording: boolean;
  mediaUrl: string | null;
  recordingTime: number; // in seconds
  error: string | null;
  startRecording: (type: 'audio' | 'video') => Promise<void>;
  stopRecording: () => void;
  clearMedia: () => void;
  previewStream: MediaStream | null; // For video preview
}

export const useMediaRecorder = (): UseMediaRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Use number for browser timer ID compatibility
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Track active request to prevent race conditions (e.g. stop called before start finishes)
  const activeRequestRef = useRef<symbol | null>(null);

  // Helper to determine supported MIME type
  const getMimeType = (type: 'audio' | 'video') => {
    const types = type === 'audio' 
      ? ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg']
      : ['video/webm;codecs=vp9', 'video/mp4', 'video/webm'];
    
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return ''; // Let browser decide default
  };

  const startRecording = useCallback(async (type: 'audio' | 'video') => {
    // Generate a new request ID
    const requestId = Symbol('startRecording');
    activeRequestRef.current = requestId;

    setError(null);
    setMediaUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];

    // Check environment support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("您的浏览器不支持录制功能，或未在安全环境(HTTPS/Localhost)下运行。");
      return;
    }

    try {
      let stream: MediaStream | undefined = undefined;

      if (type === 'video') {
        // --- Video Recording Strategy with Fallbacks ---
        
        // 1. Try Rear Camera + Audio
        try {
           stream = await navigator.mediaDevices.getUserMedia({ 
             video: { facingMode: 'environment' }, 
             audio: true 
           });
        } catch (err: any) {
           // If permission strictly denied, throw immediately
           if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') throw err;

           // 2. Try Default Camera + Audio
           try {
             stream = await navigator.mediaDevices.getUserMedia({ 
               video: true, 
               audio: true 
             });
           } catch (err2: any) {
             if (err2.name === 'NotAllowedError' || err2.name === 'PermissionDeniedError') throw err2;
             
             // 3. Try Video Only
             try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                  video: true,
                  audio: false 
                });
             } catch (err3) {
                // Throw the most relevant error (likely err2 if audio failed, or err3 if video failed)
                throw err2; 
             }
           }
        }
      } else {
        // --- Audio Recording Strategy ---
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // RACE CONDITION CHECK: If stopRecording was called while we were waiting
      if (activeRequestRef.current !== requestId) {
         if (stream) stream.getTracks().forEach(t => t.stop());
         return;
      }

      if (!stream) {
        throw new Error("Media stream could not be initialized.");
      }

      streamRef.current = stream;
      
      if (type === 'video') {
        setPreviewStream(stream);
      }

      const mimeType = getMimeType(type);
      const options = mimeType ? { mimeType } : undefined;
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn(`Failed to create MediaRecorder with options: ${JSON.stringify(options)}. Using default settings.`, e);
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const typeStr = chunksRef.current[0]?.type || (type === 'audio' ? 'audio/webm' : 'video/webm');
        const blob = new Blob(chunksRef.current, { type: typeStr });
        const url = URL.createObjectURL(blob);
        setMediaUrl(url);
        
        // Cleanup stream tracks
        if (streamRef.current) {
           streamRef.current.getTracks().forEach(track => track.stop());
           streamRef.current = null;
        }
        setPreviewStream(null);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Start Timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      // Only log unexpected errors
      if (err.name !== 'NotAllowedError' && err.name !== 'PermissionDeniedError' && err.name !== 'NotFoundError' && err.name !== 'DevicesNotFoundError') {
         console.error("Error accessing media devices:", err);
      }
      
      let errorMessage = '录制启动失败';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '请允许访问麦克风/摄像头权限';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '未检测到设备(麦克风或摄像头)';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '设备可能被其他应用占用';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = '无法满足设备分辨率要求';
      }

      setError(errorMessage);
      
      // Cleanup
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
         streamRef.current = null;
      }
      setPreviewStream(null);
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Invalidate any pending start request
    activeRequestRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
       // If stop called before recorder started (but maybe stream is open), ensure cleanup
       if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          setPreviewStream(null);
       }
       setIsRecording(false);
    }
  }, []);

  const clearMedia = useCallback(() => {
    setMediaUrl(null);
    setRecordingTime(0);
    setError(null);
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
  }, [mediaUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, []);

  return {
    isRecording,
    mediaUrl,
    recordingTime,
    error,
    startRecording,
    stopRecording,
    clearMedia,
    previewStream
  };
};