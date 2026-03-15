import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useSearch } from "wouter";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const emailFromQuery = params.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError("O código deve ter 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error === "invalid or expired verification code"
            ? "Código inválido ou expirado. Solicite um novo código."
            : data?.error || "Erro ao verificar"
        );
        setLoading(false);
        return;
      }

      // Prime local auth cache before navigating home
      try {
        const meRes = await fetch("/api/me", { credentials: "include" });
        const me = meRes.ok ? await meRes.json() : null;
        localStorage.setItem("manus-runtime-user-info", JSON.stringify(me));
      } catch {
        // ignore prefetch failures
      }

      setLocation("/");
    } catch (err) {
      console.error(err);
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setResendMessage(null);
    setError(null);
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendMessage("Novo código enviado! Verifique sua caixa de entrada.");
    } catch {
      setError("Erro ao reenviar código");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-3xl">
          ✉️
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-center">Verifique seu e-mail</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Enviamos um código de 6 dígitos para{" "}
        <span className="font-medium text-gray-700">{email || "o seu e-mail"}</span>.
        Digite-o abaixo para ativar sua conta.
      </p>

      <form onSubmit={submit} className="space-y-4">
        {!emailFromQuery && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código de verificação
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-widest font-mono"
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {resendMessage && <div className="text-sm text-green-600">{resendMessage}</div>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verificando..." : "Verificar e-mail"}
        </Button>
      </form>

      <div className="mt-4 text-center space-y-2">
        <p className="text-sm text-gray-500">Não recebeu o código?</p>
        <button
          type="button"
          onClick={resendCode}
          disabled={resending}
          className="text-sm text-[#1C3550] hover:underline disabled:opacity-50"
        >
          {resending ? "Reenviando..." : "Reenviar código"}
        </button>
        <div>
          <Link href="/login" className="text-sm text-gray-400 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
