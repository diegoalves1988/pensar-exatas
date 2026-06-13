import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Erro ao enviar e-mail");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-3xl">
            ✉️
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Verifique seu e-mail</h2>
        <p className="text-sm text-gray-500 mb-6">
          Se o e-mail <span className="font-medium text-gray-700">{email}</span> estiver
          cadastrado e verificado, você receberá um link para redefinir sua senha em breve.
        </p>
        <Link href="/login" className="text-sm text-purple-600 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold mb-2">Esqueci minha senha</h2>
      <p className="text-sm text-gray-500 mb-6">
        Digite seu e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Enviando..." : "Enviar link de recuperação"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-purple-600 hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
