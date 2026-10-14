import type { Project } from '@/domain/project';
import type { Task } from '@/domain/task';

const iso = (date: Date): string => date.toISOString();

const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const daysFromNow = (days: number, base: Date): Date => {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
};

const hoursAgo = (hours: number, base: Date): Date => {
  const date = new Date(base);
  date.setHours(date.getHours() - hours);
  return date;
};

export interface DemoData {
  projects: Project[];
  tasks: Task[];
}

/**
 * Builds a set of realistic sample projects and tasks.
 * Timestamps are relative to `now` so the dashboard's "upcoming", "overdue"
 * and "recent activity" sections always have meaningful content.
 */
export function createDemoData(now: Date = new Date()): DemoData {
  const websiteId = crypto.randomUUID();
  const mobileId = crypto.randomUUID();
  const marketingId = crypto.randomUUID();

  const projects: Project[] = [
    {
      id: websiteId,
      name: 'Website Redesign',
      description: 'Refresh the marketing site with the new brand system.',
      color: 'blue',
      createdAt: iso(daysFromNow(-21, now)),
      updatedAt: iso(hoursAgo(3, now)),
    },
    {
      id: mobileId,
      name: 'Mobile App v2',
      description: 'Ship the next major release of the mobile app.',
      color: 'purple',
      createdAt: iso(daysFromNow(-14, now)),
      updatedAt: iso(hoursAgo(9, now)),
    },
    {
      id: marketingId,
      name: 'Q3 Marketing Campaign',
      description: 'Plan and launch the summer acquisition campaign.',
      color: 'emerald',
      createdAt: iso(daysFromNow(-7, now)),
      updatedAt: iso(hoursAgo(26, now)),
    },
  ];

  const tasks: Task[] = [
    // Website Redesign
    {
      id: crypto.randomUUID(),
      projectId: websiteId,
      title: 'Design the homepage hero',
      description: 'Explore three directions and pick one with the team.',
      status: 'in_progress',
      priority: 'high',
      dueDate: dateOnly(daysFromNow(3, now)),
      assignee: 'Maya',
      tags: ['design', 'frontend'],
      createdAt: iso(daysFromNow(-10, now)),
      updatedAt: iso(hoursAgo(2, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: websiteId,
      title: 'Write landing page copy',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee: 'Tom',
      tags: ['content'],
      createdAt: iso(daysFromNow(-8, now)),
      updatedAt: iso(hoursAgo(20, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: websiteId,
      title: 'Accessibility audit',
      description: 'Run axe and fix keyboard navigation issues.',
      status: 'todo',
      priority: 'urgent',
      dueDate: dateOnly(daysFromNow(6, now)),
      tags: ['a11y', 'qa'],
      createdAt: iso(daysFromNow(-5, now)),
      updatedAt: iso(hoursAgo(30, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: websiteId,
      title: 'Set up analytics',
      description: '',
      status: 'done',
      priority: 'low',
      tags: ['infra'],
      createdAt: iso(daysFromNow(-18, now)),
      updatedAt: iso(daysFromNow(-2, now)),
      completedAt: iso(daysFromNow(-2, now)),
    },

    // Mobile App v2
    {
      id: crypto.randomUUID(),
      projectId: mobileId,
      title: 'Implement authentication',
      description: 'Support passkeys and magic links.',
      status: 'in_progress',
      priority: 'urgent',
      dueDate: dateOnly(daysFromNow(1, now)),
      assignee: 'Priya',
      tags: ['backend', 'security'],
      createdAt: iso(daysFromNow(-12, now)),
      updatedAt: iso(hoursAgo(1, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: mobileId,
      title: 'Fix crash on startup',
      description: 'Reproduced on Android 14 with large datasets.',
      status: 'todo',
      priority: 'high',
      dueDate: dateOnly(daysFromNow(-1, now)),
      assignee: 'Sam',
      tags: ['bug', 'android'],
      createdAt: iso(daysFromNow(-4, now)),
      updatedAt: iso(hoursAgo(6, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: mobileId,
      title: 'App store screenshots',
      description: '',
      status: 'todo',
      priority: 'low',
      tags: ['marketing'],
      createdAt: iso(daysFromNow(-3, now)),
      updatedAt: iso(hoursAgo(40, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: mobileId,
      title: 'Offline sync spike',
      description: 'Evaluate conflict resolution strategies.',
      status: 'done',
      priority: 'medium',
      tags: ['research'],
      createdAt: iso(daysFromNow(-20, now)),
      updatedAt: iso(daysFromNow(-6, now)),
      completedAt: iso(daysFromNow(-6, now)),
    },

    // Q3 Marketing Campaign
    {
      id: crypto.randomUUID(),
      projectId: marketingId,
      title: 'Draft email sequence',
      description: 'Five-email nurture sequence for new signups.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: dateOnly(daysFromNow(2, now)),
      assignee: 'Lena',
      tags: ['email', 'content'],
      createdAt: iso(daysFromNow(-6, now)),
      updatedAt: iso(hoursAgo(4, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: marketingId,
      title: 'Schedule social posts',
      description: '',
      status: 'todo',
      priority: 'low',
      dueDate: dateOnly(daysFromNow(5, now)),
      tags: ['social'],
      createdAt: iso(daysFromNow(-2, now)),
      updatedAt: iso(hoursAgo(12, now)),
    },
    {
      id: crypto.randomUUID(),
      projectId: marketingId,
      title: 'Review ad budget',
      description: 'Reallocate spend toward the best performing channel.',
      status: 'todo',
      priority: 'high',
      dueDate: dateOnly(daysFromNow(4, now)),
      assignee: 'Lena',
      tags: ['ads', 'finance'],
      createdAt: iso(daysFromNow(-1, now)),
      updatedAt: iso(hoursAgo(8, now)),
    },
  ];

  return { projects, tasks };
}
