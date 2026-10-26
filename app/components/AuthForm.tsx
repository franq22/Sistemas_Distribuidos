"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthFormProps = { mode: "login" | "register" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "No se pudo iniciar la sesión.");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/" aria-label="Ir al tablero">Mis notas</Link>
      <section className="auth-card">
        <h1>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h1>

        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <label className="field-label">
              Nombre
              <input autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Cómo te llamás" required />
            </label>
          )}
          <label className="field-label">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vos@ejemplo.com" required />
          </label>
          <label className="field-label">
            Contraseña
            <input type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "Al menos 8 caracteres" : "Tu contraseña"} required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" disabled={saving} type="submit">
            {saving ? "Un momento…" : isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "¿Ya tenés una cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
          <Link href={isRegister ? "/login" : "/registro"}>{isRegister ? "Iniciá sesión" : "Registrate"}</Link>
        </p>
      </section>
    </main>
  );
}
