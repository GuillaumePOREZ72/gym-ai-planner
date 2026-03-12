// frontend/src/components/layout/Navbar.tsx
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";
import { Dumbbell, Sun, Moon } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation("common");

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "fr" : "en");
  };

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
              <Link to="/dashboard" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
                {t("nav.dashboard")}
              </Link>
              <Link to="/fitness" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
                {t("nav.fitness")}
              </Link>
              <Link to="/nutrition" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
                {t("nav.nutrition")}
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  {t("nav.myPlan")}
                </Button>
              </Link>
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("nav.switchToLight") : t("nav.switchToDark")}
                className="p-2 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleLanguage}
                aria-label={t("nav.switchLang")}
                className="text-xs font-semibold px-2 py-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)] transition-colors"
              >
                {i18n.language === "en" ? "FR" : "EN"}
              </button>
              <Link
                to="/account"
                aria-label="Account settings"
                className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                <Avatar seed={user.id} size={36} />
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={toggleLanguage}
                aria-label={t("nav.switchLang")}
                className="text-xs font-semibold px-2 py-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)] transition-colors"
              >
                {i18n.language === "en" ? "FR" : "EN"}
              </button>
              <Link to="/auth/sign-in">
                <Button variant="ghost" size="sm">
                  {t("nav.signIn")}
                </Button>
              </Link>
              <Link to="/auth/sign-up">
                <Button size="sm">{t("nav.signUp")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
