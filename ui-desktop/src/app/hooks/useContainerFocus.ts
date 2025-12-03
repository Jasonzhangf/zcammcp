import { useCallback } from 'react';
import { usePageStore, useViewState } from './usePageStore.js';

/**
 * 统一的容器焦点/高亮 hook
 * - hover: highlight = 'hover'
 * - mousedown: activeNodePath 切换为当前 path, highlight = 'active'
 */
export function useContainerFocus(nodePath: string) {
  const store = usePageStore();
  const view = useViewState();

  const highlight = view.ui.highlightMap[nodePath] ?? 'none';
  const isActive = view.ui.activeNodePath === nodePath;

  const onMouseEnter = useCallback(() => {
    store.setHighlight(nodePath, 'hover');
  }, [store, nodePath]);

  const onMouseLeave = useCallback(() => {
    // 若当前不是 active 节点, 离开时恢复 none
    if (store.uiState.activeNodePath !== nodePath) {
      store.setHighlight(nodePath, 'none');
    }
  }, [store, nodePath]);

  const onMouseDown = useCallback(() => {
    store.setActiveNode(nodePath);
    store.setHighlight(nodePath, 'active');
  }, [store, nodePath]);

  return {
    highlight,
    isActive,
    eventHandlers: {
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
    },
  } as const;
}
