import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "How does Sentra securely access my code?",
    answer: "Sentra uses GitHub Apps for read-only access to your repositories. We do not store your source code, and all communication is encrypted in transit and at rest. Your code is processed entirely in memory and immediately discarded after analysis."
  },
  {
    question: "What programming languages are supported?",
    answer: "We support over 40+ programming languages out of the box, including Go, Python, JavaScript/TypeScript, Rust, Java, C++, Ruby, and PHP. Sentra's AI model is trained on diverse codebases to understand context across ecosystems."
  },
  {
    question: "How long does a typical review take?",
    answer: "Thanks to our optimized infrastructure powered by Apache Kafka, a typical PR review completes in under 10 seconds. Large monorepos with massive diffs may take up to 30 seconds."
  },
  {
    question: "Can I customize the review guidelines?",
    answer: "Yes! Sentra reads the `AGENTS.md` or `.sentra.yml` file in your repository root to enforce your team's specific architectural rules, style guidelines, and coding standards."
  },
  {
    question: "Does Sentra replace human code reviews?",
    answer: "No, Sentra acts as your team's most thorough junior reviewer. We catch the obvious bugs, security flaws, and style violations so human reviewers can focus on business logic, architecture, and design."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#000] text-[#ededed] font-sans selection:bg-gray-800 pb-24">
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

      <main className="relative z-10 max-w-3xl mx-auto px-4 pt-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-400 max-w-xl mx-auto">Everything you need to know about how Sentra works, security, and getting started.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.04] transition-colors"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-medium text-white pr-8">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`} 
                />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 pt-2 text-sm text-gray-400 leading-relaxed border-t border-white/5">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">Still have questions?</p>
          <Link to="/coming-soon" className="inline-block mt-2 text-indigo-400 hover:text-indigo-300 font-medium">
            Contact our support team &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
