import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { LabelsPage } from '@/features/labels/pages/LabelsPage';
import { ProjectDetailPage } from '@/features/projects/pages/ProjectDetailPage';
import { ProjectsPage } from '@/features/projects/pages/ProjectsPage';
import { SavedViewsPage } from '@/features/saved-views/pages/SavedViewsPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { TasksPage } from '@/features/tasks/pages/TasksPage';
import { TrashPage } from '@/features/trash/pages/TrashPage';
import { Route, Routes } from 'react-router-dom';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/new" element={<TasksPage />} />
        <Route path="/labels" element={<LabelsPage />} />
        <Route path="/saved-views" element={<SavedViewsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
