import { Link } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, ShieldCheck, Sprout } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-emerald-50/50 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium mb-8">
              <Sprout className="w-4 h-4" />
              <span>Smart Agricultural Quality Grading</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
              Grade Produce. Reduce Waste. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Increase Value.</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              AI-powered fruit and vegetable quality inspection using just a camera. Empowering farmers, wholesalers, and retailers with instant, objective grading.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/grade"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Grade Produce
              </Link>
              <button className="w-full sm:w-auto bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-slate-700 px-8 py-4 rounded-xl text-lg font-medium transition-all flex items-center justify-center gap-2">
                View Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Instant AI Quality Analysis', desc: 'Get accurate grading results in seconds.', icon: ShieldCheck },
              { title: 'Low-Cost Camera-Based', desc: 'No expensive sensors needed. Use your smartphone.', icon: Camera },
              { title: 'Consistent Grading', desc: 'Objective and repeatable quality standards.', icon: CheckCircle2 },
              { title: 'Reduced Post-Harvest Waste', desc: 'Optimize usage based on precise ripeness data.', icon: Sprout },
            ].map((benefit, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-16">How AgriGrade AI Works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 relative">
            {[
              { step: '1', title: 'Capture Image', desc: 'Take a photo of the produce' },
              { step: '2', title: 'AI Analysis', desc: 'Computer vision processes the image' },
              { step: '3', title: 'Quality Grade', desc: 'Instant score and defect detection' },
              { step: '4', title: 'Actionable Report', desc: 'Save and export the results' }
            ].map((item, i, arr) => (
              <div key={i} className="flex flex-col items-center relative z-10 flex-1">
                <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm max-w-[200px]">{item.desc}</p>
                {i < arr.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-[2px] bg-slate-200 -z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
