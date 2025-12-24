export interface SliderProfile {
  id: string;
  multipliers: number[];
  intervalMs?: number;
  baseStepScale?: number;
}

const defaultMultipliers = [1, 1, 1.5, 2, 2.5, 3, 4, 5];

const profiles: Record<string, SliderProfile> = {
  default: {
    id: 'default',
    multipliers: defaultMultipliers,
    intervalMs: 140,
    baseStepScale: 1,
  },
  gentle: {
    id: 'gentle',
    multipliers: [0.5, 0.5, 0.75, 1, 1.25, 1.5, 2],
    intervalMs: 160,
    baseStepScale: 0.6,
  },
  aggressive: {
    id: 'aggressive',
    multipliers: [1, 2, 3, 4, 6, 8, 10],
    intervalMs: 100,
    baseStepScale: 1.2,
  },
  zoomBoost: {
    id: 'zoomBoost',
    multipliers: [1, 1, 1.5, 2, 2.5, 5, 10, 20, 40, 60, 80, 110, 140, 200, 400],
    intervalMs: 50,
    baseStepScale: 1,
  },
};

export function getSliderProfile(key?: string): SliderProfile {
  if (!key) return profiles.default;
  return profiles[key] ?? profiles.default;
}

export function computeSliderStep(profile: SliderProfile, tick: number, baseStep: number): number {
  const multipliers = profile.multipliers.length > 0 ? profile.multipliers : profiles.default.multipliers;
  const clampedTick = Math.max(0, Math.min(tick, multipliers.length - 1));
  const multiplier = multipliers[clampedTick] ?? multipliers[multipliers.length - 1] ?? 1;
  const scale = profile.baseStepScale ?? 1;
  return baseStep * multiplier * scale;
}

export function getProfileInterval(profile: SliderProfile): number {
  return profile.intervalMs ?? 140;
}
