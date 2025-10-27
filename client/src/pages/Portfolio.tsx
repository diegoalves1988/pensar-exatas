import { trpc } from "@/lib/trpc";
import { Mail, Linkedin, Github, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Portfolio() {
  const { data: profile } = trpc.portfolio.getProfile.useQuery();
  const { data: items } = trpc.portfolio.getItems.useQuery();

  const education = items?.filter(i => i.type === "education") || [];
  const experience = items?.filter(i => i.type === "experience") || [];
  const projects = items?.filter(i => i.type === "project") || [];
  const social = items?.filter(i => i.type === "social") || [];

  return (
    <div className="space-y-12">
      {/* Profile Header */}
      <section className="bg-gradient-to-r from-purple-600 to-orange-500 rounded-2xl p-8 md:p-12 text-white">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-6xl flex-shrink-0">
            👨‍🏫
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">{profile?.name || "Seu Nome"}</h1>
            <p className="text-xl text-white/90 mb-4">
              {profile?.title || "Professor de Física e Criador de Conteúdo"}
            </p>
            <p className="text-white/80 mb-6">
              {profile?.bio || "Apaixonado por ensinar física de forma clara e divertida"}
            </p>
            <div className="flex gap-3 justify-center md:justify-start flex-wrap">
              <a href="mailto:seu@email.com">
                <Button className="bg-white text-purple-600 hover:bg-gray-100">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </a>
              {social.map((item) => (
                <a key={item.id} href={item.url || "#"} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-white text-white hover:bg-white/20">
                    {item.icon} {item.title}
                  </Button>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Education Section */}
      {education.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Formação Acadêmica</h2>
          <div className="space-y-4">
            {education.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                    <p className="text-purple-600 font-medium">{item.institution}</p>
                    <p className="text-gray-600 text-sm mt-2">{item.description}</p>
                    {(item.startDate || item.endDate) && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm mt-3">
                        <Calendar className="w-4 h-4" />
                        {item.startDate} {item.endDate ? `- ${item.endDate}` : "- Presente"}
                      </div>
                    )}
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience Section */}
      {experience.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Experiência Profissional</h2>
          <div className="space-y-4">
            {experience.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                    <p className="text-orange-600 font-medium">{item.institution}</p>
                    <p className="text-gray-600 text-sm mt-2">{item.description}</p>
                    {(item.startDate || item.endDate) && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm mt-3">
                        <Calendar className="w-4 h-4" />
                        {item.startDate} {item.endDate ? `- ${item.endDate}` : "- Presente"}
                      </div>
                    )}
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects Section */}
      {projects.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Projetos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Social Links */}
      {social.length > 0 && (
        <section className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Conecte-se Comigo</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            {social.map((item) => (
              <a key={item.id} href={item.url || "#"} target="_blank" rel="noopener noreferrer">
                <Button className="bg-gradient-to-r from-purple-500 to-orange-500 text-white hover:shadow-lg transition">
                  {item.icon} {item.title}
                </Button>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="text-center py-12 bg-white rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Gostou do conteúdo?</h2>
        <p className="text-gray-600 mb-6">
          Volte para as questões e continue aprendendo física de forma gamificada!
        </p>
        <a href="/questoes">
          <Button className="bg-gradient-to-r from-purple-500 to-orange-500 text-white hover:shadow-lg transition">
            Voltar para Questões
          </Button>
        </a>
      </section>
    </div>
  );
}

