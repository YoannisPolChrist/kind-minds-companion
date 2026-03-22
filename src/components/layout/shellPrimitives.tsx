import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut } from "lucide-react";
import type { UserProfile } from "../../hooks/useAuth";
import {
  clientQuickActions,
  getInitials,
  getRoleLabel,
  type ShellNavItem,
  type ShellQuickAction,
} from "./shellConfig";

export function ShellBrand({ to, collapsed = false }: { to: string; collapsed?: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-[1.75rem] border border-border bg-background shadow-sm transition-colors hover:border-foreground/10 ${
        collapsed ? "flex items-center justify-center p-3" : "px-4 py-4"
      }`}
      aria-label={collapsed ? "Kind Minds Workspace" : undefined}
    >
      {collapsed ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <LayoutDashboard size={20} />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Kind Minds</p>
            <h2 className="text-lg font-black tracking-tight text-foreground">Workspace</h2>
          </div>
        </div>
      )}
    </Link>
  );
}

export function ShellLink({
  item,
  active,
  compact = false,
  collapsed = false,
}: {
  item: ShellNavItem;
  active: boolean;
  compact?: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;

  const variant = compact ? "compact" : collapsed ? "collapsed" : "default";

  const appearance = (() => {
    if (variant === "compact") {
      return active
        ? "bg-foreground text-background shadow-lg"
        : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground";
    }
    if (variant === "collapsed") {
      return active
        ? "bg-foreground/90 text-background shadow-lg"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground";
    }
    return active
      ? "bg-foreground text-background shadow-lg shadow-foreground/10"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground";
  })();

  const spacing =
    variant === "compact"
      ? "px-4 py-3 text-sm font-bold whitespace-nowrap"
      : variant === "collapsed"
        ? "justify-center px-0 py-3"
        : "px-4 py-3.5";

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`group flex items-center gap-3 rounded-2xl transition-all ${appearance} ${spacing}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
          active
            ? "border-white/20 bg-white/10"
            : "border-border bg-card group-hover:border-foreground/10 group-hover:bg-background"
        }`}
      >
        <Icon size={18} />
      </div>
      {variant === "default" && (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight">{item.label}</p>
          <p className={`text-xs ${active ? "text-background/70" : "text-muted-foreground"}`}>
            {item.description}
          </p>
        </div>
      )}
      {variant === "compact" && <span>{item.label}</span>}
      {variant === "collapsed" && <span className="sr-only">{item.label}</span>}
    </Link>
  );
}

export function ShellProfileCard({
  profile,
  compact = false,
  collapsed = false,
  onSignOut,
}: {
  profile: UserProfile | null;
  compact?: boolean;
  collapsed?: boolean;
  onSignOut?: () => void;
}) {
  if (collapsed) {
    return (
      <div className="flex w-full min-w-0 flex-col items-center gap-3 rounded-[1.75rem] border border-border bg-background p-3 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">
          {getInitials(profile)}
        </div>
        <span
          title={profile?.firstName || "Kind Minds"}
          className="block w-full truncate text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
        >
          {profile?.firstName || "Kind Minds"}
        </span>
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-secondary"
            aria-label="Abmelden"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-[1.75rem] border border-border bg-background shadow-sm ${
        compact ? "px-3 py-2" : "p-4"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">
          {getInitials(profile)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-foreground">
            {profile?.firstName || "Kind Minds"}
            {profile?.lastName ? ` ${profile.lastName}` : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {profile?.email || getRoleLabel(profile)}
          </p>
        </div>
      </div>

      {!compact && onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
        >
          <LogOut size={16} />
          Abmelden
        </button>
      )}
    </div>
  );
}

export function ShellQuickActionStrip({
  pathname,
}: {
  pathname: string;
}) {
  return (
    <div className="border-t border-border/80 bg-background/95 px-4 py-3 md:hidden">
      <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto">
        {clientQuickActions.map((item) => {
          const Icon = item.icon;
          const active = item.active(pathname);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ShellBottomNav({
  items,
  pathname,
}: {
  items: ShellQuickAction[];
  pathname: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
      <nav className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-[1.75rem] border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.active(pathname);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition-all ${
                active
                  ? "bg-foreground text-background shadow-lg"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
