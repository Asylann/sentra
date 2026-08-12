import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/v1/users/me/orgs');
      if (res.ok) {
        const json = await res.json();
        const orgList = json.data || [];
        setOrgs(orgList);
        // Functional updater reads the latest currentOrg without it being a dep,
        // preventing a re-fetch loop every time the active workspace changes.
        setCurrentOrg(prev => {
          const stillExists = orgList.some(o => o.id === prev?.id);
          if (!prev || !stillExists) return orgList.length > 0 ? orgList[0] : null;
          // Refresh the current org entry so renamed display_name is reflected immediately.
          return orgList.find(o => o.id === prev.id) ?? prev;
        });
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]); // no currentOrg dep — functional updater avoids stale closure

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrgs();
    }
  }, [isAuthenticated, fetchOrgs]);

  const switchOrg = useCallback(async (orgId) => {
    try {
      const res = await fetchWithAuth('/api/v1/users/me/orgs/switch', {
        method: 'POST',
        body: JSON.stringify({ org_id: orgId }),
      });
      if (res.ok) {
        const target = orgs.find(o => o.id === orgId);
        if (target) setCurrentOrg(target);
      }
    } catch {
      // silently ignore
    }
  }, [fetchWithAuth, orgs]);

  const isCompanyWorkspace = currentOrg?.workspace_type === 'company';

  const value = {
    currentOrg,
    orgs,
    switchOrg,
    loading,
    isCompanyWorkspace,
    refreshOrgs: fetchOrgs,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
