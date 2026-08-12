import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { fetchWithAuth, isAuthenticated } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  // Keep a ref so switchOrg always reads the latest list without being in its dep array.
  const orgsRef = useRef([]);

  const fetchOrgs = useCallback(async (preferOrgId = null) => {
    try {
      const res = await fetchWithAuth('/api/v1/users/me/orgs');
      if (res.ok) {
        const json = await res.json();
        const orgList = json.data || [];
        orgsRef.current = orgList;
        setOrgs(orgList);
        setCurrentOrg(prev => {
          // If a specific org is preferred (e.g. just created), switch to it.
          if (preferOrgId) {
            const preferred = orgList.find(o => o.id === preferOrgId);
            if (preferred) return preferred;
          }
          const stillExists = orgList.some(o => o.id === prev?.id);
          if (!prev || !stillExists) return orgList.length > 0 ? orgList[0] : null;
          return orgList.find(o => o.id === prev.id) ?? prev;
        });
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

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
        // Read from ref so this callback never goes stale when orgs list updates
        // (e.g. right after a refreshOrgs() call that added a newly created workspace).
        const target = orgsRef.current.find(o => o.id === orgId);
        if (target) setCurrentOrg(target);
      }
    } catch {
      // silently ignore
    }
  }, [fetchWithAuth]); // no `orgs` dep — ref provides fresh data without rebuilding

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
