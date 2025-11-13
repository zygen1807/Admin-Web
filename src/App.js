import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import LocationMap from './pages/LocationMap';
import AssignPregnantBhw from './pages/AssignPregnantBhw';
import AdminPendingUsers from './pages/AdminPendingUsers';
import AdminNotifications from './pages/AdminNotifications';
import AdminNotificationWatcher from './pages/AdminNotificationWatcher';
import LandingPage from './components/LandingPage';
import ArchiveRecords from './pages/Archive_Records';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public (Landing & Auth) Routes */}
        <Route path="/" element={<LandingPage />} />  {/* ✅ Default landing page */}
        <Route path="/LandingPage" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes with Layout */}
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />               
          <Route path="dashboard" element={<Dashboard />} />    
          <Route path="reports" element={<Reports />} />  
          <Route path="LocationMap" element={<LocationMap />} /> 
          <Route path="AssignPregnantBhw" element={<AssignPregnantBhw />} /> 
          <Route path="AdminPendingUsers" element={<AdminPendingUsers />} /> 
          <Route path="users" element={<Users />} />            
          <Route path="settings" element={<Settings />} />
          <Route path="AdminNotifications" element={<AdminNotifications />} />         
          <Route path="AdminNotificationWatcher" element={<AdminNotificationWatcher />} />
          <Route path="archive_records" element={<ArchiveRecords />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
