import { Routes, Route } from "react-router-dom";
import { CategoriesProvider } from "./contexts/CategoriesContext";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { WeekView } from "./pages/WeekView";
import { TaskDetail } from "./pages/TaskDetail";
import { WeekWizard } from "./pages/WeekWizard";
import { Backlog } from "./pages/Backlog";
import { BacklogDetail } from "./pages/BacklogDetail";
import { Recurring } from "./pages/Recurring";
import { Categories } from "./pages/Categories";
import { NotFound } from "./pages/NotFound";

export function App() {
  return (
    <CategoriesProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/weeks/:weekId" element={<WeekView />} />
          <Route path="/weeks/:weekId/tasks/:taskId" element={<TaskDetail />} />
          <Route path="/weeks/new" element={<WeekWizard />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/backlog/:itemId" element={<BacklogDetail />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </CategoriesProvider>
  );
}
