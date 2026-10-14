export interface Label {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type LabelInput = Omit<Label, 'id' | 'createdAt' | 'updatedAt'>;
export type LabelUpdate = Partial<LabelInput>;
