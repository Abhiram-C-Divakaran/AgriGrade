import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertCircle, RefreshCw, FileText, Download, CheckCircle, ChevronRight, Info, AlertTriangle, Server, Database } from 'lucide-react';

const produceOptions = [
  'Apple', 'Banana', 'Mango', 'Tomato', 'Orange',
  'Potato', 'Onion', 'Guava', 'Pomegranate', 'Capsicum', 'Other'
];

interface Ripeness {
  stage: string;
  confidence: number;
}

interface Defect {
  type: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  affected_area_percent: number;
  bbox?: [number, number, number, number];
}

interface AnalysisResult {
  success?: boolean;
  ai_available?: boolean;
  produce: string;
  message?: string;
  quality_score?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'Reject';
  ripeness?: Ripeness;
  defects?: Defect[];
  total_defect_area_percent?: number;
  recommendation?: string;
  model_confidence?: number;
  explanation?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function Grade() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedProduce, setSelectedProduce] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Uploading image...');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (err) {
      setServerStatus('offline');
    }
  };

  const handleProduceSelect = (produce: string) => {
    setSelectedProduce(produce);
    setStep(2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate format
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        setError("Unsupported image format. Please upload JPG, PNG, or WEBP.");
        return;
      }
      
      // Validate size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image is too large. Maximum file size is 10 MB.");
        return;
      }

      setError(null);
      setFileToUpload(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image || serverStatus === 'offline') return;
    
    setStep(3);
    setIsAnalyzing(true);
    setError(null);
    setLoadingStepText('Uploading image...');
    
    try {
      if (isDemoMode) {
        // Simulate network delay
        setLoadingStepText('Preparing image...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoadingStepText('Running analysis...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        setResult({
          ai_available: true,
          produce: selectedProduce,
          quality_score: 91,
          grade: 'A',
          ripeness: { stage: 'Ripe', confidence: 0.93 },
          defects: [
            { type: 'Minor Spot', severity: 'low', confidence: 0.85, affected_area_percent: 2 }
          ],
          total_defect_area_percent: 2,
          recommendation: 'Premium retail or immediate consumption.',
          model_confidence: 0.95,
          explanation: 'The produce appears in excellent condition with minimal cosmetic defects.'
        });
      } else {
        if (!fileToUpload) throw new Error("No file selected.");
        
        const formData = new FormData();
        formData.append("image", fileToUpload);
        formData.append("produce_type", selectedProduce.toLowerCase());

        setLoadingStepText('Uploading image...');
        
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Analysis API error:", response.status, errorText);
          
          let detailedError = "The AI server encountered an error while processing this image.";
          try {
            const errData = JSON.parse(errorText);
            if (errData.details) detailedError = `${errData.error} (${errData.details})`;
            else if (errData.error) detailedError = errData.error;
          } catch (e) {
             // Fallback if not JSON
          }
          
          if (response.status === 400 && detailedError === "The AI server encountered an error while processing this image.") throw new Error("The uploaded image could not be processed.");
          if (response.status === 413) throw new Error("Image is too large.");
          if (response.status === 415) throw new Error("Unsupported image format.");
          if (response.status === 500) throw new Error(detailedError);
          
          throw new Error(detailedError !== "The AI server encountered an error while processing this image." ? detailedError : `Image analysis failed (${response.status})`);
        }

        setLoadingStepText('Running analysis...');
        const responseText = await response.text();
        
        let data: AnalysisResult;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("Received invalid JSON from server:", responseText.substring(0, 200));
          throw new Error("Server returned an invalid response. Please try again.");
        }
        
        setResult(data);
      }
      setStep(4);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError("Cannot reach the analysis server.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetProcess = () => {
    setStep(1);
    setSelectedProduce('');
    setImage(null);
    setFileToUpload(null);
    setResult(null);
    setError(null);
  };

  const renderBoundingBoxes = () => {
    if (!result || !result.defects || result.defects.length === 0 || !imageRef.current) return null;
    
    return result.defects.map((defect, i) => {
      if (!defect.bbox || defect.bbox.length !== 4) return null;
      
      const [x1, y1, x2, y2] = defect.bbox;
      const top = (y1 / 1000) * 100;
      const left = (x1 / 1000) * 100;
      const width = ((x2 - x1) / 1000) * 100;
      const height = ((y2 - y1) / 1000) * 100;
      
      const color = defect.severity === 'high' ? 'border-red-500' : defect.severity === 'medium' ? 'border-amber-500' : 'border-yellow-400';

      return (
        <div 
          key={i} 
          className={`absolute border-2 ${color} bg-black/10`} 
          style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
        >
          <span className={`absolute -top-6 left-0 px-1 py-0.5 text-[10px] text-white font-bold whitespace-nowrap rounded-sm ${defect.severity === 'high' ? 'bg-red-500' : defect.severity === 'medium' ? 'bg-amber-500' : 'bg-yellow-500'}`}>
            {defect.type} ({(defect.confidence * 100).toFixed(0)}%)
          </span>
        </div>
      );
    });
  };

  const hasSevereDefects = result?.grade === 'D' || result?.grade === 'Reject' || (result?.defects?.some(d => d.severity === 'high'));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 relative">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 mb-8 flex items-center justify-between rounded-r-lg shadow-sm">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-600" />
            <p className="font-medium text-sm">
              <strong className="font-bold">DEMO MODE</strong> — Results are simulated and do not represent analysis of the uploaded image.
            </p>
          </div>
        </div>
      )}

      {/* Progress Header & Settings */}
      <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Grade Produce</h1>
          <div className="flex items-center flex-wrap text-sm font-medium text-slate-500 gap-y-2">
            <span className={step >= 1 ? 'text-emerald-600' : ''}>1. Select Produce</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className={step >= 2 ? 'text-emerald-600' : ''}>2. Upload Image</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className={step >= 3 ? 'text-emerald-600' : ''}>3. Analysis</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className={step >= 4 ? 'text-emerald-600' : ''}>4. Report</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Health Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${serverStatus === 'online' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : serverStatus === 'offline' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
             <Server className="w-3.5 h-3.5" />
             {serverStatus === 'online' ? 'AI Server: Online' : serverStatus === 'offline' ? 'AI Server: Offline' : 'Checking...'}
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <label className="text-sm font-medium text-slate-700 cursor-pointer" htmlFor="demo-mode-toggle">Demo Mode</label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                name="toggle" 
                id="demo-mode-toggle" 
                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-slate-200 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                checked={isDemoMode}
                onChange={() => setIsDemoMode(!isDemoMode)}
                style={{ transform: isDemoMode ? 'translateX(1.25rem)' : 'translateX(0)', borderColor: isDemoMode ? '#10b981' : '#e2e8f0', backgroundColor: 'white' }}
              />
              <label 
                htmlFor="demo-mode-toggle" 
                className={`toggle-label block overflow-hidden h-5 rounded-full bg-slate-300 cursor-pointer transition-colors duration-200 ease-in-out ${isDemoMode ? 'bg-emerald-400' : ''}`}
              ></label>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8 flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Analysis Error</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold mb-6">What type of produce are you grading?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produceOptions.map((p) => (
              <button
                key={p}
                onClick={() => handleProduceSelect(p)}
                className="bg-white border border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-slate-50 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                  <LeafIcon name={p} />
                </div>
                <span className="font-medium text-slate-700 group-hover:text-emerald-700">{p}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Upload Image for {selectedProduce}</h2>
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700">Change Produce</button>
          </div>
          
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center relative">
            {image ? (
              <div className="flex flex-col items-center">
                <img src={image} alt="Preview" className="max-h-80 rounded-lg object-contain mb-6 shadow-sm" />
                <div className="flex gap-4">
                  <button onClick={() => { setImage(null); setFileToUpload(null); setError(null); }} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                    Replace Image
                  </button>
                  <button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing || serverStatus === 'offline'}
                    className={`px-6 py-2 text-white rounded-lg font-medium flex items-center gap-2 transition-colors ${serverStatus === 'offline' ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <RefreshCw className="w-4 h-4" /> Analyze Quality
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium text-slate-900 mb-2">Drag and drop your image here</p>
                <p className="text-slate-500 mb-6 max-w-sm">Accepted formats: JPG, PNG, WEBP (Max 10MB)</p>
                
                <div className="flex gap-4">
                  <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Browse Files
                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} />
                  </label>
                  <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in fade-in duration-500 text-center py-20">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{loadingStepText}</h2>
          <div className="max-w-md mx-auto space-y-3 text-slate-600">
            <p className={`flex items-center justify-center gap-2 ${loadingStepText !== 'Uploading image...' ? 'text-emerald-700' : ''}`}><CheckCircle className={`w-4 h-4 ${loadingStepText !== 'Uploading image...' ? 'text-emerald-500' : 'text-slate-300'}`} /> Sending to server</p>
            <p className={`flex items-center justify-center gap-2 ${loadingStepText === 'Running analysis...' ? 'text-emerald-700' : ''}`}><CheckCircle className={`w-4 h-4 ${loadingStepText === 'Running analysis...' ? 'text-emerald-500' : 'text-slate-300'}`} /> Executing ML pipeline</p>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {result.ai_available === false ? (
             <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Image uploaded successfully.</h2>
                <p className="text-xl text-slate-600 mb-10">AI model is not connected yet.</p>

                <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-xl border border-slate-100 mb-10">
                   <h3 className="font-semibold text-slate-800 mb-4 text-left">Pipeline Status</h3>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                         <span className="text-slate-600 flex items-center gap-2"><Server className="w-4 h-4" /> Backend Server</span>
                         <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Connected</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                         <span className="text-slate-600 flex items-center gap-2"><Upload className="w-4 h-4" /> Image Upload</span>
                         <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Successful</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-slate-600 flex items-center gap-2"><Database className="w-4 h-4" /> AI Model</span>
                         <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded">Not connected</span>
                      </div>
                   </div>
                </div>

                <button onClick={resetProcess} className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Start Over
                </button>
             </div>
          ) : (
             <>
                {hasSevereDefects && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm flex items-start gap-3 text-red-800">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-500" />
                    <div>
                      <h3 className="font-bold">Severe Defects Detected</h3>
                      <p className="text-sm mt-1">This produce has been flagged with severe defects (such as rot, mold, or extensive damage) and is unsuitable for normal retail.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">AI Quality Report</h2>
                    <p className="text-slate-500">Analysis complete for {result.produce}</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium">
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button onClick={resetProcess} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium">
                      Grade Another
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-1 space-y-6">
                    {/* Grade Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                      <div className="text-slate-500 font-medium mb-2">Overall Quality Grade</div>
                      <div className={`text-6xl font-black mb-2 ${result.grade === 'A' ? 'text-emerald-600' : result.grade === 'B' ? 'text-blue-600' : result.grade === 'C' ? 'text-amber-500' : 'text-red-600'}`}>
                        {result.grade}
                      </div>
                      <div className="text-lg font-bold text-slate-900 mb-4">Score: {result.quality_score} / 100</div>
                      
                      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6">
                        <div className={`h-2.5 rounded-full ${result.quality_score && result.quality_score >= 90 ? 'bg-emerald-500' : result.quality_score && result.quality_score >= 75 ? 'bg-blue-500' : result.quality_score && result.quality_score >= 55 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.quality_score}%` }}></div>
                      </div>

                      {result.model_confidence && result.model_confidence < 0.6 && (
                        <div className="w-full mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-1 text-left">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          Low-confidence result — manual inspection recommended.
                        </div>
                      )}
                      <div className="w-full text-xs text-slate-500 text-left mt-2 border-t border-slate-100 pt-3">
                        <span className="font-semibold text-slate-700">Model Confidence:</span> {((result.model_confidence || 0) * 100).toFixed(1)}%
                      </div>
                    </div>

                    {/* Ripeness & Surface Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Metrics</h3>
                      
                      <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-sm font-medium text-slate-500">Ripeness Stage</span>
                              <span className={`text-sm font-bold ${result.ripeness?.stage === 'Decayed' ? 'text-red-600' : 'text-slate-900'}`}>{result.ripeness?.stage}</span>
                            </div>
                            <div className="text-xs text-slate-400">Confidence: {((result.ripeness?.confidence || 0) * 100).toFixed(0)}%</div>
                          </div>

                          <div>
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-sm font-medium text-slate-500">Affected Surface Area</span>
                              <span className={`text-sm font-bold ${(result.total_defect_area_percent || 0) > 15 ? 'text-red-600' : 'text-slate-900'}`}>{result.total_defect_area_percent?.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${(result.total_defect_area_percent || 0) > 20 ? 'bg-red-500' : (result.total_defect_area_percent || 0) > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, result.total_defect_area_percent || 0)}%` }}></div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-sm font-medium text-slate-500 block mb-1">Size Estimation</span>
                            <span className="text-sm text-slate-600 italic">Size unavailable — place a reference object or calibration marker beside the produce.</span>
                          </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    {/* Image Preview with Bounding Boxes */}
                    <div className="bg-slate-900 rounded-2xl overflow-hidden relative shadow-md flex justify-center items-center h-80 w-full border border-slate-800">
                      {image && (
                        <div className="relative h-full inline-block">
                          <img ref={imageRef} src={image} alt="Analyzed Produce" className="h-full w-auto object-contain" />
                          {renderBoundingBoxes()}
                        </div>
                      )}
                      {!image && <span className="text-slate-500">No image available</span>}
                    </div>

                    {/* Defects List */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /> Detected Defects</h3>
                      {result.defects && result.defects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {result.defects.map((defect, i) => (
                            <div key={i} className={`flex items-start justify-between p-3 border rounded-lg ${defect.severity === 'high' ? 'bg-red-50 border-red-100' : defect.severity === 'medium' ? 'bg-amber-50 border-amber-100' : 'bg-yellow-50 border-yellow-100'}`}>
                              <div>
                                <div className={`font-semibold capitalize ${defect.severity === 'high' ? 'text-red-900' : defect.severity === 'medium' ? 'text-amber-900' : 'text-yellow-900'}`}>{defect.type}</div>
                                <div className={`text-xs ${defect.severity === 'high' ? 'text-red-700' : defect.severity === 'medium' ? 'text-amber-700' : 'text-yellow-700'}`}>
                                  Area: {defect.affected_area_percent.toFixed(1)}% | Conf: {(defect.confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                              <div className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${defect.severity === 'high' ? 'bg-red-200 text-red-800' : defect.severity === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                {defect.severity}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" /> No defects detected on visible surfaces.
                        </div>
                      )}
                    </div>

                    {/* Recommendation and Explanation */}
                    <div className="bg-emerald-900 rounded-2xl p-6 shadow-sm text-white">
                      <h3 className="font-bold mb-2 text-emerald-100">AI Recommendation</h3>
                      <p className="text-lg leading-relaxed mb-6 font-medium">"{result.recommendation}"</p>
                      
                      <h3 className="font-bold mb-2 text-emerald-100">Analysis Explanation</h3>
                      <p className="text-emerald-50 text-sm leading-relaxed">{result.explanation}</p>
                    </div>
                  </div>
                </div>
             </>
          )}
        </div>
      )}
    </div>
  );
}

function LeafIcon({ name }: { name: string }) {
  return <span className="text-xl font-bold text-slate-400">{name[0]}</span>;
}
