import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { ExerciseRow } from "./ExerciseRow";
import type { TrainingPlan } from "../../types";

interface PlanDisplayProps {
  plan: TrainingPlan;
  hasInjuries: boolean;
  isRegenerating?: boolean;
  onRegenerate?: () => void;
}

export function PlanDisplay({ plan, hasInjuries, isRegenerating = false, onRegenerate }: PlanDisplayProps) {
  const { overview, weeklySchedule, progression } = plan.planJson;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-1">
            Training Plan · v{plan.version}
          </p>
          <p className="text-[var(--color-muted)] text-sm max-w-xl">{overview}</p>
        </div>
        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="shrink-0"
          >
            {isRegenerating ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : (
              <RefreshCw size={14} className="mr-1.5" />
            )}
            Regenerate
          </Button>
        )}
      </div>

      {/* Weekly schedule */}
      <div className="grid gap-4 sm:grid-cols-2">
        {weeklySchedule.map((session) => (
          <Card key={session.day} variant="default">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{session.day}</CardTitle>
                <span className="text-xs text-[var(--color-muted)] bg-[var(--color-border)] px-2 py-0.5 rounded-full">
                  {session.focus}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {session.exercises.map((exercise, i) => (
                <ExerciseRow
                  key={`${session.day}-${i}`}
                  exercise={exercise}
                  index={i}
                  showAlternatives={hasInjuries}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progression */}
      {progression && (
        <Card variant="accent">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-1">Progression</p>
            <p className="text-sm text-[var(--color-foreground)]">{progression}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
