import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { FALLBACK_SUBJECTS, getSubjectArea, sortSubjects, type SubjectItem } from "@/lib/subjects";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState<SubjectItem[]>(FALLBACK_SUBJECTS);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Física": false,
    "Matemática": false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subjects")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items) && data.items.length > 0) {
          setSubjects(data.items);
        }
      })
      .catch(() => {
        // Keep fallback catalog when API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedSubjects = sortSubjects(subjects);

  const physicsItems = orderedSubjects.filter((item) => getSubjectArea(item.name) === "Física");
  const mathItems = orderedSubjects.filter((item) => getSubjectArea(item.name) === "Matemática");
  const normalizedFilter = subjectFilter.trim().toLowerCase();

  const subjectGroups = [
    {
      name: "Física",
      color: "from-blue-500 to-indigo-600",
      items: physicsItems,
    },
    {
      name: "Matemática",
      color: "from-emerald-500 to-teal-600",
      items: mathItems,
    },
  ];

  const visibleSubjectGroups = subjectGroups.map((group) => {
    const filteredItems = normalizedFilter
      ? group.items.filter((item) => item.name.toLowerCase().includes(normalizedFilter))
      : group.items;

    return {
      ...group,
      filteredItems,
      visibleItems:
        normalizedFilter || expandedGroups[group.name]
          ? filteredItems
          : filteredItems.slice(0, 4),
      hiddenCount:
        normalizedFilter || expandedGroups[group.name]
          ? 0
          : Math.max(filteredItems.length - 4, 0),
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              PE
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-xl text-gray-900">{APP_TITLE}</h1>
              <p className="text-xs text-gray-500">Domine as exatas!</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Início
            </Link>
            <Link href="/questoes" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Questões
            </Link>
            <Link href="/portfolio" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Portfólio
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-gray-700 hover:text-purple-600 font-medium transition">
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name || "Usuário"}</p>
                  <p className="text-xs text-gray-500">{user?.role === "admin" ? "Admin" : "Aluno"}</p>
                </div>
                <Button
                  onClick={() => logout()}
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 hover:text-purple-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-purple-500 to-orange-500 text-white hover:shadow-lg transition">
                    Entrar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="sm" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                    Cadastrar
                  </Button>
                </Link>
              </div>
            )}

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-700 hover:text-purple-600"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {sidebarOpen && (
          <div className="md:hidden bg-gray-50 border-t border-gray-200 p-4 space-y-2">
            <Link href="/" className="block px-4 py-2 text-gray-700 hover:bg-purple-100 rounded transition">
              Início
            </Link>
            <Link href="/questoes" className="block px-4 py-2 text-gray-700 hover:bg-purple-100 rounded transition">
              Questões
            </Link>
            <Link href="/portfolio" className="block px-4 py-2 text-gray-700 hover:bg-purple-100 rounded transition">
              Portfólio
            </Link>
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" className="block px-4 py-2 text-gray-700 hover:bg-purple-100 rounded transition">
                Admin
              </Link>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:w-64 bg-white shadow-md flex-col border-r border-gray-200">
          <div className="p-6 border-b border-gray-200">
            {isAuthenticated && (
              <div className="mb-5 pb-4 border-b border-gray-200 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conta</p>
                <Link
                  href="/perfil"
                  className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-100 rounded-lg transition"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">Meu Perfil</span>
                </Link>
              </div>
            )}
            <h2 className="font-bold text-lg text-gray-900 mb-4">Matérias</h2>
            <div className="mb-4">
              <input
                type="text"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                placeholder="Filtrar matérias"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
            </div>
            <div className="space-y-3">
              {visibleSubjectGroups.map((group, idx) => (
                <details key={group.name} open={idx === 0} className="group rounded-lg border border-gray-200 bg-gray-50">
                  <summary className="list-none cursor-pointer select-none px-3 py-2 flex items-center justify-between">
                    <span className={`text-sm font-bold text-white px-2 py-1 rounded bg-gradient-to-r ${group.color}`}>
                      {group.name}
                    </span>
                    <span className="text-xs text-gray-500">{group.filteredItems.length} tópicos</span>
                  </summary>
                  <div className="px-2 pb-2 space-y-1">
                    {group.visibleItems.map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/questoes?subject=${subject.id}`}
                        className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-white hover:shadow-sm transition"
                      >
                        <span>{subject.name}</span>
                      </Link>
                    ))}
                    {group.filteredItems.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">Nenhuma matéria encontrada.</p>
                    )}
                    {group.hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups((current) => ({
                            ...current,
                            [group.name]: true,
                          }))
                        }
                        className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-purple-600 hover:bg-white transition"
                      >
                        Ver mais {group.hiddenCount}
                      </button>
                    )}
                    {!normalizedFilter && expandedGroups[group.name] && group.filteredItems.length > 4 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups((current) => ({
                            ...current,
                            [group.name]: false,
                          }))
                        }
                        className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-white transition"
                      >
                        Mostrar menos
                      </button>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {isAuthenticated && (
            <div className="p-6 border-t border-gray-200 mt-auto space-y-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-100 rounded-lg transition"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm font-medium">Painel Admin</span>
                </Link>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            {title && (
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
                <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-orange-500 rounded"></div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-white mb-4">Pensar Exatas</h3>
              <p className="text-sm">Questões comentadas para estudar Física e Matemática com foco no ENEM.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/questoes" className="hover:text-purple-400 transition">Questões</Link></li>
                <li><Link href="/perfil" className="hover:text-purple-400 transition">Meu Perfil</Link></li>
                <li><Link href="/portfolio" className="hover:text-purple-400 transition">Portfólio</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Acesso Rápido</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-purple-400 transition">Início</Link></li>
                <li><Link href="/questoes" className="hover:text-purple-400 transition">Resolver Questões</Link></li>
                {isAdmin && <li><Link href="/admin" className="hover:text-purple-400 transition">Painel Admin</Link></li>}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; 2026 Pensar Exatas. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

