import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import MaybeKaTeX from "@/components/MaybeKaTeX";
import { ArrowLeft, Eye, EyeOff, ImageIcon, Save } from "lucide-react";
import { Link } from "wouter";

type Subject = { id: number; name: string };

const LABELS = ["A", "B", "C", "D", "E"];

export default function AdminQuestions() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const [form, setForm] = useState({
    subjectId: "",
    title: "",
    statement: "",
    solution: "",
    difficulty: "medium",
    year: "",
    sourceUrl: "",
    imageUrl: "",
  });

  const [choices, setChoices] = useState<string[]>(["", "", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/subjects", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setSubjects(data.items ?? []))
      .catch(() => setError("Falha ao carregar matérias"))
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateChoice(i: number, value: string) {
    setChoices((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation (no HTML required — we show errors visibly)
    if (!form.subjectId) { setError("Selecione uma matéria."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (!form.title.trim()) { setError("Preencha o título da questão."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (!form.statement.trim()) { setError("Preencha o enunciado da questão."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (!form.solution.trim()) { setError("Preencha a resolução da questão."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    const filledChoices = choices.filter((c) => c.trim() !== "");
    if (filledChoices.length > 0 && filledChoices.length < 2) {
      setError("Preencha pelo menos 2 alternativas ou deixe todas em branco para questão dissertativa.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (filledChoices.length > 0 && correctIndex === null) {
      setError("Selecione a alternativa correta (clique na letra).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        subjectId: Number(form.subjectId),
        title: form.title.trim(),
        statement: form.statement.trim(),
        solution: form.solution.trim(),
        difficulty: form.difficulty,
        year: form.year ? Number(form.year) : undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };
      if (filledChoices.length >= 2) {
        payload.choices = filledChoices;
        payload.correctChoice = correctIndex;
      }
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || data?.error || `Erro ao criar questão (status ${res.status})`);
        return;
      }
      setSuccess("Questão criada com sucesso!");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setForm({ subjectId: "", title: "", statement: "", solution: "", difficulty: "medium", year: "", sourceUrl: "", imageUrl: "" });
      setChoices(["", "", "", "", ""]);
      setCorrectIndex(null);
    } catch (err) {
      console.error("[AdminQuestions] submit error", err);
      setError("Erro inesperado ao enviar o formulário");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nova Questão</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreview((p) => !p)}
          className="gap-1"
        >
          {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {preview ? "Editar" : "Preview"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      {/* ── PREVIEW MODE ───────────────────────────────────────────── */}
      {preview ? (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
          <h2 className="text-xl font-bold text-gray-900">
            <MaybeKaTeX text={form.title || "(sem título)"} />
          </h2>
          <div className="text-gray-700 leading-relaxed">
            <MaybeKaTeX text={form.statement || "(sem enunciado)"} />
          </div>
          {form.imageUrl && (
            <div className="border rounded-lg overflow-hidden inline-block">
              <img src={form.imageUrl} alt="Imagem da questão" className="max-w-full max-h-96 object-contain" />
            </div>
          )}
          {choices.some((c) => c.trim()) && (
            <div className="space-y-2">
              {choices.map((c, i) =>
                c.trim() ? (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      correctIndex === i
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <span className={`font-bold text-sm mt-0.5 ${correctIndex === i ? "text-green-700" : "text-gray-500"}`}>
                      {LABELS[i]}
                    </span>
                    <MaybeKaTeX text={c} />
                  </div>
                ) : null
              )}
            </div>
          )}
          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-900 mb-2">Resolução</h3>
            <div className="text-gray-700">
              <MaybeKaTeX text={form.solution || "(sem resolução)"} />
            </div>
          </div>
        </div>
      ) : (
        /* ── EDIT MODE ──────────────────────────────────────────────── */
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Meta */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Informações Gerais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matéria *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={form.subjectId}
                  onChange={(e) => updateField("subjectId", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={form.difficulty}
                  onChange={(e) => updateField("difficulty", e.target.value)}
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Média</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano (ENEM)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={form.year}
                  onChange={(e) => updateField("year", e.target.value)}
                  placeholder="ex: 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonte (URL)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={form.sourceUrl}
                  onChange={(e) => updateField("sourceUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título * <span className="text-xs text-gray-400">(suporta LaTeX: $x^2$, \frac&#123;a&#125;&#123;b&#125;)</span>
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Ex: Cinemática — Velocidade Média"
              />
              {form.title && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                  <MaybeKaTeX text={form.title} />
                </div>
              )}
            </div>
          </div>

          {/* Statement */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enunciado * <span className="text-xs text-gray-400">(suporta LaTeX)</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-40 resize-y font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={form.statement}
                onChange={(e) => updateField("statement", e.target.value)}
                placeholder={"Um corpo de massa $m = 2\\,\\text{kg}$ é submetido a uma força resultante...\n\nUse $...$ para fórmulas inline e $$...$$ para fórmulas em bloco."}
              />
              {form.statement && (
                <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                  <p className="text-xs text-gray-400 mb-1">Preview:</p>
                  <MaybeKaTeX text={form.statement} />
                </div>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Imagem (opcional)
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={form.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                placeholder="URL da imagem (ex: https://i.imgur.com/...)"
              />
              {form.imageUrl && (
                <div className="mt-2 border rounded-lg overflow-hidden inline-block bg-gray-50 p-2">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="max-w-full max-h-64 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Alternatives */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Alternativas (ENEM — 5 opções)</h2>
              <span className="text-xs text-gray-400">Deixe em branco para questão dissertativa</span>
            </div>

            <div className="space-y-3">
              {choices.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setCorrectIndex(correctIndex === i ? null : i)}
                    className={`mt-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition shrink-0 ${
                      correctIndex === i
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-500"
                    }`}
                    title={correctIndex === i ? "Alternativa correta" : "Marcar como correta"}
                  >
                    {LABELS[i]}
                  </button>
                  <div className="flex-1">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={c}
                      onChange={(e) => updateChoice(i, e.target.value)}
                      placeholder={`Alternativa ${LABELS[i]} (suporta LaTeX)`}
                    />
                    {c.trim() && (
                      <div className="mt-1 px-2 py-1 bg-gray-50 rounded text-sm">
                        <MaybeKaTeX text={c} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {correctIndex !== null && (
              <p className="text-sm text-green-600 font-medium">
                Resposta correta: {LABELS[correctIndex]}
              </p>
            )}
          </div>

          {/* Solution */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolução * <span className="text-xs text-gray-400">(suporta LaTeX)</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-40 resize-y font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={form.solution}
                onChange={(e) => updateField("solution", e.target.value)}
                placeholder={"Resolução detalhada da questão.\n\nUse $v = \\frac{\\Delta s}{\\Delta t}$ para fórmulas."}
              />
              {form.solution && (
                <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                  <p className="text-xs text-gray-400 mb-1">Preview:</p>
                  <MaybeKaTeX text={form.solution} />
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/admin">
              <Button variant="outline" type="button">Cancelar</Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-purple-500 to-orange-500 text-white hover:shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Salvando..." : "Salvar Questão"}
            </Button>
          </div>
        </form>
      )}

      {/* LaTeX help */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-2">Dicas de LaTeX</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <p><code className="bg-white px-1 rounded">$x^2$</code> para inline: <MaybeKaTeX text="$x^2$" /></p>
          <p><code className="bg-white px-1 rounded">$\frac&#123;a&#125;&#123;b&#125;$</code> para fração: <MaybeKaTeX text="$\frac{a}{b}$" /></p>
          <p><code className="bg-white px-1 rounded">$\sqrt&#123;2&#125;$</code> para raiz: <MaybeKaTeX text="$\sqrt{2}$" /></p>
          <p><code className="bg-white px-1 rounded">$\vec&#123;F&#125; = m \cdot \vec&#123;a&#125;$</code> para vetores: <MaybeKaTeX text="$\vec{F} = m \cdot \vec{a}$" /></p>
          <p><code className="bg-white px-1 rounded">$\Delta s$</code> para delta: <MaybeKaTeX text="$\Delta s$" /></p>
        </div>
      </div>
    </div>
  );
}
