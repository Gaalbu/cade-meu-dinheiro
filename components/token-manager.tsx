"use client";

import { useActionState, useState } from "react";
import { generateTokenAction, type TokenActionState } from "@/app/actions/finance";

const initialState: TokenActionState = {};

export function TokenManager() {
  const [state, action, pending] = useActionState(generateTokenAction, initialState);
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    if (!state.token) return;
    await navigator.clipboard.writeText(state.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="stack">
      <form action={action} className="form-grid">
        <div className="field full">
          <label htmlFor="token-name">Nome do dispositivo</label>
          <input defaultValue="Celular principal" id="token-name" maxLength={60} name="name" />
        </div>
        <div className="form-actions"><button className="button" disabled={pending}>{pending ? "Gerando…" : "Gerar novo token"}</button></div>
      </form>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.token && (
        <div className="notice success">
          <strong>Copie agora: o token completo só aparece uma vez.</strong>
          <code className="token-display" style={{ display: "block", margin: "0.75rem 0" }}>{state.token}</code>
          <button className="button secondary" onClick={copyToken} type="button">{copied ? "Copiado" : "Copiar token"}</button>
        </div>
      )}
    </div>
  );
}
