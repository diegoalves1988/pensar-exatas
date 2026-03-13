import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { ArrowRight, Zap, Trophy, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { AdBannerPlaceholder } from "@/components/AdBanner";
import KaTeXRenderer from "@/components/KaTeXRenderer";

type SubjectItem = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  order?: number | null;
};

const FALLBACK_SUBJECTS: SubjectItem[] = [
  { id: 1, name: "Mecânica", icon: "⚙️", description: "Movimento, força e energia", order: 1 },
  { id: 2, name: "Eletromagnetismo", icon: "⚡", description: "Eletricidade e magnetismo", order: 2 },
  { id: 3, name: "Ondulatória", icon: "〰️", description: "Ondas e fenômenos ondulatórios", order: 3 },
  { id: 4, name: "Termodinâmica", icon: "🔥", description: "Calor e temperatura", order: 4 },
  { id: 5, name: "Óptica", icon: "💡", description: "Luz e fenômenos ópticos", order: 5 },
  { id: 6, name: "Cinemática", icon: "🏃", description: "Descrição do movimento", order: 6 },
  { id: 7, name: "Dinâmica", icon: "🧲", description: "Forças e leis de Newton", order: 7 },
  { id: 8, name: "Hidrostática", icon: "🌊", description: "Fluidos e empuxo", order: 8 },
  { id: 101, name: "Álgebra", icon: "🧮", description: "Expressões e equações", order: 101 },
  { id: 102, name: "Funções", icon: "📈", description: "Análise de funções", order: 102 },
  { id: 103, name: "Geometria", icon: "📐", description: "Plana e espacial", order: 103 },
  { id: 104, name: "Trigonometria", icon: "📏", description: "Relações e identidades", order: 104 },
  { id: 105, name: "Probabilidade", icon: "🎲", description: "Contagem e probabilidade", order: 105 },
  { id: 106, name: "Estatística", icon: "📊", description: "Leitura e análise de dados", order: 106 },
];

function getSubjectGradient(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("mec") || normalized.includes("cinem") || normalized.includes("din")) return "from-blue-500 to-indigo-600";
  if (normalized.includes("eletro")) return "from-yellow-400 to-amber-600";
  if (normalized.includes("onda") || normalized.includes("hidro")) return "from-cyan-400 to-blue-600";
  if (normalized.includes("termo")) return "from-red-400 to-red-600";
  if (normalized.includes("opt") || normalized.includes("ópt")) return "from-lime-500 to-green-600";
  return "from-emerald-500 to-teal-600";
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: subjects } = trpc.subjects.list.useQuery();
  // Keep tRPC for dev; add public API fallback for production (Vercel)
  const { data: questions } = trpc.questions.list.useQuery();
  const [publicQuestions, setPublicQuestions] = useState<any[] | null>(null);
  const [publicSubjects, setPublicSubjects] = useState<SubjectItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/questions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.items) setPublicQuestions(data.items);
      })
      .catch(() => {});

    fetch("/api/subjects")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) setPublicSubjects(data.items);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const subjectList: SubjectItem[] =
    (subjects as SubjectItem[] | undefined) ??
    publicSubjects ??
    FALLBACK_SUBJECTS;

  const orderedSubjects = subjectList
    .slice()
    .sort((a, b) => Number(a.order ?? 9999) - Number(b.order ?? 9999) || a.id - b.id);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-orange-500 p-8 md:p-16 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Domine as Exatas no ENEM</h1>
          <p className="text-lg md:text-xl text-purple-100 mb-8">
            Aprenda através de questões resolvidas, aulas interativas e um sistema de gamificação que torna o aprendizado divertido!
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      </section>

      {/* Ad Banner */}
      <AdBannerPlaceholder className="mb-8" />

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/questoes">
          <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-purple-500 cursor-pointer" role="button" aria-label="Ver questões">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Questões Disponíveis</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{(questions?.length ?? publicQuestions?.length ?? 0)}+</p>
              </div>
              <BookOpen className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Matérias</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{orderedSubjects.length}</p>
            </div>
            <Zap className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Badges para Conquistar</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">10+</p>
            </div>
            <Trophy className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Explore as Matérias</h2>
          <p className="text-gray-600">Escolha uma matéria e comece a resolver questões do ENEM</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderedSubjects.map((subject) => (
            <Link key={subject.id} href={`/questoes?subject=${subject.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer h-full">
                <div className={`bg-gradient-to-r ${getSubjectGradient(subject.name)} p-8 text-white text-4xl text-center`}>
                  {subject.icon || "📘"}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{subject.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{subject.description || "Conteúdo focado em ENEM com questões resolvidas."}</p>
                  <div className="flex items-center text-purple-600 font-medium text-sm">
                    Explorar <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Ad Banner */}
      <AdBannerPlaceholder className="my-8" />

      {/* Features Section */}
      <section className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-8 md:p-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Por que escolher nosso site?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white">
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
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white">
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
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
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
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-cyan-500 text-white">
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
            className="bg-gradient-to-r from-purple-500 to-orange-500 text-white hover:shadow-lg transition font-bold text-lg px-8 py-6 h-auto"
          >
            Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        )}
      </section>

      {/* Ad Banner */}
      <AdBannerPlaceholder className="mt-8" />
    </div>
  );
}

