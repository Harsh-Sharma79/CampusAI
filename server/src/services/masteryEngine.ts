export type MasteryInput = {
  attemptCount: number;
  correctCount: number;
  recentAccuracy?: number | null;
  flashcardRecall?: number | null;
  guidedAccuracy?: number | null;
  daysSinceStudied?: number | null;
};

export type MasteryResult = { score: number; confidence: number };

function validRate(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function calculateMastery(input: MasteryInput): MasteryResult | null {
  const attempts = Math.max(0, Math.floor(input.attemptCount));
  const correct = Math.min(attempts, Math.max(0, Math.floor(input.correctCount)));
  const signals: Array<{ value: number; weight: number }> = [];
  if (attempts > 0) signals.push({ value: correct / attempts, weight: 0.50 });
  if (validRate(input.recentAccuracy)) signals.push({ value: input.recentAccuracy, weight: 0.25 });
  if (validRate(input.flashcardRecall)) signals.push({ value: input.flashcardRecall, weight: 0.15 });
  if (validRate(input.guidedAccuracy)) signals.push({ value: input.guidedAccuracy, weight: 0.10 });
  if (!signals.length) return null;

  const weighted = signals.reduce((total, signal) => total + signal.value * signal.weight, 0)
    / signals.reduce((total, signal) => total + signal.weight, 0);
  const days = typeof input.daysSinceStudied === 'number' && Number.isFinite(input.daysSinceStudied)
    ? Math.max(0, input.daysSinceStudied)
    : 0;
  const recencyFactor = Math.pow(1 + days / 90, -0.25);
  const score = Math.round(weighted * recencyFactor * 10_000) / 100;
  const confidence = Math.round((1 - Math.exp(-attempts / 8)) * 10_000) / 10_000;
  return { score: Math.max(0, Math.min(100, score)), confidence };
}

export function difficultyForMastery(score: number | null): 'FOUNDATIONAL' | 'INTERMEDIATE' | 'ADVANCED' {
  if (score === null || score < 50) return 'FOUNDATIONAL';
  if (score < 80) return 'INTERMEDIATE';
  return 'ADVANCED';
}

export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\p{P}\p{S}]+/gu, '');
}
