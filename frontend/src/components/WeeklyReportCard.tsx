import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getWeeklyReport, generateWeeklyReport } from "../lib/api";
import type { WeeklyReport } from "../types";
import { Button } from "./ui/Button";

export default function WeeklyReportCard() {
  const { t, i18n } = useTranslation("common");
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getWeeklyReport()
      .then((r) => { if (active) setReport(r); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const newReport = await generateWeeklyReport(i18n.language);
      setReport(newReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
        {t("weeklyReport.title")}
      </h2>
      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">{t("weeklyReport.loading")}</p>
      ) : report ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">{report.reportText}</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-muted)]">
              {t("weeklyReport.weekOf", {
                weekStart: new Date(report.weekStart + "T00:00:00").toLocaleDateString("en-GB"),
                generatedAt: new Date(report.updatedAt).toLocaleDateString("en-GB"),
              })}
            </p>
            <Button variant="ghost" onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? t("weeklyReport.generating") : t("weeklyReport.regenerate")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-muted)]">
            {t("weeklyReport.emptyDesc")}
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button variant="outline" onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {isGenerating ? t("weeklyReport.generating") : t("weeklyReport.generateBtn")}
          </Button>
        </div>
      )}
    </div>
  );
}
