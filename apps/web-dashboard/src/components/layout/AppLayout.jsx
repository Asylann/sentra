import React from 'react';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-black selection:bg-orange-500/30 selection:text-orange-200">
      <Header />
      <main className="flex flex-col items-center w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
