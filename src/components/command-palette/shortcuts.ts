export interface ShortcutDefinition {
  keys: string[];
  description: string;
}

export const SHORTCUTS: ShortcutDefinition[] = [
  { keys: ['Ctrl', 'K'], description: 'Open the command palette' },
  { keys: ['?'], description: 'Show this shortcuts help' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'P'], description: 'Go to Projects' },
  { keys: ['G', 'T'], description: 'Go to Tasks' },
  { keys: ['G', 'R'], description: 'Go to Trash' },
  { keys: ['G', 'S'], description: 'Go to Settings' },
  { keys: ['G', 'L'], description: 'Go to Labels' },
  { keys: ['G', 'V'], description: 'Go to Saved Views' },
  { keys: ['↑', '↓'], description: 'Move through command palette results' },
  { keys: ['Enter'], description: 'Run the highlighted command' },
  { keys: ['Esc'], description: 'Close the palette or this dialog' },
];
