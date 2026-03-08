import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, FileText, ExternalLink, Download } from "lucide-react";

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: "pdf" | "link" | "document" | "image";
  url: string;
  fileSize?: number;
  createdAt?: string;
}

export default function Resources() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id || !profile?.therapistId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users", profile.therapistId!, "clients", profile.id, "resources")
          )
        );
        let data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource));

        // Also try shared resources
        if (data.length === 0) {
          const sharedSnap = await getDocs(
            query(collection(db, "resources"), where("clientId", "==", profile.id))
          );
          data = sharedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource));
        }

        data.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setResources(data);
      } catch (e) {
        console.error("Error fetching resources:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id, profile?.therapistId]);

  const openResource = (url: string) => {
    let validUrl = url;
    if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
      validUrl = "https://" + validUrl;
    }
    window.open(validUrl, "_blank");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "pdf": return "📄";
      case "link": return "🔗";
      case "image": return "🖼️";
      default: return "📎";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold mb-5"
          >
            <ArrowLeft size={16} /> Zurück
          </button>
          <h1 className="text-3xl font-black tracking-tight">Bibliothek</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">
            Dokumente & Links von deinem Therapeuten
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        {resources.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <FileText size={48} className="text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-black text-foreground mb-2">Keine Ressourcen</h2>
            <p className="text-muted-foreground">
              Dein Therapeut hat noch keine Dokumente hinterlegt.
            </p>
          </div>
        ) : (
          resources.map((res, idx) => (
            <button
              key={res.id}
              onClick={() => openResource(res.url)}
              className="w-full text-left bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group animate-slide-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                  {getIcon(res.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{res.title}</h3>
                  {res.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{res.description}</p>
                  )}
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                    {res.type.toUpperCase()}
                    {res.fileSize && ` · ${(res.fileSize / 1024).toFixed(0)} KB`}
                  </p>
                </div>
                <ExternalLink size={18} className="text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
