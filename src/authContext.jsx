import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const ADVISOR_ALLOWED_PATHS = [
  "/adviser/dashboard",
  "/adviser/client-operations",
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateUserFromSession = useCallback(async (session) => {
    if (!session?.user) {
      setCurrentUser(null);
      return;
    }
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, advisor_candidate_id")
      .eq("id", session.user.id)
      .single();

    if (error || !profile) {
      setCurrentUser(null);
      return;
    }

    setCurrentUser({
      id: profile.role === "advisor" ? profile.advisor_candidate_id : profile.id,
      authId: profile.id,
      name: profile.name,
      role: profile.role,
      email: profile.email,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      hydrateUserFromSession(session).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateUserFromSession(session);
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [hydrateUserFromSession]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await hydrateUserFromSession(data.session);
    return data;
  }, [hydrateUserFromSession]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isAdvisor = currentUser?.role === "advisor";

  const canViewModule = useCallback(
    (modulePath) => {
      if (isAdmin) return true;
      if (isAdvisor) {
        return ADVISOR_ALLOWED_PATHS.some((p) => modulePath.startsWith(p));
      }
      return true;
    },
    [isAdmin, isAdvisor]
  );

  const canEditClient = useCallback(
    (candidate) => {
      if (isAdmin) return true;
      return String(candidate?.assignedAdvisorId || "") === String(currentUser?.id || "");
    },
    [isAdmin, currentUser]
  );

  const canDeleteClient = useCallback(
    (candidate) => {
      if (isAdmin) return true;
      // Advisors can request deletion of their own clients (subject to admin approval).
      return String(candidate?.assignedAdvisorId || "") === String(currentUser?.id || "");
    },
    [isAdmin, currentUser]
  );
  const canAssignClient = useCallback(() => isAdmin, [isAdmin]);
  const canViewDashboard = useCallback(() => true, []);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      isAdmin,
      isAdvisor,
      login,
      logout,
      canViewModule,
      canEditClient,
      canDeleteClient,
      canAssignClient,
      canViewDashboard,
    }),
    [currentUser, loading, isAdmin, isAdvisor, login, logout, canViewModule, canEditClient, canDeleteClient, canAssignClient, canViewDashboard]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function filterByRole(records, user) {
  if (!user) return [];
  if (user.role === "admin") return records;
  return records.filter((r) => String(r.assignedAdvisorId || "") === String(user.id || ""));
}
