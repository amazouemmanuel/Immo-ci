import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL = "https://wjrjllrcwvmyymxivspk.supabase.co";
const SUPABASE_KEY = "sb_publishable_ymzYPY2qTdWnFQnvHfVMvg_lr2FhHz0";

const sb = async (endpoint, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Supabase error:", err);
    throw new Error(err.message || "Erreur Supabase");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

// CRUD helpers
const db = {
  get: (table, query = "") => sb(`${table}?${query}&order=created_at.desc`),
  getOne: (table, query) => sb(`${table}?${query}`).then(r => r[0] || null),
  insert: (table, data) => sb(table, { method: "POST", body: JSON.stringify(data) }),
  update: (table, query, data) => sb(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (table, query) => sb(`${table}?${query}`, { method: "DELETE", prefer: "return=minimal" }),
  rpc: (fn, data) => sb(`rpc/${fn}`, { method: "POST", body: JSON.stringify(data) }),
};

// ═══════════════════════════════════════════════════════════
// COULEURS
// ═══════════════════════════════════════════════════════════
const C = {
  navy: "#0c1f35", navyMid: "#163354", gold: "#e8a020", goldLight: "#fef3dc",
  teal: "#0d9488", tealLight: "#ccfbf1", red: "#dc2626", redLight: "#fee2e2",
  green: "#16a34a", greenLight: "#dcfce7", purple: "#7c3aed",
  gray50: "#f8fafc", gray100: "#f1f5f9", gray200: "#e2e8f0", gray400: "#94a3b8",
  gray600: "#475569", gray800: "#1e293b", white: "#ffffff",
};

const fmt = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)} M FCFA` : `${Number(n).toLocaleString("fr-FR")} FCFA`;

// ═══════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════
const Avatar = ({ user, size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: user?.role === "admin" ? C.red : user?.role === "promoteur" ? C.navy : C.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, flexShrink: 0, color: "#fff", fontWeight: 700, border: `2px solid ${C.white}`, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
    {user?.avatar || user?.name?.[0] || "?"}
  </div>
);

const Stars = ({ note, small }) => (
  <span>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= note ? C.gold : C.gray200, fontSize: small ? 12 : 16 }}>★</span>)}</span>
);

const Bdg = ({ s }) => {
  const m = { "approuvé": [C.greenLight,C.green,"Approuvé"], "en attente": [C.goldLight,C.gold,"En attente"], "refusé": [C.redLight,C.red,"Refusé"], "actif": [C.greenLight,C.green,"Actif"], "suspendu": [C.redLight,C.red,"Suspendu"], "client": [C.tealLight,C.teal,"Client"], "promoteur": [C.goldLight,"#b45309","Promoteur"], "admin": [C.redLight,C.red,"Admin"], "vente": [C.goldLight,"#b45309","Vente"], "location": [C.tealLight,C.teal,"Location"], "disponible": [C.greenLight,C.green,"Disponible"], "vendu": [C.redLight,C.red,"Vendu/Loué"], "réservé": ["#fff7ed","#ea580c","Réservé"] };
  const [bg,color,label] = m[s] || [C.gray100,C.gray600,s];
  return <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{label}</span>;
};

const Btn = ({ children, onClick, v = "primary", sm, disabled, style: ex = {} }) => {
  const vs = { primary:[C.gold,C.navy], danger:[C.red,C.white], success:[C.teal,C.white], ghost:["transparent",C.gray600], navy:[C.navy,C.white], secondary:[C.gray200,C.gray800], wa:["#25D366",C.white] };
  const [bg,color] = vs[v] || vs.primary;
  return <button onClick={onClick} disabled={disabled} style={{ background: bg, color, border: "none", borderRadius: 8, padding: sm ? "6px 12px" : "10px 20px", fontWeight: 700, fontSize: sm ? 12 : 14, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, ...ex }}>{children}</button>;
};

const Modal = ({ onClose, children, wide }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 20, padding: 28, width: "100%", maxWidth: wide ? 760 : 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.3)" }}>
      {children}
    </div>
  </div>
);

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
    <div style={{ width: 36, height: 36, border: `4px solid ${C.gray200}`, borderTop: `4px solid ${C.gold}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [step, setStep] = useState("main");
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "", role: "client", whatsapp: "", ville: "Abidjan" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpIn, setOtpIn] = useState(["","","","","",""]);
  const [cd, setCd] = useState(0);
  const [pendingUser, setPendingUser] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  const [adminErr, setAdminErr] = useState("");
  const [clicks, setClicks] = useState(0);
  const refs = Array.from({length:6}, () => useRef());

  useEffect(() => { if (cd <= 0) return; const t = setTimeout(() => setCd(c => c-1), 1000); return () => clearTimeout(t); }, [cd]);

  const genOtp = () => { const o = Math.floor(100000+Math.random()*900000).toString(); setOtp(o); setOtpIn(["","","","","",""]); setCd(60); return o; };

  const handleLogoClick = () => { const n = clicks+1; setClicks(n); if(n>=5){setAdminMode(true);setClicks(0);} };

  const doLogin = async () => {
    if(!form.email||!form.password) return setErr("Email et mot de passe requis.");
    setLoading(true);
    try {
      const users = await db.get("users", `email=eq.${encodeURIComponent(form.email)}&password=eq.${encodeURIComponent(form.password)}`);
      if(!users.length) return setErr("Email ou mot de passe incorrect.");
      if(users[0].status==="suspendu") return setErr("Compte suspendu.");
      onLogin(users[0]);
    } catch { setErr("Erreur de connexion. Réessayez."); }
    finally { setLoading(false); }
  };

  const doRegister = async () => {
    if(!form.name||!form.email||!form.password) return setErr("Tous les champs sont requis.");
    if(!/\S+@\S+\.\S+/.test(form.email)) return setErr("Email invalide.");
    if(form.password.length<6) return setErr("Mot de passe min. 6 caractères.");
    setLoading(true);
    try {
      const existing = await db.get("users", `email=eq.${encodeURIComponent(form.email)}`);
      if(existing.length) return setErr("Email déjà utilisé.");
      setErr(""); genOtp();
      setPendingUser({ name:form.name, company:form.company||null, email:form.email, password:form.password, role:form.role, status:"actif", avatar:form.role==="promoteur"?"🏢":"👤", whatsapp:form.whatsapp||null, ville:form.ville, verified:false, favoris:[] });
      setStep("otp");
    } catch { setErr("Erreur. Réessayez."); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    const entered = otpIn.join("");
    if(entered.length<6) return setErr("Saisissez les 6 chiffres.");
    if(entered!==otp) return setErr("Code incorrect.");
    setLoading(true);
    try {
      const created = await db.insert("users", pendingUser);
      onLogin(created[0]);
    } catch { setErr("Erreur lors de la création du compte."); }
    finally { setLoading(false); }
  };

  const handleChange = (i, val) => {
    if(!/^\d?$/.test(val)) return;
    const next=[...otpIn]; next[i]=val; setOtpIn(next);
    if(val&&i<5) refs[i+1].current?.focus();
    if(!val&&i>0) refs[i-1].current?.focus();
  };

  const loginAdmin = async () => {
    setLoading(true);
    try {
      const users = await db.get("users", `email=eq.${encodeURIComponent(adminForm.email)}&password=eq.${encodeURIComponent(adminForm.password)}&role=eq.admin`);
      if(!users.length) return setAdminErr("Accès refusé.");
      onLogin(users[0]);
    } catch { setAdminErr("Erreur de connexion."); }
    finally { setLoading(false); }
  };

  const iS = { width:"100%", padding:"10px 14px", borderRadius:8, border:`1.5px solid ${C.gray200}`, fontSize:14, boxSizing:"border-box", outline:"none" };
  const f = k => ({ value: form[k], onChange: e => { setForm({...form,[k]:e.target.value}); setErr(""); } });

  if(adminMode) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#111118", borderRadius:20, padding:"36px 32px", width:"100%", maxWidth:400, boxShadow:"0 0 60px rgba(124,58,237,.3)", border:"1px solid #a78bfa22" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🛡️</div>
          <h2 style={{ margin:0, color:"#a78bfa", fontSize:20, fontWeight:900 }}>ACCÈS ADMINISTRATEUR</h2>
          <p style={{ color:"#4b4b6b", fontSize:12, margin:"6px 0 0" }}>Accès restreint — ImmoCI</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:"#a78bfa", display:"block", marginBottom:4 }}>Email</label>
            <input style={{ ...iS, background:"#1e1e2e", border:"1.5px solid #a78bfa44", color:C.white }} type="email" placeholder="Votre email" value={adminForm.email} onChange={e=>{setAdminForm({...adminForm,email:e.target.value});setAdminErr("");}} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:"#a78bfa", display:"block", marginBottom:4 }}>Mot de passe</label>
            <input style={{ ...iS, background:"#1e1e2e", border:"1.5px solid #a78bfa44", color:C.white }} type="password" placeholder="••••••••" value={adminForm.password} onChange={e=>{setAdminForm({...adminForm,password:e.target.value});setAdminErr("");}} />
          </div>
          {adminErr && <p style={{ color:"#ef4444", fontSize:12, textAlign:"center", margin:0 }}>{adminErr}</p>}
          <button onClick={loginAdmin} disabled={loading} style={{ background:"#7c3aed", color:C.white, border:"none", borderRadius:12, padding:"12px", fontWeight:900, fontSize:15, cursor:"pointer" }}>
            {loading ? "Connexion…" : "Accéder au panneau de contrôle"}
          </button>
          <button onClick={()=>{setAdminMode(false);setAdminErr("");}} style={{ background:"none", border:"none", color:"#4b4b6b", fontSize:12, cursor:"pointer" }}>← Retour</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 60%,#1d4d7a 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:24, padding:"36px 32px", width:"100%", maxWidth:440, boxShadow:"0 32px 80px rgba(0,0,0,.4)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48, cursor:"default", userSelect:"none" }} onClick={handleLogoClick}>🏙️</div>
          <h1 style={{ margin:"6px 0 2px", color:C.navy, fontSize:26, fontWeight:900 }}>ImmoCI</h1>
          <p style={{ color:C.gray400, fontSize:13, margin:0 }}>Immobilier de confiance en Côte d'Ivoire</p>
        </div>

        {step==="otp" ? (
          <>
            <div style={{ textAlign:"center", marginBottom:18 }}>
              <div style={{ fontSize:38, marginBottom:8 }}>📧</div>
              <h2 style={{ margin:"0 0 4px", color:C.navy, fontSize:17, fontWeight:900 }}>Vérifiez votre email</h2>
              <p style={{ margin:0, color:C.gray400, fontSize:13 }}>Code envoyé à <strong style={{ color:C.navy }}>{form.email}</strong></p>
            </div>
            <div style={{ background:C.greenLight, border:`1.5px dashed ${C.green}`, borderRadius:10, padding:"10px 14px", textAlign:"center", marginBottom:14 }}>
              <p style={{ margin:"0 0 4px", fontSize:11, color:C.green, fontWeight:700 }}>📬 DÉMO — Votre code :</p>
              <p style={{ margin:0, fontSize:28, fontWeight:900, letterSpacing:8, color:C.navy }}>{otp}</p>
            </div>
            <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:14 }}>
              {otpIn.map((v,i) => (
                <input key={i} ref={refs[i]} value={v} onChange={e=>handleChange(i,e.target.value)} onKeyDown={e=>e.key==="Backspace"&&!v&&i>0&&refs[i-1].current?.focus()} maxLength={1} inputMode="numeric"
                  style={{ width:42, height:50, textAlign:"center", fontSize:22, fontWeight:900, borderRadius:10, border:`2px solid ${v?C.gold:C.gray200}`, background:v?C.goldLight:C.white, outline:"none", color:C.navy }} />
              ))}
            </div>
            {err && <p style={{ color:C.red, fontSize:12, textAlign:"center", margin:"0 0 10px" }}>{err}</p>}
            <button onClick={verifyOtp} disabled={loading} style={{ width:"100%", padding:"12px", background:C.gold, color:C.navy, border:"none", borderRadius:12, fontWeight:900, fontSize:15, cursor:"pointer", marginBottom:10 }}>
              {loading ? "Création…" : "✅ Confirmer et créer mon compte"}
            </button>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button onClick={()=>{setStep("main");setErr("");}} style={{ background:"none", border:"none", color:C.gray400, fontSize:12, cursor:"pointer" }}>← Modifier</button>
              <button onClick={()=>cd<=0&&genOtp()} style={{ background:"none", border:"none", color:cd>0?C.gray400:C.teal, fontSize:12, cursor:cd>0?"default":"pointer", fontWeight:700 }}>{cd>0?`Renvoyer (${cd}s)`:"Renvoyer"}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display:"flex", background:C.gray100, borderRadius:12, padding:4, marginBottom:18 }}>
              {["login","register"].map(t => (
                <button key={t} onClick={()=>{setTab(t);setErr("");}} style={{ flex:1, padding:"9px 0", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, background:tab===t?C.white:"transparent", color:tab===t?C.navy:C.gray400 }}>
                  {t==="login"?"Se connecter":"S'inscrire"}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {tab==="register" && <>
                <div><label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:4 }}>Nom complet</label><input style={iS} placeholder="Ex: Koné Ibrahima" {...f("name")} /></div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:4 }}>Je suis</label>
                  <select style={iS} {...f("role")}><option value="client">👤 Client</option><option value="promoteur">🏢 Entreprise / Promoteur</option></select>
                </div>
                {form.role==="promoteur" && <>
                  <div><label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:4 }}>Nom entreprise</label><input style={iS} placeholder="Koné & Associés" {...f("company")} /></div>
                  <div><label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:4 }}>WhatsApp</label><input style={iS} placeholder="+2250707070707" {...f("whatsapp")} /></div>
                </>}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:4 }}>Ville</label>
                  <select style={iS} {...f("ville")}>{["Abidjan","Bouaké","Yamoussoukro","Daloa","San-Pédro","Korhogo"].map(v=><option key={v}>{v}</option>)}</select>
                </div>
              </>}
              <div><label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:4 }}>Email</label><input style={iS} type="email" placeholder="votre@email.com" {...f("email")} /></div>
              <div><label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:4 }}>Mot de passe</label><input style={iS} type="password" placeholder="••••••••" {...f("password")} /></div>
              {err && <p style={{ color:C.red, fontSize:12, margin:0 }}>{err}</p>}
              <button onClick={tab==="login"?doLogin:doRegister} disabled={loading} style={{ background:C.gold, color:C.navy, border:"none", borderRadius:12, padding:"12px", fontWeight:900, fontSize:15, cursor:"pointer" }}>
                {loading ? "Chargement…" : tab==="login" ? "Se connecter" : "Recevoir le code →"}
              </button>
            </div>
            <p style={{ textAlign:"center", fontSize:11, color:C.gray400, marginTop:14 }}>🏢 kone@email.com / 1234 &nbsp;·&nbsp; 👤 toure@email.com / 1234</p>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════════════════════
