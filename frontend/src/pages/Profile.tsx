import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PlanDisplay } from "../components/plan/PlanDisplay";
import { generatePlan } from "../lib/api";

export default function Profile() {
  const { user, profile, plan, isLoading, refreshData } = useAuth();
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="h-8 w-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/sign-in" replace />;
  if (!plan) return <Navigate to="/onboarding" replace />;

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      await generatePlan();
      await refreshData();
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Your Training Plan</h1>
          <p className="text-[var(--color-muted)] mt-1 text-sm">
            Based on your profile — {profile?.daysPerWeek} days/week · {profile?.sessionLength} min sessions
          </p>
        </div>
        <PlanDisplay
          plan={plan}
          hasInjuries={!!profile?.injuries}
          isRegenerating={isRegenerating}
          onRegenerate={handleRegenerate}
        />
      </div>
    </div>
  );
}
