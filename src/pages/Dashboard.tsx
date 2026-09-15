import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Search, Filter, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const gradeData = [
  { name: 'Grade A', value: 450, color: '#10b981' },
  { name: 'Grade B', value: 320, color: '#3b82f6' },
  { name: 'Grade C', value: 150, color: '#f59e0b' },
  { name: 'Grade D', value: 50, color: '#ef4444' },
  { name: 'Reject', value: 30, color: '#7f1d1d' },
];

const trendData = [
  { name: 'Mon', score: 88 },
  { name: 'Tue', score: 85 },
  { name: 'Wed', score: 90 },
  { name: 'Thu', score: 92 },
  { name: 'Fri', score: 87 },
  { name: 'Sat', score: 89 },
  { name: 'Sun', score: 91 },
];

const defectData = [
  { name: 'Bruise', value: 120 },
  { name: 'Dark Spot', value: 85 },
  { name: 'Cut', value: 40 },
  { name: 'Rot', value: 25 },
  { name: 'Pest', value: 10 },
];

const tableData = [
  { id: 'INS-8921', produce: 'Mango', date: '2023-10-25', score: 91, grade: 'A', defects: 1, status: 'Completed' },
  { id: 'INS-8922', produce: 'Apple', date: '2023-10-25', score: 78, grade: 'C', defects: 3, status: 'Completed' },
  { id: 'INS-8923', produce: 'Banana', date: '2023-10-25', score: 85, grade: 'B', defects: 0, status: 'Completed' },
  { id: 'INS-8924', produce: 'Tomato', date: '2023-10-24', score: 45, grade: 'Reject', defects: 4, status: 'Flagged' },
  { id: 'INS-8925', produce: 'Orange', date: '2023-10-24', score: 95, grade: 'A', defects: 0, status: 'Completed' },
];

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Batch Inspection Dashboard</h1>
          <p className="text-slate-500">Overview of all quality assessments</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Inspected" value="1,000" change="+12%" positive={true} />
        <MetricCard title="Grade A Produces" value="450" change="+5%" positive={true} />
        <MetricCard title="Average Quality Score" value="88.5" change="-1.2%" positive={false} />
        <MetricCard title="Rejection Rate" value="3.0%" change="-0.5%" positive={true} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="font-bold text-slate-800 mb-6">Quality Grade Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {gradeData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-slate-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-6">Average Quality Trend (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Recent Inspections</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search ID..." className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48" />
              </div>
              <button className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Inspection ID</th>
                  <th className="px-4 py-3">Produce</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.id}</td>
                    <td className="px-4 py-3 text-slate-600">{row.produce}</td>
                    <td className="px-4 py-3 text-slate-500">{row.date}</td>
                    <td className="px-4 py-3 font-medium">{row.score}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        row.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                        row.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                        row.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {row.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs ${row.status === 'Completed' ? 'text-slate-600' : 'text-amber-600'}`}>
                        {row.status === 'Completed' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="font-bold text-slate-800 mb-6">Common Defects</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={70} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, positive }: { title: string, value: string, change: string, positive: boolean }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="text-sm font-medium text-slate-500 mb-2">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className={`flex items-center text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {positive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {change}
        </span>
      </div>
    </div>
  );
}
