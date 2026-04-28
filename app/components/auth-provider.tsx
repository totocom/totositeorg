"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getIsAdminByEmail } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  errorMessage: string;
  refreshAdminStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

let initialSessionPromise:
  | ReturnType<typeof supabase.auth.getSession>
  | null = null;

function getInitialSessionOnce() {
  initialSessionPromise ??= supabase.auth.getSession();
  return initialSessionPromise;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const requestIdRef = useRef(0);

  const loadAdminStatus = useCallback(async (nextUser: User | null) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!nextUser?.email) {
      setIsAdmin(false);
      setErrorMessage("");
      return;
    }

    const { isAdmin: nextIsAdmin, error } = await getIsAdminByEmail(
      nextUser.email,
    );

    if (requestIdRef.current !== requestId) {
      return;
    }

    setIsAdmin(error ? false : nextIsAdmin);
    setErrorMessage(
      error
        ? "관리자 권한을 확인하지 못했습니다. Supabase RLS 정책을 확인해주세요."
        : "",
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      const { data, error } = await getInitialSessionOnce();

      if (!isMounted) {
        return;
      }

      const nextUser = data.session?.user ?? null;
      setUser(nextUser);

      if (error) {
        setErrorMessage("로그인 상태를 확인하지 못했습니다.");
      }

      await loadAdminStatus(nextUser);

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;

      setUser(nextUser);
      setIsAdmin(false);
      setErrorMessage("");
      setIsLoading(false);

      window.setTimeout(() => {
        if (!isMounted) {
          return;
        }

        loadAdminStatus(nextUser);
      }, 0);
    });

    return () => {
      isMounted = false;
      requestIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [loadAdminStatus]);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    let isCancelled = false;

    async function registerAdminIp() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token || isCancelled) {
        return;
      }

      await fetch("/api/admin/signup-ip-allowlist/current", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }).catch(() => null);
    }

    registerAdminIp();

    return () => {
      isCancelled = true;
    };
  }, [user, isAdmin]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin,
      isLoading,
      errorMessage,
      refreshAdminStatus: () => loadAdminStatus(user),
    }),
    [user, isAdmin, isLoading, errorMessage, loadAdminStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth는 AuthProvider 안에서 사용해야 합니다.");
  }

  return value;
}
