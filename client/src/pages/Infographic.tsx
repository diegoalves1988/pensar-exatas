export default function Infographic() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-4xl font-bold text-gray-900">Infográfico</h1>
      <section className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900">Teorema de Pitágoras</h2>
        <div className="mt-6 grid items-center gap-6 sm:grid-cols-2">
          <figure className="rounded-lg bg-purple-50 p-4 text-center text-purple-900">
            <div aria-hidden="true" className="relative mx-auto my-8 h-24 w-32">
              <div className="absolute inset-0 bg-purple-200 [clip-path:polygon(0_0,0_100%,100%_100%)]" />
              <div className="absolute bottom-0 left-0 size-4 border-r-2 border-t-2 border-purple-700" />
              <span className="absolute -left-5 top-1/2 -translate-y-1/2 font-semibold">3</span>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-semibold">4</span>
              <span className="absolute left-1/2 top-5 font-semibold">5</span>
            </div>
            <figcaption>Catetos de 3 e 4 e hipotenusa de 5</figcaption>
          </figure>
          <div className="space-y-3 text-gray-700">
            <p>Em um triângulo retângulo, o quadrado da hipotenusa é igual à soma dos quadrados dos catetos.</p>
            <p className="text-xl font-semibold text-purple-800">3² + 4² = 9 + 16 = 25</p>
            <p>Logo, a hipotenusa mede √25 = 5 unidades.</p>
          </div>
        </div>
      </section>
      <section className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900">Rapidez média</h2>
        <div className="mt-6 grid items-center gap-6 sm:grid-cols-2">
          <figure className="rounded-lg bg-orange-50 p-4 text-orange-950">
            <div aria-hidden="true" className="grid grid-cols-3 gap-1 text-center">
              {[1, 2, 3].map(hour => (
                <div key={hour}>
                  <div className="rounded bg-orange-200 px-1 py-2 font-semibold">60 km</div>
                  <div className="mt-1 text-sm">{hour}ª hora</div>
                </div>
              ))}
            </div>
            <figcaption className="mt-3 text-center">Em ritmo constante, 180 km em 3 horas</figcaption>
          </figure>
          <div className="space-y-3 text-gray-700">
            <p>Para encontrar a rapidez média de um percurso, divida a distância total pelo tempo total.</p>
            <p className="text-xl font-semibold text-orange-800">180 km ÷ 3 h = 60 km/h</p>
            <p>O resultado corresponde a 60 quilômetros por hora, em média.</p>
          </div>
        </div>
      </section>
    </article>
  );
}
