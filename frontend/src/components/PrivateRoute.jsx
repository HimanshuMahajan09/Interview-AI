import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div id="overlay">
        <div className="ov-logo">InterviewAI</div>
        <div className="ov-bar"><div className="ov-fill" /></div>
        <div className="ov-msg">Loading…</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
