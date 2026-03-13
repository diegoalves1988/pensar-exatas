import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

type SubjectItem = {
  id: number;
  name: string;
  icon?: string | null;
};

type AdminQuestion = {
  id: number;
  title: string;
  difficulty: string | null;
  year: number | null;
  subjectName?: string | null;
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"questions" | "lessons" | "subjects" | "portfolio">("questions");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subjects", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) {
          setSubjects(data.items);
        }
      })
      .catch(() => {
        // Keep empty list on fetch failure.
      });

    fetch("/api/admin/questions", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) {
          setQuestions(data.items);
        }
      })
      .catch(() => {
        // Keep empty list on fetch failure.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const deleteQuestion = async (questionId: number) => {
    const confirmed = window.confirm("Excluir esta questão? Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    const response = await fetch(`/api/admin/questions/${questionId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      window.alert("Não foi possível excluir a questão.");
      return;
    }
    setQuestions((current) => current.filter((question) => question.id !== questionId));
  };

  // Redirect if not admin
  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
        <p className="text-gray-600 mb-6">Você não tem permissão para acessar o painel admin.</p>
        <Button onClick={() => setLocation("/")} className="bg-purple-500 text-white">
          Voltar para Início
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Painel Admin</h1>
        <p className="text-gray-600">Gerencie questões, aulas, matérias e seu portfólio</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "questions"
              ? "bg-purple-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Questões
        </button>
        <button
          onClick={() => setActiveTab("lessons")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "lessons"
              ? "bg-purple-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Aulas
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "subjects"
              ? "bg-purple-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Matérias
        </button>
        <button
          onClick={() => setActiveTab("portfolio")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === "portfolio"
              ? "bg-purple-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Portfólio
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-md p-8">
        {activeTab === "questions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Questões</h2>
              <Button
                onClick={() => setLocation("/admin/questions")}
                className="bg-gradient-to-r from-purple-500 to-orange-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Questão
              </Button>
            </div>
            {questions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nenhuma questão cadastrada ainda.</p>
                <p className="text-sm mt-2">Clique no botão acima para adicionar a primeira questão.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question) => (
                  <div key={question.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{question.title}</p>
                      <p className="text-sm text-gray-500">
                        {question.subjectName || "Sem matéria"}
                        {question.year ? ` • ENEM ${question.year}` : ""}
                        {question.difficulty ? ` • ${question.difficulty}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/questions")}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteQuestion(question.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "lessons" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Aulas</h2>
            </div>
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              Módulo de aulas em desenvolvimento. Quando houver conteúdo real, esta aba volta a ganhar ações.
            </div>
          </div>
        )}

        {activeTab === "subjects" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Matérias</h2>
              <Button className="bg-gradient-to-r from-purple-500 to-orange-500 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Matéria
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subject) => (
                <div key={subject.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{subject.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {subjects.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-500 py-6">
                  Nenhuma matéria encontrada.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Portfólio</h2>
            </div>
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              O portfólio público já está online, mas o painel de edição ainda precisa ser consolidado.
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-2">💡 Dica</h3>
        <p className="text-gray-700 text-sm">
          Use este painel para gerenciar todo o conteúdo do seu site. Adicione questões com resoluções detalhadas,
          aulas relacionadas e mantenha seu portfólio profissional atualizado.
        </p>
      </div>
    </div>
  );
}

