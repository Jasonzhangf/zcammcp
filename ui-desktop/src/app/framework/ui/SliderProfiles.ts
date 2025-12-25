export interface SliderProfile {
  id: string;
  // 简单滑块：使用归一化速度（每 tick 的进度百分比）
  normalizedSpeed?: number;
  // 百分比速度曲线：用于 zoom 等需要加速感的滑块
  maxSpeed?: number;
  speedPercentages?: readonly number[]; // 每个 tick 对应的百分比（0–100）
  intervalMs?: number; // 更新间隔
}

// 预设的百分比曲线
export const PERCENTAGE_CURVES = {
  gentle: [2, 4, 8, 15, 25, 40, 60, 100],
  normal: [5, 10, 20, 35, 50, 70, 85, 100],
  aggressive: [10, 20, 35, 50, 65, 80, 90, 100],
  exponential: [1, 2, 4, 8, 16, 32, 64, 100],
} as const;

const profiles: Record<string, SliderProfile> = {
  default: {
    id: 'default',
    // 每 tick 1% 归一化步进
    normalizedSpeed: 1,
    intervalMs: 100,
  },
  precise: {
    id: 'precise',
    // 每 tick 0.5% 归一化步进
    normalizedSpeed: 0.5,
    intervalMs: 150,
  },
  fast: {
    id: 'fast',
    // 每 tick 2% 归一化步进
    normalizedSpeed: 2,
    intervalMs: 50,
  },
  // 通用的百分比加速 profile（给需要“越按越快”的场景用）
  percentageAcceleration: {
    id: 'percentageAcceleration',
    maxSpeed: 10,
    speedPercentages: [5, 10, 20, 35, 50, 70, 85, 100],
    intervalMs: 60,
  },
  zoom: {
    id: 'zoom',
    // 使用标准加速曲线，speed=100 时接近 maxSpeed
    maxSpeed: 10,
    speedPercentages: PERCENTAGE_CURVES.normal,
    intervalMs: 60,
  },
};

export function getSliderProfile(key?: string): SliderProfile {
  if (!key) return profiles.default;
  return profiles[key] ?? profiles.default;
}

export function computeNormalizedStep(
  profile: SliderProfile,
  tick: number,
  speedMultiplier: number = 1,
): number {
  try {
    // 简单模式：直接使用 normalizedSpeed
    if (profile.normalizedSpeed !== undefined) {
      return profile.normalizedSpeed * speedMultiplier;
    }

    // 百分比曲线模式（zoom 等）
    if (
      profile.maxSpeed !== undefined &&
      profile.speedPercentages &&
      Array.isArray(profile.speedPercentages)
    ) {
      const curve = profile.speedPercentages;
      const index = Math.max(0, Math.min(tick, curve.length - 1));
      const speedPercentage = curve[index] ?? 0;

      const actualSpeed = (speedPercentage / 100) * profile.maxSpeed * speedMultiplier;
      return Math.min(actualSpeed, profile.maxSpeed);
    }

    // 默认兜底：每 tick 1 单位
    return 1 * speedMultiplier;
  } catch (error) {
    console.warn('Error computing normalized step:', error);
    return 1;
  }
}

export function getProfileInterval(profile: SliderProfile): number {
  return profile.intervalMs ?? 100;
}

// 工厂：创建自定义百分比曲线 profile
export function createPercentageSpeedProfile(config: {
  id: string;
  maxSpeed: number;
  percentages: readonly number[];
  intervalMs?: number;
}): SliderProfile {
  return {
    id: config.id,
    maxSpeed: config.maxSpeed,
    speedPercentages: config.percentages,
    intervalMs: config.intervalMs ?? 60,
  };
}

