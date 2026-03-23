import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import MaybeKaTeX from "@/components/MaybeKaTeX";
import { ArrowLeft, ImageIcon, Save, Upload, X } from "lucide-react";
import { Link, useSearch } from "wouter";

type Subject = { id: number; name: string };
type AlternativeChoice = { text: string; imageUrl: string };

const LABELS = ["A", "B", "C", "D", "E"];

function emptyChoices(): AlternativeChoice[] {
  return [
    { text: "", imageUrl: "" },
    { text: "", imageUrl: "" },
    { text: "", imageUrl: "" },
    { text: "", imageUrl: "" },
    { text: "", imageUrl: "" },
  ];
}

function sanitizePreviewArtifacts(text: string): string {
  const cleanedLines = text
    .replace(/\r\n/g, "\n")
    .split(/\n/)
    .map((line) => line.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(undefined|null)$/i.test(line)) return false;
      if (/^\*?\d{6}AM\d+\*?$/i.test(line)) return false;
      if (/^(?:ENE[MN]2025\s*)+$/i.test(line)) return false;
      if (/^(?:CIÊNCIAS|MATEMÁTICA)\s+E\s+SUAS\s+TECNOLOGIAS\s*\|\s*2[ºo]\s*DIA\s*\|\s*CADERNO\s*5\s*\|\s*AMARELO\s*\d*$/i.test(line)) return false;
      if (/^\d{1,2}$/.test(line)) return false;
      return true;
    });

  return cleanedLines
    .join("\n")
    .replace(/\b(?:undefined|null)\b/gi, " ")
    .replace(/\bENE[MN]2025\b/gi, " ")
    .replace(/\*\d{6}AM\d+\*/gi, " ")
    .replace(/(?:CIÊNCIAS|MATEMÁTICA)\s+E\s+SUAS\s+TECNOLOGIAS\s*\|\s*2[ºo]\s*DIA\s*\|\s*CADERNO\s*5\s*\|\s*AMARELO\s*\d*/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizePreviewText(text: string): string {
  return sanitizePreviewArtifacts(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export default function AdminQuestions() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    subjectId: "",
    title: "",
    statement: "",
    solution: "",
    year: "",
    sourceUrl: "",
    imageUrl: "",
  });

  const [choices, setChoices] = useState<AlternativeChoice[]>(emptyChoices());
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

  const normalizeChoiceFromApi = (choice: any): AlternativeChoice => {
    if (typeof choice === "string") {
      return { text: choice, imageUrl: "" };
    }
    if (choice && typeof choice === "object") {
      return {
        text: choice.text ? String(choice.text) : "",
        imageUrl: choice.imageUrl ? String(choice.imageUrl) : "",
      };
    }
    return { text: "", imageUrl: "" };
  };

  useEffect(() => {
    fetch("/api/subjects", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setSubjects(data.items ?? []))
      .catch(() => setError("Falha ao carregar matérias"))
      .finally(() => setLoading(false));
  }, []);

  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const id = Number(params.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      setEditingId(null);
      return;
    }

    setEditingId(id);
    setLoadingQuestion(true);
    fetch(`/api/admin/questions/${id}`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.item) {
          throw new Error(data?.error || "Falha ao carregar dados da questão");
        }
        const item = data.item;
        setForm({
          subjectId: item.subjectId ? String(item.subjectId) : "",
          title: item.title ?? "",
          statement: item.statement ?? "",
          solution: item.solution ?? "",
          year: item.year ? String(item.year) : "",
          sourceUrl: item.sourceUrl ?? "",
          imageUrl: item.imageUrl ?? "",
        });

        const incomingChoices = Array.isArray(item.choices)
          ? item.choices.map((choice: any) => normalizeChoiceFromApi(choice))
          : [];
        const paddedChoices = [...incomingChoices, ...emptyChoices()].slice(0, 5);
        setChoices(paddedChoices);
        setCorrectIndex(typeof item.correctChoice === "number" ? item.correctChoice : null);
      })
      .catch((err: any) => {
        setError(err?.message || "Falha ao carregar dados da questão");
      })
      .finally(() => setLoadingQuestion(false));
  }, [search]);

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateChoiceText(i: number, value: string) {
    setChoices((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], text: value };
      return next;
    });
  }

  function updateChoiceImage(i: number, value: string) {
    setChoices((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], imageUrl: value };
      return next;
    });
  }

  async function uploadImageFile(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Selecione um arquivo de imagem (PNG, JPG, etc.)");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 5 MB.");
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ data: base64, filename: file.name, contentType: file.type }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.detail || json?.error || "Erro ao fazer upload da imagem");
    }
    return json.url;
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadImageFile(file);
      updateField("imageUrl", url);
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao fazer upload da imagem");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  }

  async function handleChoiceFileUpload(choiceIndex: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImageFile(file);
      updateChoiceImage(choiceIndex, url);
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao fazer upload da imagem da alternativa");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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

    const hasAnyChoiceData = choices.some((choice) => choice.text.trim() || choice.imageUrl.trim());
    const filledChoicesCount = choices.filter((choice) => choice.text.trim() || choice.imageUrl.trim()).length;
    if (hasAnyChoiceData && filledChoicesCount < 5) {
      setError("Para questões objetivas, preencha as 5 alternativas (texto e/ou imagem).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (hasAnyChoiceData && correctIndex === null) {
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
        year: form.year ? Number(form.year) : undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };
      if (hasAnyChoiceData) {
        payload.choices = choices.map((choice) => ({
          text: choice.text.trim() || null,
          imageUrl: choice.imageUrl.trim() || null,
        }));
        payload.correctChoice = correctIndex;
      }
      const isEditing = editingId !== null;
      const res = await fetch(isEditing ? `/api/admin/questions/${editingId}` : "/api/admin/questions", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || data?.error || `Erro ao criar questão (status ${res.status})`);
        return;
      }
      setSuccess(editingId ? "Questão atualizada com sucesso!" : "Questão criada com sucesso!");
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (!editingId) {
        setForm({ subjectId: "", title: "", statement: "", solution: "", year: "", sourceUrl: "", imageUrl: "" });
        setChoices(emptyChoices());
        setCorrectIndex(null);
      }
    } catch (err) {
      console.error("[AdminQuestions] submit error", err);
      setError("Erro inesperado ao enviar o formulário");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || loadingQuestion) {
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
          <h1 className="text-2xl font-bold text-gray-900">{editingId ? `Editar Questão #${editingId}` : "Nova Questão"}</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

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
            </div>
          </div>

          {/* Image */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Imagem (opcional)
              </label>

              {form.imageUrl ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="max-w-full max-h-64 object-contain rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => updateField("imageUrl", "")}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow"
                      title="Remover imagem"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 break-all">{form.imageUrl}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label
                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition ${
                      uploading
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
                    }`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-2" />
                        <span className="text-sm text-purple-600">Enviando...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Clique para selecionar uma imagem</span>
                        <span className="text-xs text-gray-400 mt-1">PNG, JPG ou GIF (máx. 5 MB)</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
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
              {choices.map((choice, i) => (
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
                  <div className="flex-1 space-y-2">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={choice.text}
                      onChange={(e) => updateChoiceText(i, e.target.value)}
                      placeholder={`Alternativa ${LABELS[i]} - texto (suporta LaTeX)`}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={choice.imageUrl}
                        onChange={(e) => updateChoiceImage(i, e.target.value)}
                        placeholder={`Alternativa ${LABELS[i]} - URL da imagem (opcional)`}
                      />
                      <label className="inline-flex items-center justify-center px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-gray-50 text-sm text-gray-600">
                        <Upload className="w-4 h-4 mr-1" /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void handleChoiceFileUpload(i, e)}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    {(choice.text.trim() || choice.imageUrl.trim()) && (
                      <div className="mt-1 px-2 py-1 bg-gray-50 rounded text-sm">
                        {choice.text.trim() && <MaybeKaTeX text={choice.text} />}
                        {choice.imageUrl.trim() && (
                          <img src={choice.imageUrl} alt={`Preview alternativa ${LABELS[i]}`} className="mt-2 max-h-28 rounded border" />
                        )}
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
                  <MaybeKaTeX text={normalizePreviewText(form.solution)} />
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
              {submitting ? "Salvando..." : editingId ? "Atualizar Questão" : "Salvar Questão"}
            </Button>
          </div>
        </form>

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
