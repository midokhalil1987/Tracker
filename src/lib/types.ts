export type Project = {
  id: string;
  name: string;
  client?: string;
  color: string;
  billable: boolean;
  /** Hourly billing rate in the workspace currency. Undefined = no rate. */
  hourlyRate?: number;
  createdAt: number;
};

export type Tag = {
  id: string;
  name: string;
};

export type TimeEntry = {
  id: string;
  description: string;
  projectId: string | null;
  tagIds: string[];
  startedAt: number; // unix ms
  endedAt: number; // unix ms
  billable: boolean;
};

export type RunningTimer = {
  description: string;
  projectId: string | null;
  tagIds: string[];
  startedAt: number;
  billable: boolean;
  /** Original entry being resumed; removed from the list until stop/discard. */
  resumedEntry?: TimeEntry;
};

/** Last timer draft — used for "Resume" on the home screen. */
export type LastTimerContext = {
  description: string;
  projectId: string | null;
  tagIds: string[];
  billable: boolean;
};

/** Personal freelance targets (solo use). */
export type FreelanceGoals = {
  /** Target billable/tracked hours per week (e.g. 40). */
  weeklyHoursTarget: number;
  /** Optional weekly earnings goal in workspace currency. 0 = hidden. */
  weeklyEarningsTarget: number;
};
