import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/Shell';
import { LoadingState } from '../components/ui';

const LandingPage = lazy(() => import('../pages/PublicPages').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('../pages/PublicPages').then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('../pages/PublicPages').then((module) => ({ default: module.SignupPage })));
const DashboardPage = lazy(() => import('../pages/LearningPages').then((module) => ({ default: module.DashboardPage })));
const KnowledgePage = lazy(() => import('../pages/LearningPages').then((module) => ({ default: module.KnowledgePage })));
const ProgressPage = lazy(() => import('../pages/LearningPages').then((module) => ({ default: module.ProgressPage })));
const SettingsPage = lazy(() => import('../pages/LearningPages').then((module) => ({ default: module.SettingsPage })));
const ProfilePage = lazy(() => import('../pages/LearningPages').then((module) => ({ default: module.ProfilePage })));
const TutorPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.TutorPage })));
const MaterialsPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.MaterialsPage })));
const MaterialDetailPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.MaterialDetailPage })));
const QuizBuilderPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.QuizBuilderPage })));
const QuizPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.QuizPage })));
const QuizResultPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.QuizResultPage })));
const FlashcardsPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.FlashcardsPage })));
const PlannerPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.PlannerPage })));
const NotFoundPage = lazy(() => import('../pages/PublicPages').then((module) => ({ default: module.NotFoundPage })));

function LoadingScreen() { return <div className="route-loading"><LoadingState message="Preparing your study space…" /></div>; }

export function App() {
  return <BrowserRouter><Suspense fallback={<LoadingScreen />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/materials/:id" element={<MaterialDetailPage />} />
      <Route path="/tutor" element={<TutorPage />} />
      <Route path="/tutor/:conversationId" element={<TutorPage />} />
      <Route path="/knowledge" element={<KnowledgePage />} />
      <Route path="/quiz" element={<QuizBuilderPage />} />
      <Route path="/quiz/:id" element={<QuizPage />} />
      <Route path="/quiz/:id/result" element={<QuizResultPage />} />
      <Route path="/flashcards" element={<FlashcardsPage />} />
      <Route path="/planner" element={<PlannerPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Route>
    <Route path="/404" element={<NotFoundPage />} />
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes></Suspense></BrowserRouter>;
}
