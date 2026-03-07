import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";
import { Dumbbell } from "lucide-react";
import { UserButton } from "@neondatabase/neon-js/auth/react";

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <Dumbbell className="h-6 w-6 text-accent" />
          <span className="text-xl font-bold tracking-tight">GymAI</span>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  My Plan
                </Button>
              </Link>
              <UserButton className="bg-(--color-accent)" />
            </>
          ) : (
            <>
              <Link to="/auth/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth/sign-up">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
