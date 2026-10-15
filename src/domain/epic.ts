export interface Epic {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the epic is moved to trash; omitted for active epics. */
  deletedAt?: string;
}

export interface EpicInput {
  name: string;
  description: string;
}

export type EpicUpdate = Partial<EpicInput>;
