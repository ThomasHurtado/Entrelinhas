import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, BookOpen, Check } from "lucide-react";

import { api } from "./api.js";

function fromApi(page) {
  if (!page || typeof page._id !== "string" || typeof page.title !== "string" || typeof page.text !== "string") throw new Error("Resposta inválida do servidor.");
  return { id: page._id, title: page.title, text: page.text, savedTitle: page.title, savedText: page.text };
}
const blankDraft = () => ({ id: "draft:unloaded", title: "", text: "", savedTitle: "", savedText: "", localDraft: true });
const isDirty = page => page.title !== page.savedTitle || page.text !== page.savedText;

export default function Notebook({ decoration, bow }) {
  const [pages, setPages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mutating, setMutating] = useState(false);
  const lock = useRef(false);
  const [saveError, setSaveError] = useState("");
  const index = Math.max(0, pages.findIndex(p => p.id === selectedId));
  const current = pages[index];
  const words = current?.text.trim() ? current.text.trim().split(/\s+/u).length : 0;
  const dirty = pages.some(isDirty);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.notebook.list().then(data => {
      if (!Array.isArray(data)) throw new Error("Resposta inválida do servidor.");
      const next = data.map(fromApi);
      if (!active) return;
      setPages(prev => [...next, ...prev.filter(p => p.localDraft)]);
      setSelectedId(prev => prev === "draft:unloaded" ? prev : next[0]?.id ?? null);
      setLoadError("");
    }).catch(error => {
      if (!active) return;
      setLoadError("Não foi possível carregar o caderno. Você pode escrever nesta folha; o rascunho ainda não está salvo no servidor. Tente conectar novamente antes de sair.");
      setPages(prev => prev.length ? prev : [blankDraft()]);
      setSelectedId(prev => prev ?? "draft:unloaded");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const savePending = useCallback(async () => {
    if (lock.current || loading || loadError) return;
    lock.current = true;
    setBusy(true);
    setSaveError("");
    try {
      for (const page of pages.filter(isDirty)) {
        const body = { title: page.title, text: page.text };
        if (page.localDraft) {
          const saved = fromApi(await api.notebook.create(body));
          setPages(prev => prev.map(p => p.id === page.id ? { ...p, id: saved.id, localDraft: false, savedTitle: page.title, savedText: page.text } : p));
          setSelectedId(prev => prev === page.id ? saved.id : prev);
        } else {
          await api.notebook.update(page.id, body);
          setPages(prev => prev.map(p => p.id === page.id ? { ...p, savedTitle: page.title, savedText: page.text } : p));
        }
      }
    } catch (error) {
      setSaveError(`Não foi possível salvar: ${error.message}. Seu texto continua aberto; tente novamente antes de sair.`);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [pages, loading, loadError]);

  useEffect(() => {
    if (!dirty || busy || saveError || loading || loadError) return;
    const timer = setTimeout(savePending, 700);
    return () => clearTimeout(timer);
  }, [dirty, busy, saveError, loading, loadError, savePending]);

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(field, value) {
    setPages(prev => prev.map(p => p.id === current.id ? { ...p, [field]: value } : p));
  }

  async function addPage() {
    if (lock.current || dirty) return;
    lock.current = true;
    setBusy(true);
    setMutating(true);
    setSaveError("");
    try {
      const next = fromApi(await api.notebook.create({ title: "", text: "" }));
      setPages(prev => [...prev, next]);
      setSelectedId(next.id);
    } catch (error) { setSaveError(`Não foi possível criar a página: ${error.message}`); }
    finally { lock.current = false; setBusy(false); setMutating(false); }
  }

  async function removePage() {
    if (lock.current || dirty) return;
    if (!window.confirm(`Excluir a página “${current.title.trim() || `Página ${index + 1}`}”? Esta ação não pode ser desfeita.`)) return;
    lock.current = true;
    setBusy(true);
    setMutating(true);
    setSaveError("");
    try {
      if (!current.localDraft) await api.notebook.remove(current.id);
      const next = pages.filter(p => p.id !== current.id);
      setPages(next);
      setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
    } catch (error) { setSaveError(`Não foi possível excluir a página: ${error.message}`); }
    finally { lock.current = false; setBusy(false); setMutating(false); }
  }

  return <section className="content notebook-content">
    <div className="welcome notebook-welcome">
      <div><p className="eyebrow">ENTRE PALAVRAS E AFETOS</p><h2>Um cantinho para suas palavras</h2><p>Guarde pensamentos, trechos favoritos e histórias que merecem ficar.</p></div>
      {decoration}
    </div>
    {loadError && <div className="login-error" role="alert">{loadError} <button className="secondary" disabled={loading} onClick={() => setReload(n => n + 1)}>{loading ? "Conectando…" : "Tentar conectar novamente"}</button></div>}
    {loading && <p role="status">Carregando caderno…</p>}
    {(!loading || current) && <>
      <div className="notebook-toolbar">
        {current && <label className="notebook-page-picker"><BookOpen size={18}/><span>Página</span><select aria-label="Escolher página do caderno" value={current.id} onChange={e => setSelectedId(e.target.value)}>{pages.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.title.trim() || "Sem título"}</option>)}</select></label>}
        <button className="primary" disabled={busy || dirty || loading || Boolean(loadError)} onClick={addPage}><Plus size={17}/> Nova página</button>
      </div>
      {current ? <>
      <article className="notebook-paper">
        <div className="notebook-binding" aria-hidden="true"/>
        {bow}
        <div className="notebook-heading"><label htmlFor="notebook-title" className="eyebrow">MINHAS ANOTAÇÕES</label><input id="notebook-title" disabled={mutating} value={current.title} onChange={e => update("title", e.target.value)} placeholder="Dê um título a esta página…" maxLength={160}/></div>
        <textarea key={current.id} className="notebook-writing" disabled={mutating} aria-label="Texto da página" placeholder="Era uma vez um pensamento… Escreva aqui." value={current.text} onChange={e => update("text", e.target.value)} spellCheck lang="pt-BR"/>
        <footer className="notebook-paper-footer"><span>{words} {words === 1 ? "palavra" : "palavras"}</span><span>Entrelinhas · {String(index + 1).padStart(2, "0")}</span></footer>
      </article>
      <div className="notebook-bottom">
        <button className="secondary" disabled={busy || dirty || loading || Boolean(loadError)} onClick={removePage}><Trash2 size={15}/> Excluir página</button>
        <div className="notebook-pagination"><button className="calendar-nav" aria-label="Página anterior" disabled={index === 0} onClick={() => setSelectedId(pages[index - 1].id)}><ChevronLeft size={18}/></button><span>{index + 1} de {pages.length}</span><button className="calendar-nav" aria-label="Próxima página" disabled={index === pages.length - 1} onClick={() => setSelectedId(pages[index + 1].id)}><ChevronRight size={18}/></button></div>
      </div>
      </> : <div className="panel empty">Seu caderno está esperando a primeira história. Crie uma página para começar.</div>}
      <p className={`notebook-save-status ${saveError ? "has-error" : ""}`} role="status">{saveError || (loading || loadError ? "Aguardando conexão. Mantenha esta aba aberta para preservar seu rascunho." : busy ? "Sincronizando…" : dirty ? "Alterações aguardando salvamento…" : current?.localDraft ? "Folha em branco. Ao escrever, uma nova página será salva no servidor." : <><Check size={14}/> Caderno sincronizado. Suas páginas são salvas automaticamente no servidor.</>)}</p>
      {dirty && !loadError && <button className="secondary" disabled={busy || loading} onClick={savePending}>{saveError ? "Tentar salvar novamente" : "Salvar agora"}</button>}
    </>}
  </section>;
}
