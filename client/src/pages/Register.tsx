import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

export default function Register() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agree) return setError("Você precisa concordar com os termos");
    if (password.length < 6) return setError("Senha deve ter ao menos 6 caracteres");
    if (password !== confirm) return setError("Senhas não conferem");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erro ao cadastrar");
        setLoading(false);
        return;
      }

      setLocation("/");
    } catch (err) {
      console.error(err);
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-orange-500 to-purple-600 text-white rounded-lg p-6">
        <div>
          <h3 className="text-2xl font-bold mb-2">Participe da comunidade</h3>
          <p className="text-sm">Crie sua conta para acessar questões, aulas e recursos exclusivos.</p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">Cadastrar</h2>
        <p className="text-sm text-gray-500 mb-6">Use seu e-mail para criar uma conta</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome e Sobrenome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} type="text" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar senha</label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" />
          </div>

          <div className="flex items-center gap-2">
            <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <label htmlFor="agree" className="text-sm">Estou de acordo com os Termos de Uso</label>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center gap-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Cadastrando..." : "Criar sua conta"}
            </Button>
            <Link href="/login" className="text-sm text-purple-600 hover:underline">
              Já tem conta? Entrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
