import { Info } from "lucide-react";
import type { Exercise } from "../../types";

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  showAlternatives?: boolean;
}

function getRpeBadgeClass(rpe: number): string {
  if (rpe >= 8) return "bg-red-500/10 text-red-400 border border-red-500/20";
  if (rpe >= 7) return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
  return "bg-green-500/10 text-green-400 border border-green-500/20";
}

export function ExerciseRow({ exercise, index, showAlternatives = false }: ExerciseRowProps) {
  return (
    <div className="py-3 border-b border-[var(--color-border)] last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-border)] text-[var(--color-muted)] text-xs flex items-center justify-center font-medium mt-0.5">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm text-[var(--color-foreground)]">{exercise.name}</span>
              {exercise.notes && (
                <span title={exercise.notes} className="text-[var(--color-muted)] cursor-help">
                  <Info size={13} />
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              {exercise.sets} × {exercise.reps} &nbsp;·&nbsp; Rest {exercise.rest}
            </p>
          </div>
        </div>

        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${getRpeBadgeClass(exercise.rpe)}`}>
          RPE {exercise.rpe}
        </span>
      </div>

      {showAlternatives && exercise.alternatives && exercise.alternatives.length > 0 && (
        <div className="mt-2 ml-9">
          <p className="text-xs text-[var(--color-muted)] mb-1">Alternatives:</p>
          <div className="flex flex-wrap gap-1.5">
            {exercise.alternatives.map((alt) => (
              <span
                key={alt}
                className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted)]"
              >
                {alt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
