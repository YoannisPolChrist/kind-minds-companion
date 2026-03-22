import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

window.addEventListener("error", (event) => {
  console.error("Global runtime error:", event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

const root = ReactDOM.createRoot(document.getElementById("root")!);

function BootstrapFallback() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Kind Minds</p>
            <p className="text-sm font-black tracking-tight text-foreground">Workspace wird geladen</p>
          </div>
        </div>
      </div>
    </div>
  );
}

root.render(
  <React.StrictMode>
    <BootstrapFallback />
  </React.StrictMode>
);

async function bootstrap() {
  const [{ BrowserRouter }, { default: App }, { SharedBootProviders }] = await Promise.all([
    import("react-router-dom"),
    import("./App"),
    import("./runtime/BootProviders"),
  ]);

  root.render(
    <React.StrictMode>
      <SharedBootProviders>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SharedBootProviders>
    </React.StrictMode>
  );
}

void bootstrap();
