import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Dumbbell, Brain, Zap } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const ctaHref = user ? "/profile" : "/auth/sign-up";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
      {/* Hero */}
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 text-[var(--color-accent)] text-xs font-medium">
          <Zap size={12} />
          AI-powered training
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[var(--color-foreground)] leading-tight">
          Your perfect <span className="text-[var(--color-accent)]">gym plan</span>,<br />generated in seconds.
        </h1>

        <p className="text-lg text-[var(--color-muted)] max-w-lg mx-auto">
          Answer a few questions about your goals and experience. Get a personalized, AI-crafted training plan built just for you.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          {!isLoading && (
            <Button size="lg" variant="primary" onClick={() => navigate(ctaHref)}>
              Get Started for Free
            </Button>
          )}
          {!isLoading && !user && (
            <Button size="lg" variant="outline" onClick={() => navigate("/auth/sign-in")}>
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mt-24 grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto w-full">
        {[
          { icon: Brain, title: "AI-Crafted Plans", desc: "Personalized training built around your goals, experience, and available equipment." },
          { icon: Dumbbell, title: "4–6 Exercises/Session", desc: "Focused sessions with compound movements, RPE guidance, and rest times." },
          { icon: Zap, title: "Instant Regeneration", desc: "Not happy with your plan? Regenerate it in one click with updated preferences." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 text-left">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center mb-3">
              <Icon size={18} className="text-[var(--color-accent)]" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
