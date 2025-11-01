import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erro no login");
        setLoading(false);
        return;
      }

      // on success redirect to home
      setLocation("/");
    } catch (err) {
      console.error(err);
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold mb-2">Entrar</h2>
      <p className="text-sm text-gray-500 mb-6">Faça login com seu e-mail e senha</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center justify-between gap-4">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <Link href="/register" className="text-sm text-purple-600 hover:underline">
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}
