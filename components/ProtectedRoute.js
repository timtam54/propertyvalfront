import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the children (protected component)
  return children;
}

export default ProtectedRoute;
