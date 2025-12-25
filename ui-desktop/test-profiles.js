// 简单的SliderProfiles测试
console.log('Testing SliderProfiles...');

// 模拟profiles
const profiles = {
  default: {
    id: 'default',
    normalizedSpeed: 1,
    intervalMs: 100,
  },
  zoom: {
    id: 'zoom',
    maxSpeed: 10,
    speedPercentages: [5, 10, 20, 35, 50, 70, 85, 100],
    intervalMs: 60,
  }
};

const PERCENTAGE_CURVES = {
  gentle: [2, 4, 8, 15, 25, 40, 60, 100],
  normal: [5, 10, 20, 35, 50, 70, 85, 100],
  aggressive: [10, 20, 35, 50, 65, 80, 90, 100],
  exponential: [1, 2, 4, 8, 16, 32, 64, 100],
};

function getSliderProfile(key) {
  if (!key) return profiles.default;
  return profiles[key] ?? profiles.default;
}

function computeNormalizedStep(profile, tick, speedMultiplier = 1) {
  try {
    if (profile.normalizedSpeed !== undefined) {
      return profile.normalizedSpeed * speedMultiplier;
    }
    
    if (profile.maxSpeed !== undefined && profile.speedPercentages && Array.isArray(profile.speedPercentages)) {
      const curveIndex = Math.max(0, Math.min(tick, profile.speedPercentages.length - 1));
      const speedPercentage = profile.speedPercentages[curveIndex] || 0;
      
      const actualSpeed = (speedPercentage / 100) * profile.maxSpeed * speedMultiplier;
      
      return Math.min(actualSpeed, profile.maxSpeed);
    }
    
    return 1 * speedMultiplier;
  } catch (error) {
    console.warn('Error computing normalized step:', error);
    return 1;
  }
}

// 测试
try {
  const zoomProfile = getSliderProfile('zoom');
  console.log('Zoom profile:', zoomProfile);
  
  const step1 = computeNormalizedStep(zoomProfile, 0, 1.0); // Should be 0.5
  const step2 = computeNormalizedStep(zoomProfile, 7, 1.0); // Should be 10
  const step3 = computeNormalizedStep(zoomProfile, 7, 0.5); // Should be 5
  
  console.log('Step 0 (5%):', step1);
  console.log('Step 7 (100%):', step2);
  console.log('Step 7 (100% * 0.5):', step3);
  
  console.log('Test completed successfully');
} catch (error) {
  console.error('Test failed:', error);
}