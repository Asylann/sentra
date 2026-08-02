import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', deployment: 4, qs: 88 },
  { name: 'Tue', deployment: 7, qs: 90 },
  { name: 'Wed', deployment: 5, qs: 89 },
  { name: 'Thu', deployment: 12, qs: 93 },
  { name: 'Fri', deployment: 15, qs: 92 },
  { name: 'Sat', deployment: 8, qs: 94 },
  { name: 'Sun', deployment: 14, qs: 95 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0a0a]/90 border border-white/[0.08] backdrop-blur-xl rounded-lg p-3 shadow-2xl">
        <p className="text-gray-400 text-xs mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white text-sm font-medium">{entry.value}</span>
            <span className="text-gray-500 text-xs ml-1">{entry.name === 'deployment' ? 'Deploys' : 'Score'}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DoraCharts() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-white font-medium">Delivery Trends</h3>
          <p className="text-gray-400 text-sm mt-1">Deployment Frequency vs Quality Score</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs text-gray-400">Deployments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-400">Quality Score</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDeploy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorQS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="qs" 
              stroke="#34d399" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorQS)" 
            />
            <Area 
              type="monotone" 
              dataKey="deployment" 
              stroke="#6366f1" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorDeploy)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
