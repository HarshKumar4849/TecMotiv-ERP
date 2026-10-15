import { Routes, Route, Navigate } from 'react-router-dom';

import Login from '@/pages/Login';
import Register from '@/pages/Register';

export default function AuthRouter() {
  return (
    <Routes>
      <Route element={<Login />} path="/" />
      <Route element={<Login />} path="/login" />
      <Route element={<Navigate to="/login" replace />} path="/logout" />
      <Route element={<Register />} path="/register" />
      {/* While signed out only auth routes are reachable. Any other URL is a
          deep link into the protected app, so send the user to the login screen
          instead of a misleading 404. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
