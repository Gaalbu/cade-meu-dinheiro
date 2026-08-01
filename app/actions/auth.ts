"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function authError(message: string) {
  redirect(`/entrar?erro=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 6) authError("Informe e-mail e senha válidos.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authError("Não foi possível entrar. Confira e-mail, senha e confirmação da conta.");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) authError("Use um e-mail válido e uma senha com pelo menos 8 caracteres.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/confirmado`,
    },
  });
  if (error) authError("Não foi possível criar a conta. Talvez este e-mail já esteja em uso.");
  if (!data.session) redirect("/entrar?mensagem=Confira seu e-mail para confirmar a conta.");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
