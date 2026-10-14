export interface SavedView {
  id: string;
  name: string;
  filters: {
    q?: string;
    status?: string;
    priority?: string;
    project?: string;
    due?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export type SavedViewInput = Omit<SavedView, 'id' | 'createdAt' | 'updatedAt'>;
export type SavedViewUpdate = Partial<SavedViewInput>;
