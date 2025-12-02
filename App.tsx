import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadIcon, 
  MagicWandIcon, 
  ClockIcon, 
  UserIcon, 
  DownloadIcon, 
  TrashIcon, 
  LoadingSpinner,
  SparklesIcon,
  CameraIcon,
  XIcon,
  ShirtIcon,
  ScissorsIcon,
  ImageIcon,
  PaletteIcon,
  LogoIcon,
  EraserIcon,
  BriefcaseIcon,
  PencilIcon
} from './components/Icons';
import { generateEditedImage } from './services/geminiService';
import { EditMode, AgeDirection, ImageFile } from './types';

const App: React.FC = () => {
  const [file, setFile] = useState<ImageFile | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [mode, setMode] = useState<EditMode>(EditMode.RESTORE);
  const [ageDirection, setAgeDirection] = useState<AgeDirection>(AgeDirection.YOUNGER);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  // Stop camera stream on cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element
  useEffect(() => {
    if (isCameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (!selectedFile.type.startsWith('image/')) {
        setError("Please upload an image file.");
        return;
      }
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFile({
          file: selectedFile,
          previewUrl: URL.createObjectURL(selectedFile),
          base64: event.target.result as string
        });
        setResultImage(null);
        setError(null);
      }
    };
    reader.readAsDataURL(selectedFile);
  }

  const startCamera = async () => {
    try {
      setError(null);
      // Prefer back camera on mobile, works on desktop webcam too
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            setFile({
              file: file,
              previewUrl: dataUrl,
              base64: dataUrl
            });
            setResultImage(null);
            setError(null);
            stopCamera();
          });
      }
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      // Smooth scroll on mobile, minimal effect on desktop
      const resultArea = document.getElementById('result-area');
      if (resultArea) resultArea.scrollIntoView({ behavior: 'smooth' });
      
      const result = await generateEditedImage(file.base64, mode, ageDirection, customPrompt);
      setResultImage(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `dani-ai-${mode.toLowerCase()}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const reset = () => {
    setFile(null);
    setResultImage(null);
    setError(null);
    setCustomPrompt("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tools = [
    { id: EditMode.RESTORE, label: 'Restore', icon: ClockIcon },
    { id: EditMode.ENHANCE, label: 'Enhance', icon: SparklesIcon },
    { id: EditMode.COLORIZE, label: 'Colorize', icon: PaletteIcon },
    { id: EditMode.AGE_CHANGE, label: 'Age Swap', icon: UserIcon },
    { id: EditMode.HEADSHOT, label: 'Headshot', icon: BriefcaseIcon },
    { id: EditMode.CLOTH_CHANGE, label: 'Outfit', icon: ShirtIcon },
    { id: EditMode.OBJECT_REMOVE, label: 'Eraser', icon: EraserIcon },
    { id: EditMode.BG_REMOVE, label: 'No BG', icon: ScissorsIcon },
    { id: EditMode.BG_CHANGE, label: 'New BG', icon: ImageIcon },
    { id: EditMode.SKETCH, label: 'Sketch', icon: PencilIcon },
    { id: EditMode.CARTOONIFY, label: '3D Toon', icon: MagicWandIcon },
  ];

  const needsPrompt = [EditMode.CLOTH_CHANGE, EditMode.BG_CHANGE, EditMode.OBJECT_REMOVE];

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-md transform hover:rotate-3 transition-transform duration-300">
              <LogoIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-black">
              Dani.ai
            </h1>
          </div>
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick}
              className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full shadow-lg hover:bg-gray-800 transition-colors"
            >
              Install App
            </button>
          )}
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8">
          
          {/* Left Column: Upload */}
          <div className="lg:col-span-5 space-y-4">
            <div 
              className={`relative border-2 border-dashed rounded-3xl transition-all duration-300 h-[400px] md:h-[600px] flex flex-col items-center justify-center overflow-hidden bg-gray-50 group
                ${!file ? 'border-gray-300 hover:border-gray-400' : 'border-gray-200 bg-white shadow-sm'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {!file ? (
                <div className="text-center p-8 space-y-6 w-full max-w-sm">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-2 border border-gray-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <UploadIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-black">Upload Photo</h3>
                    <p className="text-gray-500 text-sm">Drag & drop or click below</p>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-4 w-full">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 bg-black text-white rounded-xl font-semibold shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all active:scale-[0.98] text-sm"
                    >
                      Choose from Device
                    </button>
                    <button 
                      onClick={startCamera}
                      className="w-full py-3.5 bg-white text-black border border-gray-200 rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <CameraIcon className="w-4 h-4" />
                      Open Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-gray-100/50">
                  <img 
                    src={file.previewUrl} 
                    alt="Original" 
                    className="max-w-full max-h-full object-contain p-4"
                  />
                  <button 
                    onClick={reset}
                    className="absolute top-4 right-4 p-2.5 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                    ORIGINAL
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          {/* Right Column: Tools */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-8">
              
              {/* Tool Grid */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block px-1">
                  AI Tools
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setMode(tool.id);
                        setCustomPrompt("");
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border text-center space-y-2 h-24
                        ${mode === tool.id 
                          ? 'bg-black text-white border-black shadow-lg scale-105' 
                          : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'}`}
                    >
                      <tool.icon className={`w-6 h-6 ${mode === tool.id ? 'text-white' : 'text-gray-400'}`} />
                      <span className="font-semibold text-xs">{tool.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Options Area */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[100px] flex flex-col justify-center">
                {mode === EditMode.AGE_CHANGE ? (
                  <div className="animate-fade-in w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                      Target Age
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { l: 'Child', v: AgeDirection.CHILD },
                        { l: 'Younger', v: AgeDirection.YOUNGER },
                        { l: 'Older', v: AgeDirection.OLDER },
                        { l: 'Elderly', v: AgeDirection.ELDERLY }
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => setAgeDirection(opt.v)}
                          className={`py-2 px-5 rounded-xl text-sm font-bold transition-all border
                            ${ageDirection === opt.v
                              ? 'bg-black border-black text-white shadow-md'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : needsPrompt.includes(mode) ? (
                  <div className="animate-fade-in w-full">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                      Custom Instructions
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={
                        mode === EditMode.CLOTH_CHANGE ? "E.g. Blue business suit, red evening dress..." :
                        mode === EditMode.BG_CHANGE ? "E.g. Sunset beach, futuristic city, cozy office..." :
                        "Describe what to remove..."
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder-gray-400 resize-none h-24 shadow-sm"
                    />
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center space-y-2 text-gray-400 py-2">
                     <SparklesIcon className="w-5 h-5" />
                     <span className="text-sm font-medium">Ready to apply {mode.toLowerCase().replace('_', ' ')} filter</span>
                   </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!file || isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 transition-all transform
                  ${!file || isLoading 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                    : 'bg-black text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-5 h-5" />
                    <span className="text-base">Processing Image...</span>
                  </>
                ) : (
                  <>
                    <MagicWandIcon className="w-5 h-5" />
                    <span className="text-base">Generate Result</span>
                  </>
                )}
              </button>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Result Display */}
            {resultImage && (
              <div id="result-area" className="flex-1 bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col shadow-xl animate-fade-in min-h-[400px]">
                <div className="p-4 px-6 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
                  <h3 className="font-bold text-sm text-black">Generated Result</h3>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center space-x-2 text-xs bg-black text-white font-bold px-5 py-2.5 rounded-full transition-all hover:bg-gray-800"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Download HD</span>
                  </button>
                </div>
                <div className="flex-1 relative bg-gray-50 flex items-center justify-center p-6">
                  <img 
                    src={resultImage} 
                    alt="Processed" 
                    className="max-w-full h-auto max-h-[600px] object-contain rounded-lg shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Camera Fullscreen Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
           <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
             <canvas ref={canvasRef} className="hidden" />
             <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               className="absolute inset-0 w-full h-full object-cover" 
             />
             
             {/* Camera Controls Overlay */}
             <div className="absolute top-0 left-0 right-0 p-8 flex justify-end bg-gradient-to-b from-black/50 to-transparent">
               <button 
                 onClick={stopCamera}
                 className="p-3 bg-white/20 text-white rounded-full backdrop-blur-md hover:bg-white/30 transition-colors"
               >
                 <XIcon className="w-8 h-8" />
               </button>
             </div>
             
             <div className="absolute bottom-0 left-0 right-0 p-10 pb-16 flex justify-center items-center bg-gradient-to-t from-black/80 to-transparent">
                <button 
                 onClick={captureImage}
                 className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10"
               >
                 <div className="w-20 h-20 rounded-full bg-white shadow-lg"></div>
               </button>
             </div>
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;