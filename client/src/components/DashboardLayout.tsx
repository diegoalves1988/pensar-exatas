import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src="/logo.svg" alt="Pensar Exatas" className="w-14 h-14 object-contain" />
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
            {isAuthenticated && (
              <Link href="/perfil" className="text-gray-700 hover:text-purple-600 font-medium transition">
                Meu Perfil
              </Link>
            )}
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
                  onClick={async () => { try { await logout(); } finally { setLocation("/"); } }}
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
            {isAuthenticated && (
              <Link href="/perfil" className="block px-4 py-2 text-gray-700 hover:bg-purple-100 rounded transition">
                Meu Perfil
              </Link>
            )}
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

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-white mb-4">Domine as Exatas no Enem</h3>
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
            <p>&copy; 2026 Domine as Exatas no Enem. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

