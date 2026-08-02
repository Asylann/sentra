import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800 flex flex-col">
      {/* Background Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, #111 0%, transparent 60%)' }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <header className="relative z-10 px-8 py-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <img src="/logo_with_name.png" alt="Sentra" className="h-8" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-8">
          <Clock className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Coming Soon</h1>
        <p className="text-gray-400 max-w-md mx-auto leading-relaxed mb-8">
          This feature is currently under construction. We are building something amazing and can't wait to share it with you.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-medium transition-colors border border-indigo-500/50 shadow-lg shadow-indigo-500/20">
          Return to Home
        </Link>
      </main>
    </div>
  );
}
