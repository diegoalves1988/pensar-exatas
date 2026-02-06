import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Search, Filter, Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { AdBannerPlaceholder } from "@/components/AdBanner";
import KaTeXRenderer from "@/components/KaTeXRenderer";

export default function Questions() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Use tRPC in dev; fall back to serverless /api/questions in production (Vercel)
  const { data: questions } = trpc.questions.list.useQuery();
  const [publicQuestions, setPublicQuestions] = useState<any[] | null>(null);
  useEffect(() => {
    // If tRPC isn’t available in prod, this ensures list of questions is still shown
    let cancelled = false;
    fetch("/api/questions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.items) setPublicQuestions(data.items);
      })
      .catch(() => {
        // ignore silently; tRPC may still work in dev
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const { data: favorites } = trpc.favorites.list.useQuery(undefined, { enabled: isAuthenticated });

  const subjectList = [
    { id: 1, name: "Mecânica", icon: "⚙️", color: "from-blue-400 to-blue-600" },
    { id: 2, name: "Eletromagnetismo", icon: "⚡", color: "from-yellow-400 to-yellow-600" },
    { id: 3, name: "Ondulatória", icon: "〰️", color: "from-cyan-400 to-cyan-600" },
    { id: 4, name: "Termodinâmica", icon: "🔥", color: "from-red-400 to-red-600" },
    { id: 5, name: "Óptica", icon: "💡", color: "from-green-400 to-green-600" },
  ];

  const allQuestions = questions ?? publicQuestions ?? [];
  const filteredQuestions = allQuestions.filter((q: any) => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.statement.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !selectedSubject || q.subjectId === selectedSubject;
    const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const isFavorite = (questionId: number) => {
    return favorites?.some(f => f.id === questionId) || false;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "Fácil";
      case "medium":
        return "Médio";
      case "hard":
        return "Difícil";
      default:
        return difficulty;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Questões do ENEM</h1>
        <p className="text-gray-600">Resolva questões e aprenda com explicações detalhadas</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar questão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        {/* Difficulty Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDifficulty(null)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedDifficulty === null
                ? "bg-purple-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedDifficulty("easy")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedDifficulty === "easy"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Fácil
          </button>
          <button
            onClick={() => setSelectedDifficulty("medium")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedDifficulty === "medium"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Médio
          </button>
          <button
            onClick={() => setSelectedDifficulty("hard")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedDifficulty === "hard"
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Difícil
          </button>
        </div>
      </div>

      {/* Ad Banner */}
      <AdBannerPlaceholder className="mb-6" />

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-600 text-lg">Nenhuma questão encontrada</p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
            >
              <div
                className="p-6 cursor-pointer"
                onClick={() =>
                  setExpandedQuestion(
                    expandedQuestion === question.id ? null : question.id
                  )
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">
                        {subjectList.find(s => s.id === question.subjectId)?.icon}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">
                        {question.title}
                      </h3>
                    </div>
                    <div className="text-gray-600 text-sm line-clamp-2">
                      <KaTeXRenderer formula={String(question.statement || "")} displayMode={false} />
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                          question.difficulty || "medium"
                        )}`}
                      >
                        {getDifficultyLabel(question.difficulty || "medium")}
                      </span>
                      {question.year && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ENEM {question.year}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAuthenticated && (
                      <button className="p-2 hover:bg-red-100 rounded-lg transition">
                        <Heart
                          className={`w-5 h-5 ${
                            isFavorite(question.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedQuestion === question.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Enunciado</h4>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      <KaTeXRenderer formula={String(question.statement || "")} displayMode={false} />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Resolução</h4>
                    <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                      <div className="text-gray-700 whitespace-pre-wrap">
                        <KaTeXRenderer formula={String(question.solution || "")} displayMode={false} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    {question.sourceUrl && (
                      <a
                        href={question.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          Ver Fonte Original
                        </Button>
                      </a>
                    )}
                    <Button className="flex-1 bg-gradient-to-r from-purple-500 to-orange-500 text-white">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Ver Aula Relacionada
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Ad Banner */}
      <AdBannerPlaceholder className="my-6" />

      {/* Pagination Info */}
      <div className="text-center text-gray-600 py-4">
        Mostrando {filteredQuestions.length} de {(questions?.length ?? publicQuestions?.length ?? 0)} questões
      </div>
    </div>
  );
}

