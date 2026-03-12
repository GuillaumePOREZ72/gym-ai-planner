import { useState } from "react";
import { RedirectToSignIn, SignedIn } from "@neondatabase/neon-js/auth/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { saveProfile, generatePlan } from "../lib/api";

export default function Onboarding() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    goal: "bulk",
    experience: "intermediate",
    daysPerWeek: "4",
    sessionLength: "60",
    equipment: "full_gym",
    injuries: "",
    preferredSplit: "upper_lower",
  });

  const goalOptions = [
    { value: "bulk", label: t("onboarding.goal_bulk") },
    { value: "cut", label: t("onboarding.goal_cut") },
    { value: "recomp", label: t("onboarding.goal_recomp") },
    { value: "strength", label: t("onboarding.goal_strength") },
    { value: "endurance", label: t("onboarding.goal_endurance") },
  ];

  const experienceOptions = [
    { value: "beginner", label: t("onboarding.exp_beginner") },
    { value: "intermediate", label: t("onboarding.exp_intermediate") },
    { value: "advanced", label: t("onboarding.exp_advanced") },
  ];

  const daysOptions = [
    { value: "1", label: t("onboarding.days_1") },
    { value: "2", label: t("onboarding.days_2") },
    { value: "3", label: t("onboarding.days_3") },
    { value: "4", label: t("onboarding.days_4") },
    { value: "5", label: t("onboarding.days_5") },
    { value: "6", label: t("onboarding.days_6") },
  ];

  const sessionOptions = [
    { value: "30", label: t("onboarding.session_30") },
    { value: "45", label: t("onboarding.session_45") },
    { value: "60", label: t("onboarding.session_60") },
    { value: "75", label: t("onboarding.session_75") },
    { value: "90", label: t("onboarding.session_90") },
  ];

  const equipmentOptions = [
    { value: "full_gym", label: t("onboarding.equip_fullGym") },
    { value: "home", label: t("onboarding.equip_home") },
    { value: "dumbbells", label: t("onboarding.equip_dumbbells") },
  ];

  const splitOptions = [
    { value: "full", label: t("onboarding.split_full") },
    { value: "upper_lower", label: t("onboarding.split_upperLower") },
    { value: "push_pull", label: t("onboarding.split_pushPull") },
    { value: "chest_back", label: t("onboarding.split_chestBack") },
    { value: "legs_arms", label: t("onboarding.split_legsArms") },
  ];

  const injuriesOptions = [
    { value: "", label: t("onboarding.injury_none") },
    { value: "knee", label: t("onboarding.injury_knee") },
    { value: "back", label: t("onboarding.injury_back") },
    { value: "shoulder", label: t("onboarding.injury_shoulder") },
    { value: "wrist", label: t("onboarding.injury_wrist") },
    { value: "hip", label: t("onboarding.injury_hip") },
    { value: "ankle", label: t("onboarding.injury_ankle") },
  ];

  function updateForm(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await saveProfile(formData);
      await generatePlan();
      navigate("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return <RedirectToSignIn />;
  }
  return (
    <SignedIn>
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-xl mx-auto">
          {/* Progress Indicator*/}

          {/* Step 1: Questionnaire*/}
          <Card variant="default" className="p-6">
            <h1 className="text-2xl font-bold mb-2">{t("onboarding.title")}</h1>
            <p className="text-[var(--color-muted)] mb-6">
              {t("onboarding.subtitle")}
            </p>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Select
                id="goal"
                label={t("onboarding.goalLabel")}
                options={goalOptions}
                value={formData.goal}
                onChange={(e) => updateForm("goal", e.target.value)}
              />
              <Select
                id="experience"
                label={t("onboarding.experienceLabel")}
                options={experienceOptions}
                value={formData.experience}
                onChange={(e) => updateForm("experience", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="daysPerWeek"
                  label={t("onboarding.daysLabel")}
                  options={daysOptions}
                  value={formData.daysPerWeek}
                  onChange={(e) => updateForm("daysPerWeek", e.target.value)}
                />
                <Select
                  id="sessionLength"
                  label={t("onboarding.sessionLabel")}
                  options={sessionOptions}
                  value={formData.sessionLength}
                  onChange={(e) => updateForm("sessionLength", e.target.value)}
                />
              </div>
              <Select
                id="equipment"
                label={t("onboarding.equipmentLabel")}
                options={equipmentOptions}
                value={formData.equipment}
                onChange={(e) => updateForm("equipment", e.target.value)}
              />
              <Select
                id="preferredSplit"
                label={t("onboarding.splitLabel")}
                options={splitOptions}
                value={formData.preferredSplit}
                onChange={(e) => updateForm("preferredSplit", e.target.value)}
              />
              <Select
                id="injuries"
                label={t("onboarding.injuriesLabel")}
                options={injuriesOptions}
                value={formData.injuries}
                onChange={(e) => updateForm("injuries", e.target.value)}
              />
              {formData.injuries && (
                <Textarea
                  id="injuriesDetail"
                  label={t("onboarding.injuriesDetailLabel")}
                  placeholder={t("onboarding.injuriesDetailPlaceholder")}
                  value={formData.injuries}
                  onChange={(e) => updateForm("injuries", e.target.value)}
                />
              )}
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? t("onboarding.generatingBtn") : t("onboarding.generateBtn")}
              </Button>
            </form>
          </Card>

          {/* Step 2: Generate AI Plan*/}
        </div>
      </div>
    </SignedIn>
  );
}
