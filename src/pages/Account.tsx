import { AccountView } from "@neondatabase/neon-js/auth/react/ui";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) return <Navigate to="/auth/sign-in" replace />;

  return (
    <div className="flex items-center justify-center min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-md w-full">
        <AccountView />
      </div>
    </div>
  );
}