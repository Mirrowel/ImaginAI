import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthAction } from "../hooks/useAuth";

/** Login/register page for alpha nickname-password auth. */
export function AuthShell() {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const mutation = useAuthAction(() => navigate("/"));
  /** Submit credentials through the selected alpha auth action. */
  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ mode, nickname, password });
  }
  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={submit}>
        <p className="eyebrow">Self-host alpha</p>
        <h1>{mode === "login" ? "Enter the story engine" : "Create a storyteller"}</h1>
        <label>Nickname<input value={nickname} onChange={(event) => setNickname(event.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
        <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
        <button type="button" className="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Need an account?" : "Have an account?"}</button>
        <p className="warning">Dev seed command creates Admin / 123. Change it before production.</p>
        {mutation.error ? <p className="error">{String(mutation.error.message)}</p> : null}
      </form>
    </div>
  );
}
