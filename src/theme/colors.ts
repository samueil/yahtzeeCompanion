export const colors = {
  primary: '#4f46e5',
  'primary-light': '#a5b4fc',
  'primary-dark': '#3730a3',
  background: '#f1f5f9',
  card: '#ffffff',
  text: '#1e293b',
  muted: '#94a3b8',
  disabled: '#cbd5e1',
  inverted: '#ffffff',
  'primary-hover': '#e0e7ff',
  'background-subtle': '#f8fafc',
  emphasis: '#475569',
  border: '#e2e8f0',
  destructive: '#ef4444',
  'destructive-light': '#f87171',
  success: '#16a34a',
  icon: '#64748b',
} as const;

export type AppColor = keyof typeof colors;
