export function ProgressBar({ value, threshold = 80 }: { value: number; threshold?: number }) {
  const safeValue = Math.max(0, Math.min(value, 100));
  const state = safeValue >= 100 ? "danger" : safeValue >= threshold ? "warning" : "";
  return (
    <div className="progress-track" aria-label={`${Math.round(value)}% utilizado`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(safeValue)}>
      <div className={`progress-value ${state}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}
