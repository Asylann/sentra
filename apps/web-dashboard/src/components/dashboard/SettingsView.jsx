import { useState, useEffect, useCallback } from 'react';
import { Shield, Bell, GitBranch, Key, Save, Loader2, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

const HEURISTIC_OPTIONS = [
  { key: 'Security',     label: 'Security Vulnerabilities',  desc: 'SQLi, XSS, auth bypass, hardcoded secrets' },
  { key: 'Performance', label: 'Performance / Big-O',        desc: 'N+1 queries, unbounded loops, memory leaks' },
  { key: 'Complexity',  label: 'Code Complexity',            desc: 'Cyclomatic complexity, deep nesting, god objects' },
  { key: 'Style',       label: 'Code Style / Formatting',    desc: 'Naming conventions, dead code, clarity' },
];

const DEFAULT_SETTINGS = {
  quality_gate_threshold: 80,
  daily_pr_limit: 7,
  analysis_focus: ['Security', 'Performance'],
  custom_rules_text: '',
  auto_approve_enabled: false,
};

export default function SettingsView() {
  const { fetchWithAuth } = useAuth();
  const { currentOrg } = useWorkspace();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [error,   setError]     = useState(null);

  // ─── Fetch settings on mount ──────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          quality_gate_threshold: data.quality_gate_threshold ?? 80,
          daily_pr_limit:         data.daily_pr_limit         ?? 7,
          analysis_focus:         data.analysis_focus         ?? ['Security', 'Performance'],
          custom_rules_text:      data.custom_rules_text      ?? '',
          auto_approve_enabled:   data.auto_approve_enabled   ?? false,
        });
      } else {
        setError('Failed to load settings. Using defaults.');
      }
    } catch (e) {
      setError('Network error loading settings.');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, currentOrg?.id]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ─── Save settings ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!currentOrg?.id) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/v1/orgs/${currentOrg.id}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Failed to save settings.');
      }
    } catch {
      setError('Network error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const toggleFocus = (key) => {
    setSettings(s => ({
      ...s,
      analysis_focus: s.analysis_focus.includes(key)
        ? s.analysis_focus.filter(k => k !== key)
        : [...s.analysis_focus, key],
    }));
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-white">Settings</h2>
          {currentOrg && (
            <p className="text-sm text-gray-400 mt-1">
              Configuring workspace: <span className="text-indigo-400 font-medium">{currentOrg.login}</span>
            </p>
          )}
        </div>
        <button
          id="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Status messages */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Settings saved successfully! Changes will apply to the next PR analysis.
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
        >
          <AlertTriangle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      <div className="grid gap-6">
        {/* ── Security Policies ─────────────────────────────────────────── */}
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
              <p className="text-sm text-gray-400">Configure organization-wide quality thresholds.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Quality Gate Threshold */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-300">Quality Gate Threshold</label>
                <span className="text-indigo-400 font-bold text-sm tabular-nums">
                  {settings.quality_gate_threshold} / 100
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Minimum PR quality score to pass the gate. PRs below this score will block merging.
              </p>
              <input
                id="quality-gate-slider"
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.quality_gate_threshold}
                onChange={e => setSettings(s => ({ ...s, quality_gate_threshold: Number(e.target.value) }))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 — Permissive</span>
                <span>50 — Balanced</span>
                <span>100 — Strictest</span>
              </div>
            </div>

            {/* Daily PR Limit */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <label className="block text-sm font-medium text-gray-300">Daily PR Limit per Developer</label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Maximum number of PR analyses per developer per day. Set to <code className="text-indigo-400">0</code> for unlimited.
              </p>
              <div className="flex items-center gap-3">
                <input
                  id="daily-pr-limit-input"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.daily_pr_limit}
                  onChange={e => setSettings(s => ({ ...s, daily_pr_limit: Number(e.target.value) }))}
                  className="w-28 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors tabular-nums"
                />
                <span className="text-sm text-gray-400">PRs / day</span>
                {settings.daily_pr_limit === 0 && (
                  <span className="text-xs text-emerald-400 font-medium">∞ Unlimited</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── GitHub Integration ────────────────────────────────────────── */}
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
            <a
              href="https://github.com/apps/sentra-devex"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-gray-300 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors border border-white/10"
            >
              Configure in GitHub
            </a>
          </div>
        </motion.div>

        {/* ── Analysis Focus (Heuristics) ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Analysis Focus (Heuristics)</h3>
              <p className="text-sm text-gray-400">Tell the AI which areas to prioritize. The LLM will focus its analysis effort on enabled categories.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-5 ml-11">
            CRITICAL/HIGH findings are always reported regardless of focus. LOW/INFO findings are suppressed for disabled categories.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HEURISTIC_OPTIONS.map(({ key, label, desc }) => {
              const active = settings.analysis_focus.includes(key);
              return (
                <label
                  key={key}
                  id={`focus-${key.toLowerCase()}`}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    active
                      ? 'bg-indigo-500/10 border-indigo-500/30'
                      : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleFocus(key)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                  />
                  <div>
                    <span className={`text-sm font-medium ${active ? 'text-indigo-300' : 'text-gray-300'}`}>{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </motion.div>

        {/* ── Custom RAG Policies ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Custom RAG Policies (Prompt Injection)</h3>
              <p className="text-sm text-gray-400">Define your own rules that get injected into the AWS Bedrock system prompt.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4 ml-11">
            One rule per line. These are prepended to the AI's <code className="text-purple-400">&lt;organization_rules&gt;</code> XML tag before every analysis.
          </p>

          <textarea
            id="custom-rules-textarea"
            rows={5}
            value={settings.custom_rules_text}
            onChange={e => setSettings(s => ({ ...s, custom_rules_text: e.target.value }))}
            className="w-full bg-white/[0.03] border border-white/[0.1] rounded-lg p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
            placeholder={`Example:\nAlways enforce strict typing. Never use 'any' in TypeScript.\nAll database queries must use parameterized statements.\nAPI endpoints must validate JWT claims before processing.`}
          />
          <p className="text-xs text-gray-600 mt-2">
            {settings.custom_rules_text.split('\n').filter(l => l.trim()).length} rule(s) defined
          </p>
        </motion.div>

        {/* ── Auto-Approve Automation ───────────────────────────────────── */}
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
                <p className="text-sm text-gray-400">
                  Automatically post a GitHub <strong>Approve</strong> review on PRs that achieve a perfect{' '}
                  <span className="text-emerald-400 font-medium">100 / 100</span> quality score with zero findings.
                </p>
                {settings.auto_approve_enabled && (
                  <p className="text-xs text-orange-300 mt-1">
                    ⚠️ Only enable this after verifying your quality gate threshold is strict enough.
                  </p>
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
              <input
                id="auto-approve-toggle"
                type="checkbox"
                className="sr-only peer"
                checked={settings.auto_approve_enabled}
                onChange={e => setSettings(s => ({ ...s, auto_approve_enabled: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500" />
            </label>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
