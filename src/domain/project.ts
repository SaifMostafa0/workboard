export type ProjectColor =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky';

export const PROJECT_COLORS: ProjectColor[] = [
  'blue',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
];

export const PROJECT_COLOR_HEX: Record<ProjectColor, string> = {
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink: '#ec4899',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
};

export interface Project {
  id: string;
  name: string;
  description: string;
  color: ProjectColor;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  description: string;
  color: ProjectColor;
}

export type ProjectUpdate = Partial<ProjectInput>;

export const isValidProjectColor = (color: string): color is ProjectColor => {
  return PROJECT_COLORS.includes(color as ProjectColor);
};

export const DEFAULT_PROJECT_COLOR: ProjectColor = 'blue';
