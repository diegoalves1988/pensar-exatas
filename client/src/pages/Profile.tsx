import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Heart, Target, Trophy, Flame } from "lucide-react";
import { Link } from "wouter";

type ProfileSummary = {
  favoritesCount: number;
  questionsResolved: number;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
};

type FavoriteQuestion = {
  id: number;
  title: string;
  subjectId: number | null;
};

export default function Profile() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/summary", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary({
            favoritesCount: 0,
            questionsResolved: 0,
            totalPoints: 0,
            currentStreak: 0,
            bestStreak: 0,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadFavorites = async () => {
    setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const response = await fetch("/api/favorites", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Não foi possível carregar suas favoritas agora.");
      }
      const data = await response.json();
      setFavorites(Array.isArray(data?.items) ? data.items : []);
    } catch (error: any) {
      setFavoritesError(error?.message || "Erro ao carregar favoritas.");
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleFavoritesClick = async () => {
    const shouldShow = !showFavorites;
    setShowFavorites(shouldShow);
    if (shouldShow) {
      await loadFavorites();
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
        <p className="text-gray-600 mb-6">Acompanhe seu progresso e retome seus estudos com foco.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 p-5 bg-gray-50">
            <p className="text-sm text-gray-500">Nome</p>
            <p className="text-lg font-semibold text-gray-900">{user?.name || "Aluno"}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-5 bg-gray-50">
            <p className="text-sm text-gray-500">E-mail</p>
            <p className="text-lg font-semibold text-gray-900">{user?.email || "Não informado"}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={handleFavoritesClick}
          className="bg-white rounded-xl shadow-md p-6 border-l-4 border-pink-500 text-left transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Favoritas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.favoritesCount ?? 0}</p>
              <p className="text-xs text-pink-600 mt-2">Clique para ver suas questões favoritas</p>
            </div>
            <Heart className="w-9 h-9 text-pink-500 opacity-70" />
          </div>
        </button>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#1C3550]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolvidas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.questionsResolved ?? 0}</p>
            </div>
            <Target className="w-9 h-9 text-[#1C3550] opacity-70" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#C4605A]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Melhor sequência</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.bestStreak ?? 0}</p>
              <p className="text-xs text-gray-500 mt-2">Atual: {summary?.currentStreak ?? 0}</p>
            </div>
            <Flame className="w-9 h-9 text-[#C4605A] opacity-70" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#A8B4C8]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pontos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.totalPoints ?? 0}</p>
            </div>
            <Trophy className="w-9 h-9 text-[#A8B4C8] opacity-70" />
          </div>
        </div>
      </section>

      {showFavorites && (
        <section className="bg-white rounded-2xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas favoritas</h2>
          {favoritesLoading && <p className="text-gray-600">Carregando favoritas...</p>}
          {!favoritesLoading && favoritesError && <p className="text-red-600">{favoritesError}</p>}
          {!favoritesLoading && !favoritesError && favorites.length === 0 && (
            <p className="text-gray-600">Você ainda não adicionou questões aos favoritos.</p>
          )}
          {!favoritesLoading && !favoritesError && favorites.length > 0 && (
            <div className="space-y-3">
              {favorites.map((question) => (
                <div key={question.id} className="rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{question.title}</p>
                    <p className="text-sm text-gray-500">Questão #{question.id}</p>
                  </div>
                  <Link href="/questoes">
                    <Button variant="outline">Abrir em Questões</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="bg-white rounded-2xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Próximo passo</h2>
        <p className="text-gray-600 mb-6">Continue resolvendo questões para aumentar sua sequência e consolidar o aprendizado.</p>
        <Link href="/questoes">
          <Button className="bg-gradient-to-r from-[#1C3550] to-[#C4605A] text-white">Voltar para Questões</Button>
        </Link>
      </section>
    </div>
  );
}