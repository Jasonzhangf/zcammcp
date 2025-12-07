// CardConfig.ts
// 卡片级配置: 描述控件组的基础尺寸和比例, 由页面布局组合使用

export type CardSizePreset = 'S' | 'M' | 'L' | 'ball';

export type PageLayoutMode = 'full' | 'medium' | 'compact' | 'ball';

export interface CardConfig {
  id: string;              // 例如 'ptz.main', 'image.main'
  aspectRatio: number;     // 宽 / 高, 例如 3/2, 16/9
  baseWidth: number;       // 设计基准宽度, 例如 320
  minScale?: number;       // 可选: 最小缩放倍数
  maxScale?: number;       // 可选: 最大缩放倍数
  // 各布局模式下使用的尺寸预设, 未指定时由页面决定
  sizeByMode?: Partial<Record<PageLayoutMode, CardSizePreset>>;
}

export interface CardInstanceConfig {
  cardId: string;
  size: CardSizePreset;
  order: number;
}

export interface PageLayoutConfig {
  mode: PageLayoutMode;
  cards: CardInstanceConfig[];
}
