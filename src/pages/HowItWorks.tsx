import { Camera, Cpu, Activity, FileCheck, ArrowDown } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Behind the AI Magic</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Understanding the technology that powers AgriGrade's fast and accurate quality inspection.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-1/2 -ml-0.5 w-1 h-full bg-slate-100 hidden md:block"></div>
        
        <div className="space-y-12">
          {/* Step 1 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-5/12 text-center md:text-right mb-6 md:mb-0">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Image Acquisition</h3>
              <p className="text-slate-600 leading-relaxed">
                The process begins with a standard smartphone camera or industrial webcam. Our preprocessing pipeline normalizes the image, adjusting for lighting conditions and background noise to ensure a clear view of the produce.
              </p>
            </div>
            <div className="md:w-2/12 flex justify-center z-10">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-white shadow-lg flex items-center justify-center text-emerald-600">
                <Camera className="w-8 h-8" />
              </div>
            </div>
            <div className="md:w-5/12"></div>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:flex-row-reverse">
            <div className="md:w-5/12 text-center md:text-left mb-6 md:mb-0">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Detection & Segmentation</h3>
              <p className="text-slate-600 leading-relaxed">
                Using state-of-the-art YOLO (You Only Look Once) models, the AI instantly identifies the produce type and isolates it from the background. Image segmentation techniques define the exact boundaries for precise size estimation.
              </p>
            </div>
            <div className="md:w-2/12 flex justify-center z-10">
              <div className="w-16 h-16 rounded-full bg-emerald-600 border-4 border-white shadow-lg flex items-center justify-center text-white">
                <Cpu className="w-8 h-8" />
              </div>
            </div>
            <div className="md:w-5/12"></div>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-5/12 text-center md:text-right mb-6 md:mb-0">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Feature Extraction</h3>
              <p className="text-slate-600 leading-relaxed">
                Convolutional Neural Networks (CNNs) analyze the segmented image for specific features. Color analysis determines ripeness, while texture analysis detects subtle surface anomalies like bruises, cuts, or rot.
              </p>
            </div>
            <div className="md:w-2/12 flex justify-center z-10">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-white shadow-lg flex items-center justify-center text-emerald-600">
                <Activity className="w-8 h-8" />
              </div>
            </div>
            <div className="md:w-5/12"></div>
          </div>

          {/* Step 4 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:flex-row-reverse">
            <div className="md:w-5/12 text-center md:text-left">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Scoring & Grading</h3>
              <p className="text-slate-600 leading-relaxed">
                The extracted features are weighted and combined into an overall Quality Score. Based on customizable thresholds, a final Grade (A, B, C, or Reject) is assigned, and actionable recommendations are generated.
              </p>
            </div>
            <div className="md:w-2/12 flex justify-center z-10">
              <div className="w-16 h-16 rounded-full bg-emerald-600 border-4 border-white shadow-lg flex items-center justify-center text-white">
                <FileCheck className="w-8 h-8" />
              </div>
            </div>
            <div className="md:w-5/12"></div>
          </div>
        </div>
      </div>

      <div className="mt-24 bg-slate-50 rounded-3xl p-8 md:p-12 text-center border border-slate-100">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Core Technologies</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {['OpenCV', 'YOLO Object Detection', 'Vision Transformers', 'Transfer Learning', 'Image Segmentation', 'Colorimetric Analysis'].map((tech) => (
            <span key={tech} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full font-medium shadow-sm">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
