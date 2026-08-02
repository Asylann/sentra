import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldAlert, Code2, ArrowLeft, TerminalSquare, Zap, Lock, Bug, Database } from 'lucide-react';

const samples = [
  {
    id: 1,
    title: "Hardcoded Secret Prevention",
    description: "Caught an API key before it was merged into the main branch.",
    icon: <Lock className="w-5 h-5 text-rose-400" />,
    diff: `+ const awsKey = "AKIAIOSFODNN7EXAMPLE";\n+ const s3Client = new S3Client({ region, credentials: { accessKeyId: awsKey } });`,
    commentType: "threat",
    commentTitle: "Critical Vulnerability",
    commentText: "Hardcoded AWS credentials detected. This violates CWE-798. Use process.env or AWS Secrets Manager.",
    color: "rose"
  },
  {
    id: 2,
    title: "SQL Injection Flaw",
    description: "Identified string concatenation used in an SQL query instead of parameterized inputs.",
    icon: <Database className="w-5 h-5 text-amber-400" />,
    diff: `- const query = "SELECT * FROM users WHERE email = '" + req.body.email + "'";\n+ const query = "SELECT * FROM users WHERE email = $1";`,
    commentType: "fix",
    commentTitle: "AI Auto-Fix Suggested",
    commentText: "Refactored to use parameterized queries to prevent SQL injection attacks.",
    color: "amber"
  },
  {
    id: 3,
    title: "Big-O Performance Issue",
    description: "Detected a nested O(n^2) loop that would degrade performance in production.",
    icon: <Zap className="w-5 h-5 text-indigo-400" />,
    diff: `- for(let i=0; i<users.length; i++) {\n-   let match = transactions.find(t => t.userId === users[i].id);\n- }`,
    commentType: "threat",
    commentTitle: "Performance Bottleneck",
    commentText: "This results in O(n*m) complexity. Consider creating a hash map of transactions grouped by userId for O(n) lookup.",
    color: "indigo"
  },
  {
    id: 4,
    title: "Null Pointer Dereference",
    description: "Spotted missing null checks that would cause a runtime panic.",
    icon: <Bug className="w-5 h-5 text-rose-400" />,
    diff: `- return user.Profile.AvatarURL\n+ if user != nil && user.Profile != nil {\n+     return user.Profile.AvatarURL\n+ }\n+ return ""`,
    commentType: "fix",
    commentTitle: "AI Auto-Fix Suggested",
    commentText: "Added defensive nil checks. The previous code would panic if user or user.Profile was nil.",
    color: "emerald"
  },
  {
    id: 5,
    title: "Concurrency Race Condition",
    description: "Found an unsynchronized map write in a goroutine.",
    icon: <TerminalSquare className="w-5 h-5 text-purple-400" />,
    diff: `- go func() {\n-     cache[req.ID] = result\n- }()`,
    commentType: "threat",
    commentTitle: "Race Condition Detected",
    commentText: "Concurrent map writes will cause a fatal error. Use sync.Map or protect with sync.RWMutex.",
    color: "purple"
  }
];

export default function SamplesPage() {
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

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-16">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Sample AI Reviews</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">Explore how Sentra analyzes context to catch critical flaws and suggest instant auto-fixes.</p>
        </div>

        <div className="space-y-16">
          {samples.map((sample, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              key={sample.id} 
              className="bg-[#0a0a0a] border border-white/[0.05] rounded-xl overflow-hidden hover:border-white/10 transition-colors"
            >
              <div className="p-6 border-b border-white/[0.05] flex items-center gap-4 bg-[#050505]">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  {sample.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{sample.title}</h3>
                  <p className="text-sm text-gray-400">{sample.description}</p>
                </div>
              </div>
              <div className="p-6 md:p-8 font-mono text-sm leading-loose overflow-x-auto relative">
                <div className="bg-[#111] border border-white/5 rounded-lg p-6 relative">
                  <pre className="text-gray-300">
                    {sample.diff.split('\n').map((line, i) => (
                      <div key={i} className={
                        line.startsWith('+') ? 'text-emerald-400 bg-emerald-500/[0.05] px-2 py-0.5 rounded -mx-2' : 
                        line.startsWith('-') ? 'text-rose-400 bg-rose-500/[0.05] px-2 py-0.5 rounded line-through -mx-2' : 
                        'px-2 py-0.5'
                      }>
                        {line}
                      </div>
                    ))}
                  </pre>
                  
                  <div className={`mt-8 p-4 bg-black border border-${sample.color}-500/30 rounded-lg max-w-md shadow-xl`}>
                    <div className="flex gap-2 items-center mb-2">
                      {sample.commentType === 'threat' ? <ShieldAlert className={`w-4 h-4 text-${sample.color}-400`} /> : <Code2 className={`w-4 h-4 text-${sample.color}-400`} />}
                      <span className={`font-semibold text-${sample.color}-100 text-xs tracking-wide uppercase`}>{sample.commentTitle}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">{sample.commentText}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
