import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CheckSquare, Settings, Activity, Shield } from 'lucide-react';
export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard', end: true },
    { name: 'Repositories', icon: CheckSquare, path: '/dashboard/repositories' },
    { name: 'Security', icon: Shield, path: '#' },
    { name: 'Metrics', icon: Activity, path: '#' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ];

  return (
    <aside className="w-64 bg-black border-r border-white/[0.05] flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="h-16 flex items-center px-6 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-indigo-400" strokeWidth={2} />
          </div>
          <span className="font-medium text-sm tracking-widest text-zinc-100 font-serif uppercase">Sentra</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
              isActive 
                ? 'bg-white/[0.04] text-white shadow-sm border border-white/[0.05]' 
                : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300 border border-transparent'
            }`}
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} strokeWidth={1.5} />
                <span className="font-mono text-[10px] uppercase tracking-widest">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/[0.05] bg-black">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer border border-transparent hover:border-white/[0.02]">
          <div className="w-7 h-7 rounded bg-white/[0.03] flex items-center justify-center text-[10px] font-mono text-zinc-400 border border-white/[0.05]">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest">usena</span>
            <span className="text-[9px] text-zinc-600 font-mono tracking-widest">DevSecOps</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
