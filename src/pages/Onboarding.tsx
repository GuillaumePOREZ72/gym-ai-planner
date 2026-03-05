import { RedirectToSignIn, SignedIn } from "@neondatabase/neon-js/auth/react";
import { useAuth } from "../context/AuthContext";

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

export default function Onboarding() {
  const { user } = useAuth();

  if (!user) {
    return <RedirectToSignIn />;
  }
  return (
    <SignedIn>
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-xl mx-auto">
          {/* Progress Indicator*/}

          {/* Step 1: Questionnaire}

          {/* Step 2: Generate AI Plan*/}
        </div>
      </div>
    </SignedIn>
  );
}
