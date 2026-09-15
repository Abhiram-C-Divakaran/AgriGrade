import { Leaf, Globe, Sprout, TrendingDown } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Leaf className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-6">About AgriGrade AI</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          We are on a mission to democratize quality inspection in agriculture, reducing food waste and ensuring fair value for farmers worldwide.
        </p>
      </div>

      <div className="prose prose-lg prose-slate mx-auto mb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">The Problem</h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Every year, millions of tons of fresh produce are lost post-harvest due to inconsistent grading, slow manual inspection, and misallocation of resources. Traditional optical sorting machines cost tens of thousands of dollars, making them inaccessible to smallholder farmers, local cooperatives, and small retail businesses.
        </p>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Solution</h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          AgriGrade AI brings industrial-grade computer vision to the smartphone. By leveraging advanced machine learning models trained on vast agricultural datasets, we provide instant, objective, and accurate quality assessments without the need for expensive hardware.
        </p>
      </div>

      <div className="bg-emerald-900 text-white rounded-3xl p-8 md:p-12 mb-16">
        <h2 className="text-3xl font-bold mb-10 text-center">Our Sustainability Impact</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-8 h-8 text-emerald-300" />
            </div>
            <h3 className="text-xl font-bold mb-2">Reduce Waste</h3>
            <p className="text-emerald-100 text-sm">By correctly grading produce, less food is thrown away unnecessarily. Marginal produce can be routed to processing rather than discarded.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sprout className="w-8 h-8 text-emerald-300" />
            </div>
            <h3 className="text-xl font-bold mb-2">Empower Farmers</h3>
            <p className="text-emerald-100 text-sm">Objective grading gives farmers leverage in pricing negotiations, ensuring they are fairly compensated for premium quality harvests.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-emerald-300" />
            </div>
            <h3 className="text-xl font-bold mb-2">Global Access</h3>
            <p className="text-emerald-100 text-sm">Built to work on affordable smartphones, bringing high-tech inspection capabilities to developing agricultural regions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
