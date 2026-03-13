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

export default function Profile() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [summary, setSummary] = useState<ProfileSummary | null>(null);

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
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Favoritas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.favoritesCount ?? 0}</p>
            </div>
            <Heart className="w-9 h-9 text-pink-500 opacity-70" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolvidas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.questionsResolved ?? 0}</p>
            </div>
            <Target className="w-9 h-9 text-blue-500 opacity-70" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sequência atual</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.currentStreak ?? 0}</p>
            </div>
            <Flame className="w-9 h-9 text-orange-500 opacity-70" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pontos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.totalPoints ?? 0}</p>
            </div>
            <Trophy className="w-9 h-9 text-emerald-500 opacity-70" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Próximo passo</h2>
        <p className="text-gray-600 mb-6">Continue resolvendo questões para aumentar sua sequência e consolidar o aprendizado.</p>
        <Link href="/questoes">
          <Button className="bg-gradient-to-r from-purple-500 to-orange-500 text-white">Voltar para Questões</Button>
        </Link>
      </section>
    </div>
  );
}