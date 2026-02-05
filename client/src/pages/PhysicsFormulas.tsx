import KaTeXRenderer from "@/components/KaTeXRenderer";

export default function PhysicsFormulas() {
  const examples = [
    { title: "Teorema de Pitágoras (inline)", formula: "c = \\sqrt{a^2 + b^2}", display: false },
    { title: "Energia e massa (display)", formula: "E = mc^2", display: true },
    { title: "Equação da onda (display)", formula: "\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\n+\\nabla^2 u", display: true },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Exemplos de fórmulas com KaTeX</h2>
      <p className="mb-6 text-sm text-gray-600">Use o componente <code>KaTeXRenderer</code> para renderizar fórmulas a partir de strings TeX.</p>

      <div className="space-y-6">
        {examples.map((ex, i) => (
          <div key={i} className="p-4 bg-white rounded shadow-sm">
            <h3 className="font-medium mb-2">{ex.title}</h3>
            <div className="text-lg">
              <KaTeXRenderer formula={ex.formula} displayMode={ex.display} />
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 p-4 bg-white rounded shadow-sm">
        <h3 className="font-medium mb-2">Observações</h3>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
          <li>Não passe HTML diretamente — o componente espera strings TeX.</li>
          <li>O componente carrega KaTeX do CDN por padrão. Para produção, considere instalar <code>katex</code> via npm e importar diretamente.</li>
          <li>Se receber fórmulas do usuário, valide/filtre o conteúdo antes de renderizar para evitar abusos.</li>
        </ul>
      </section>
    </div>
  );
}
