import { useState } from "react";
import { RedirectToSignIn, SignedIn } from "@neondatabase/neon-js/auth/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { saveProfile, generatePlan } from "../lib/api";

const goalOptions = [
  { value: "bulk", label: "Build Muscle (Bulk)" },
  { value: "cut", label: "Get Lean (Cut)" },
  { value: "recomp", label: "Body Recomposition" },
  { value: "strength", label: "Build Strength" },
  { value: "endurance", label: "Improve Endurance" },
];

const experienceOptions = [
  { value: "beginner", label: "Beginner (0-1 year)" },
  { value: "intermediate", label: "Intermediate (1-3 years)" },
  { value: "advanced", label: "Advanced (3+ years)" },
];

const daysOptions = [
  { value: "1", label: "1 day/week" },
  { value: "2", label: "2 days/week" },
  { value: "3", label: "3 days/week" },
  { value: "4", label: "4 days/week" },
  { value: "5", label: "5 days/week" },
  { value: "6", label: "6 days/week" },
];

const sessionOptions = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "75", label: "75 minutes" },
  { value: "90", label: "90 minutes" },
];

const equipmentOptions = [
  { value: "full_gym", label: "Full Gym Access" },
  { value: "home", label: "Home Gym" },
  { value: "dumbbells", label: "Dumbbells Only" },
];

const splitOptions = [
  { value: "full", label: "Full Body" },
  { value: "upper_lower", label: "Upper/Lower" },
  { value: "push_pull", label: "Push/Pull" },
  { value: "chest_back", label: "Chest/Back" },
  { value: "legs_arms", label: "Legs/Arms" },
];

const injuriesOptions = [
  { value: "", label: "None" },
  { value: "knee", label: "Knee pain" },
  { value: "back", label: "Lower back pain" },
  { value: "shoulder", label: "Shoulder issues" },
  { value: "wrist", label: "Wrist pain" },
  { value: "hip", label: "Hip pain" },
  { value: "ankle", label: "Ankle issues" },
];

export default function Onboarding() {
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
            <h1 className="text-2xl font-bold mb-2">Let's get to know you</h1>
            <p className="text-[var(--color-muted)] mb-6">
              Help us create the perfect plan for you.
            </p>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Select
                id="goal"
                label="What's your primary goal?"
                options={goalOptions}
                value={formData.goal}
                onChange={(e) => updateForm("goal", e.target.value)}
              />
              <Select
                id="experience"
                label="How experienced are you?"
                options={experienceOptions}
                value={formData.experience}
                onChange={(e) => updateForm("experience", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="daysPerWeek"
                  label="How many days per week can you train?"
                  options={daysOptions}
                  value={formData.daysPerWeek}
                  onChange={(e) => updateForm("daysPerWeek", e.target.value)}
                />
                <Select
                  id="sessionLength"
                  label="How long do you want your sessions to be?"
                  options={sessionOptions}
                  value={formData.sessionLength}
                  onChange={(e) => updateForm("sessionLength", e.target.value)}
                />
              </div>
              <Select
                id="equipment"
                label="What equipment do you have access to?"
                options={equipmentOptions}
                value={formData.equipment}
                onChange={(e) => updateForm("equipment", e.target.value)}
              />
              <Select
                id="preferredSplit"
                label="What split do you prefer?"
                options={splitOptions}
                value={formData.preferredSplit}
                onChange={(e) => updateForm("preferredSplit", e.target.value)}
              />
              <Select
                id="injuries"
                label="Do you have any injuries or limitations?"
                options={injuriesOptions}
                value={formData.injuries}
                onChange={(e) => updateForm("injuries", e.target.value)}
              />
              {formData.injuries && (
                <Textarea
                  id="injuriesDetail"
                  label="Describe your injury (optional)"
                  placeholder="e.g. right knee pain when squatting"
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
                {isSubmitting ? "Generating your plan…" : "Generate My Plan"}
              </Button>
            </form>
          </Card>

          {/* Step 2: Generate AI Plan*/}
        </div>
      </div>
    </SignedIn>
  );
}
