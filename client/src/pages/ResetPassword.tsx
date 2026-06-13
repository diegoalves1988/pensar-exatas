import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useSearch } from "wouter";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error === "invalid or expired reset token"
            ? "Link inválido ou expirado. Solicite um novo link de recuperação."
            : data?.error || "Erro ao redefinir senha"
        );
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
        <p className="text-sm text-red-600 mb-4">Link inválido. Solicite um novo link de recuperação.</p>
        <Link href="/esqueci-senha" className="text-sm text-purple-600 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-3xl">
            ✅
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Senha redefinida!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
        </p>
        <Button className="w-full" onClick={() => setLocation("/login")}>
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold mb-2">Redefinir senha</h2>
      <p className="text-sm text-gray-500 mb-6">Digite e confirme sua nova senha.</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nova senha</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar nova senha</label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Redefinindo..." : "Redefinir senha"}
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
