import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { UserProfile } from "../../hooks/useAuth";
import { clientBottomNav, clientNavItems, getRoleLabel, therapistNavItems } from "./shellConfig";
import {
  ShellBottomNav,
  ShellLink,
  ShellProfileCard,
  ShellQuickActionStrip,
} from "./shellPrimitives";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function AppShell({
  children,
  profile,
  signOut,
}: {
  children: ReactNode;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const role = profile?.role === "therapist" ? "therapist" : "client";
  const navItems = role === "therapist" ? therapistNavItems : clientNavItems;
  const activeItem = navItems.find((item) => item.matches(pathname)) || navItems[0];
  const isTherapistLanding =
    role === "therapist" && (pathname === "/" || pathname === "/therapist");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {!isTherapistLanding && (
        <div
          className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:border-r lg:border-border lg:bg-card/90 lg:backdrop-blur-xl lg:transition-[width] lg:duration-300 ${
            sidebarCollapsed ? "lg:w-24" : "lg:w-72"
          }`}
        >
          <div
            className={`flex h-full flex-col pb-6 pt-5 ${sidebarCollapsed ? "items-center px-3" : "px-5"}`}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className={`mb-5 inline-flex items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary ${sidebarCollapsed ? "w-12 p-3" : "w-full gap-2 px-4 py-3 text-sm font-bold"}`}
              aria-pressed={!sidebarCollapsed}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Navigation ausklappen" : "Navigation einklappen"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              {!sidebarCollapsed && <span>Navigation</span>}
            </button>

            <nav className="w-full space-y-2">
              {navItems.map((item) => (
                <ShellLink
                  key={item.to}
                  item={item}
                  active={item.matches(pathname)}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </nav>

            <div className="mt-auto w-full">
              <ShellProfileCard
                profile={profile}
                onSignOut={handleSignOut}
                collapsed={sidebarCollapsed}
              />
            </div>
          </div>
        </div>
      )}

      <div
        className={`${!isTherapistLanding ? "lg:transition-[padding] lg:duration-300" : ""} ${
          isTherapistLanding
            ? ""
            : sidebarCollapsed
              ? "lg:pl-24"
              : "lg:pl-72"
        }`}
      >
        {!isTherapistLanding && (
          <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="hidden rounded-2xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-secondary lg:inline-flex"
                  aria-pressed={!sidebarCollapsed}
                  aria-expanded={!sidebarCollapsed}
                  aria-label={sidebarCollapsed ? "Navigation ausklappen" : "Navigation einklappen"}
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    {getRoleLabel(profile)}
                  </p>
                  <h1 className="truncate text-xl font-black tracking-tight text-foreground">
                    {activeItem?.label || "Workspace"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <ShellProfileCard profile={profile} compact />
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary lg:hidden"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-black text-background">
                    !
                  </span>
                  <span className="hidden sm:inline">Abmelden</span>
                  <span className="sm:hidden">Konto</span>
                </button>
              </div>
            </div>

            <div className={`${role === "therapist" ? "block" : "hidden md:block"} border-t border-border lg:hidden`}>
              <div className="mx-auto w-full max-w-[1600px] overflow-x-auto px-4 py-3 sm:px-6">
                <nav className="flex items-center gap-2">
                  {navItems.map((item) => (
                    <ShellLink key={item.to} item={item} active={item.matches(pathname)} compact />
                  ))}
                </nav>
              </div>
            </div>

            {role === "client" && <ShellQuickActionStrip pathname={pathname} />}
          </header>
        )}

        <main
          className={
            isTherapistLanding
              ? ""
              : role === "client"
                ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-10"
                : "pb-10"
          }
        >
          {children}
        </main>
      </div>

      {role === "client" && <ShellBottomNav items={clientBottomNav} pathname={pathname} />}
    </div>
  );
}
