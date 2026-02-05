import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  // Fallback for production (Vercel) when tRPC might be unavailable: attempt /api/me
  const [meFallback, setMeFallback] = useState<{ role?: string } | null>(null);
  useEffect(() => {
    if (isAuthenticated) return; // prefer tRPC auth when present
    let cancelled = false;
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) setMeFallback(data); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [isAuthenticated]);
  const isAdmin = (user?.role === 'admin') || (meFallback?.role === 'admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const subjects = [
    { id: 1, name: "Mecânica", icon: "⚙️", color: "from-blue-400 to-blue-600" },
    { id: 2, name: "Eletromagnetismo", icon: "⚡", color: "from-yellow-400 to-yellow-600" },
    { id: 3, name: "Ondulatória", icon: "〰️", color: "from-cyan-400 to-cyan-600" },
    { id: 4, name: "Termodinâmica", icon: "🔥", color: "from-red-400 to-red-600" },
    { id: 5, name: "Óptica", icon: "💡", color: "from-green-400 to-green-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              F
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-xl text-gray-900">{APP_TITLE}</h1>
              <p className="text-xs text-gray-500">Domina a Física!</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Início
            </Link>
            <Link href="/questoes" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Questões
            </Link>
            <Link href="/formulas" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Fórmulas
            </Link>
            <Link href="/portfolio" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Portfólio
            </Link>
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" className="text-gray-700 hover:text-purple-600 font-medium transition">
                Admin
              </Link>
            )}
            {!isAuthenticated && isAdmin && (
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
            <h2 className="font-bold text-lg text-gray-900 mb-4">Matérias</h2>
            <div className="space-y-2">
              {subjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/questoes?subject=${subject.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r ${subject.color} text-white font-medium hover:shadow-lg transition transform hover:scale-105`}
                >
                  <span className="text-xl">{subject.icon}</span>
                  <span className="text-sm">{subject.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {isAuthenticated && (
            <div className="p-6 border-t border-gray-200 mt-auto space-y-3">
              <Link
                href="/perfil"
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-purple-100 rounded-lg transition"
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">Meu Perfil</span>
              </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-white mb-4">Física ENEM</h3>
              <p className="text-sm">Aprenda física de forma gamificada e divertida!</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/questoes" className="hover:text-purple-400 transition">Questões</Link></li>
                <li><Link href="/aulas" className="hover:text-purple-400 transition">Aulas</Link></li>
                <li><Link href="/portfolio" className="hover:text-purple-400 transition">Portfólio</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Sobre</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-purple-400 transition">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-purple-400 transition">Contato</a></li>
                <li><a href="#" className="hover:text-purple-400 transition">Política de Privacidade</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Redes Sociais</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-purple-400 transition">Instagram</a></li>
                <li><a href="#" className="hover:text-purple-400 transition">YouTube</a></li>
                <li><a href="#" className="hover:text-purple-400 transition">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; 2024 Física ENEM Descomplicada. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

