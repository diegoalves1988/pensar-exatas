import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Search, Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { AdBannerPlaceholder } from "@/components/AdBanner";
import MaybeKaTeX from "@/components/MaybeKaTeX";
import InlineKaTeX from "@/components/InlineKaTeX";
import { FALLBACK_SUBJECTS, sortSubjects, type SubjectItem } from "@/lib/subjects";

export default function Questions() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // track answers for multiple-choice questions: questionId -> selected index
  const [answers, setAnswers] = useState<Record<number, number>>({});
  // track if the user chose to reveal the answer/solution for each question
  const [showSolution, setShowSolution] = useState<Record<number, boolean>>({});

  // Use tRPC in local dev; in production use /api/questions directly.
  const { data: questions } = trpc.questions.list.useQuery(undefined, {
    enabled: isLocalDev,
    retry: false,
    staleTime: 60_000,
  });
  const [publicQuestions, setPublicQuestions] = useState<any[] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = sessionStorage.getItem("questions-cache-v1");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    // Always refresh in background; sessionStorage gives instant first paint on repeat visits.
    let cancelled = false;
    fetch("/api/questions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.items) {
          setPublicQuestions(data.items);
          try {
            sessionStorage.setItem("questions-cache-v1", JSON.stringify(data.items));
          } catch {
            // ignore storage quota/unavailable errors
          }
        }
      })
      .catch(() => {
        // ignore silently; tRPC may still work in dev
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const { data: favorites } = trpc.favorites.list.useQuery(undefined, { enabled: isAuthenticated && isLocalDev });
  const [publicFavorites, setPublicFavorites] = useState<Array<{ id: number }>>([]);
  const [publicSubjects, setPublicSubjects] = useState<SubjectItem[]>(FALLBACK_SUBJECTS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subjects")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items) && data.items.length > 0) {
          setPublicSubjects(data.items);
        }
      })
      .catch(() => {
        // Keep fallback subject catalog when API fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLocalDev) return;
    let cancelled = false;
    fetch("/api/favorites", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) {
          setPublicFavorites(data.items);
        }
      })
      .catch(() => {
        if (!cancelled) setPublicFavorites([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLocalDev]);

  const subjectList = sortSubjects(publicSubjects.length > 0 ? publicSubjects : FALLBACK_SUBJECTS);

  const normalizeQuestionText = (text: string) =>
    text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      // single line breaks from copied PDFs become spaces; paragraph breaks are kept
      .replace(/([^\n])\n([^\n])/g, "$1 $2");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const subjectParam = Number(params.get("subject"));
    if (Number.isFinite(subjectParam) && subjectParam > 0) {
      setSelectedSubject(subjectParam);
      return;
    }
    setSelectedSubject(null);
  }, [location]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSubject, selectedDifficulty]);

  const allQuestions = questions ?? publicQuestions ?? [];
  const filteredQuestions = allQuestions.filter((q: any) => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.statement.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !selectedSubject || Number(q.subjectId) === selectedSubject;
    const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const favoriteItems = isLocalDev ? favorites ?? [] : publicFavorites;

  const isFavorite = (questionId: number) => {
    return favoriteItems.some((favorite) => favorite.id === questionId);
  };

  const toggleFavorite = async (questionId: number) => {
    if (!isAuthenticated) return;
    const alreadyFavorite = isFavorite(questionId);
    if (isLocalDev) return;
    const response = await fetch(alreadyFavorite ? `/api/favorites/${questionId}` : "/api/favorites", {
      method: alreadyFavorite ? "DELETE" : "POST",
      credentials: "include",
      headers: alreadyFavorite ? undefined : { "Content-Type": "application/json" },
      body: alreadyFavorite ? undefined : JSON.stringify({ questionId }),
    });
    if (!response.ok) return;
    setPublicFavorites((current) =>
      alreadyFavorite ? current.filter((favorite) => favorite.id !== questionId) : [...current, { id: questionId }]
    );
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
    <div className="space-y-8 max-w-6xl mx-auto w-full px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Questões do ENEM</h1>
        <p className="text-gray-600">Resolva questões e aprenda com explicações detalhadas</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex gap-3 flex-col md:flex-row md:items-center">
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
          <select
            value={selectedSubject ?? "all"}
            onChange={(e) =>
              setSelectedSubject(e.target.value === "all" ? null : Number(e.target.value))
            }
            className="min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todas as matérias</option>
            {subjectList.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
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
          paginatedQuestions.map((question) => (
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
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        <InlineKaTeX text={String(question.title || "")} />
                      </h3>
                    </div>
                    <div className="text-gray-600 text-sm line-clamp-2">
                      <MaybeKaTeX text={normalizeQuestionText(String(question.statement || ""))} displayMode={false} />
                    </div>
                    {question.imageUrl && (
                      <div className="mt-3 mb-3">
                        <img
                          src={question.imageUrl}
                          alt="Imagem da questao"
                          className="h-20 w-auto object-cover rounded-md border border-gray-200"
                        />
                      </div>
                    )}
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
                      <button
                        className="p-2 hover:bg-red-100 rounded-lg transition"
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleFavorite(question.id);
                        }}
                        aria-label={isFavorite(question.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
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
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {question.imageUrl && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Imagem</h4>
                        <img
                          src={question.imageUrl}
                          alt="Imagem da questão"
                          className="w-full h-auto object-cover rounded-lg border border-gray-300 max-h-96"
                        />
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Enunciado</h4>
                      <div className="text-gray-700 whitespace-pre-wrap text-[17px] leading-8">
                        <MaybeKaTeX text={normalizeQuestionText(String(question.statement || ""))} displayMode={false} />
                      </div>
                    </div>

                    {/* multiple-choice interaction */}
                    {question.choices && question.choices.length > 0 && (
                      <div className="space-y-2">
                        {question.choices.map((opt: string, idx: number) => {
                          const selected = answers[question.id] === idx;
                          const correct = question.correctChoice === idx;
                          const disabled = answers[question.id] !== undefined;
                          let bg = "bg-white hover:bg-gray-100";
                          if (disabled && selected) {
                            bg = correct ? "bg-green-200" : "bg-red-200";
                          }
                          const label = String.fromCharCode(65 + idx); // A, B, C, D, E
                          return (
                            <button
                              key={idx}
                              className={`${bg} w-full text-left px-4 py-2 rounded border border-gray-300 flex items-start gap-3`}
                              onClick={() => {
                                if (disabled) return;
                                setAnswers(a => ({ ...a, [question.id]: idx }));
                              }}
                              disabled={disabled}
                            >
                              <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center font-bold text-xs leading-none">
                                {label}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                        {answers[question.id] !== undefined && (
                          <div className="mt-2">
                            {answers[question.id] === question.correctChoice ? (
                              <span className="text-green-600 font-semibold">Você acertou!</span>
                            ) : (
                              <span className="text-red-600 font-semibold">Você errou.</span>
                            )}
                          </div>
                        )}
                        {answers[question.id] === undefined && (
                          <p className="text-sm text-gray-400 mt-2 italic">Selecione uma alternativa e, se quiser, clique em Mostrar resposta.</p>
                        )}
                      </div>
                    )}

                    <div>
                      {question.choices && question.choices.length > 0 && answers[question.id] === undefined && (
                        <p className="text-sm text-gray-400 mb-2 italic">Responda a questão para liberar a resposta.</p>
                      )}
                      <Button
                        variant="outline"
                        disabled={Boolean(question.choices && question.choices.length > 0 && answers[question.id] === undefined)}
                        onClick={() =>
                          setShowSolution((prev) => ({
                            ...prev,
                            [question.id]: !prev[question.id],
                          }))
                        }
                        className="w-full sm:w-auto"
                      >
                        {showSolution[question.id] ? "Ocultar resposta" : "Mostrar resposta"}
                      </Button>
                    </div>

                    {/* Resolução: exibida somente quando o usuário clicar no botão */}
                    {showSolution[question.id] && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Resolução</h4>
                        <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                          <div className="text-gray-700 whitespace-pre-wrap text-[17px] leading-8">
                            <MaybeKaTeX text={normalizeQuestionText(String(question.solution || ""))} displayMode={false} />
                          </div>
                        </div>
                      </div>
                    )}

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
        Mostrando {paginatedQuestions.length} de {filteredQuestions.length} questões filtradas
      </div>
      {filteredQuestions.length > pageSize && (
        <div className="flex items-center justify-center gap-3 pb-4">
          <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            Anterior
          </Button>
          <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

