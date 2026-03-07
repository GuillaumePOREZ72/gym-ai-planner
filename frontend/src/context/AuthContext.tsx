import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User, UserProfile, TrainingPlan } from "../types";
import { authClient } from "../lib/auth";
import { getProfile, getPlan } from "../lib/api";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  plan: TrainingPlan | null;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isRefreshingRef = useRef(false);

  const refreshData = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const result = await authClient.getSession();
      const sessionUser = result?.data?.user ?? null;
      setUser(sessionUser ? {
        id: sessionUser.id,
        email: sessionUser.email,
        createdAt: sessionUser.createdAt instanceof Date
          ? sessionUser.createdAt.toISOString()
          : String(sessionUser.createdAt),
      } : null);

      if (sessionUser) {
        const userProfile = await getProfile();
        setProfile(userProfile);
        if (userProfile) {
          const userPlan = await getPlan();
          setPlan(userPlan);
        } else {
          setPlan(null);
        }
      } else {
        setProfile(null);
        setPlan(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setPlan(null);
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, plan, isLoading, refreshData }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
