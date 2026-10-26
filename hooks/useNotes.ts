"use client";

import { useCallback, useState } from "react";
import type { Note } from "../lib/types";

type NoteInput = Pick<Note, "title" | "text" | "color" | "minutes">;
type NotesResponse = { notes: Note[] };
type NoteResponse = { note: Note };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const result = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(result.message ?? "No se pudo completar la operación.");
  return result;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<NotesResponse>("/api/notes");
      setNotes(result.notes);
      return result.notes;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudieron cargar las notas.";
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (values: NoteInput) => {
    setError("");
    try {
      const result = await request<NoteResponse>("/api/notes", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setNotes((current) => [result.note, ...current]);
      return result.note;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo crear la nota.";
      setError(message);
      throw cause;
    }
  }, []);

  const updateNote = useCallback(async (id: string, values: NoteInput) => {
    setError("");
    try {
      const result = await request<NoteResponse>(`/api/notes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      setNotes((current) => current.map((note) => note.id === id ? result.note : note));
      return result.note;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo actualizar la nota.";
      setError(message);
      throw cause;
    }
  }, []);

  const markNotified = useCallback(async (id: string) => {
    setNotes((current) => current.map((note) => note.id === id ? { ...note, notified: true } : note));
    try {
      await request<NoteResponse>(`/api/notes/${encodeURIComponent(id)}/notified`, {
        method: "PATCH",
      });
    } catch (cause) {
      setNotes((current) => current.map((note) => note.id === id ? { ...note, notified: false } : note));
      throw cause;
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setError("");
    try {
      await request(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo eliminar la nota.";
      setError(message);
      throw cause;
    }
  }, []);

  return { notes, loading, error, setError, loadNotes, createNote, updateNote, markNotified, deleteNote };
}
