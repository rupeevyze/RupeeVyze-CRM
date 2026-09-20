import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuth } from "./authContext.jsx";
import Layout from "./components/Layout";
import Login from "./pages/Login.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard/index.jsx";
import LeadManagementModule from "./pages/lead-management/LeadManagementModule.jsx";
import AdvisorOperationsModule from "./pages/advisor-operations/AdvisorOperationsModule.jsx";
import ClientOperationsModule from "./pages/client-operations/ClientOperationsModule.jsx";
import BusinessIntModule from "./pages/business-intelligence/BusinessIntModule.jsx";
import AdminModule from "./pages/administration/AdminModule.jsx";
import CandidateDetails from "./pages/CandidateDetails.jsx";

function ProtectedRoute({ children, modulePath }) {
  const { currentUser, canViewModule, loading } = useAuth();
  if (loading) return null; // avoid flashing to /login while session is still resolving
  if (!currentUser) return <Navigate to="/login" replace />;
  if (modulePath && !canViewModule(modulePath)) return <Navigate to="/adviser/dashboard" replace />;
  return children;
}

function ProfileRoute() {
  const { id } = useParams();
  return <CandidateDetails key={id} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/adviser/dashboard" replace />} />
                  <Route path="/adviser/dashboard" element={<Dashboard />} />
                  <Route path="/adviser/profile/:id" element={<ProfileRoute />} />
                  <Route path="/adviser/lead-management/*" element={
                    <ProtectedRoute modulePath="/adviser/lead-management"><LeadManagementModule /></ProtectedRoute>
                  } />
                  <Route path="/adviser/advisor-operations/*" element={
                    <ProtectedRoute modulePath="/adviser/advisor-operations"><AdvisorOperationsModule /></ProtectedRoute>
                  } />
                  <Route path="/adviser/client-operations/*" element={<ClientOperationsModule />} />
                  <Route path="/adviser/business-intelligence/*" element={
                    <ProtectedRoute modulePath="/adviser/business-intelligence"><BusinessIntModule /></ProtectedRoute>
                  } />
                  <Route path="/adviser/administration/*" element={
                    <ProtectedRoute modulePath="/adviser/administration"><AdminModule /></ProtectedRoute>
                  } />
                  <Route path="*" element={<Navigate to="/adviser/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
