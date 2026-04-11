declare module 'naive-ui';
declare module 'naive-ui/es';

// 临时类型声明，修复已有代码的编译问题
export interface TreeOption {
  key: string | number;
  label: string;
  children?: TreeOption[];
  [key: string]: unknown;
}
