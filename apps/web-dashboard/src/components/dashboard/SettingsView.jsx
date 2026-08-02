import { Shield, Bell, GitBranch, Key, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsView() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium text-white">Settings</h2>
        <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="grid gap-6">
        {/* Security Policies */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Security Policies</h3>
              <p className="text-sm text-gray-400">Configure organization-wide security thresholds.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Quality Gate Threshold</label>
              <p className="text-xs text-gray-500 mb-3">Minimum PR quality score required to pass.</p>
              <input type="range" min="0" max="100" defaultValue="80" className="w-full accent-indigo-500" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 (Permissive)</span>
                <span className="text-indigo-400 font-medium">80 (Current)</span>
                <span>100 (Strict)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* GitHub Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">GitHub Integration</h3>
              <p className="text-sm text-gray-400">Manage connected repositories and app permissions.</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-lg border border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Sentra AI Security App</h4>
                <p className="text-xs text-green-400">Connected</p>
              </div>
            </div>
            <a href="https://github.com/apps/sentra-devex" target="_blank" rel="noreferrer" className="text-sm text-gray-300 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors border border-white/10">
              Configure in GitHub
            </a>
          </div>
        </motion.div>
        {/* Analysis Focus (Heuristics) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Analysis Focus (Heuristics)</h3>
              <p className="text-sm text-gray-400">Toggles to tell the AI what to care about.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['Security Vulnerabilities', 'Performance/Big-O', 'Code Style/Formatting', 'Documentation Check'].map((heuristic, i) => (
              <label key={heuristic} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.05] cursor-pointer hover:bg-white/[0.05] transition-colors">
                <input 
                  type="checkbox" 
                  defaultChecked={i < 2} 
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm font-medium text-gray-300">{heuristic}</span>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Custom RAG Policies (Prompt Injection) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Custom RAG Policies (Prompt Injection)</h3>
              <p className="text-sm text-gray-400">Define your own rules that get injected into the AWS Bedrock prompt.</p>
            </div>
          </div>
          
          <div>
            <textarea 
              rows={4} 
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-lg p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Example: Always enforce strict typing. Never use any in TypeScript."
            />
          </div>
        </motion.div>

        {/* Auto-Approve Automation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Auto-Approve Automation</h3>
                <p className="text-sm text-gray-400">Automatically approve GitHub PRs if the Quality Score is 100/100.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
