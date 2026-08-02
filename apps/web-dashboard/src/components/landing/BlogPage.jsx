import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function BlogPage() {
  const posts = [
    {
      title: "The Future of AI Code Reviews",
      date: "August 12, 2026",
      category: "Engineering",
      desc: "How we're moving beyond simple syntax checking to deep architectural analysis."
    },
    {
      title: "Deploying Sentra inside a VPC",
      date: "July 28, 2026",
      category: "Security",
      desc: "A technical deep dive into our Enterprise architecture and data privacy guarantees."
    },
    {
      title: "Announcing 1-Click Fixes",
      date: "July 15, 2026",
      category: "Product",
      desc: "Stop manually fixing lint errors and basic bugs. Let the agent do it for you."
    }
  ];

  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800 pb-24 relative overflow-hidden">
      {/* Background Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, #111 0%, transparent 60%)' }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <header className="relative z-10 px-8 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <img src="/logo_with_name.png" alt="Sentra" className="h-8" />
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">The Sentra Blog</h1>
          <p className="text-xl text-gray-400">Updates, engineering insights, and news from the team.</p>
        </motion.div>

        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to="/coming-soon" className="block p-8 bg-[#0a0a0a] rounded-2xl border border-white/5 hover:border-white/20 transition-colors group">
                <div className="flex items-center gap-4 text-xs font-mono text-gray-500 mb-4">
                  <span className="text-indigo-400">{post.category}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                  {post.title}
                  <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all text-indigo-400" />
                </h2>
                <p className="text-gray-400 leading-relaxed max-w-2xl">{post.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
