import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseDb";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import {
  Users, Plus, Search, ArrowRight, ArrowLeft, X, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition } from "../../components/motion";
import TherapistHeroHeader from "../../components/therapist/TherapistHeroHeader";
import { Toast } from "../../components/ui/Toast";
import { Badge } from "../../components/ui/Badge";
interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isArchived?: boolean;
  pendingSetup?: boolean;
  onboardingCompleted?: boolean;
  nextAppointment?: string;
  calendarConnectionSummary?: {
    google?: {
      status?: string;
    };
  };
}

const formatNextAppointment = (value: string | undefined, locale: string) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TherapistClients() {
  const { profile } = useAuth();
  const { locale } = useLanguage();
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

  useEffect(() => {
    void import("./ClientDetail");
  }, []);

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
        pendingSetup: true, inviteStatus: "pending", invitedAt: new Date().toISOString(),
      });
      await addDoc(collection(db, "mail_requests"), {
        email, type: "WELCOME_CLIENT", firstName: newFirstName.trim(), lastName: newLastName.trim(),
        userId: tempId, therapistId: profile?.id,
        status: "pending", createdAt: serverTimestamp(),
      });
      setClients((prev) => [...prev, {
        id: tempId,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        email,
        pendingSetup: true,
        onboardingCompleted: false,
      }]);
      setShowAddModal(false);
      resetForm();
      setToast({
        visible: true,
        message: "Einladung versendet",
        subMessage: `Der Zugang für ${email} wird jetzt per Einladungs-Mail vorbereitet.`,
        type: "success",
      });
    } catch (e: any) {
      const msg = e?.code === "auth/email-already-in-use" ? "Diese E-Mail wird bereits verwendet." : "Klient konnte nicht angelegt werden.";
      setToast({ visible: true, message: "Fehler", subMessage: msg, type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const resetForm = () => {
    setNewFirstName(""); setNewLastName(""); setNewEmail("");
    setFormErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TherapistHeroHeader maxWidthClassName="max-w-6xl">
          <div className="h-6 w-32 bg-primary-foreground/20 rounded-xl mb-3" />
          <div className="h-9 w-56 bg-primary-foreground/15 rounded-2xl" />
          <div className="h-4 w-72 bg-primary-foreground/10 rounded-xl mt-3" />
        </TherapistHeroHeader>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-[1.75rem] border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <PageTransition className="min-h-screen bg-background">
      <TherapistHeroHeader maxWidthClassName="max-w-6xl">
        <motion.button
          onClick={() => navigate("/therapist")}
          className="inline-flex items-center gap-2 bg-primary-foreground/15 hover:bg-primary-foreground/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold mb-6"
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={16} /> Dashboard
        </motion.button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black tracking-tight">Klienten</h1>
              <Badge
                variant="muted"
                className="bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground"
              >
                {clients.length}
              </Badge>
            </div>
            <p className="text-primary-foreground/70 text-sm font-semibold">
              {clients.length} aktive Klienten
            </p>
          </div>

          <motion.button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-primary-foreground/20 hover:bg-primary-foreground/30 px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 text-sm transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={16} /> Hinzufügen
          </motion.button>
        </div>
      </TherapistHeroHeader>
      <div className="mx-auto max-w-6xl space-y-5 px-6 py-6">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Klienten suchen..." className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Client List */}
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-10 text-center">
            <Users size={36} className="text-muted-foreground mx-auto mb-3" />
            <p className="font-bold text-foreground mb-1">{search ? "Kein Klient gefunden" : "Noch keine Klienten"}</p>
            <p className="text-sm text-muted-foreground">{search ? "Versuche einen anderen Suchbegriff." : "Füge deinen ersten Klienten hinzu."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((client) => {
                      const nextAppointmentLabel = formatNextAppointment(client.nextAppointment, locale);

              return (
                <motion.button
                  type="button"
                  key={client.id}
                  onClick={() => navigate(`/therapist/client/${client.id}`)}
                  className="group flex min-h-[17rem] flex-col rounded-[1.75rem] border border-border bg-card p-5 text-left shadow-sm shadow-primary/5 transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 sm:p-6"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">
                        {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black tracking-tight text-foreground">
                          {client.firstName} {client.lastName}
                        </h3>
                        <p className="mt-1 truncate text-sm font-medium text-muted-foreground">{client.email}</p>
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {client.pendingSetup ? (
                      <Badge variant="muted" className="border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700">
                        Einladung offen
                      </Badge>
                    ) : client.onboardingCompleted ? (
                      <Badge variant="muted" className="border-emerald-300/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        Onboarding fertig
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="border-border bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">
                        Anmeldung begonnen
                      </Badge>
                    )}
                    {client.calendarConnectionSummary?.google?.status === "connected" ? (
                      <Badge variant="muted" className="border-sky-300/40 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-700">
                        Kalender verbunden
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-[1.35rem] border border-primary/12 bg-primary/5 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      {nextAppointmentLabel ? "Nächster Termin" : "Terminstatus"}
                    </p>
                    {nextAppointmentLabel ? (
                      <div className="mt-3 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <CalendarDays size={18} />
                        </div>
                        <p className="text-sm font-bold leading-6 text-foreground">{nextAppointmentLabel}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                        Noch kein Termin eingetragen.
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-5 text-sm font-bold text-foreground/75 transition-colors group-hover:text-foreground">
                    Profil öffnen
                  </div>
                </motion.button>
              );
            })}
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

                <div className="hidden items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Einladung</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="hidden">
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

                <div className="hidden">
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
                  {adding ? <motion.span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Plus size={14} /> Einladung senden</>}
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
