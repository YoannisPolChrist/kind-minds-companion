import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  Users, Plus, Search, ArrowRight, ArrowLeft, X, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, PressableScale } from "../../components/motion";
import TherapistHeroHeader from "../../components/therapist/TherapistHeroHeader";
import { Toast } from "../../components/ui/Toast";
import { Badge } from "../../components/ui/Badge";
interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isArchived?: boolean;
}

export default function TherapistClients() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), where("role", "==", "client"), where("therapistId", "==", profile.id)));
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)).filter((c) => !c.isArchived));
      } catch (e) {
        console.error("Error loading clients:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newFirstName.trim()) errors.firstName = "Vorname ist erforderlich";
    if (!newLastName.trim()) errors.lastName = "Nachname ist erforderlich";
    if (!newEmail.trim()) errors.email = "E-Mail ist erforderlich";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) errors.email = "Ungültige E-Mail-Adresse";
    if (!newPassword) errors.password = "Passwort ist erforderlich";
    else if (newPassword.length < 8) errors.password = "Mindestens 8 Zeichen";
    if (newPassword !== confirmPassword) errors.confirmPassword = "Passwörter stimmen nicht überein";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddClient = async () => {
    if (!validateForm()) return;
    setAdding(true);
    try {
      const email = newEmail.trim();
      const tempId = crypto.randomUUID();
      await setDoc(doc(db, "users", tempId), {
        firstName: newFirstName.trim(), lastName: newLastName.trim(), email,
        role: "client", therapistId: profile?.id, createdAt: new Date().toISOString(),
        pendingSetup: true, initialPassword: newPassword,
      });
      await addDoc(collection(db, "mail_requests"), {
        email, type: "WELCOME_CLIENT", firstName: newFirstName.trim(), lastName: newLastName.trim(),
        userId: tempId, therapistId: profile?.id, initialPassword: newPassword,
        status: "pending", createdAt: serverTimestamp(),
      });
      setClients((prev) => [...prev, { id: tempId, firstName: newFirstName.trim(), lastName: newLastName.trim(), email }]);
      setShowAddModal(false);
      resetForm();
      setToast({ visible: true, message: "Klient angelegt!", subMessage: `Willkommens-E-Mail an ${email} versendet.`, type: "success" });
    } catch (e: any) {
      const msg = e?.code === "auth/email-already-in-use" ? "Diese E-Mail wird bereits verwendet." : "Klient konnte nicht angelegt werden.";
      setToast({ visible: true, message: "Fehler", subMessage: msg, type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const resetForm = () => {
    setNewFirstName(""); setNewLastName(""); setNewEmail(""); setNewPassword(""); setConfirmPassword("");
    setFormErrors({}); setShowPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TherapistHeroHeader maxWidthClassName="max-w-5xl">
          <div className="h-6 w-32 bg-primary-foreground/20 rounded-xl mb-3" />
          <div className="h-9 w-56 bg-primary-foreground/15 rounded-2xl" />
          <div className="h-4 w-72 bg-primary-foreground/10 rounded-xl mt-3" />
        </TherapistHeroHeader>

        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <motion.button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground text-sm font-bold mb-5 inline-flex items-center gap-1 transition-colors" whileHover={{ x: -3 }}>
            <ArrowLeft size={16} /> Dashboard
          </motion.button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-foreground tracking-tight">Klienten</h1>
                <Badge variant="muted">{clients.length}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{clients.length} aktive Klienten</p>
            </div>
            <motion.button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-foreground text-background px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Plus size={16} /> Hinzufügen
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Klienten suchen..." className="w-full pl-11 pr-4 py-3 bg-card rounded-xl border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
        </div>

        {/* Client List */}
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-10 text-center">
            <Users size={36} className="text-muted-foreground mx-auto mb-3" />
            <p className="font-bold text-foreground mb-1">{search ? "Kein Klient gefunden" : "Noch keine Klienten"}</p>
            <p className="text-sm text-muted-foreground">{search ? "Versuche einen anderen Suchbegriff." : "Füge deinen ersten Klienten hinzu."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((client) => (
              <motion.button
                key={client.id}
                onClick={() => navigate(`/therapist/client/${client.id}`)}
                className="bg-card rounded-xl border border-border p-4 text-left hover:border-foreground/15 transition-colors group"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                    {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate">{client.firstName} {client.lastName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)}>
            <motion.div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 22 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h2 className="text-base font-black text-foreground">Klient hinzufügen</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Erhält eine Willkommens-E-Mail</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-secondary"><X size={18} className="text-muted-foreground" /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Vorname *</label>
                    <input value={newFirstName} onChange={(e) => { setNewFirstName(e.target.value); setFormErrors(p => ({ ...p, firstName: "" })); }} placeholder="Max" className={`w-full bg-secondary rounded-lg border p-3 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.firstName ? "border-destructive" : "border-border"}`} />
                    {formErrors.firstName && <p className="text-destructive text-[10px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={10} />{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nachname *</label>
                    <input value={newLastName} onChange={(e) => { setNewLastName(e.target.value); setFormErrors(p => ({ ...p, lastName: "" })); }} placeholder="Mustermann" className={`w-full bg-secondary rounded-lg border p-3 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.lastName ? "border-destructive" : "border-border"}`} />
                    {formErrors.lastName && <p className="text-destructive text-[10px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={10} />{formErrors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center gap-1"><Mail size={10} /> E-Mail *</label>
                  <input value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setFormErrors(p => ({ ...p, email: "" })); }} placeholder="max@beispiel.de" type="email" className={`w-full bg-secondary rounded-lg border p-3 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.email ? "border-destructive" : "border-border"}`} />
                  {formErrors.email && <p className="text-destructive text-[10px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={10} />{formErrors.email}</p>}
                </div>

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Zugangsdaten</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center gap-1"><Lock size={10} /> Passwort *</label>
                  <div className="relative">
                    <input value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setFormErrors(p => ({ ...p, password: "", confirmPassword: "" })); }} placeholder="Mindestens 8 Zeichen" type={showPassword ? "text" : "password"} className={`w-full bg-secondary rounded-lg border p-3 pr-10 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.password ? "border-destructive" : "border-border"}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-muted-foreground" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-destructive text-[10px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={10} />{formErrors.password}</p>}
                  {newPassword.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map(level => (
                        <div key={level} className={`flex-1 h-1 rounded-full transition-colors ${newPassword.length >= level * 3 ? (newPassword.length >= 12 ? "bg-success" : newPassword.length >= 8 ? "bg-accent" : "bg-destructive") : "bg-border"}`} />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center gap-1"><Lock size={10} /> Passwort bestätigen *</label>
                  <div className="relative">
                    <input value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors(p => ({ ...p, confirmPassword: "" })); }} placeholder="Passwort wiederholen" type={showPassword ? "text" : "password"} className={`w-full bg-secondary rounded-lg border p-3 pr-10 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.confirmPassword ? "border-destructive" : "border-border"}`} />
                    {confirmPassword && newPassword === confirmPassword && <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />}
                  </div>
                  {formErrors.confirmPassword && <p className="text-destructive text-[10px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={10} />{formErrors.confirmPassword}</p>}
                </div>

                <div className="bg-primary/5 rounded-lg p-3 flex items-start gap-2.5">
                  <Mail size={14} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Der Klient erhält eine <strong className="text-foreground">Willkommens-E-Mail</strong> mit Bestätigungslink.
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <motion.button onClick={handleAddClient} disabled={adding} className="w-full py-3 rounded-lg bg-foreground text-background font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2" whileTap={{ scale: 0.97 }}>
                  {adding ? <motion.span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Plus size={14} /> Klient anlegen</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}
