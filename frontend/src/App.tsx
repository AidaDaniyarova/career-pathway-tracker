import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from "./pages/UserDashboard.tsx";
import CareerPaths from "./pages/dashboard/CareerPaths.tsx";
import CareerPathDetail from "./pages/dashboard/CareerPathDetail.tsx";
import LearningModules from "./pages/dashboard/LearningModules.tsx";
import LearningModuleDetail from "./pages/dashboard/LearningModuleDetail.tsx";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/career-paths" element={<CareerPaths />} />
          <Route path="/career-paths/:id" element={<CareerPathDetail />} />
          <Route path="/modules" element={<LearningModules />} />
          <Route path="/modules/:id" element={<LearningModuleDetail />} />

          {/* Protected Routes */}
          <Route path="/user/dashboard/*" element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/user/dashboard" />} />
          <Route path="*" element={<Navigate to="/user/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;