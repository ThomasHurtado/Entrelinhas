import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen, Cat, Coffee, Flower2, Users, CalendarCheck, LayoutDashboard, Plus,
  Trash2, Pencil, Check, X, ChevronRight, UserPlus, Search,
  MoreHorizontal, Sparkles, Menu, LibraryBig, CalendarPlus, CalendarDays,
  ChevronLeft, ChevronRight as ChevronRightIcon, LogIn, LogOut, Save, StickyNote, Lightbulb, Wallet, CircleDollarSign
} from "lucide-react";
import "./styles.css";
import Notebook from "./Notebook.jsx";
import { api } from "./api.js";
import { birthdaysInMonth, normalizeBirthDate } from "./birthdays.js";

function formatDate(date) {
  if (!date) return "";
  const [y,m,d] = date.split("-");
  return `${d}/${m}/${y}`;
}
function shortDate(date) {
  if (!date) return "";
  const [y,m,d] = date.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${d} ${months[Number(m)-1]}`;
}
function frequencyFor(participantId, meetings) {
  const relevant = meetings.filter(m => m.participantIds.includes(participantId));
  if (!relevant.length) return 0;
  const present = relevant.filter(m => m.attendance[participantId]).length;
  return Math.round((present / relevant.length) * 100);
}
function relevantStats(participantId, meetings) {
  const relevant = meetings.filter(m => m.participantIds.includes(participantId));
  return {
    total: relevant.length,
    present: relevant.filter(m => m.attendance[participantId]).length
  };
}
function Avatar({ name, size = "normal" }) {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("");
  return <div className={`avatar ${size}`}>{initials}</div>;
}

function Bow({ className = "" }) {
  return <svg className={className} viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M29 23C17 6 4 7 6 20s14 13 23 6M35 23C47 6 60 7 58 20s-14 13-23 6" fill="var(--purple-light)"/>
    <path d="M28 28 18 43l-1-9-8 1 15-11m12 4 10 15 1-9 8 1-15-11"/>
    <rect x="27" y="20" width="10" height="10" rx="4" fill="var(--purple-light)"/>
  </svg>;
}

function ReadingDecoration({ className = "" }) {
  return <div className={`reading-decoration ${className}`} aria-hidden="true">
    <div className="reading-halo"/>
    <Flower2 className="reading-flower" size={38} strokeWidth={1.4}/>
    <Sparkles className="reading-sparkles" size={23} strokeWidth={1.3}/>
    <div className="reading-cat"><Cat size={65} strokeWidth={1.3}/><Bow className="cat-bow"/></div>
    <div className="reading-book reading-book-top"><span/><span/><span/></div>
    <div className="reading-book reading-book-bottom"><span/><span/><span/></div>
    <div className="reading-coffee"><Coffee size={39} strokeWidth={1.4}/></div>
    <div className="reading-shelf"/>
  </div>;
}

function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    try { return sessionStorage.getItem("entrelinhas.loggedIn") === "true"; }
    catch { return false; }
  });
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [participantName, setParticipantName] = useState("");
  const [participantBirthDate, setParticipantBirthDate] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState("dashboard");
  const [participants, setParticipants] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [participantModal, setParticipantModal] = useState(false);
  const [meetingModal, setMeetingModal] = useState(false);
  const [form, setForm] = useState({ name: "", birthDate: "" });
  const [meetingForm, setMeetingForm] = useState({ title: "", date: "", participantIds: [] });
  const [mobileMenu, setMobileMenu] = useState(false);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const [birthdayMonth, setBirthdayMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`);
  const [notes, setNotes] = useState({});
  const [noteDraft, setNoteDraft] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [apiMessage, setApiMessage] = useState("Modo local: backend indisponível.");
  const [clubBalance, setClubBalance] = useState(0);
  const [balanceDraft, setBalanceDraft] = useState("0");
  const [editingBalance, setEditingBalance] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [ideaModal, setIdeaModal] = useState(false);
  const [ideaForm, setIdeaForm] = useState({ text: "", author: "" });

  useEffect(() => {
    let active = true;
    async function loadApiData() {
      try {
        await api.health();
        const [remoteParticipants, remoteMeetings, remoteNotes, remoteFinance, remoteIdeas] = await Promise.all([
          api.participants.list(), api.meetings.list(), api.notes.list(), api.finance.get(), api.ideas.list()
        ]);
        if (!active) return;
        const mappedParticipants = remoteParticipants.map(p => ({
          id: p._id, name: p.name, birthDate: normalizeBirthDate(p.birthDate),
          joined: p.joined ? new Date(p.joined).toLocaleDateString("pt-BR") : "—"
        }));
        const mappedMeetings = remoteMeetings.map(m => ({
          id: m._id, title: m.title, date: m.date,
          participantIds: (m.participants || []).map(String),
          attendance: Object.fromEntries((m.attendance || []).map(a => [String(a.participant), Boolean(a.present)]))
        }));
        setParticipants(mappedParticipants);
        setMeetings(mappedMeetings);
        setSelectedMeeting(mappedMeetings.at(-1)?.id || null);
        setNotes(Object.fromEntries(remoteNotes.map(n => [n.date, n.text])));
        setClubBalance(Number(remoteFinance?.balance || 0));
        setBalanceDraft(String(Number(remoteFinance?.balance || 0)));
        setIdeas(remoteIdeas.map(i => ({ id:i._id, text:i.text, author:i.author, status:i.status || "pending" })));
        setApiOnline(true);
        setApiMessage("Conectado ao MongoDB.");
      } catch (error) {
        if (!active) return;
        setApiOnline(false);
        setApiMessage("Não foi possível carregar os dados do servidor. Atualize a página para tentar novamente. Alterações feitas agora serão temporárias.");
      } finally {
        if (active) setLoadingData(false);
      }
    }
    loadApiData();
    return () => { active = false; };
  }, []);

  const currentMeeting = meetings.find(m => m.id === selectedMeeting) || meetings[meetings.length - 1];
  const currentParticipants = currentMeeting
    ? participants.filter(p => currentMeeting.participantIds.includes(p.id))
    : [];

  const totalPresent = currentMeeting
    ? currentParticipants.filter(p => currentMeeting.attendance[p.id]).length
    : 0;

  const averageFrequency = participants.length
    ? Math.round(participants.reduce((sum,p) => sum + frequencyFor(p.id, meetings), 0) / participants.length)
    : 0;

  const filtered = useMemo(
    () => participants.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [participants, search]
  );
  const monthBirthdays = birthdaysInMonth(participants, birthdayMonth.getMonth() + 1);

  async function toggleAttendance(id) {
    if (!currentMeeting) return;
    const nextPresent = !currentMeeting.attendance[id];
    setMeetings(prev => prev.map(m => {
      if (m.id !== selectedMeeting || !m.participantIds.includes(id)) return m;
      return { ...m, attendance: { ...m.attendance, [id]: nextPresent } };
    }));
    if (apiOnline) {
      try { await api.meetings.attendance(selectedMeeting, id, nextPresent); }
      catch { setApiOnline(false); setApiMessage("Conexão perdida: alterações seguintes ficarão somente no navegador."); }
    }
  }

  function toggleMeetingParticipant(id) {
    setMeetingForm(prev => {
      const exists = prev.participantIds.includes(id);
      return {
        ...prev,
        participantIds: exists
          ? prev.participantIds.filter(x => x !== id)
          : [...prev.participantIds, id]
      };
    });
  }

  async function addParticipant(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const birthDate = normalizeBirthDate(form.birthDate);
    if (form.birthDate && (!birthDate || birthDate > todayKey)) return;
    let participant = { id: Date.now(), name: form.name.trim(), birthDate, joined: new Date().toLocaleDateString("pt-BR") };
    if (apiOnline) {
      try {
        const saved = await api.participants.create({ name: form.name.trim(), birthDate: birthDate || null });
        participant = { id: saved._id, name: saved.name, birthDate: normalizeBirthDate(saved.birthDate), joined: new Date(saved.joined).toLocaleDateString("pt-BR") };
      } catch { setApiOnline(false); setApiMessage("Falha ao salvar no backend; participante mantido apenas localmente."); }
    }
    setParticipants(prev => [...prev, participant]);
    setForm({ name: "", birthDate: "" }); setParticipantModal(false); setPage("participants");
  }

  async function addMeeting(e) {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.date || !meetingForm.participantIds.length) return;
    let id = Date.now();
    let participantIds = [...meetingForm.participantIds];
    let attendance = Object.fromEntries(participantIds.map(pid => [pid, false]));
    if (apiOnline) {
      try {
        const saved = await api.meetings.create({ title: meetingForm.title.trim(), date: meetingForm.date, participantIds });
        id = saved._id; participantIds = (saved.participants || []).map(String);
        attendance = Object.fromEntries((saved.attendance || []).map(a => [String(a.participant), Boolean(a.present)]));
      } catch { setApiOnline(false); setApiMessage("Falha ao salvar encontro no backend; encontro mantido apenas localmente."); }
    }
    const meeting = { id, title: meetingForm.title.trim(), date: meetingForm.date, participantIds, attendance };
    setMeetings(prev => [...prev, meeting].sort((a,b) => a.date.localeCompare(b.date)));
    setSelectedMeeting(id); setMeetingForm({ title: "", date: "", participantIds: [] }); setMeetingModal(false); setPage("attendance");
  }

  async function removeParticipant(id) {
    const p = participants.find(x => x.id === id);
    if (!p || !window.confirm(`Excluir ${p.name} do clube?`)) return;
    if (apiOnline) {
      try { await api.participants.remove(id); }
      catch { setApiOnline(false); setApiMessage("Falha ao excluir no backend; exclusão aplicada apenas localmente."); }
    }
    setParticipants(prev => prev.filter(x => x.id !== id));
    setMeetings(prev => prev.map(m => ({ ...m, participantIds: m.participantIds.filter(pid => pid !== id), attendance: Object.fromEntries(Object.entries(m.attendance).filter(([pid]) => String(pid) !== String(id))) })));
  }

  function openNewMeeting() {
    setMeetingForm({
      title: "",
      date: "",
      participantIds: participants.map(p => p.id)
    });
    setMeetingModal(true);
  }

  async function updateParticipant(e) {
    e.preventDefault();
    const name = participantName.trim();
    if (!name || actionPending) return;
    const birthDate = normalizeBirthDate(participantBirthDate);
    if (participantBirthDate && (!birthDate || birthDate > todayKey)) return;
    setActionPending(true); setActionError("");
    try {
      if (apiOnline) await api.participants.update(editingParticipant.id, { name, birthDate: birthDate || null });
      setParticipants(prev => prev.map(p => p.id === editingParticipant.id ? { ...p, name, birthDate } : p));
      setEditingParticipant(null);
    } catch (error) {
      setActionError(`Não foi possível salvar o participante: ${error.message}`);
    } finally { setActionPending(false); }
  }

  async function removeIdea(idea) {
    if (actionPending || !window.confirm(`Excluir a ideia de ${idea.author}?`)) return;
    setActionPending(true); setActionError("");
    try {
      if (apiOnline) await api.ideas.remove(idea.id);
      setIdeas(prev => prev.filter(i => i.id !== idea.id));
    } catch (error) {
      setActionError(`Não foi possível excluir a ideia: ${error.message}`);
    } finally { setActionPending(false); }
  }

  async function removeMeeting(meeting) {
    if (actionPending || !window.confirm(`Excluir o encontro “${meeting.title}” e seus registros de presença?`)) return;
    setActionPending(true); setActionError("");
    try {
      if (apiOnline) await api.meetings.remove(meeting.id);
      const remaining = meetings.filter(m => m.id !== meeting.id);
      setMeetings(remaining);
      setSelectedMeeting(remaining.at(-1)?.id ?? null);
    } catch (error) {
      setActionError(`Não foi possível excluir o encontro: ${error.message}`);
    } finally { setActionPending(false); }
  }


  async function handleLogin(e) {
    e.preventDefault();
    if (loadingData) return;
    if (!loginForm.email.trim() || !loginForm.password.trim()) { setLoginError("Preencha o usuário e a senha para entrar."); return; }
    if (apiOnline) {
      try { await api.login(loginForm); }
      catch (error) { setLoginError(error.message?.replace(/e-?mail/gi, "usuário") || "Usuário ou senha incorretos."); return; }
    }
    try { sessionStorage.setItem("entrelinhas.loggedIn", "true"); } catch {}
    setLoginError(""); setLoggedIn(true);
  }

  function logout() {
    try { sessionStorage.removeItem("entrelinhas.loggedIn"); } catch {}
    setLoggedIn(false);
    setLoginForm({ email: "", password: "" });
    setPage("dashboard");
  }

  function selectCalendarDay(dateKey) {
    setSelectedDay(dateKey);
    setNoteDraft(notes[dateKey] || "");
  }

  async function saveNote() {
    const text = noteDraft.trim();
    setNotes(prev => { const next = { ...prev }; if (text) next[selectedDay] = text; else delete next[selectedDay]; return next; });
    if (apiOnline) {
      try { if (text) await api.notes.save(selectedDay, text); else await api.notes.remove(selectedDay); }
      catch { setApiOnline(false); setApiMessage("Falha ao salvar anotação no backend; anotação mantida apenas localmente."); }
    }
  }

  async function saveBalance() {
    const value = Number(String(balanceDraft).replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return;
    setClubBalance(value); setEditingBalance(false);
    if (apiOnline) {
      try { const saved = await api.finance.update(value); setClubBalance(Number(saved.balance || 0)); setBalanceDraft(String(Number(saved.balance || 0))); }
      catch { setApiOnline(false); setApiMessage("Falha ao atualizar o saldo no backend; valor mantido apenas localmente."); }
    }
  }

  async function addIdea(e) {
    e.preventDefault();
    const text = ideaForm.text.trim(), author = ideaForm.author.trim();
    if (!text || !author) return;
    let idea = { id: Date.now(), text, author, status: "pending" };
    if (apiOnline) {
      try { const saved = await api.ideas.create({text,author}); idea = {id:saved._id,text:saved.text,author:saved.author,status:saved.status}; }
      catch { setApiOnline(false); setApiMessage("Falha ao salvar a ideia no backend; ideia mantida apenas localmente."); }
    }
    setIdeas(prev => [idea, ...prev]); setIdeaForm({text:"",author:""}); setIdeaModal(false);
  }

  async function setIdeaStatus(id, status) {
    setIdeas(prev => prev.map(i => i.id === id ? {...i,status} : i));
    if (apiOnline) {
      try { await api.ideas.status(id,status); }
      catch { setApiOnline(false); setApiMessage("Falha ao atualizar a ideia no backend; status mantido apenas localmente."); }
    }
  }

  function changeMonth(offset) {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  function calendarCells() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const start = first.getDay();
    const cells = Array(start).fill(null);
    for (let day = 1; day <= days; day++) {
      cells.push({
        day,
        key: `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
      });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-decoration login-decoration-one"/>
        <div className="login-decoration login-decoration-two"/>
        <form className="login-card" onSubmit={handleLogin}>
          <Bow className="login-bow"/>
          <div className="login-brand">
            <div className="brand-icon"><BookOpen size={25}/></div>
            <div><strong>Entrelinhas</strong><span>Clube do Livro</span></div>
          </div>
          <div className="login-copy">
            <p className="eyebrow">BEM-VINDO</p>
            <h1>Entre na sua conta</h1>
            <p>Acesse o painel para organizar participantes, encontros, presenças e anotações.</p>
          </div>
          <label>Usuário<input type="text" autoFocus value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} placeholder="Digite o nome do usuário"/></label>
          <label>Senha<input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Digite sua senha"/></label>
          {loginError && <div className="login-error">{loginError}</div>}
          <button className="primary login-button" type="submit" disabled={loadingData}><LogIn size={18}/> Entrar</button>
          <p className="login-hint">Protótipo front-end: qualquer usuário e senha preenchidos permitem o acesso.</p>
          <div className="login-flourish" aria-hidden="true"><Flower2 size={17}/><BookOpen size={20}/><Coffee size={18}/></div>
        </form>
      </div>
    );
  }

  const nav = [
    ["dashboard", "Visão geral", LayoutDashboard],
    ["participants", "Participantes", Users],
    ["attendance", "Encontros", CalendarCheck],
    ["calendar", "Calendário", CalendarDays],
    ["ideas", "Ideias", Lightbulb],
    ["notebook", "Caderno", BookOpen]
  ];

  return (
    <div className="app">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><BookOpen size={22}/></div>
          <div><strong>Entrelinhas</strong><span>Clube do Livro</span></div>
        </div>
        <div className="nav-label">MENU</div>
        <nav>
          {nav.map(([id,label,Icon]) => (
            <button key={id} className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => { setPage(id); setMobileMenu(false); }}>
              <Icon size={19}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-reading">
          <ReadingDecoration/>
          <p>Entre páginas e café,<br/><span>boas histórias florescem.</span></p>
        </div>
        <div className="sidebar-bottom">
          <div className="mini-book">
            <Sparkles size={17}/>
            <div><b>Leitura atual</b><span>Entrelinhas</span></div>
          </div>
          <div className="profile-mini">
            <Avatar name="Organizador" size="small"/>
            <div><b>Organizador</b><span>Administrador</span></div>
<button className="logout-mini" title="Sair" onClick={logout}><LogOut size={17}/></button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}><Menu/></button>
          <div>
            <p className="eyebrow">CLUBE DO LIVRO</p>
            <h1>{page === "dashboard" ? "Visão geral" : page === "participants" ? "Participantes" : page === "attendance" ? "Controle de presença" : page === "calendar" ? "Calendário" : page === "notebook" ? "Caderno" : "Ideias"}</h1>
          </div>
          <div className="topbar-flourish" aria-hidden="true"><Flower2/><span/><Bow/><span/><Coffee/></div>
        </header>
        {actionError && !editingParticipant && <div className="action-error" role="alert">{actionError}</div>}

        <div hidden={page !== "notebook"}>
          <Notebook decoration={<ReadingDecoration className="welcome-reading"/>} bow={<Bow className="note-bow"/>}/>
        </div>

        {page === "dashboard" && (
          <section className="content">
            <div className="welcome">
              <div>
                <p className="eyebrow">BEM-VINDO DE VOLTA</p>
                <h2>Vamos acompanhar o nosso clube.</h2>
                <p>Organize os encontros e acompanhe a participação de cada leitor.</p>
              </div>
              <ReadingDecoration className="welcome-reading"/>
            </div>

            <div className="dashboard-highlights">
            <div className="panel finance-panel">
              <div className="finance-main">
                <div className="finance-icon"><Wallet size={24}/></div>
                <div><p className="eyebrow">CAIXA DO CLUBE</p><h3>Saldo disponível</h3><p>Valor registrado e sincronizado com o banco de dados.</p></div>
              </div>
              <div className="finance-value">
                {editingBalance ? <div className="balance-editor"><span>R$</span><input type="number" min="0" step="0.01" value={balanceDraft} onChange={e=>setBalanceDraft(e.target.value)}/><button className="primary" onClick={saveBalance}><Save size={16}/> Salvar</button></div>
                : <><strong>{clubBalance.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong><button className="secondary" onClick={()=>{setBalanceDraft(String(clubBalance));setEditingBalance(true)}}>Atualizar saldo</button></>}
              </div>
            </div>

            <section className="panel birthday-panel" aria-labelledby="birthday-heading">
              <div className="panel-head">
                <div><p className="eyebrow">DATAS PARA CELEBRAR</p><h3 id="birthday-heading">Aniversariantes do mês ({monthBirthdays.length})</h3></div>
                <Flower2 size={26} className="birthday-flower" aria-hidden="true"/>
              </div>
              <div className="birthday-month-nav">
                <button className="calendar-nav" aria-label="Mês anterior dos aniversariantes" onClick={() => setBirthdayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}><ChevronLeft size={18}/></button>
                <span aria-live="polite">{birthdayMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
                <button className="calendar-nav" aria-label="Próximo mês dos aniversariantes" onClick={() => setBirthdayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}><ChevronRightIcon size={18}/></button>
              </div>
              <div className="birthday-list dashboard-scroll-list" role="region" aria-label="Lista de aniversariantes" tabIndex={0}>
                {monthBirthdays.length === 0 ? <div className="empty">Nenhum aniversariante cadastrado neste mês.</div> : <ul>{monthBirthdays.map(p => <li className="birthday-row" key={p.id}>
                  <div className="person"><Avatar name={p.name} size="small"/><b>{p.name}</b></div>
                  <span className="birthday-date">{formatDate(p.birthDate).slice(0, 5)}</span>
                </li>)}</ul>}
              </div>
            </section>
            </div>

            <div className="stats-grid">
              <Stat icon={Users} label="Participantes" value={participants.length} note="membros cadastrados"/>
              <Stat icon={CalendarCheck} label="Encontros" value={meetings.length} note="encontros cadastrados"/>
              <Stat icon={Check} label="Presentes no último" value={totalPresent} note={`de ${currentParticipants.length} participantes`}/>
              <Stat icon={Sparkles} label="Frequência média" value={`${averageFrequency}%`} note="considerando cada vínculo"/>
            </div>

            <div className="grid-two">
              <div className="panel">
                <div className="panel-head">
                  <div><h3>Encontros</h3><p>Cada encontro possui sua própria lista</p></div>
                  <button className="small-primary" onClick={openNewMeeting}><Plus size={15}/> Novo</button>
                </div>
                <div className="meeting-list dashboard-scroll-list" role="region" aria-label="Lista de encontros" tabIndex={0}>
                  {[...meetings].sort((a,b)=>b.date.localeCompare(a.date)).map(m => (
                    <button className="meeting-line" key={m.id}
                      onClick={() => { setSelectedMeeting(m.id); setPage("attendance"); }}>
                      <span className="meeting-date">{shortDate(m.date)}</span>
                      <span className="meeting-info"><b>{m.title}</b><small>{m.participantIds.length} participantes</small></span>
                      <ChevronRight size={17}/>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div><h3>Frequência individual</h3><p>Somente encontros em que a pessoa participou do clube</p></div>
                </div>
                <div className="frequency-list dashboard-scroll-list" role="region" aria-label="Lista de frequência individual" tabIndex={0}>
                  {[...participants].sort((a,b)=>frequencyFor(b.id,meetings)-frequencyFor(a.id,meetings)).map(p => {
                    const f = frequencyFor(p.id, meetings);
                    const stats = relevantStats(p.id, meetings);
                    return <div className="frequency-row" key={p.id}>
                      <Avatar name={p.name} size="small"/>
                      <div className="freq-name"><b>{p.name}</b><div className="progress"><span style={{width:`${f}%`}}/></div></div>
                      <div className="freq-value"><strong>{f}%</strong><small>{stats.present}/{stats.total}</small></div>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {page === "participants" && (
          <section className="content">
            <div className="page-intro">
              <div><h2>Todos os participantes</h2><p>A frequência de cada pessoa é calculada pelos encontros em que ela esteve na lista.</p></div>
              <button className="primary" onClick={() => setParticipantModal(true)}><Plus size={18}/> Cadastrar</button>
            </div>
            <div className="panel table-panel">
              <div className="toolbar">
                <div className="search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar participante..." /></div>
                <span className="muted">{filtered.length} participantes</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>PARTICIPANTE</th><th>ANIVERSÁRIO</th><th>ENCONTROS</th><th>PRESENÇAS</th><th>FREQUÊNCIA</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(p => {
                      const stats = relevantStats(p.id, meetings);
                      const f = frequencyFor(p.id, meetings);
                      return <tr key={p.id}>
                        <td><div className="person"><Avatar name={p.name}/><div><b>{p.name}</b></div></div></td>
                        <td>{p.birthDate ? formatDate(p.birthDate).slice(0, 5) : "Não informado"}</td>
                        <td>{stats.total}</td>
                        <td>{stats.present} / {stats.total}</td>
                        <td><div className="freq-cell"><span>{f}%</span><div className="progress"><span style={{width:`${f}%`}}/></div></div></td>
                        <td><div className="participant-actions"><button className="danger-icon" title={`Editar ${p.name}`} aria-label={`Editar ${p.name}`} onClick={()=>{setEditingParticipant(p);setParticipantName(p.name);setParticipantBirthDate(p.birthDate || "");setActionError("");}}><Pencil size={17}/></button><button className="danger-icon" title="Excluir" onClick={()=>removeParticipant(p.id)}><Trash2 size={17}/></button></div></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {page === "attendance" && currentMeeting && (
          <section className="content">
            <div className="page-intro">
              <div><h2>Presença</h2><p>Escolha um encontro para ver apenas os participantes vinculados a ele.</p></div>
              <button className="primary" onClick={openNewMeeting}><CalendarPlus size={18}/> Novo encontro</button>
            </div>

            <div className="meeting-selector">
              {[...meetings].sort((a,b)=>a.date.localeCompare(b.date)).map(m => (
                <button key={m.id} className={selectedMeeting === m.id ? "meeting-select active" : "meeting-select"}
                  onClick={()=>setSelectedMeeting(m.id)}>
                  <span>{shortDate(m.date)}</span><b>{m.title}</b><small>{m.participantIds.length} membros</small>
                </button>
              ))}
            </div>

            <div className="panel attendance-panel">
              <div className="panel-head">
                <div><h3>{currentMeeting.title}</h3><p>{formatDate(currentMeeting.date)} · {currentParticipants.length} participantes neste encontro</p></div>
                <div className="meeting-actions"><div className="attendance-total"><b>{totalPresent}</b> presentes</div><button className="secondary" disabled={actionPending} onClick={()=>removeMeeting(currentMeeting)}><Trash2 size={17}/> Excluir encontro</button></div>
              </div>
              <div className="attendance-list">
                {currentParticipants.length === 0 ? (
                  <div className="empty">Nenhum participante foi vinculado a este encontro.</div>
                ) : currentParticipants.map(p => {
                  const present = !!currentMeeting.attendance[p.id];
                  const f = frequencyFor(p.id, meetings);
                  return <div className="attendance-row" key={p.id}>
                    <div className="person"><Avatar name={p.name}/><div><b>{p.name}</b><span>{f}% de frequência · {relevantStats(p.id,meetings).present}/{relevantStats(p.id,meetings).total} encontros</span></div></div>
                    <button className={present ? "presence present" : "presence absent"} onClick={()=>toggleAttendance(p.id)}>
                      {present ? <><Check size={18}/> Presente</> : <><X size={18}/> Ausente</>}
                    </button>
                  </div>;
                })}
              </div>
            </div>
          </section>
        )}

        {page === "attendance" && !currentMeeting && (
          <section className="content"><div className="page-intro"><div><h2>Nenhum encontro cadastrado</h2><p>Crie um encontro para registrar presenças.</p></div><button className="primary" onClick={openNewMeeting}><CalendarPlus size={18}/> Novo encontro</button></div></section>
        )}

        {page === "calendar" && (
          <section className="content">
            <div className="page-intro">
              <div><h2>Calendário</h2><p>Consulte e organize as anotações de cada mês.</p></div>
            </div>
            <div className="calendar-layout">
              <div className="panel calendar-panel">
                <div className="calendar-head">
                  <button className="calendar-nav" aria-label="Mês anterior" onClick={()=>changeMonth(-1)}><ChevronLeft size={20}/></button>
                  <div>
                    <p className="eyebrow">CALENDÁRIO</p>
                    <h3>{calendarMonth.toLocaleDateString("pt-BR", { month:"long", year:"numeric" })}</h3>
                  </div>
                  <button className="calendar-nav" aria-label="Próximo mês" onClick={()=>changeMonth(1)}><ChevronRightIcon size={20}/></button>
                </div>
                <div className="weekdays">
                  {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><span key={d}>{d}</span>)}
                </div>
                <div className="calendar-grid">
                  {calendarCells().map((cell,index) => cell ? (
                    <button key={cell.key} className={`calendar-day ${selectedDay===cell.key?"selected":""} ${notes[cell.key]?"has-note":""}`} onClick={()=>selectCalendarDay(cell.key)}>
                      <span>{cell.day}</span>
                      {notes[cell.key] && <i/>}
                    </button>
                  ) : <div className="calendar-day empty-day" key={`empty-${index}`}/>)}
                </div>
              </div>

              <div className="panel note-panel">
                <Bow className="note-bow"/>
                <div className="note-icon"><StickyNote size={21}/></div>
                <p className="eyebrow">ANOTAÇÃO DO DIA</p>
                <h3>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR", {day:"2-digit", month:"long", year:"numeric"})}</h3>
                <p className="note-help">Registre lembretes, pautas, livros ou qualquer observação importante para esta data.</p>
                <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="Escreva sua anotação aqui..."/>
                <div className="note-actions">
                  <span>{noteDraft.length} caracteres</span>
                  <button className="primary" onClick={saveNote}><Save size={17}/> Salvar anotação</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {page === "ideas" && (
          <section className="content">
            <div className="page-intro">
              <div><h2>Ideias do clube</h2><p>Registre sugestões dos participantes e acompanhe quais foram aceitas.</p></div>
              <button className="primary" onClick={()=>setIdeaModal(true)}><Plus size={18}/> Nova ideia</button>
            </div>
            {ideas.length === 0 ? <div className="panel ideas-empty"><Lightbulb size={34}/><h3>Nenhuma ideia cadastrada</h3><p>Adicione a primeira sugestão para o clube.</p></div> :
            <div className="ideas-grid">{ideas.map(idea => <article className="panel idea-card" key={idea.id}>
              <div className="idea-top"><div className="idea-icon"><Lightbulb size={19}/></div><span className={`idea-status ${idea.status}`}>{idea.status === "accepted" ? "Aceita" : idea.status === "rejected" ? "Não aceita" : "Pendente"}</span></div>
              <p className="idea-text">{idea.text}</p><div className="idea-author">Ideia de <b>{idea.author}</b></div>
              <button className="danger-icon" disabled={actionPending} onClick={()=>removeIdea(idea)} aria-label={`Excluir ideia de ${idea.author}`}><Trash2 size={17}/> Excluir ideia</button>
              <div className="idea-actions"><button className={idea.status==="accepted"?"idea-accept active":"idea-accept"} onClick={()=>setIdeaStatus(idea.id,"accepted")}><Check size={17}/> Aceito</button><button className={idea.status==="rejected"?"idea-reject active":"idea-reject"} onClick={()=>setIdeaStatus(idea.id,"rejected")}><X size={17}/> Não aceito</button></div>
            </article>)}</div>}
          </section>
        )}

      </main>

      {editingParticipant && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={updateParticipant}>
            <div className="modal-head"><div><h2>Editar participante</h2><p>Altere o nome e a data de nascimento do membro do clube.</p></div><button type="button" className="close" aria-label="Fechar" disabled={actionPending} onClick={()=>setEditingParticipant(null)}><X/></button></div>
            <label>Nome completo<input autoFocus required value={participantName} onChange={e=>setParticipantName(e.target.value)}/></label>
            <label>Data de nascimento <span>(opcional)</span><input type="date" max={todayKey} value={participantBirthDate} disabled={actionPending} onChange={e=>setParticipantBirthDate(e.target.value)}/></label>
            {actionError && <div className="login-error" role="alert">{actionError}</div>}
            <div className="modal-actions"><button type="button" className="secondary" disabled={actionPending} onClick={()=>setEditingParticipant(null)}>Cancelar</button><button className="primary" type="submit" disabled={actionPending || !participantName.trim()}><Save size={18}/> {actionPending ? "Salvando..." : "Salvar alterações"}</button></div>
          </form>
        </div>
      )}

      {participantModal && (
        <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setParticipantModal(false)}>
          <form className="modal" onSubmit={addParticipant}>
            <div className="modal-head"><div><h2>Novo participante</h2><p>Adicione um novo membro ao Entrelinhas.</p></div><button type="button" className="close" onClick={()=>setParticipantModal(false)}><X/></button></div>
            <label>Nome completo<input autoFocus required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Maria Oliveira"/></label>
            <label>Data de nascimento <span>(opcional)</span><input type="date" max={todayKey} value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})}/></label>
            <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setParticipantModal(false)}>Cancelar</button><button className="primary" type="submit"><UserPlus size={18}/> Cadastrar participante</button></div>
          </form>
        </div>
      )}

      {ideaModal && (
        <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setIdeaModal(false)}>
          <form className="modal" onSubmit={addIdea}>
            <div className="modal-head"><div><h2>Nova ideia</h2><p>Registre uma sugestão feita para o clube.</p></div><button type="button" className="close" onClick={()=>setIdeaModal(false)}><X/></button></div>
            <label>Quem deu a ideia<input required value={ideaForm.author} onChange={e=>setIdeaForm({...ideaForm,author:e.target.value})} placeholder="Ex.: Ana Clara"/></label>
            <label>Ideia<textarea className="idea-modal-textarea" required value={ideaForm.text} onChange={e=>setIdeaForm({...ideaForm,text:e.target.value})} placeholder="Descreva a ideia..."/></label>
            <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setIdeaModal(false)}>Cancelar</button><button className="primary" type="submit"><Lightbulb size={18}/> Adicionar ideia</button></div>
          </form>
        </div>
      )}

      {meetingModal && (
        <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setMeetingModal(false)}>
          <form className="modal meeting-modal" onSubmit={addMeeting}>
            <div className="modal-head"><div><h2>Novo encontro</h2><p>Defina a data e quais participantes fazem parte deste encontro.</p></div><button type="button" className="close" onClick={()=>setMeetingModal(false)}><X/></button></div>
            <label>Título do encontro<input autoFocus required value={meetingForm.title} onChange={e=>setMeetingForm({...meetingForm,title:e.target.value})} placeholder="Ex.: Capítulos 13–15"/></label>
            <label>Data<input type="date" required value={meetingForm.date} onChange={e=>setMeetingForm({...meetingForm,date:e.target.value})}/></label>
            <div className="member-picker">
              <div className="picker-head"><b>Participantes deste encontro</b><span>{meetingForm.participantIds.length} selecionados</span></div>
              <div className="picker-list">
                {participants.map(p => {
                  const selected = meetingForm.participantIds.includes(p.id);
                  return <button type="button" key={p.id} className={selected ? "picker-item selected" : "picker-item"} onClick={()=>toggleMeetingParticipant(p.id)}>
                    <span className="check-circle">{selected && <Check size={13}/>}</span><Avatar name={p.name} size="small"/><span className="picker-name">{p.name}</span>
                  </button>;
                })}
              </div>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setMeetingModal(false)}>Cancelar</button><button className="primary" type="submit" disabled={!meetingForm.participantIds.length}><CalendarPlus size={18}/> Criar encontro</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({icon:Icon,label,value,note}) {
  return <div className="stat"><div className="stat-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}

createRoot(document.getElementById("root")).render(<App />);
