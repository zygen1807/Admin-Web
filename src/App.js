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
import AdminPendingUsers from './pages/AdminPendingUsers';


function App() {
  return (
    <Router>
      <Routes>
        {/* Public (Auth) Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes with Layout */}
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />               {/* /app */}
          <Route path="dashboard" element={<Dashboard />} />    {/* /app/dashboard */}
          <Route path="reports" element={<Reports />} />  
          <Route path="LocationMap" element={<LocationMap />} /> 
          <Route path="AdminPendingUsers" element={<AdminPendingUsers />} /> {/* /app/AdminPendingUsers */} 
          <Route path="users" element={<Users />} />            {/* /app/users */}
          <Route path="settings" element={<Settings />} />      {/* /app/settings */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
