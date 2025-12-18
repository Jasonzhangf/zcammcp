// ShortcutsCard.tsx
// 路径: zcam.camera.pages.main.shortcuts

import React, { useMemo } from 'react';
import type { ContainerNode } from '../../../framework/container/ContainerNode.js';
import { useContainerData, useContainerState } from '../../../hooks/useContainerStore.js';

export const shortcutsCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.shortcuts',
  role: 'container',
  kind: 'shortcuts.card',
  selectable: true,
  children: [],
};

export function ShortcutsCard() {
  const demoShortcuts = useMemo(() => ['快捷1', '快捷2', '快捷3'], []);
  const containerData = useMemo(() => ({ shortcuts: demoShortcuts }), [demoShortcuts]);
  useContainerData('group.shortcuts', containerData);
  const containerState = useContainerState('group.shortcuts');
  const editMode = containerState?.data?.['editMode'] === true;

  return (
    <div
      className="zcam-card"
      data-path="zcam.camera.pages.main.shortcuts.card"
    >
      <div className="zcam-card-header">
        <span className="zcam-card-title">快捷方式</span>
        <span className="zcam-card-header-right">
          <span style={{ fontSize: 10, color: '#555' }}>编辑</span>
          <span
            className={`zcam-toggle ${editMode ? 'zcam-toggle-on' : 'zcam-toggle-off'}`}
            data-path="zcam.camera.pages.main.shortcuts.editToggle"
          >
            <span className="zcam-toggle-knob" />
          </span>
        </span>
      </div>
      <div className="zcam-card-body">
        <div
          className="zcam-shortcuts-layout"
          data-path="zcam.camera.pages.main.shortcuts.layout"
        >
          {/* 左：快捷控制区域 */}
          <div
            className="zcam-card"
            style={{ padding: '4px 6px', gap: 4 }}
            data-path="zcam.camera.pages.main.shortcuts.controlPanel"
          >
            <div className="zcam-card-header" style={{ padding: 0, border: 'none' }}>
              <span className="zcam-card-title" style={{ fontSize: 10 }}>
                控制
              </span>
            </div>
            <div className="zcam-card-body" style={{ gap: 4 }}>
              <button
                className="zcam-shortcut-btn"
                data-path="zcam.camera.pages.main.shortcuts.addFromSelection"
              >
                从选择区域添加
              </button>
              <button
                className="zcam-shortcut-btn"
                data-path="zcam.camera.pages.main.shortcuts.deleteSelected"
              >
                删除选中
              </button>
            </div>
          </div>

          {/* 右：快捷按钮区域 */}
          <div
            className="zcam-card"
            style={{ padding: '4px 6px', gap: 4 }}
            data-path="zcam.camera.pages.main.shortcuts.buttonPanel"
          >
            <div className="zcam-card-header" style={{ padding: 0, border: 'none' }}>
              <span className="zcam-card-title" style={{ fontSize: 10 }}>
                快捷
              </span>
            </div>
            <div
              className="zcam-shortcut-grid"
              data-path="zcam.camera.pages.main.shortcuts.buttons"
            >
              <button className="zcam-shortcut-btn">快捷1</button>
              <button className="zcam-shortcut-btn">快捷2</button>
              <button className="zcam-shortcut-btn">快捷3</button>
              <button
                className="zcam-shortcut-btn zcam-shortcut-add"
                data-path="zcam.camera.pages.main.shortcuts.addButton"
              >
                + 添加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

