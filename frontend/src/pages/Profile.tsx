import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { PlanDisplay } from "../components/plan/PlanDisplay";
import { generatePlan } from "../lib/api";
import { Avatar } from "../components/ui/Avatar";

export default function Profile() {
  const { user, profile, plan, isLoading, refreshData } = useAuth();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { t } = useTranslation("common");

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

  const memberSince = (() => {
    const d = new Date(user.createdAt);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  })();

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <Avatar seed={user.id} size={80} label={user.email} />
          <div>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">{user.email}</p>
            <p className="text-sm text-[var(--color-muted)]">{t("profile.memberSince", { date: memberSince })}</p>
          </div>
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">{t("profile.trainingPlan")}</h1>
          <p className="text-[var(--color-muted)] mt-1 text-sm">
            {t("profile.planSubtitle", { days: profile?.daysPerWeek, session: profile?.sessionLength })}
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
