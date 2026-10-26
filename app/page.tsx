"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useNotes } from "../hooks/useNotes";
import type { Note, PublicUser } from "../lib/types";

const palette = [
  { value: "#fef08a", label: "Amarillo" },
  { value: "#bae6fd", label: "Azul" },
  { value: "#bbf7d0", label: "Verde" },
  { value: "#fbcfe8", label: "Rosa" },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "No se pudo completar la operación.");
  return body;
}

function isExpired(note: Note, now: number) {
  return now >= note.createdAt + note.minutes * 60_000;
}

export default function Home() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const {
    notes,
    loading: notesLoading,
    error: notesError,
    setError: setNotesError,
    loadNotes,
    createNote: createNoteRequest,
    updateNote: updateNoteRequest,
    markNotified,
    deleteNote: deleteNoteRequest,
  } = useNotes();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [color, setColor] = useState(palette[0].value);
  const [minutes, setMinutes] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !window.isSecureContext) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  const loadBoard = useCallback(async () => {
    const session = await api<{ user: PublicUser }>("/api/auth/me");
    setUser(session.user);
    const loadedNotes = await loadNotes();
    if (loadedNotes.length === 0) {
      try {
        const legacy = localStorage.getItem("mis_notas");
        if (legacy) {
          const previousNotes = JSON.parse(legacy) as Array<{
            titulo?: unknown; texto?: unknown; color?: unknown; minutos?: unknown;
          }>;
          if (Array.isArray(previousNotes) && previousNotes.length > 0) {
            for (const oldNote of previousNotes) {
              const oldColor = typeof oldNote.color === "string" && palette.some((item) => item.value === oldNote.color)
                ? oldNote.color : palette[0].value;
              const oldMinutes = Number(oldNote.minutos);
              await createNoteRequest({
                  title: typeof oldNote.titulo === "string" && oldNote.titulo.trim() ? oldNote.titulo.trim() : "Nota importada",
                  text: typeof oldNote.texto === "string" ? oldNote.texto : "",
                  color: oldColor,
                  minutes: Number.isInteger(oldMinutes) && oldMinutes > 0 ? Math.min(oldMinutes, 10080) : 1,
              });
            }
            localStorage.removeItem("mis_notas");
          } else {
            localStorage.removeItem("mis_notas");
          }
        }
      } catch {
        // Si una importación falla, se conserva la copia local para volver a intentarlo.
      }
    }
  }, [createNoteRequest, loadNotes]);

  useEffect(() => {
    let active = true;
    loadBoard()
      .catch((cause: unknown) => {
        if (active) {
          const statusMessage = cause instanceof Error ? cause.message : "No se pudo cargar el tablero.";
          if (statusMessage.includes("sesión")) window.location.replace("/login");
          else setNotesError(statusMessage);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadBoard, setNotesError]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || now === 0 || notificationPermission !== "granted") return;
    const due = notes.filter((note) => !note.notified && isExpired(note, now));
    if (!due.length) return;
    for (const note of due) {
      if (mostrarNotificacion(`Recordatorio: ${note.title}`, note.text || "Tu nota venció.")) {
        void markNotified(note.id).catch(() => undefined);
      }
    }
  }, [markNotified, notes, now, notificationPermission, user]);

  async function guardarNota(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotesError("");
    setSaving(true);
    const values = { title, text, color, minutes: Number(minutes) };
    try {
      // Los navegadores requieren una acción explícita del usuario para mostrar este permiso.
      if (!editingId && notificationPermission === "default" && "Notification" in window && window.isSecureContext) {
        setNotificationPermission(await Notification.requestPermission());
      }
      if (editingId) await updateNoteRequest(editingId, values);
      else await createNoteRequest(values);
      cancelarEdicion();
    } catch (cause) {
      setNotesError(cause instanceof Error ? cause.message : "No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  function cancelarEdicion() {
    setEditingId(null);
    setTitle("");
    setText("");
    setColor(palette[0].value);
    setMinutes(1);
  }

  function editarNota(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setText(note.text);
    setColor(note.color);
    setMinutes(note.minutes);
    document.querySelector("#note-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function eliminarNota(id: string) {
    if (!window.confirm("¿Querés eliminar esta nota?")) return;
    try {
      await deleteNoteRequest(id);
      if (editingId === id) cancelarEdicion();
    } catch (cause) {
      setNotesError(cause instanceof Error ? cause.message : "No se pudo eliminar la nota.");
    }
  }

  async function cerrarSesion() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  async function pedirPermiso() {
    if ("Notification" in window && window.isSecureContext) {
      setNotificationPermission(await Notification.requestPermission());
    }
  }

  function mostrarNotificacion(title: string, body: string) {
    try {
      new Notification(title, { body });
      return true;
    } catch {
      setNotificationPermission(Notification.permission);
      return false;
    }
  }

  if (loading || notesLoading) return <main className="loading-screen"><p>Cargando…</p></main>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">Mis notas</Link>
        <div className="topbar-actions">
          <span className="welcome">Hola, <strong>{user?.name}</strong></span>
          <button className="quiet-button" onClick={() => void cerrarSesion()}>Cerrar sesión <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">TABLERO PERSONAL</p>
          <h1>Mis notas</h1>
        </div>
      </section>

      <section className="workspace">
        <form className="note-composer" id="note-form" onSubmit={guardarNota}>
          <div className="composer-heading"><span className="composer-icon">✎</span><h2>{editingId ? "Editar nota" : "Nueva nota"}</h2></div>
          <label className="field-label">Título<input maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label className="field-label">Detalle<textarea maxLength={2000} rows={4} value={text} onChange={(event) => setText(event.target.value)} /></label>
          <div className="form-row">
            <label className="field-label minutes-field">Recordarme en<span className="input-suffix"><input type="number" min={1} max={10080} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} required /><span>min</span></span></label>
            <fieldset className="color-field"><legend>Color</legend><div className="color-options">{palette.map((item) => <button key={item.value} className={`color-swatch ${color === item.value ? "selected" : ""}`} style={{ "--swatch": item.value } as React.CSSProperties} type="button" title={item.label} aria-label={item.label} aria-pressed={color === item.value} onClick={() => setColor(item.value)} />)}</div></fieldset>
          </div>
          {notesError && <p className="form-error" role="alert">{notesError}</p>}
          <div className="composer-actions"><button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar nota"}<span aria-hidden="true">→</span></button>{editingId && <button className="text-button" type="button" onClick={cancelarEdicion}>Cancelar</button>}</div>
          {notificationPermission === "default" && <button className="notification-help" onClick={() => void pedirPermiso()} type="button">Activar notificaciones</button>}
          {notificationPermission === "denied" && <p className="notification-help">Notificaciones bloqueadas: habilitalas en los permisos del navegador.</p>}
          {notificationPermission === "unsupported" && <p className="notification-help">Las notificaciones requieren HTTPS o localhost y un navegador compatible.</p>}
        </form>

        <section className="notes-section" aria-labelledby="notes-heading">
          <div className="section-heading"><div><p className="eyebrow">TU TABLERO</p><h2 id="notes-heading">Tus notas <span className="note-count">{notes.length.toString().padStart(2, "0")}</span></h2></div><span className="sort-label">Más recientes primero ↓</span></div>
          {notes.length === 0 ? <div className="empty-state"><h3>Tu tablero está en blanco.</h3></div> : (
            <div className="notes-grid">{notes.map((note, index) => {
              const expired = now > 0 && isExpired(note, now);
              return <article className={`note-card ${expired ? "expired" : ""}`} key={note.id} style={{ "--note-color": note.color, "--note-rotation": `${index % 2 === 0 ? "-1.2" : "1"}deg` } as React.CSSProperties}>
                <div className="note-card-top"><span className="note-pin" aria-hidden="true">✳</span><span className="note-date">{new Date(note.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</span></div>
                <div className="note-content"><h3>{note.title}</h3>{note.text && <p>{note.text}</p>}</div>
                <div className="note-meta"><span className={`expiry-label ${expired ? "is-expired" : ""}`}>{expired ? "Vencida" : `Recordatorio · ${note.minutes} min`}</span>{note.notified && <span className="notified-dot" title="Recordatorio enviado" />}</div>
                <div className="note-actions"><button onClick={() => editarNota(note)} type="button">Editar</button><button onClick={() => void eliminarNota(note.id)} type="button">Eliminar</button></div>
              </article>;
            })}</div>
          )}
        </section>
      </section>
      <footer className="page-footer"><span>Mis notas</span><span>Tablero personal</span></footer>
    </main>
  );
}
