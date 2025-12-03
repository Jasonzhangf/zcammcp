// ContainerNode.ts
// UI 容器/控件的通用元数据定义, 与具体 ZCAM 业务解耦

export type ContainerRole = 'page' | 'container' | 'control' | 'group';

export interface ContainerNode {
  path: string;              // 绝对路径, 例如 zcam.camera.pages.main.ptz.focus
  role: ContainerRole;       // page/container/control/group
  kind: string;              // 功能种类, 例如 ptz.focus
  selectable: boolean;       // 是否可被选择导出结构体
  children: ContainerNode[]; // 子容器, 由布局树构建

  // 可选的增强属性, 后续按规范扩展:
  bindKey?: string;          // 显示数据绑定键
  valueKey?: string;         // 实际值绑定键
  operationId?: string;      // 写操作标识
}

