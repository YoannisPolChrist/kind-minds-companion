import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  Users, Plus, Search, ArrowRight, ArrowLeft, X, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs,
  TiltCard, PressableScale, CountUp,
} from "../../components/motion";
import { Toast } from "../../components/ui/Toast";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { Badge } from "../../components/ui/Badge";
import { getRandomHeaderImage } from "../../constants/headerImages";

const headerImg = getRandomHeaderImage();

interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isArchived?: boolean;
  emailVerified?: boolean;
}

export default function TherapistClients() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Client Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Feedback
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const clientSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "client"), where("therapistId", "==", profile.id))
        );
        const rawClients = clientSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Client))
          .filter((c) => !c.isArchived);
        setClients(rawClients);
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
    return (
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newFirstName.trim()) errors.firstName = "Vorname ist erforderlich";
    if (!newLastName.trim()) errors.lastName = "Nachname ist erforderlich";

    if (!newEmail.trim()) {
      errors.email = "E-Mail ist erforderlich";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      errors.email = "Ungültige E-Mail-Adresse";
    }

    if (!newPassword) {
      errors.password = "Passwort ist erforderlich";
    } else if (newPassword.length < 8) {
      errors.password = "Mindestens 8 Zeichen";
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwörter stimmen nicht überein";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddClient = async () => {
    if (!validateForm()) return;
    setAdding(true);
    try {
      // Save the current therapist user reference before creating a new user
      const currentUser = auth.currentUser;
      
      // Create Firebase Auth account for the client
      // NOTE: createUserWithEmailAndPassword will sign in as the new user,
      // so we need to handle re-authentication of the therapist.
      // Instead, we'll use a Cloud Function approach by writing to mail_requests.
      // For now, we create the Firestore doc and trigger a welcome email via Cloud Function.
      
      const email = newEmail.trim();
      const tempId = crypto.randomUUID();
      
      // Write client doc to Firestore
      await setDoc(doc(db, "users", tempId), {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        email,
        role: "client",
        therapistId: profile?.id,
        createdAt: new Date().toISOString(),
        pendingSetup: true, // Flag: client needs to verify & set their own password
        initialPassword: newPassword, // Will be used by Cloud Function to create auth account
      });

      // Trigger welcome email via mail_requests (Cloud Function will handle auth account creation)
      await addDoc(collection(db, "mail_requests"), {
        email,
        type: "WELCOME_CLIENT",
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        userId: tempId,
        therapistId: profile?.id,
        initialPassword: newPassword,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setClients((prev) => [
        ...prev,
        { id: tempId, firstName: newFirstName.trim(), lastName: newLastName.trim(), email },
      ]);
      setShowAddModal(false);
      resetForm();
      setToast({
        visible: true,
        message: "Klient angelegt! ✉️",
        subMessage: `${newFirstName.trim()} ${newLastName.trim()} erhält eine Willkommens-E-Mail an ${email}.`,
        type: "success",
      });
    } catch (e: any) {
      console.error("Error adding client:", e);
      const msg = e?.code === "auth/email-already-in-use"
        ? "Diese E-Mail-Adresse wird bereits verwendet."
        : "Klient konnte nicht angelegt werden.";
      setToast({ visible: true, message: "Fehler", subMessage: msg, type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const resetForm = () => {
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setFormErrors({});
    setShowPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
          <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary/40" />
          <HeaderOrbs />
          <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative z-10">
            <div className="h-8 w-48 bg-white/20 rounded-2xl mb-2" />
            <div className="h-4 w-32 bg-white/10 rounded-xl" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary/40" />
        <HeaderOrbs />
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative z-10">
          <motion.button
            onClick={() => navigate("/")}
            className="text-white/80 hover:text-white font-bold text-sm bg-white/15 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1 hover:bg-white/25 transition-all"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} /> Dashboard
          </motion.button>
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Meine Klienten
              </h1>
              <p className="text-white/70 text-sm font-medium mt-1">
                <CountUp to={clients.length} className="font-black" duration={1} /> aktive Klienten
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <StaggerContainer className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Search + Add Client */}
        <StaggerItem>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Klienten suchen..."
                className="w-full pl-11 pr-4 py-3.5 bg-card rounded-2xl border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <motion.button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Klient hinzufügen</span>
            </motion.button>
          </div>
        </StaggerItem>

        {/* Client List */}
        <StaggerItem>
          <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Alle Klienten
            <Badge variant="muted">{clients.length}</Badge>
          </h2>

          {filtered.length === 0 ? (
            <div className="bg-card rounded-3xl border border-border p-10 text-center">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Users size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <p className="font-bold text-foreground text-lg mb-1">
                {search ? "Kein Klient gefunden" : "Noch keine Klienten"}
              </p>
              <p className="text-sm text-muted-foreground">
                {search ? "Versuche einen anderen Suchbegriff." : "Füge deinen ersten Klienten hinzu."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((client) => (
                <TiltCard
                  key={client.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/therapist/client/${client.id}`)}
                  maxTilt={4}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-black text-primary shrink-0">
                      {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground shrink-0" />
                  </div>
                </TiltCard>
              ))}
            </div>
          )}
        </StaggerItem>

        <div className="h-8" />
      </StaggerContainer>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 150 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-lg font-black text-foreground">Klient hinzufügen</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Der Klient erhält eine Willkommens-E-Mail</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Vorname *</label>
                    <input
                      value={newFirstName}
                      onChange={(e) => { setNewFirstName(e.target.value); setFormErrors(prev => ({ ...prev, firstName: "" })); }}
                      placeholder="Max"
                      className={`w-full bg-secondary rounded-2xl border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.firstName ? "border-destructive" : "border-border"}`}
                    />
                    {formErrors.firstName && <p className="text-destructive text-[11px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Nachname *</label>
                    <input
                      value={newLastName}
                      onChange={(e) => { setNewLastName(e.target.value); setFormErrors(prev => ({ ...prev, lastName: "" })); }}
                      placeholder="Mustermann"
                      className={`w-full bg-secondary rounded-2xl border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.lastName ? "border-destructive" : "border-border"}`}
                    />
                    {formErrors.lastName && <p className="text-destructive text-[11px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.lastName}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1">
                    <Mail size={12} /> E-Mail-Adresse *
                  </label>
                  <input
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setFormErrors(prev => ({ ...prev, email: "" })); }}
                    placeholder="max@beispiel.de"
                    type="email"
                    className={`w-full bg-secondary rounded-2xl border p-3.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.email ? "border-destructive" : "border-border"}`}
                  />
                  {formErrors.email && <p className="text-destructive text-[11px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.email}</p>}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Zugangsdaten</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Password */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1">
                    <Lock size={12} /> Passwort *
                  </label>
                  <div className="relative">
                    <input
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setFormErrors(prev => ({ ...prev, password: "", confirmPassword: "" })); }}
                      placeholder="Mindestens 8 Zeichen"
                      type={showPassword ? "text" : "password"}
                      className={`w-full bg-secondary rounded-2xl border p-3.5 pr-12 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.password ? "border-destructive" : "border-border"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-background transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} className="text-muted-foreground" /> : <Eye size={16} className="text-muted-foreground" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-destructive text-[11px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.password}</p>}
                  {newPassword.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map(level => (
                        <div key={level} className={`flex-1 h-1.5 rounded-full transition-colors ${
                          newPassword.length >= level * 3 ? (
                            newPassword.length >= 12 ? "bg-green-500" :
                            newPassword.length >= 8 ? "bg-yellow-500" : "bg-destructive"
                          ) : "bg-border"
                        }`} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1">
                    <Lock size={12} /> Passwort bestätigen *
                  </label>
                  <div className="relative">
                    <input
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors(prev => ({ ...prev, confirmPassword: "" })); }}
                      placeholder="Passwort wiederholen"
                      type={showPassword ? "text" : "password"}
                      className={`w-full bg-secondary rounded-2xl border p-3.5 pr-12 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.confirmPassword ? "border-destructive" : "border-border"}`}
                    />
                    {confirmPassword && newPassword === confirmPassword && (
                      <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                  </div>
                  {formErrors.confirmPassword && <p className="text-destructive text-[11px] font-semibold mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.confirmPassword}</p>}
                </div>

                {/* Info hint */}
                <div className="bg-primary/5 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-lg shrink-0">📧</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Der Klient erhält eine <strong className="text-foreground">Willkommens-E-Mail</strong> mit einem Bestätigungslink. 
                    Erst nach Bestätigung ist der Account aktiviert.
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <motion.button
                  onClick={handleAddClient}
                  disabled={adding}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {adding ? (
                    <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                  ) : (
                    <><Plus size={18} /> Klient anlegen & E-Mail senden</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}
