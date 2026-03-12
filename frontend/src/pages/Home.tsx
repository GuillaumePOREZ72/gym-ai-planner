import { Link } from "react-router-dom";
import { Zap, Target, Calendar, ArrowRight, Sparkles, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export default function Home() {
  const { t } = useTranslation("common");

  const features = [
    { key: "ai", icon: Sparkles, title: t("home.feature_aiTitle"), description: t("home.feature_aiDesc") },
    { key: "goal", icon: Target, title: t("home.feature_goalTitle"), description: t("home.feature_goalDesc") },
    { key: "schedule", icon: Calendar, title: t("home.feature_scheduleTitle"), description: t("home.feature_scheduleDesc") },
    { key: "time", icon: Clock, title: t("home.feature_timeTitle"), description: t("home.feature_timeDesc") },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-accent)]/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--color-accent)]/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] mb-8">
            <Zap className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="text-sm text-[var(--color-muted)]">{t("home.badge")}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            {t("home.heroTitle1")}
            <br />
            <span className="text-[var(--color-accent)]">{t("home.heroAccent")}</span>{" "}
            {t("home.heroTitle2")}
          </h1>

          <p className="text-xl text-[var(--color-muted)] max-w-2xl mx-auto mb-10">
            {t("home.heroSubtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding">
              <Button size="lg" className="gap-2">
                {t("home.getStarted")}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/auth/sign-in">
              <Button variant="outline" size="lg">
                {t("nav.signIn")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.whyTitle")}</h2>
            <p className="text-[var(--color-muted)] text-lg max-w-2xl mx-auto">
              {t("home.whySubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.key}
                variant="outline"
                className="group p-6 hover:border-[var(--color-accent)]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-accent)]/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-[var(--color-muted)] text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
