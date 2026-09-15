import { Search, Filter, Download, Trash2, Eye } from 'lucide-react';

const historyData = Array.from({ length: 12 }).map((_, i) => ({
  id: `INS-89${30 - i}`,
  produce: ['Mango', 'Apple', 'Banana', 'Tomato', 'Orange'][Math.floor(Math.random() * 5)],
  date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0],
  score: Math.floor(Math.random() * 40) + 60,
  grade: ['A', 'A', 'B', 'C', 'Reject'][Math.floor(Math.random() * 5)],
  defects: Math.floor(Math.random() * 4),
}));

export default function History() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inspection History</h1>
          <p className="text-slate-500">View and manage past grading reports</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium">
            <Download className="w-4 h-4" /> Export All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID or Produce..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            />
          </div>
          <div className="flex gap-2">
            <select className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>All Grades</option>
              <option>Grade A</option>
              <option>Grade B</option>
              <option>Grade C</option>
              <option>Reject</option>
            </select>
            <select className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>All Dates</option>
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
            <button className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Inspection ID</th>
                <th className="px-6 py-4">Produce Type</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4 text-center">Defects</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{row.id}</td>
                  <td className="px-6 py-4 font-medium">{row.produce}</td>
                  <td className="px-6 py-4 text-slate-500">{row.date}</td>
                  <td className="px-6 py-4 text-center font-medium">{row.score}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-block w-16 text-center ${
                      row.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                      row.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                      row.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${row.defects === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {row.defects}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-end gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Download Report">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Record">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <div>Showing 1 to 12 of 124 entries</div>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-200 rounded bg-slate-50 text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded bg-emerald-600 text-white font-medium">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-700">2</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-700">3</button>
            <span className="px-2 py-1">...</span>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-700">11</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-700">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
