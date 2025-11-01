import React, { useEffect, useState } from "react";

type Subject = {
  id: number;
  name: string;
};

export default function AdminQuestions() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subjectId: "",
    title: "",
    statement: "",
    solution: "",
    difficulty: "medium",
    year: "",
    sourceUrl: "",
  });
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/subjects");
        const data = await res.json();
        setSubjects(data.items ?? []);
      } catch (e) {
        setError("Falha ao carregar matérias");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const payload = {
        subjectId: Number(form.subjectId),
        title: form.title.trim(),
        statement: form.statement.trim(),
        solution: form.solution.trim(),
        difficulty: form.difficulty,
        year: form.year ? Number(form.year) : undefined,
        sourceUrl: form.sourceUrl || undefined,
      };
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erro ao criar questão (talvez sem permissão)");
        return;
      }
      setResult("Questão criada com sucesso!");
      setForm({ subjectId: "", title: "", statement: "", solution: "", difficulty: "medium", year: "", sourceUrl: "" });
    } catch (e) {
      setError("Erro inesperado ao enviar o formulário");
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin: Cadastrar Questão</h1>
      <p className="text-sm text-gray-500 mb-6">É necessário estar logado como admin. Se não tiver permissão, a API retornará 403.</p>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {result && <div className="mb-4 text-green-600">{result}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Matéria</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.subjectId}
            onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            required
          >
            <option value="">Selecione...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Enunciado</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-28"
            value={form.statement}
            onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Solução</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-28"
            value={form.solution}
            onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Dificuldade</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
            >
              <option value="easy">Fácil</option>
              <option value="medium">Média</option>
              <option value="hard">Difícil</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ano</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              placeholder="2024"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fonte (URL)</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="pt-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Salvar</button>
        </div>
      </form>
    </div>
  );
}
