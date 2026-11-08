import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const messages: Record<string, string> = {
  unavailable: "O login com Google ainda não está disponível. Use seu e-mail e senha.",
  cancelled: "Login com Google cancelado. Você pode tentar novamente.",
  existing_account: "Já existe uma conta com esse e-mail. Entre com sua senha ou use Esqueci minha senha para acessar seu histórico.",
  failed: "Não foi possível entrar com Google. Tente novamente.",
};

export default function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const code = new URLSearchParams(window.location.search).get("google_error");
  const message = code ? messages[code] : null;
  useEffect(() => {
    let active = true;
    fetch("/api/auth/providers", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setEnabled(data?.google === true); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  if (!enabled && !message) return null;
  return (
    <div className="space-y-3 my-4">
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {enabled && <>
        <Button type="button" variant="outline" className="w-full bg-white text-gray-800" disabled={disabled || pending}
          onClick={() => { setPending(true); window.location.assign("/api/auth/google"); }}>
          {pending ? "Abrindo Google..." : "Continuar com Google"}
        </Button>
        <p className="text-center text-xs text-gray-500">ou use seu e-mail e senha</p>
      </>}
    </div>
  );
}
