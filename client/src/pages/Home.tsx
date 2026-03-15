import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { ArrowRight, Zap, Trophy, BookOpen, Target, Flame } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { AdBannerPlaceholder } from "@/components/AdBanner";
import { FALLBACK_SUBJECTS, getSubjectArea, sortSubjects, type SubjectItem } from "@/lib/subjects";

type ProfileSummary = {
  favoritesCount: number;
  questionsResolved: number;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  questionsToday: number;
};

const FIXED_QUESTIONS_COUNT = 1000;

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: subjects } = trpc.subjects.list.useQuery();
  const [publicSubjects, setPublicSubjects] = useState<SubjectItem[] | null>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/subjects")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) setPublicSubjects(data.items);
      })
      .catch(() => {});

    if (isAuthenticated) {
      fetch("/api/profile/summary", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data) setProfileSummary(data);
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const subjectList: SubjectItem[] =
    (subjects as SubjectItem[] | undefined) ??
    publicSubjects ??
    FALLBACK_SUBJECTS;

  const orderedSubjects = sortSubjects(subjectList);
  const physicsTopics = orderedSubjects.filter((subject) => getSubjectArea(subject) === "Física");
  const mathTopics = orderedSubjects.filter((subject) => getSubjectArea(subject) === "Matemática");
  const todayGoal = 10;
  const todayProgress = Math.min(profileSummary?.questionsToday ?? 0, todayGoal);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1C3550] via-[#1C3550] to-[#C4605A] p-8 md:p-16 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Domine as Exatas no Enem e Vestibulares</h1>
          <p className="text-lg md:text-xl text-[#A8B4C8] mb-8">
            Aprenda através de questões resolvidas, aulas interativas e um sistema de gamificação que torna o aprendizado divertido!
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      </section>

      {/* Ad Banner */}
      <AdBannerPlaceholder className="mb-8" />

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isAuthenticated ? (
          <Link href="/perfil">
            <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-[#1C3550] cursor-pointer" role="button" aria-label="Ver progresso">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Seu Progresso</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{profileSummary?.questionsResolved ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">questões resolvidas</p>
                </div>
                <Target className="w-12 h-12 text-[#1C3550] opacity-25" />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Meta de hoje</span>
                  <span>{todayProgress}/{todayGoal}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1C3550] to-[#C4605A]"
                    style={{ width: `${(todayProgress / todayGoal) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/questoes">
            <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-[#1C3550] cursor-pointer" role="button" aria-label="Ver questões">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Questões Disponíveis</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{FIXED_QUESTIONS_COUNT}+</p>
                </div>
                <BookOpen className="w-12 h-12 text-[#1C3550] opacity-20" />
              </div>
            </div>
          </Link>
        )}

        <Link href="/questoes">
          <div
            className="bg-white rounded-xl p-6 shadow-md border-l-4 border-[#C4605A] cursor-pointer hover:shadow-lg transition"
            role="button"
            aria-label="Abrir simulados"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Simulado Rápido</p>
                <p className="text-lg font-bold text-gray-900 mt-2">Monte seu teste em segundos</p>
                <p className="text-xs text-gray-500 mt-1">Escolha matérias, ano e quantidade de questões.</p>
              </div>
              <Zap className="w-12 h-12 text-[#C4605A] opacity-25" />
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-[#A8B4C8]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Sequência Atual</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{profileSummary?.currentStreak ?? 0}</p>
            </div>
            <Flame className="w-12 h-12 text-[#A8B4C8] opacity-25" />
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Explore por Área</h2>
          <p className="text-gray-600">Escolha a área principal e foque nos tópicos que mais caem</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl overflow-hidden shadow-md border border-[#1C3550]/20">
            <div className="bg-gradient-to-r from-[#1C3550] to-[#264d75] px-6 py-5 text-white">
              <p className="text-lg font-bold">Física</p>
              <p className="text-sm text-[#A8B4C8]">Questões de Ciências da Natureza com foco em Física</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Tópicos em destaque:</p>
              <div className="flex flex-wrap gap-2">
                {physicsTopics.slice(0, 10).map((subject) => (
                  <Link key={subject.id} href={`/questoes?subject=${subject.id}`}>
                    <span className="inline-flex rounded-full bg-[#EDE8D0] text-[#1C3550] px-3 py-1 text-sm border border-[#A8B4C8] hover:bg-[#A8B4C8] hover:text-white transition">
                      {subject.name}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <Link href="/questoes">
                  <Button variant="outline" className="border-[#1C3550] text-[#1C3550] hover:bg-[#EDE8D0]">
                    Ver questões de Física <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-md border border-[#C4605A]/20">
            <div className="bg-gradient-to-r from-[#C4605A] to-[#a34a45] px-6 py-5 text-white">
              <p className="text-lg font-bold">Matemática</p>
              <p className="text-sm text-[#EDE8D0]">Raciocínio, funções, geometria e interpretação de dados</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Tópicos em destaque:</p>
              <div className="flex flex-wrap gap-2">
                {mathTopics.slice(0, 10).map((subject) => (
                  <Link key={subject.id} href={`/questoes?subject=${subject.id}`}>
                    <span className="inline-flex rounded-full bg-[#EDE8D0] text-[#C4605A] px-3 py-1 text-sm border border-[#C4605A]/20 hover:bg-[#C4605A] hover:text-white transition">
                      {subject.name}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <Link href="/questoes">
                  <Button variant="outline" className="border-[#C4605A] text-[#C4605A] hover:bg-[#EDE8D0]">
                    Ver questões de Matemática <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Tópicos que mais caem no ENEM</p>
          <div className="flex flex-wrap gap-2">
            {orderedSubjects.slice(0, 14).map((subject) => (
              <Link key={subject.id} href={`/questoes?subject=${subject.id}`}>
                <span className="inline-flex rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm hover:bg-gray-200 transition">
                  {subject.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-8 md:p-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Por que escolher nosso site?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#1C3550] text-white">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Questões Resolvidas</h3>
              <p className="text-gray-600 text-sm mt-2">Cada questão vem com uma resolução detalhada passo a passo</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#C4605A] text-white">
                <Zap className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Aulas Relacionadas</h3>
              <p className="text-gray-600 text-sm mt-2">Links para aulas que explicam o conceito por trás de cada questão</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#A8B4C8] text-white">
                <Trophy className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Sistema de Gamificação</h3>
              <p className="text-gray-600 text-sm mt-2">Ganhe badges e pontos conforme resolve questões e progride</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#EDE8D0] text-[#1C3550]">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Conteúdo Atualizado</h3>
              <p className="text-gray-600 text-sm mt-2">Questões dos últimos ENEMs e conteúdo sempre atualizado</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Banner */}
      <AdBannerPlaceholder className="my-8" />

      {/* CTA Section */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pronto para começar?</h2>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
          Junte-se a milhares de alunos que já estão dominando a física do ENEM com nosso método gamificado e eficaz.
        </p>
        {!isAuthenticated && (
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-gradient-to-r from-[#1C3550] to-[#C4605A] text-white hover:shadow-lg transition font-bold text-lg px-8 py-6 h-auto"
          >
            Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        )}
      </section>

    </div>
  );
}

