import { useContext, useEffect, useState } from 'react';
import type { ViewState } from '../framework/state/PageStore.js';
import { PageStoreContext } from '../main.js';

// 访问 PageStore 实例
export function usePageStore() {
  const store = useContext(PageStoreContext);
  if (!store) {
    throw new Error('PageStoreContext not provided');
  }
  return store;
}

// 简单的只读视图 hook
export function useViewState(): ViewState {
  const store = usePageStore();
  const [view, setView] = useState<ViewState>(() => store.getViewState());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setView(store.getViewState());
    });
    return unsubscribe;
  }, [store]);

  return view;
}
