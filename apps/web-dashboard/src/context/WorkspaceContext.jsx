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
        // Switch to first org if current org was deleted or not yet set
        const stillExists = orgList.some(o => o.id === currentOrg?.id);
        if (!currentOrg || !stillExists) {
          setCurrentOrg(orgList.length > 0 ? orgList[0] : null);
        }
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, currentOrg]);

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
