import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const SentraWSContext = createContext(null);

export function SentraWSProvider({ children }) {
  const { isAuthenticated, token, apiBase } = useAuth();
  const [activePRs, setActivePRs] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Fetch initial PRs
    const fetchPRs = async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/prs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const mappedPRs = data.data.map(pr => ({
              id: pr.id.toString(),
              repo: pr.repository_full_name,
              title: pr.title,
              author: pr.author_login,
              qs: pr.quality_score,
              status: pr.analysis_status,
              time: new Date(pr.created_at).toLocaleString(),
              pr_number: pr.pull_number
            }));
            setActivePRs(mappedPRs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch PRs", err);
      }
    };
    fetchPRs();

    // The websocket connection could go to apiBase but websocket scheme is needed
    // let's construct it correctly from apiBase
    let wsUrl = '';
    if (apiBase) {
       const url = new URL(apiBase);
       wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/api/v1/ws?token=${token}`;
    } else {
       const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
       const host = window.location.host;
       wsUrl = `${protocol}//${host}/api/v1/ws?token=${token}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[SentraWS] Connected to live analysis pipeline');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[SentraWS] Received message:', payload);
        setLastMessage(payload);
        
        // payload expects: { id: "repo#123", repo: "sentra/test", title: "...", author: "usena", status: "analyzing" | "completed", qs: null | 95, time: "just now" }
        // Let's handle 'analyzing' and 'completed' events gracefully
        if (payload.status) {
          setActivePRs(prev => {
            const existingIdx = prev.findIndex(pr => 
              pr.id === payload.id || 
              (pr.repo === payload.repo && String(pr.pr_number) === String(payload.pr_number)) ||
              pr.id === `${payload.repo}#${payload.pr_number}`
            );
            if (existingIdx !== -1) {
              // Update existing
              const updated = [...prev];
              updated[existingIdx] = { ...updated[existingIdx], ...payload, time: 'just now' };
              return updated;
            } else {
              // Add new at top
              return [{ ...payload, time: 'just now' }, ...prev];
            }
          });
        }
      } catch (err) {
        console.error('[SentraWS] Failed to parse message', err);
      }
    };

    ws.onclose = () => {
      console.log('[SentraWS] Disconnected');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, [isAuthenticated, token]);

  return (
    <SentraWSContext.Provider value={{ activePRs, isConnected, lastMessage }}>
      {children}
    </SentraWSContext.Provider>
  );
}

export function useSentraWS() {
  const context = useContext(SentraWSContext);
  if (!context) {
    throw new Error('useSentraWS must be used within a SentraWSProvider');
  }
  return context;
}
