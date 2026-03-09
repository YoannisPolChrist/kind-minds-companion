import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-3xl font-black text-foreground mb-2">Seite nicht gefunden</h1>
        <p className="text-text-subtle font-medium mb-8">Diese Seite existiert nicht.</p>
        <Link
          to="/"
          className="inline-block px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
