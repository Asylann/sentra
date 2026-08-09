import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-textMain font-sans flex items-center justify-center relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, transparent 70%)' }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] animate-grid-scroll" />
      </div>

      <div className="relative z-10 text-center px-4 flex flex-col items-center animate-fade-in">
        <h1 className="text-[120px] md:text-[200px] font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-br from-primary via-purple-500 to-pink-500 animate-pulse drop-shadow-[0_0_40px_rgba(99,102,241,0.5)]">
          404
        </h1>
        
        <div className="mt-6 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-textMain">
            Lost in the Void
          </h2>
          <p className="text-lg md:text-xl text-textMuted max-w-lg mx-auto leading-relaxed">
            The page you're looking for has drifted into deep space or never existed in the first place.
          </p>
        </div>

        <div className="mt-12">
          <Link
            to="/"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-surfaceHighlight hover:bg-white/10 border border-white/10 rounded-full text-white font-medium transition-all duration-300 overflow-hidden hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            <svg
              className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
      
      {/* Decorative floating elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full mix-blend-screen filter blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px]" />
    </div>
  );
}