function Nav({ user, tab, setTab, notifs, setNotifs, onLogout }) {
  const unread = notifs.filter(n => n.user_id===user.id && !n.lu).length;
  const [showN, setShowN] = useState(false);
  const tabsByRole = {
    admin: [{k:"feed",i:"📰",l:"Feed"},{k:"annonces",i:"🏠",l:"Annonces"},{k:"carte",i:"🗺️",l:"Carte"},{k:"messages",i:"💬",l:"Messages"},{k:"gestion",i:"🛡️",l:"Admin"}],
    promoteur: [{k:"feed",i:"📰",l:"Feed"},{k:"annonces",i:"🏠",l:"Annonces"},{k:"carte",i:"🗺️",l:"Carte"},{k:"moncompte",i:"🏢",l:"Mon espace"},{k:"messages",i:"💬",l:"Messages"}],
    client: [{k:"feed",i:"📰",l:"Feed"},{k:"annonces",i:"🏠",l:"Annonces"},{k:"carte",i:"🗺️",l:"Carte"},{k:"favoris",i:"❤️",l:"Favoris"},{k:"messages",i:"💬",l:"Messages"}],
  };
  const tabs = tabsByRole[user.role]||tabsByRole.client;
  const markAllRead = async () => {
    await db.update("notifications", `user_id=eq.${user.id}&lu=eq.false`, { lu: true });
    setNotifs(prev => prev.map(n => n.user_id===user.id ? {...n,lu:true} : n));
  };
  return (
    <nav style={{ background:C.navy, position:"sticky", top:0, zIndex:200, boxShadow:"0 2px 16px rgba(0,0,0,.3)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 14px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <div style={{ fontWeight:900, fontSize:19, color:C.gold }}>🏙️ ImmoCI</div>
        <div style={{ display:"flex", gap:3 }}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:"7px 12px", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, background:tab===t.k?C.gold:"rgba(255,255,255,.08)", color:tab===t.k?C.navy:"rgba(255,255,255,.8)" }}>
              {t.i} {t.l}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ position:"relative" }}>
            <button onClick={()=>setShowN(!showN)} style={{ position:"relative", background:"rgba(255,255,255,.08)", border:"none", borderRadius:9, padding:"7px 11px", cursor:"pointer", fontSize:16 }}>
              🔔{unread>0&&<span style={{ position:"absolute", top:2, right:2, background:C.red, color:"#fff", borderRadius:"50%", width:15, height:15, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>{unread}</span>}
            </button>
            {showN && (
              <div style={{ position:"absolute", right:0, top:44, background:C.white, borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,.2)", width:290, zIndex:999, overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.gray100}`, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:800, fontSize:13, color:C.navy }}>🔔 Notifications</span>
                  <button onClick={markAllRead} style={{ background:"none", border:"none", color:C.teal, fontSize:11, fontWeight:700, cursor:"pointer" }}>Tout lire</button>
                </div>
                {notifs.filter(n=>n.user_id===user.id).length===0
                  ? <p style={{ padding:"16px", textAlign:"center", color:C.gray400, fontSize:12 }}>Aucune notification</p>
                  : notifs.filter(n=>n.user_id===user.id).slice(0,6).map(n=>(
                    <div key={n.id} onClick={()=>{setTab(n.link);setShowN(false);}} style={{ padding:"10px 14px", borderBottom:`1px solid ${C.gray100}`, background:n.lu?C.white:C.goldLight, cursor:"pointer" }}>
                      <p style={{ margin:"0 0 2px", fontSize:12, color:C.navy, fontWeight:n.lu?400:700 }}>{n.text}</p>
                      <p style={{ margin:0, fontSize:10, color:C.gray400 }}>{new Date(n.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,.1)", border:"none", borderRadius:9, padding:"7px 12px", cursor:"pointer", color:"rgba(255,255,255,.8)", fontSize:12, fontWeight:700 }}>Déco.</button>
        </div>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════
// FEED
// ═══════════════════════════════════════════════════════════
function FeedPage({ user, users }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ content:"", mediaUrl:"", mediaType:"image" });
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    db.get("posts").then(data => { setPosts(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const getUser = id => users.find(u => u.id===id);

  const publish = async () => {
    if(!draft.content.trim()) return;
    const post = await db.insert("posts", { user_id:user.id, content:draft.content, media_url:draft.mediaUrl||null, media_type:draft.mediaUrl?draft.mediaType:null, likes:[] });
    setPosts(prev => [post[0], ...prev]);
    setDraft({content:"",mediaUrl:"",mediaType:"image"}); setComposing(false);
  };

  const toggleLike = async (post) => {
    const liked = (post.likes||[]).includes(user.id);
    const newLikes = liked ? post.likes.filter(id=>id!==user.id) : [...(post.likes||[]),user.id];
    await db.update("posts", `id=eq.${post.id}`, { likes: newLikes });
    setPosts(prev => prev.map(p => p.id===post.id ? {...p,likes:newLikes} : p));
  };

  const deletePost = async (postId) => {
    await db.delete("posts", `id=eq.${postId}`);
    setPosts(prev => prev.filter(p => p.id!==postId));
  };

  if(loading) return <Spinner/>;

  return (
    <div style={{ maxWidth:660, margin:"0 auto", padding:"22px 16px" }}>
      {(user.role==="promoteur"||user.role==="admin")&&(
        <div style={{ background:C.white, borderRadius:16, padding:16, marginBottom:16, boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <Avatar user={user} size={40}/>
            <div style={{ flex:1 }}>
              {!composing
                ? <div onClick={()=>setComposing(true)} style={{ background:C.gray100, borderRadius:24, padding:"10px 16px", color:C.gray400, cursor:"text", fontSize:13 }}>Partager une annonce, photo, actualité…</div>
                : <>
                  <textarea value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})} placeholder="Votre message…" style={{ width:"100%", minHeight:80, padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", outline:"none" }}/>
                  <input value={draft.mediaUrl} onChange={e=>setDraft({...draft,mediaUrl:e.target.value})} placeholder="URL image/vidéo (optionnel)" style={{ width:"100%", padding:"7px 11px", borderRadius:8, border:`1.5px solid ${C.gray200}`, fontSize:12, boxSizing:"border-box", marginTop:7, marginBottom:7 }}/>
                  <div style={{ display:"flex", gap:7 }}>
                    {["image","video"].map(t=><button key={t} onClick={()=>setDraft({...draft,mediaType:t})} style={{ padding:"5px 11px", borderRadius:7, border:`2px solid ${draft.mediaType===t?C.teal:C.gray200}`, background:draft.mediaType===t?C.tealLight:C.white, fontWeight:700, fontSize:11, cursor:"pointer", color:draft.mediaType===t?C.teal:C.gray600 }}>{t==="image"?"📷 Image":"🎥 Vidéo"}</button>)}
                    <Btn onClick={publish} sm>Publier</Btn>
                    <Btn onClick={()=>setComposing(false)} v="ghost" sm style={{ color:C.gray600 }}>Annuler</Btn>
                  </div>
                </>
              }
            </div>
          </div>
        </div>
      )}
      {posts.length===0&&!loading&&<div style={{ textAlign:"center", padding:"48px 0", color:C.gray400 }}><div style={{ fontSize:48, marginBottom:12 }}>📰</div><p>Aucune publication pour l'instant.</p></div>}
      {posts.map(post=>{
        const author=getUser(post.user_id);
        const liked=(post.likes||[]).includes(user.id);
        return (
          <div key={post.id} style={{ background:C.white, borderRadius:14, marginBottom:14, boxShadow:"0 2px 10px rgba(0,0,0,.06)", overflow:"hidden" }}>
            <div style={{ padding:"13px 15px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <Avatar user={author} size={38}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:C.navy }}>{author?.company||author?.name||"Utilisateur"}</div>
                  <div style={{ fontSize:11, color:C.gray400 }}>{new Date(post.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
              {(user.id===post.user_id||user.role==="admin")&&<button onClick={()=>deletePost(post.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray400, fontSize:18 }}>×</button>}
            </div>
            <p style={{ margin:"0 15px 12px", fontSize:13, lineHeight:1.6, color:C.gray800 }}>{post.content}</p>
            {post.media_url&&(post.media_type==="video"?<video src={post.media_url} controls style={{ width:"100%", maxHeight:280, background:"#000" }}/>:<img src={post.media_url} alt="" style={{ width:"100%", maxHeight:320, objectFit:"cover" }}/>)}
            <div style={{ padding:"10px 15px", borderTop:`1px solid ${C.gray100}` }}>
              <button onClick={()=>toggleLike(post)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:liked?C.red:C.gray400 }}>
                {liked?"❤️":"🤍"} {(post.likes||[]).length}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANNONCES
// ═══════════════════════════════════════════════════════════
function AnnoncesPage({ user, users, setUsers, setConvs, setTab, addNotif }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type:"tous", ville:"toutes", prixMin:"", prixMax:"", surfaceMin:"", chambresMin:"", dispo:"tous" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [detail, setDetail] = useState(null);
  const [profilPromo, setProfilPromo] = useState(null);
  const [avisForm, setAvisForm] = useState({ note:5, commentaire:"" });
  const [showAvis, setShowAvis] = useState(false);
  const [promoAvis, setPromoAvis] = useState([]);

  useEffect(() => {
    db.get("listings").then(data => { setListings(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const visible = listings
    .filter(l => user.role==="admin" || l.statut==="approuvé" || l.promoteur_id===user.id)
    .filter(l => filters.type==="tous" || l.type===filters.type)
    .filter(l => filters.ville==="toutes" || l.ville===filters.ville)
    .filter(l => filters.dispo==="tous" || l.disponibilite===filters.dispo)
    .filter(l => !filters.prixMin || l.prix>=Number(filters.prixMin))
    .filter(l => !filters.prixMax || l.prix<=Number(filters.prixMax))
    .filter(l => !filters.surfaceMin || l.surface>=Number(filters.surfaceMin))
    .filter(l => !filters.chambresMin || l.chambres>=Number(filters.chambresMin))
    .filter(l => !search || l.titre.toLowerCase().includes(search.toLowerCase()) || l.adresse.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sort==="recent" ? new Date(b.created_at)-new Date(a.created_at) : sort==="prix_asc" ? a.prix-b.prix : sort==="prix_desc" ? b.prix-a.prix : b.vues-a.vues);

  const toggleFavori = async (lId) => {
    if(user.role!=="client") return;
    const fav = user.favoris||[];
    const nf = fav.includes(lId) ? fav.filter(f=>f!==lId) : [...fav,lId];
    user.favoris = nf;
    await db.update("users", `id=eq.${user.id}`, { favoris: nf });
    setUsers(prev => prev.map(u => u.id===user.id ? {...u,favoris:nf} : u));
  };

  const updateStatut = async (id, statut) => {
    await db.update("listings", `id=eq.${id}`, { statut });
    setListings(prev => prev.map(l => l.id===id ? {...l,statut} : l));
  };

  const updateDispo = async (id, disponibilite) => {
    await db.update("listings", `id=eq.${id}`, { disponibilite });
    setListings(prev => prev.map(l => l.id===id ? {...l,disponibilite} : l));
  };

  const incrVues = async (l) => {
    if(user.id===l.promoteur_id || user.role==="admin") return;
    await db.update("listings", `id=eq.${l.id}`, { vues: (l.vues||0)+1 });
    setListings(prev => prev.map(x => x.id===l.id ? {...x,vues:(x.vues||0)+1} : x));
  };

  const startChat = async (listing) => {
    const existing = await db.get("conversations", `listing_id=eq.${listing.id}`);
    const myConv = existing.find(c => c.participants.includes(user.id) && c.participants.includes(listing.promoteur_id));
    if(!myConv) {
      const conv = await db.insert("conversations", { participants:[user.id,listing.promoteur_id], listing_id:listing.id, listing_titre:listing.titre });
      setConvs(prev => [conv[0], ...prev]);
      await addNotif(listing.promoteur_id, "message", `${user.name} s'intéresse à : ${listing.titre}`, "messages");
    }
    setDetail(null); setTab("messages");
  };

  const loadPromoAvis = async (promoId) => {
    const data = await db.get("avis", `promoteur_id=eq.${promoId}`);
    setPromoAvis(data);
  };

  const soumettreAvis = async (promoId) => {
    if(!avisForm.commentaire.trim()) return;
    await db.insert("avis", { promoteur_id:promoId, auteur_id:user.id, auteur_nom:user.name, note:avisForm.note, commentaire:avisForm.commentaire });
    await loadPromoAvis(promoId);
    setShowAvis(false); setAvisForm({note:5,commentaire:""});
  };

  const iS = { padding:"9px 13px", borderRadius:9, border:"none", fontSize:13, background:C.white };
  const villes = ["toutes","Abidjan","Bouaké","Yamoussoukro","Daloa","San-Pédro","Korhogo"];

  if(loading) return <Spinner/>;

  return (
    <div style={{ maxWidth:1200, margin:"0 auto", padding:"20px 16px" }}>
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, borderRadius:18, padding:"22px", marginBottom:20, color:C.white }}>
        <h2 style={{ margin:"0 0 14px", fontSize:18, fontWeight:900 }}>🔍 Recherche avancée</h2>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Titre, adresse…" style={{ flex:2, minWidth:180, padding:"9px 14px", borderRadius:9, border:"none", fontSize:13 }} />
          <select style={iS} value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})}><option value="tous">Tous types</option><option value="vente">Vente</option><option value="location">Location</option></select>
          <select style={iS} value={filters.ville} onChange={e=>setFilters({...filters,ville:e.target.value})}>{villes.map(v=><option key={v} value={v}>{v==="toutes"?"Toutes villes":v}</option>)}</select>
          <select style={iS} value={filters.dispo} onChange={e=>setFilters({...filters,dispo:e.target.value})}><option value="tous">Tous statuts</option><option value="disponible">Disponible</option><option value="réservé">Réservé</option><option value="vendu">Vendu/Loué</option></select>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={filters.prixMin} onChange={e=>setFilters({...filters,prixMin:e.target.value})} placeholder="Prix min" type="number" style={{ flex:1, minWidth:110, ...iS }} />
          <input value={filters.prixMax} onChange={e=>setFilters({...filters,prixMax:e.target.value})} placeholder="Prix max" type="number" style={{ flex:1, minWidth:110, ...iS }} />
          <input value={filters.surfaceMin} onChange={e=>setFilters({...filters,surfaceMin:e.target.value})} placeholder="Surface min m²" type="number" style={{ flex:1, minWidth:110, ...iS }} />
          <input value={filters.chambresMin} onChange={e=>setFilters({...filters,chambresMin:e.target.value})} placeholder="Chambres min" type="number" style={{ flex:1, minWidth:100, ...iS }} />
          <select style={iS} value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Récents</option><option value="prix_asc">Prix ↑</option><option value="prix_desc">Prix ↓</option><option value="vues">Populaires</option></select>
          <button onClick={()=>{setFilters({type:"tous",ville:"toutes",prixMin:"",prixMax:"",surfaceMin:"",chambresMin:"",dispo:"tous"});setSearch("");}} style={{ padding:"9px 14px", borderRadius:9, border:"none", background:"rgba(255,255,255,.15)", color:C.white, fontWeight:700, fontSize:12, cursor:"pointer" }}>↺</button>
        </div>
        <p style={{ margin:"10px 0 0", fontSize:12, opacity:.7 }}>{visible.length} annonce(s)</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(290px, 1fr))", gap:16 }}>
        {visible.map(l=>{
          const promo = users.find(u=>u.id===l.promoteur_id);
          const isFav = (user.favoris||[]).includes(l.id);
          const isVendu = l.disponibilite==="vendu";
          return (
            <div key={l.id} style={{ background:C.white, borderRadius:14, boxShadow:"0 2px 10px rgba(0,0,0,.07)", overflow:"hidden", opacity:isVendu?.8:1 }}>
              <div style={{ position:"relative" }}>
                <img src={(l.images||[])[0]||"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"} alt={l.titre} style={{ width:"100%", height:185, objectFit:"cover", filter:isVendu?"grayscale(50%)":"none" }} />
                <span style={{ position:"absolute", top:10, left:10, background:l.type==="vente"?C.gold:C.teal, color:C.white, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:800 }}>{(l.type||"").toUpperCase()}</span>
                {isVendu&&<div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ background:"rgba(0,0,0,.65)", color:C.white, padding:"7px 18px", borderRadius:20, fontWeight:900, fontSize:15 }}>VENDU / LOUÉ</span></div>}
                {user.role==="client"&&<button onClick={()=>toggleFavori(l.id)} style={{ position:"absolute", top:10, right:10, background:"rgba(255,255,255,.9)", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>{isFav?"❤️":"🤍"}</button>}
              </div>
              <div style={{ padding:"12px 14px" }}>
                <h3 style={{ margin:"0 0 3px", fontSize:14, fontWeight:800, color:C.navy }}>{l.titre}</h3>
                <p style={{ margin:"0 0 5px", fontSize:12, color:C.gray400 }}>📍 {l.adresse}</p>
                <div style={{ display:"flex", gap:10, fontSize:12, color:C.gray600, marginBottom:6 }}>
                  {l.chambres>0&&<span>🛏 {l.chambres}</span>}
                  <span>📐 {l.surface}m²</span>
                  <span style={{ color:C.gray400 }}>👁 {l.vues||0}</span>
                </div>
                {promo&&<button onClick={()=>{setProfilPromo(promo);loadPromoAvis(promo.id);}} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", marginBottom:8, padding:0 }}>
                  <Avatar user={promo} size={18}/>
                  <span style={{ fontSize:11, color:C.teal, fontWeight:700 }}>{promo?.company||promo?.name}</span>
                  {promo?.verified&&<span style={{ fontSize:9, background:C.greenLight, color:C.green, padding:"1px 5px", borderRadius:10, fontWeight:700 }}>✓</span>}
                </button>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:900, fontSize:14, color:C.gold }}>{fmt(l.prix)}{l.type==="location"?"/mois":""}</span>
                  <div style={{ display:"flex", gap:5 }}>
                    {user.role==="admin"&&<><Btn onClick={()=>updateStatut(l.id,"approuvé")} v="success" sm>✓</Btn><Btn onClick={()=>updateStatut(l.id,"refusé")} v="danger" sm>✗</Btn></>}
                    {user.id===l.promoteur_id&&(
                      <select value={l.disponibilite} onChange={e=>updateDispo(l.id,e.target.value)} style={{ padding:"4px 6px", borderRadius:6, border:`1px solid ${C.gray200}`, fontSize:10, cursor:"pointer" }}>
                        <option value="disponible">✅</option><option value="réservé">⏳</option><option value="vendu">🔴</option>
                      </select>
                    )}
                    <Btn onClick={()=>{incrVues(l);setDetail(l);}} v="navy" sm>Voir</Btn>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {detail&&(()=>{
        const promo=users.find(u=>u.id===detail.promoteur_id);
        return (
          <Modal onClose={()=>setDetail(null)} wide>
            <img src={(detail.images||[])[0]||"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"} alt="" style={{ width:"100%", height:240, objectFit:"cover", borderRadius:12, marginBottom:16 }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <h2 style={{ margin:0, color:C.navy, fontSize:19, fontWeight:900 }}>{detail.titre}</h2>
              <div style={{ display:"flex", gap:6 }}><Bdg s={detail.type}/><Bdg s={detail.disponibilite}/></div>
            </div>
            <p style={{ color:C.gray400, margin:"0 0 12px", fontSize:13 }}>📍 {detail.adresse} · {detail.ville}</p>
            <div style={{ display:"flex", gap:14, marginBottom:12, fontSize:13, color:C.gray600 }}>
              {detail.chambres>0&&<span>🛏 {detail.chambres} ch.</span>}
              <span>📐 {detail.surface}m²</span><span>👁 {detail.vues||0} vues</span>
            </div>
            <p style={{ lineHeight:1.7, color:C.gray600, margin:"0 0 14px" }}>{detail.description}</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
              {(detail.options||[]).map(o=><span key={o} style={{ background:C.tealLight, color:C.teal, padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>✓ {o}</span>)}
            </div>
            {promo&&<div style={{ background:C.gray50, borderRadius:12, padding:"12px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
              <Avatar user={promo} size={44}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14, color:C.navy }}>{promo?.company||promo?.name} {promo?.verified&&<span style={{ fontSize:10, background:C.greenLight, color:C.green, padding:"1px 7px", borderRadius:10, marginLeft:4, fontWeight:700 }}>✓</span>}</div>
                <p style={{ margin:"2px 0 0", fontSize:12, color:C.gray400 }}>{promo?.email}</p>
              </div>
              <button onClick={()=>{setDetail(null);setProfilPromo(promo);loadPromoAvis(promo.id);}} style={{ background:"none", border:"none", color:C.teal, cursor:"pointer", fontSize:12, fontWeight:700 }}>Profil →</button>
            </div>}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:900, fontSize:21, color:C.gold }}>{fmt(detail.prix)}{detail.type==="location"?"/mois":""}</span>
              <div style={{ display:"flex", gap:8 }}>
                {user.role==="client"&&detail.disponibilite==="disponible"&&<Btn onClick={()=>startChat(detail)} v="success">💬 Contacter</Btn>}
                {promo?.whatsapp&&detail.disponibilite==="disponible"&&<Btn onClick={()=>window.open(`https://wa.me/${promo.whatsapp.replace(/\D/g,"")}?text=Bonjour, intéressé par : ${detail.titre}`,"_blank")} v="wa">💚 WA</Btn>}
                <Btn onClick={()=>setDetail(null)} v="secondary">Fermer</Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {profilPromo&&(
        <Modal onClose={()=>{setProfilPromo(null);setShowAvis(false);}} wide>
          <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, borderRadius:14, padding:"22px", color:C.white, marginBottom:18, display:"flex", gap:14, alignItems:"center" }}>
            <Avatar user={profilPromo} size={68}/>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:900 }}>{profilPromo.company||profilPromo.name}</h2>
                {profilPromo.verified&&<span style={{ background:C.greenLight, color:C.green, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700 }}>✓ Vérifié</span>}
              </div>
              <p style={{ margin:"0 0 4px", opacity:.75, fontSize:12 }}>📍 {profilPromo.ville} · {profilPromo.email}</p>
              {promoAvis.length>0&&<Stars note={Math.round(promoAvis.reduce((a,r)=>a+r.note,0)/promoAvis.length)}/>}
              <span style={{ fontSize:12, opacity:.7 }}> {promoAvis.length} avis</span>
            </div>
            {profilPromo.whatsapp&&<button onClick={()=>window.open(`https://wa.me/${profilPromo.whatsapp.replace(/\D/g,"")}`,"_blank")} style={{ background:"#25D366", color:C.white, border:"none", borderRadius:10, padding:"9px 14px", fontWeight:900, fontSize:13, cursor:"pointer" }}>💚 WA</button>}
          </div>
          {profilPromo.description&&<p style={{ color:C.gray600, lineHeight:1.7, marginBottom:16, fontSize:14 }}>{profilPromo.description}</p>}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <h3 style={{ margin:0, color:C.navy, fontSize:15 }}>Avis ({promoAvis.length})</h3>
            {user.role==="client"&&<Btn onClick={()=>setShowAvis(!showAvis)} sm>+ Avis</Btn>}
          </div>
          {showAvis&&(
            <div style={{ background:C.gray50, borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setAvisForm({...avisForm,note:n})} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:n<=avisForm.note?C.gold:C.gray200 }}>★</button>)}
              </div>
              <textarea value={avisForm.commentaire} onChange={e=>setAvisForm({...avisForm,commentaire:e.target.value})} placeholder="Votre commentaire…" style={{ width:"100%", minHeight:60, padding:"9px", borderRadius:8, border:`1.5px solid ${C.gray200}`, fontSize:13, boxSizing:"border-box", fontFamily:"inherit", resize:"none" }}/>
              <Btn onClick={()=>soumettreAvis(profilPromo.id)} style={{ marginTop:8 }}>Soumettre</Btn>
            </div>
          )}
          {promoAvis.map((a,i)=>(
            <div key={i} style={{ background:C.gray50, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontWeight:700, fontSize:13 }}>👤 {a.auteur_nom}</span>
                <Stars note={a.note} small/>
              </div>
              <p style={{ margin:0, fontSize:13, color:C.gray600 }}>{a.commentaire}</p>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CARTE
// ═══════════════════════════════════════════════════════════
function CartePage({ user, users, setConvs, setTab }) {
  const [listings, setListings] = useState([]);
  const [detail, setDetail] = useState(null);
  const mapRef = useRef(null);
  const mapInst = useRef(null);

  useEffect(() => {
    db.get("listings", "statut=eq.approuvé&disponibilite=neq.vendu").then(setListings);
  }, []);

  useEffect(() => {
    if(!listings.length) return;
    const init = () => {
      if(mapInst.current||!mapRef.current) return;
      const L = window.L; if(!L) return;
      const map = L.map(mapRef.current,{center:[5.3364,-4.0267],zoom:10});
      mapInst.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'© OpenStreetMap'}).addTo(map);
      listings.filter(l=>l.lat&&l.lng).forEach(l=>{
        const color = l.type==="vente"?"#e8a020":"#0d9488";
        const icon = L.divIcon({ html:`<div style="background:${color};color:white;padding:4px 8px;border-radius:16px;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);">${l.type==="vente"?"🏷️":"🔑"} ${l.prix>=1000000?(l.prix/1000000).toFixed(0)+"M":Number(l.prix).toLocaleString()} F</div>`, className:"", iconAnchor:[40,16] });
        L.marker([l.lat,l.lng],{icon}).addTo(map).on("click",()=>setDetail(l));
      });
    };
    if(window.L) init();
    else { const t=setInterval(()=>{if(window.L){init();clearInterval(t);}},300); return ()=>clearInterval(t); }
    return ()=>{ if(mapInst.current){mapInst.current.remove();mapInst.current=null;} };
  }, [listings]);

  const startChat = async (listing) => {
    const existing = await db.get("conversations", `listing_id=eq.${listing.id}`);
    const myConv = existing.find(c=>c.participants.includes(user.id));
    if(!myConv) {
      const conv = await db.insert("conversations",{participants:[user.id,listing.promoteur_id],listing_id:listing.id,listing_titre:listing.titre});
      setConvs(prev=>[conv[0],...prev]);
    }
    setDetail(null); setTab("messages");
  };

  return (
    <div style={{ maxWidth:1200, margin:"0 auto", padding:"20px 16px" }}>
      <h2 style={{ margin:"0 0 12px", color:C.navy, fontWeight:900 }}>🗺️ Carte des biens</h2>
      <div ref={mapRef} style={{ width:"100%", height:460, borderRadius:16, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,.1)", background:C.gray100 }}>
        {!window.L&&<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:C.gray400, flexDirection:"column", gap:8 }}><div style={{ fontSize:36 }}>🗺️</div><p>Chargement de la carte…</p></div>}
      </div>
      {detail&&(()=>{
        const promo=users.find(u=>u.id===detail.promoteur_id);
        return (
          <Modal onClose={()=>setDetail(null)}>
            <img src={(detail.images||[])[0]||"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"} alt="" style={{ width:"100%", height:190, objectFit:"cover", borderRadius:12, marginBottom:14 }}/>
            <h3 style={{ margin:"0 0 4px", color:C.navy, fontWeight:900 }}>{detail.titre}</h3>
            <p style={{ margin:"0 0 10px", color:C.gray400, fontSize:13 }}>📍 {detail.adresse}</p>
            <p style={{ fontWeight:900, fontSize:20, color:C.gold, margin:"0 0 14px" }}>{fmt(detail.prix)}{detail.type==="location"?"/mois":""}</p>
            <div style={{ display:"flex", gap:8 }}>
              {user.role==="client"&&<Btn onClick={()=>startChat(detail)} v="success">💬 Contacter</Btn>}
              {promo?.whatsapp&&<Btn onClick={()=>window.open(`https://wa.me/${promo.whatsapp.replace(/\D/g,"")}?text=Bonjour, intéressé par : ${detail.titre}`,"_blank")} v="wa">💚 WA</Btn>}
              <Btn onClick={()=>setDetail(null)} v="secondary">Fermer</Btn>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FAVORIS
// ═══════════════════════════════════════════════════════════
function FavorisPage({ user, users }) {
  const [favs, setFavs] = useState([]);
  useEffect(() => {
    if(!(user.favoris||[]).length) return;
    db.get("listings", `id=in.(${user.favoris.join(",")})`).then(setFavs);
  }, []);
  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 16px" }}>
      <h2 style={{ margin:"0 0 18px", color:C.navy, fontWeight:900 }}>❤️ Mes favoris ({favs.length})</h2>
      {favs.length===0
        ? <div style={{ textAlign:"center", padding:"60px 0", color:C.gray400 }}><div style={{ fontSize:48, marginBottom:12 }}>🤍</div><p>Appuyez sur 🤍 sur une annonce pour la sauvegarder.</p></div>
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))", gap:14 }}>
          {favs.map(l=>{
            const promo=users.find(u=>u.id===l.promoteur_id);
            return (
              <div key={l.id} style={{ background:C.white, borderRadius:14, boxShadow:"0 2px 10px rgba(0,0,0,.07)", overflow:"hidden" }}>
                <img src={(l.images||[])[0]||"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"} alt="" style={{ width:"100%", height:160, objectFit:"cover" }}/>
                <div style={{ padding:"12px 14px" }}>
                  <h3 style={{ margin:"0 0 3px", fontSize:13, fontWeight:800, color:C.navy }}>{l.titre}</h3>
                  <p style={{ margin:"0 0 8px", fontSize:11, color:C.gray400 }}>📍 {l.adresse}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:900, color:C.gold, fontSize:13 }}>{fmt(l.prix)}{l.type==="location"?"/mois":""}</span>
                    {promo?.whatsapp&&<button onClick={()=>window.open(`https://wa.me/${promo.whatsapp.replace(/\D/g,"")}?text=Bonjour, intéressé par : ${l.titre}`,"_blank")} style={{ background:"#25D366", color:C.white, border:"none", borderRadius:8, padding:"5px 10px", fontWeight:700, fontSize:11, cursor:"pointer" }}>💚 WA</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MESSAGERIE
// ═══════════════════════════════════════════════════════════
function MessagesPage({ user, users, convs, setConvs }) {
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [showMedia, setShowMedia] = useState(false);
  const bottomRef = useRef(null);
  const myConvs = user.role==="admin" ? convs : convs.filter(c=>c.participants.includes(user.id));
  const activeConv = convs.find(c=>c.id===activeId)||null;

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  useEffect(() => {
    if(!activeId) return;
    db.get("messages", `conversation_id=eq.${activeId}&order=created_at.asc`).then(setMessages);
  }, [activeId]);

  const getOther = conv => {
    if(user.role==="admin") return users.find(u=>u.id===conv.participants[0]);
    return users.find(u=>u.id===conv.participants.find(p=>p!==user.id));
  };

  const send = async () => {
    if(!text.trim()&&!mediaUrl.trim()) return;
    const msg = await db.insert("messages",{ conversation_id:activeId, sender_id:user.id, text:text||null, media_url:mediaUrl||null, media_type:mediaUrl?mediaType:null, type:mediaUrl?"media":"text", is_admin:user.role==="admin" });
    setMessages(prev=>[...prev,msg[0]]);
    setText(""); setMediaUrl(""); setShowMedia(false);
  };

  const exportConv = () => {
    if(!activeConv) return;
    const lines = messages.map(m=>{ const s=users.find(u=>u.id===m.sender_id); return `[${new Date(m.created_at).toLocaleTimeString("fr-FR")}] ${s?.name||"?"} : ${m.type==="media"?"[MÉDIA] "+m.media_url:m.text}`; });
    const header = `=== CAPTURE ImmoCI ===\nConversation : ${activeConv.listing_titre}\nDate : ${new Date().toLocaleString("fr-FR")}\n${"─".repeat(40)}\n`;
    const blob = new Blob([header+lines.join("\n")],{type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`capture_${activeId}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 16px" }}>
      <h2 style={{ margin:"0 0 14px", color:C.navy, fontWeight:900 }}>💬 Messagerie</h2>
      <div style={{ display:"flex", background:C.white, borderRadius:18, boxShadow:"0 2px 14px rgba(0,0,0,.08)", overflow:"hidden", minHeight:540 }}>
        <div style={{ width:270, borderRight:`1px solid ${C.gray100}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.gray100}`, background:C.gray50 }}>
            <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.gray600 }}>{myConvs.length} conversation(s)</p>
            {user.role==="admin"&&<p style={{ margin:"2px 0 0", fontSize:10, color:C.gold, fontWeight:700 }}>👁 Lecture seule</p>}
          </div>
          <div style={{ overflowY:"auto", flex:1 }}>
            {myConvs.length===0&&<div style={{ padding:"28px 14px", textAlign:"center", color:C.gray400 }}><div style={{ fontSize:32, marginBottom:8 }}>💬</div><p style={{ fontSize:12 }}>Aucune conversation</p></div>}
            {myConvs.map(c=>{
              const other=getOther(c);
              return (
                <div key={c.id} onClick={()=>setActiveId(c.id)} style={{ padding:"10px 13px", cursor:"pointer", borderBottom:`1px solid ${C.gray100}`, background:c.id===activeId?C.goldLight:"transparent", borderLeft:`4px solid ${c.id===activeId?C.gold:"transparent"}` }}>
                  <div style={{ display:"flex", gap:8, marginBottom:3 }}>
                    <Avatar user={other} size={30}/>
                    <div style={{ minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:700, fontSize:12, color:C.navy, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{other?.company||other?.name}</p>
                      <p style={{ margin:0, fontSize:10, color:C.gray400 }}>📋 {c.listing_titre}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {!activeConv
          ? <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.gray400 }}><div style={{ textAlign:"center" }}><div style={{ fontSize:46, marginBottom:10 }}>💬</div><p>Sélectionnez une conversation</p></div></div>
          : (
            <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.gray100}`, display:"flex", alignItems:"center", gap:10, background:user.role==="admin"?"#0f0f1a":C.gray50 }}>
                <Avatar user={getOther(activeConv)} size={36}/>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:800, fontSize:14, color:user.role==="admin"?C.white:C.navy }}>{getOther(activeConv)?.company||getOther(activeConv)?.name}</p>
                  <p style={{ margin:0, fontSize:11, color:user.role==="admin"?"#a78bfa":C.gray400 }}>
                    {user.role==="admin" ? `👁 ${activeConv.participants.map(id=>users.find(u=>u.id===id)?.name).join(" ↔ ")}` : `Re : ${activeConv.listing_titre}`}
                  </p>
                </div>
                {user.role==="admin" && <button onClick={exportConv} style={{ background:"#1e1e2e", color:"#a78bfa", border:"1px solid #a78bfa44", borderRadius:8, padding:"6px 12px", fontWeight:800, fontSize:11, cursor:"pointer" }}>📋 Capturer</button>}
                {user.role!=="admin"&&getOther(activeConv)?.whatsapp&&<button onClick={()=>window.open(`https://wa.me/${getOther(activeConv).whatsapp.replace(/\D/g,"")}`,"_blank")} style={{ background:"#25D366", color:C.white, border:"none", borderRadius:8, padding:"6px 11px", fontWeight:700, fontSize:11, cursor:"pointer" }}>💚 WA</button>}
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:11, background:"#f5f8ff" }}>
                {messages.map(msg=>{
                  const isMine=msg.sender_id===user.id;
                  const sender=users.find(u=>u.id===msg.sender_id);
                  return (
                    <div key={msg.id} style={{ display:"flex", justifyContent:isMine?"flex-end":"flex-start", gap:6, alignItems:"flex-end" }}>
                      {!isMine&&<Avatar user={sender} size={24}/>}
                      <div style={{ maxWidth:"68%" }}>
                        {!isMine&&<p style={{ margin:"0 0 2px 4px", fontSize:10, color:C.gray400, fontWeight:700 }}>{sender?.name}</p>}
                        <div style={{ background:isMine?C.navy:C.white, color:isMine?C.white:C.gray800, padding:"9px 13px", borderRadius:isMine?"14px 14px 4px 14px":"14px 14px 14px 4px", boxShadow:"0 1px 4px rgba(0,0,0,.08)" }}>
                          {msg.text&&<p style={{ margin:0, fontSize:13, lineHeight:1.5 }}>{msg.text}</p>}
                          {msg.media_url&&(msg.media_type==="video"?<video src={msg.media_url} controls style={{ maxWidth:"100%", borderRadius:8 }}/>:<img src={msg.media_url} alt="" style={{ maxWidth:"100%", borderRadius:8, display:"block" }}/>)}
                        </div>
                        <p style={{ margin:"2px 5px 0", fontSize:10, color:C.gray400, textAlign:isMine?"right":"left" }}>{new Date(msg.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
                      </div>
                      {isMine&&<Avatar user={user} size={24}/>}
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>
              <div style={{ padding:"11px 16px", borderTop:`1px solid ${C.gray100}`, background:C.white }}>
                {user.role==="admin" ? (
                  <div style={{ display:"flex", alignItems:"center", gap:10, background:"#1e1e2e", borderRadius:10, padding:"10px 14px" }}>
                    <span style={{ fontSize:14 }}>👁</span>
                    <p style={{ margin:0, fontSize:12, color:"#a78bfa", fontWeight:700 }}>Mode surveillance — lecture seule</p>
                  </div>
                ) : (
                  <>
                    {showMedia&&(
                      <div style={{ display:"flex", gap:7, marginBottom:7 }}>
                        <input value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} placeholder="URL image/vidéo…" style={{ flex:1, padding:"7px 11px", borderRadius:8, border:`1.5px solid ${C.gray200}`, fontSize:12 }}/>
                        <select value={mediaType} onChange={e=>setMediaType(e.target.value)} style={{ padding:"7px 9px", borderRadius:8, border:`1.5px solid ${C.gray200}`, fontSize:12 }}><option value="image">📷</option><option value="video">🎥</option></select>
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                      <button onClick={()=>setShowMedia(!showMedia)} style={{ background:showMedia?C.goldLight:C.gray100, border:"none", borderRadius:8, padding:"8px 11px", cursor:"pointer", fontSize:15, flexShrink:0 }}>📎</button>
                      <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Écrire un message…" style={{ flex:1, padding:"9px 12px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, resize:"none", minHeight:38, maxHeight:100, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
                      <Btn onClick={send} style={{ flexShrink:0 }}>Envoyer</Btn>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MON ESPACE PROMOTEUR
// ═══════════════════════════════════════════════════════════
function MonEspacePage({ user, setUsers }) {
  const [listings, setListings] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mStep, setMStep] = useState("choose");
  const [postForm, setPostForm] = useState({ content:"", mediaUrl:"", mediaType:"image" });
  const [annForm, setAnnForm] = useState({ titre:"", type:"vente", prix:"", adresse:"", ville:"Abidjan", surface:"", chambres:"", description:"", options:"", imageUrl:"" });
  const [viewTab, setViewTab] = useState("annonces");
  const [editProfil, setEditProfil] = useState(false);
  const [pf, setPf] = useState({ company:user.company||"", description:user.description||"", whatsapp:user.whatsapp||"", phone:user.phone||"", ville:user.ville||"Abidjan" });

  useEffect(() => {
    Promise.all([
      db.get("listings", `promoteur_id=eq.${user.id}`),
      db.get("posts", `user_id=eq.${user.id}`),
    ]).then(([l,p]) => { setListings(l); setPosts(p); setLoading(false); });
  }, []);

  const publishPost = async () => {
    if(!postForm.content.trim()) return;
    const post = await db.insert("posts",{ user_id:user.id, content:postForm.content, media_url:postForm.mediaUrl||null, media_type:postForm.mediaUrl?postForm.mediaType:null, likes:[] });
    setPosts(prev=>[post[0],...prev]);
    setShowModal(false); setPostForm({content:"",mediaUrl:"",mediaType:"image"});
  };

  const publishAnnonce = async () => {
    if(!annForm.titre||!annForm.prix||!annForm.adresse) return;
    const coords={"Abidjan":[5.3364,-4.0267],"Bouaké":[7.6900,-5.0300],"Yamoussoukro":[6.8276,-5.2893],"Daloa":[6.8774,-6.4502],"San-Pédro":[4.7485,-6.6363],"Korhogo":[9.4580,-5.6297]};
    const [lat,lng]=coords[annForm.ville]||[5.3364,-4.0267];
    const listing = await db.insert("listings",{
      promoteur_id:user.id, titre:annForm.titre, type:annForm.type, prix:Number(annForm.prix),
      adresse:annForm.adresse, ville:annForm.ville, surface:Number(annForm.surface)||0,
      chambres:Number(annForm.chambres)||0, description:annForm.description,
      options:annForm.options.split(",").map(o=>o.trim()).filter(Boolean),
      images:[annForm.imageUrl||"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"],
      statut:"en attente", disponibilite:"disponible",
      lat:lat+(Math.random()-.5)*.04, lng:lng+(Math.random()-.5)*.04, vues:0
    });
    setListings(prev=>[listing[0],...prev]);
    setShowModal(false); setAnnForm({titre:"",type:"vente",prix:"",adresse:"",ville:"Abidjan",surface:"",chambres:"",description:"",options:"",imageUrl:""});
  };

  const saveProfil = async () => {
    await db.update("users", `id=eq.${user.id}`, pf);
    Object.assign(user, pf);
    setUsers(prev => prev.map(u => u.id===user.id ? {...u,...pf} : u));
    setEditProfil(false);
  };

  const updateDispo = async (id, val) => {
    await db.update("listings", `id=eq.${id}`, { disponibilite: val });
    setListings(prev=>prev.map(l=>l.id===id?{...l,disponibilite:val}:l));
  };

  const totalVues = listings.reduce((a,l)=>a+(l.vues||0),0);
  const maxVues = Math.max(...listings.map(l=>l.vues||0),1);
  const stats=[
    {l:"Annonces",v:listings.length,i:"🏠",c:C.navy},
    {l:"Publications",v:posts.length,i:"📰",c:C.teal},
    {l:"Total vues",v:totalVues,i:"👁",c:C.purple},
    {l:"Vendus/Loués",v:listings.filter(l=>l.disponibilite==="vendu").length,i:"🏆",c:C.gold},
  ];
  const iS={width:"100%",padding:"10px 13px",borderRadius:8,border:`1.5px solid ${C.gray200}`,fontSize:14,boxSizing:"border-box"};

  if(loading) return <Spinner/>;

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px" }}>
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, borderRadius:18, padding:"22px", color:C.white, display:"flex", gap:14, alignItems:"center", marginBottom:14 }}>
        <Avatar user={user} size={66}/>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:"0 0 2px", fontSize:19, fontWeight:900 }}>{user.company||user.name}</h2>
          <p style={{ margin:"0 0 3px", opacity:.7, fontSize:12 }}>{user.email} · 📍 {user.ville}</p>
          {user.whatsapp&&<p style={{ margin:"0 0 6px", fontSize:12, opacity:.75 }}>💚 {user.whatsapp}</p>}
          {user.description&&<p style={{ margin:"0 0 7px", fontSize:12, opacity:.8, lineHeight:1.5 }}>{user.description}</p>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={()=>{setMStep("choose");setShowModal(true);}} style={{ background:C.gold, color:C.navy, border:"none", borderRadius:12, padding:"11px 20px", fontWeight:900, fontSize:14, cursor:"pointer" }}>➕ Publier</button>
          <button onClick={()=>setEditProfil(true)} style={{ background:"rgba(255,255,255,.12)", color:C.white, border:"1px solid rgba(255,255,255,.2)", borderRadius:9, padding:"7px 14px", fontWeight:700, fontSize:12, cursor:"pointer" }}>✏️ Mon profil</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
        {stats.map(s=>(<div key={s.l} style={{ background:C.white, borderRadius:12, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", borderTop:`4px solid ${s.c}` }}><div style={{ fontSize:20 }}>{s.i}</div><div style={{ fontSize:24, fontWeight:900, color:s.c }}>{s.v}</div><div style={{ fontSize:11, color:C.gray400 }}>{s.l}</div></div>))}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[["annonces","🏠 Annonces"],["stats","📊 Stats"],["posts","📰 Publications"]].map(([k,l])=>(
          <button key={k} onClick={()=>setViewTab(k)} style={{ padding:"8px 17px", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, background:viewTab===k?C.navy:C.gray100, color:viewTab===k?C.white:C.gray600 }}>{l}</button>
        ))}
      </div>

      {viewTab==="stats"&&(
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, borderRadius:14, padding:"18px", color:C.white }}>
              <p style={{ margin:"0 0 4px", fontSize:12, opacity:.7 }}>Total vues</p>
              <p style={{ margin:0, fontSize:34, fontWeight:900 }}>{totalVues}</p>
            </div>
            <div style={{ background:`linear-gradient(135deg,${C.teal},#0f766e)`, borderRadius:14, padding:"18px", color:C.white }}>
              <p style={{ margin:"0 0 4px", fontSize:12, opacity:.7 }}>Annonces actives</p>
              <p style={{ margin:0, fontSize:34, fontWeight:900 }}>{listings.filter(l=>l.disponibilite==="disponible").length}</p>
            </div>
          </div>
          <div style={{ background:C.white, borderRadius:14, padding:"18px", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
            <h3 style={{ margin:"0 0 14px", color:C.navy, fontSize:14, fontWeight:800 }}>📊 Vues par annonce</h3>
            {listings.sort((a,b)=>(b.vues||0)-(a.vues||0)).map((l,i)=>(
              <div key={l.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":""} {l.titre}</span>
                  <span style={{ fontSize:13, fontWeight:900, color:C.navy }}>{l.vues||0} vues</span>
                </div>
                <div style={{ background:C.gray100, borderRadius:20, height:8 }}>
                  <div style={{ width:`${Math.round(((l.vues||0)/maxVues)*100)}%`, height:"100%", background:i===0?C.gold:C.teal, borderRadius:20 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewTab==="annonces"&&(
        listings.length===0
          ? <div style={{ textAlign:"center", padding:"40px", color:C.gray400 }}><div style={{ fontSize:40, marginBottom:10 }}>🏗️</div><p>Appuyez sur <strong>Publier</strong>.</p></div>
          : listings.map(l=>(
            <div key={l.id} style={{ background:C.white, borderRadius:12, padding:"11px 14px", marginBottom:9, display:"flex", gap:11, alignItems:"center", boxShadow:"0 1px 6px rgba(0,0,0,.05)" }}>
              <img src={(l.images||[])[0]||"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"} alt="" style={{ width:64, height:50, objectFit:"cover", borderRadius:8 }}/>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 2px", fontWeight:700, fontSize:13 }}>{l.titre}</p>
                <p style={{ margin:0, fontSize:11, color:C.gray400 }}>{l.adresse} · {fmt(l.prix)} · 👁 {l.vues||0}</p>
              </div>
              <Bdg s={l.statut}/>
              <select value={l.disponibilite} onChange={e=>updateDispo(l.id,e.target.value)} style={{ padding:"5px 7px", borderRadius:7, border:`1px solid ${C.gray200}`, fontSize:11, cursor:"pointer" }}>
                <option value="disponible">✅ Disponible</option>
                <option value="réservé">⏳ Réservé</option>
                <option value="vendu">🔴 Vendu</option>
              </select>
            </div>
          ))
      )}

      {viewTab==="posts"&&(
        posts.length===0
          ? <div style={{ textAlign:"center", padding:"40px", color:C.gray400 }}><div style={{ fontSize:40, marginBottom:10 }}>📭</div><p>Appuyez sur <strong>Publier</strong>.</p></div>
          : posts.map(p=>(
            <div key={p.id} style={{ background:C.white, borderRadius:12, marginBottom:9, overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,.05)" }}>
              {p.media_url&&<img src={p.media_url} alt="" style={{ width:"100%", height:150, objectFit:"cover" }}/>}
              <div style={{ padding:"11px 13px" }}><p style={{ margin:"0 0 5px", fontSize:13 }}>{p.content}</p><p style={{ margin:0, fontSize:11, color:C.gray400 }}>{new Date(p.created_at).toLocaleDateString("fr-FR")} · ❤️ {(p.likes||[]).length}</p></div>
            </div>
          ))
      )}

      {showModal&&(
        <div onClick={()=>setShowModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:22, padding:26, width:"100%", maxWidth:510, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,.35)" }}>
            {mStep==="choose"&&(
              <>
                <h2 style={{ margin:"0 0 18px", color:C.navy, fontSize:17, fontWeight:900 }}>Que voulez-vous publier ?</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                  <button onClick={()=>setMStep("annonce")} style={{ background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, color:C.white, border:"none", borderRadius:14, padding:"18px 20px", cursor:"pointer", textAlign:"left", display:"flex", gap:14, alignItems:"center" }}>
                    <span style={{ fontSize:34 }}>🏠</span><div><p style={{ margin:"0 0 2px", fontWeight:900, fontSize:14 }}>Annonce immobilière</p><p style={{ margin:0, opacity:.7, fontSize:11 }}>Vente ou location</p></div>
                  </button>
                  <button onClick={()=>setMStep("post")} style={{ background:`linear-gradient(135deg,${C.teal},#0f766e)`, color:C.white, border:"none", borderRadius:14, padding:"18px 20px", cursor:"pointer", textAlign:"left", display:"flex", gap:14, alignItems:"center" }}>
                    <span style={{ fontSize:34 }}>📸</span><div><p style={{ margin:"0 0 2px", fontWeight:900, fontSize:14 }}>Publication (photo/vidéo)</p><p style={{ margin:0, opacity:.7, fontSize:11 }}>Actualité, chantier, promo…</p></div>
                  </button>
                </div>
                <button onClick={()=>setShowModal(false)} style={{ marginTop:12, width:"100%", padding:"10px", background:C.gray100, border:"none", borderRadius:10, fontWeight:700, color:C.gray600, cursor:"pointer" }}>Annuler</button>
              </>
            )}
            {mStep==="post"&&(
              <>
                <div style={{ display:"flex", gap:9, alignItems:"center", marginBottom:16 }}>
                  <button onClick={()=>setMStep("choose")} style={{ background:C.gray100, border:"none", borderRadius:8, padding:"4px 11px", cursor:"pointer", fontWeight:700, fontSize:12, color:C.gray600 }}>←</button>
                  <h2 style={{ margin:0, color:C.navy, fontSize:16, fontWeight:900 }}>📸 Nouvelle publication</h2>
                </div>
                <textarea value={postForm.content} onChange={e=>setPostForm({...postForm,content:e.target.value})} placeholder="Votre message…" style={{ width:"100%", minHeight:95, padding:"11px", borderRadius:10, border:`1.5px solid ${C.gray200}`, fontSize:13, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", outline:"none", marginBottom:9 }}/>
                <input value={postForm.mediaUrl} onChange={e=>setPostForm({...postForm,mediaUrl:e.target.value})} placeholder="URL photo/vidéo (optionnel)" style={{ ...iS, marginBottom:8 }}/>
                {postForm.mediaUrl&&<img src={postForm.mediaUrl} alt="" style={{ width:"100%", height:120, objectFit:"cover", borderRadius:10, marginBottom:10 }} onError={e=>e.target.style.display="none"}/>}
                <button onClick={publishPost} style={{ width:"100%", padding:"12px", background:C.teal, color:C.white, border:"none", borderRadius:12, fontWeight:900, fontSize:14, cursor:"pointer" }}>Publier</button>
              </>
            )}
            {mStep==="annonce"&&(
              <>
                <div style={{ display:"flex", gap:9, alignItems:"center", marginBottom:16 }}>
                  <button onClick={()=>setMStep("choose")} style={{ background:C.gray100, border:"none", borderRadius:8, padding:"4px 11px", cursor:"pointer", fontWeight:700, fontSize:12, color:C.gray600 }}>←</button>
                  <h2 style={{ margin:0, color:C.navy, fontSize:16, fontWeight:900 }}>🏠 Nouvelle annonce</h2>
                </div>
                {[["Titre *","titre","text","Villa 4 pièces Cocody"],["Prix (FCFA) *","prix","number","45000000"],["Adresse *","adresse","text","Cocody, Abidjan"],["Surface (m²)","surface","number",""],["Chambres","chambres","number",""],["URL photo","imageUrl","text","https://..."]].map(([lb,key,type,ph])=>(
                  <div key={key} style={{ marginBottom:9 }}>
                    <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>{lb}</label>
                    <input style={iS} type={type} placeholder={ph} value={annForm[key]} onChange={e=>setAnnForm({...annForm,[key]:e.target.value})}/>
                  </div>
                ))}
                <div style={{ display:"flex", gap:9, marginBottom:9 }}>
                  <div style={{ flex:1 }}><label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>Type</label><select style={iS} value={annForm.type} onChange={e=>setAnnForm({...annForm,type:e.target.value})}><option value="vente">Vente</option><option value="location">Location</option></select></div>
                  <div style={{ flex:1 }}><label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>Ville</label><select style={iS} value={annForm.ville} onChange={e=>setAnnForm({...annForm,ville:e.target.value})}>{["Abidjan","Bouaké","Yamoussoukro","Daloa","San-Pédro","Korhogo"].map(v=><option key={v}>{v}</option>)}</select></div>
                </div>
                <div style={{ marginBottom:9 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>Description</label>
                  <textarea value={annForm.description} onChange={e=>setAnnForm({...annForm,description:e.target.value})} style={{ width:"100%", minHeight:65, padding:"9px", borderRadius:8, border:`1.5px solid ${C.gray200}`, fontSize:13, boxSizing:"border-box", fontFamily:"inherit", resize:"vertical" }} placeholder="Décrivez le bien…"/>
                </div>
                <div style={{ marginBottom:9 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>Options (virgules)</label>
                  <input style={iS} placeholder="Piscine, Parking, Titre foncier…" value={annForm.options} onChange={e=>setAnnForm({...annForm,options:e.target.value})}/>
                </div>
                {annForm.imageUrl&&<img src={annForm.imageUrl} alt="" style={{ width:"100%", height:110, objectFit:"cover", borderRadius:9, marginBottom:9 }} onError={e=>e.target.style.display="none"}/>}
                <div style={{ background:C.goldLight, borderRadius:8, padding:"7px 11px", marginBottom:11 }}>
                  <p style={{ margin:0, fontSize:11, color:"#92400e", fontWeight:600 }}>⏳ Soumis à validation admin.</p>
                </div>
                <button onClick={publishAnnonce} style={{ width:"100%", padding:"12px", background:C.gold, color:C.navy, border:"none", borderRadius:12, fontWeight:900, fontSize:14, cursor:"pointer" }}>Soumettre</button>
              </>
            )}
          </div>
        </div>
      )}

      {editProfil&&(
        <Modal onClose={()=>setEditProfil(false)}>
          <h2 style={{ margin:"0 0 16px", color:C.navy, fontSize:16, fontWeight:900 }}>✏️ Mon profil</h2>
          {[["Nom entreprise","company","text","Koné & Associés"],["WhatsApp","whatsapp","text","+2250707070707"],["Téléphone","phone","text","+2250707070707"]].map(([lb,key,type,ph])=>(
            <div key={key} style={{ marginBottom:11 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>{lb}</label>
              <input style={iS} type={type} placeholder={ph} value={pf[key]} onChange={e=>setPf({...pf,[key]:e.target.value})}/>
            </div>
          ))}
          <div style={{ marginBottom:11 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>Ville</label>
            <select style={iS} value={pf.ville} onChange={e=>setPf({...pf,ville:e.target.value})}>{["Abidjan","Bouaké","Yamoussoukro","Daloa","San-Pédro","Korhogo"].map(v=><option key={v}>{v}</option>)}</select>
          </div>
          <div style={{ marginBottom:13 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.gray600, display:"block", marginBottom:3 }}>Bio / Description</label>
            <textarea value={pf.description} onChange={e=>setPf({...pf,description:e.target.value})} style={{ width:"100%", minHeight:75, padding:"9px", borderRadius:8, border:`1.5px solid ${C.gray200}`, fontSize:13, boxSizing:"border-box", fontFamily:"inherit", resize:"vertical" }} placeholder="Décrivez votre activité…"/>
          </div>
          <div style={{ display:"flex", gap:9 }}>
            <Btn onClick={saveProfil} style={{ flex:1 }}>💾 Enregistrer</Btn>
            <Btn onClick={()=>setEditProfil(false)} v="secondary" style={{ flex:1 }}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════
function AdminPanel({ users, setUsers }) {
  const [listings, setListings] = useState([]);
  const [convs, setConvs] = useState([]);
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.get("listings"),db.get("conversations")]).then(([l,c])=>{ setListings(l); setConvs(c); setLoading(false); });
  }, []);

  const updateUser = async (id, data) => {
    await db.update("users", `id=eq.${id}`, data);
    setUsers(prev => prev.map(u => u.id===id ? {...u,...data} : u));
  };

  const updateListing = async (id, data) => {
    await db.update("listings", `id=eq.${id}`, data);
    setListings(prev => prev.map(l => l.id===id ? {...l,...data} : l));
  };

  const deleteListing = async (id) => {
    await db.delete("listings", `id=eq.${id}`);
    setListings(prev => prev.filter(l => l.id!==id));
  };

  const stats=[
    {l:"Promoteurs",v:users.filter(u=>u.role==="promoteur").length,c:C.navy,i:"🏢"},
    {l:"Clients",v:users.filter(u=>u.role==="client").length,c:C.teal,i:"👤"},
    {l:"Annonces",v:listings.length,c:C.gold,i:"🏠"},
    {l:"Conversations",v:convs.length,c:C.purple,i:"💬"},
  ];

  if(loading) return <Spinner/>;

  return (
    <div style={{ maxWidth:1000, margin:"0 auto", padding:"20px 16px" }}>
      <h2 style={{ margin:"0 0 16px", color:C.navy, fontWeight:900 }}>🛡️ Panneau d'administration</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
        {stats.map(s=><div key={s.l} style={{ background:C.white, borderRadius:12, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", borderLeft:`4px solid ${s.c}` }}><div style={{ fontSize:20 }}>{s.i}</div><div style={{ fontSize:24, fontWeight:900, color:s.c }}>{s.v}</div><div style={{ fontSize:11, color:C.gray400 }}>{s.l}</div></div>)}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["users","👥 Utilisateurs"],["annonces","🏠 Annonces"],["convs","💬 Conversations"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"8px 16px", borderRadius:9, border:"none", cursor:"pointer", fontWeight:700, fontSize:12, background:tab===k?C.navy:C.gray100, color:tab===k?C.white:C.gray600 }}>{l}</button>
        ))}
      </div>

      {tab==="users"&&users.filter(u=>u.role!=="admin").map(u=>(
        <div key={u.id} style={{ background:C.white, borderRadius:12, padding:"11px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:11, boxShadow:"0 1px 5px rgba(0,0,0,.04)" }}>
          <Avatar user={u} size={40}/>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 1px", fontWeight:700, fontSize:13 }}>{u.company||u.name}</p>
            <p style={{ margin:"0 0 4px", fontSize:11, color:C.gray400 }}>{u.email} · {u.ville}</p>
            <div style={{ display:"flex", gap:5 }}><Bdg s={u.role}/>{u.verified&&<span style={{ background:C.greenLight, color:C.green, padding:"2px 7px", borderRadius:20, fontSize:10, fontWeight:700 }}>✓</span>}</div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <Bdg s={u.status}/>
            {u.role==="promoteur"&&<Btn onClick={()=>updateUser(u.id,{verified:!u.verified})} v={u.verified?"secondary":"success"} sm>{u.verified?"Retirer":"✓ Vérifier"}</Btn>}
            <Btn onClick={()=>updateUser(u.id,{status:u.status==="actif"?"suspendu":"actif"})} v={u.status==="actif"?"danger":"success"} sm>{u.status==="actif"?"Suspendre":"Réactiver"}</Btn>
          </div>
        </div>
      ))}

      {tab==="annonces"&&listings.map(l=>{
        const promo=users.find(u=>u.id===l.promoteur_id);
        return (
          <div key={l.id} style={{ background:C.white, borderRadius:12, padding:"11px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:11, boxShadow:"0 1px 5px rgba(0,0,0,.04)" }}>
            <img src={(l.images||[])[0]||"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"} alt="" style={{ width:62, height:48, objectFit:"cover", borderRadius:8 }}/>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 1px", fontWeight:700, fontSize:13 }}>{l.titre}</p>
              <p style={{ margin:0, fontSize:11, color:C.gray400 }}>{promo?.company||promo?.name} · {l.adresse}</p>
            </div>
            <Bdg s={l.statut}/><Bdg s={l.disponibilite}/>
            <div style={{ display:"flex", gap:5 }}>
              <Btn onClick={()=>updateListing(l.id,{statut:"approuvé"})} v="success" sm>✓</Btn>
              <Btn onClick={()=>updateListing(l.id,{statut:"refusé"})} v="danger" sm>✗</Btn>
              <Btn onClick={()=>deleteListing(l.id)} v="danger" sm>🗑</Btn>
            </div>
          </div>
        );
      })}

      {tab==="convs"&&convs.map(c=>(
        <div key={c.id} style={{ background:C.white, borderRadius:12, padding:"13px 14px", marginBottom:8, boxShadow:"0 1px 5px rgba(0,0,0,.04)" }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 2px", fontWeight:700, fontSize:13 }}>💬 {c.listing_titre}</p>
              <p style={{ margin:0, fontSize:11, color:C.gold }}>{c.participants.map(id=>users.find(u=>u.id===id)?.name||id).join(" ↔ ")}</p>
            </div>
            <button onClick={async()=>{
              const msgs = await db.get("messages",`conversation_id=eq.${c.id}&order=created_at.asc`);
              const lines=msgs.map(m=>`[${new Date(m.created_at).toLocaleTimeString("fr-FR")}] ${users.find(u=>u.id===m.sender_id)?.name||"?"} : ${m.type==="media"?"[MÉDIA]":m.text}`);
              const blob=new Blob([`=== CAPTURE ===\n${c.listing_titre}\n${new Date().toLocaleString("fr-FR")}\n---\n`+lines.join("\n")],{type:"text/plain"});
              const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`conv_${c.id}.txt`; a.click(); URL.revokeObjectURL(url);
            }} style={{ background:"#1e1e2e", color:"#a78bfa", border:"1px solid #a78bfa44", borderRadius:8, padding:"6px 12px", fontWeight:800, fontSize:11, cursor:"pointer" }}>📋 Capturer</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [convs, setConvs] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [tab, setTab] = useState("feed");

  // Charger les users et convs au démarrage
  useEffect(() => {
    if(!currentUser) return;
    db.get("users").then(setUsers);
    db.get("conversations").then(setConvs);
    db.get("notifications", `user_id=eq.${currentUser.id}`).then(setNotifs);
  }, [currentUser]);

  // Leaflet CDN
  useEffect(() => {
    if(document.getElementById("leaflet-js")) return;
    const s=document.createElement("script"); s.id="leaflet-js"; s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.async=true; document.head.appendChild(s);
    const l=document.createElement("link"); l.rel="stylesheet"; l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l);
  }, []);

  const addNotif = async (userId, type, text, link) => {
    const n = await db.insert("notifications",{user_id:userId,type,text,link,lu:false});
    setNotifs(prev => n[0].user_id===currentUser?.id ? [n[0],...prev] : prev);
  };

  const handleLogin = (u) => { setCurrentUser(u); setTab(u.role==="admin"?"gestion":"feed"); };
  const handleLogout = () => { setCurrentUser(null); setTab("feed"); setUsers([]); setConvs([]); setNotifs([]); };

  if(!currentUser) return <AuthScreen onLogin={handleLogin}/>;

  const me = users.find(u=>u.id===currentUser.id)||currentUser;

  return (
    <div style={{ fontFamily:"'Segoe UI', system-ui, sans-serif", minHeight:"100vh", background:C.gray50, color:C.gray800 }}>
      <Nav user={me} tab={tab} setTab={setTab} notifs={notifs} setNotifs={setNotifs} onLogout={handleLogout}/>
      <div style={{ paddingBottom:40 }}>
        {tab==="feed"&&<FeedPage user={me} users={users}/>}
        {tab==="annonces"&&<AnnoncesPage user={me} users={users} setUsers={setUsers} setConvs={setConvs} setTab={setTab} addNotif={addNotif}/>}
        {tab==="carte"&&<CartePage user={me} users={users} setConvs={setConvs} setTab={setTab}/>}
        {tab==="favoris"&&me.role==="client"&&<FavorisPage user={me} users={users}/>}
        {tab==="messages"&&<MessagesPage user={me} users={users} convs={convs} setConvs={setConvs}/>}
        {tab==="moncompte"&&me.role==="promoteur"&&<MonEspacePage user={me} setUsers={setUsers}/>}
        {tab==="gestion"&&me.role==="admin"&&<AdminPanel users={users} setUsers={setUsers}/>}
      </div>
    </div>
  );
}
