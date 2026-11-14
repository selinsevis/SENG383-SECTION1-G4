import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import RequireRole from './RequireRole.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { ChildHome, ParentHome, SpecialistHome } from './pages/RoleHomes.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/parent" element={<RequireRole role="parent"><ParentHome /></RequireRole>} />
          <Route path="/specialist" element={<RequireRole role="specialist"><SpecialistHome /></RequireRole>} />
          <Route path="/child" element={<RequireRole role="child"><ChildHome /></RequireRole>} />
          {/* Any other address: the login page sends logged-in users to their own start page. */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
