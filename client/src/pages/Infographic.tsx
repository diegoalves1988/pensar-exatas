import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { disciplines, type InfographicItem } from "@shared/infographics";

export const infographicsQueryKey = ["infographics"] as const;

export default function Infographic() {
  const [filter, setFilter] = useState<"Todos" | InfographicItem["discipline"]>("Todos");
  const [selected, setSelected] = useState<InfographicItem | null>(null);
  const library = useQuery({
    queryKey: infographicsQueryKey,
    queryFn: async ({ signal }): Promise<{ items: InfographicItem[] }> => {
      const response = await fetch("/api/infographics", { signal });
      if (!response.ok) throw new Error("Não foi possível carregar os infográficos.");
      return response.json();
    },
  });
  const items = library.data?.items.filter(item => filter === "Todos" || item.discipline === filter) ?? [];

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-4xl font-bold text-gray-900">Infográficos</h1>
      <div role="group" aria-label="Filtrar por disciplina" className="flex flex-wrap gap-2">
        {(["Todos", ...disciplines] as const).map(option => (
          <button key={option} type="button" aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className="rounded-full border border-purple-200 bg-white px-4 py-2 font-medium text-purple-900 hover:bg-purple-50 aria-pressed:bg-purple-700 aria-pressed:text-white">
            {option}
          </button>
        ))}
      </div>
      {library.isPending && <p role="status">Carregando infográficos…</p>}
      {library.isError && (
        <div role="alert">
          Não foi possível carregar os infográficos.{" "}
          <button type="button" onClick={() => library.refetch()} className="font-medium text-purple-700 underline">
            Tentar novamente
          </button>
        </div>
      )}
      {library.isSuccess && items.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-gray-600">
          {filter === "Todos" ? "Nenhum infográfico publicado ainda." : `Nenhum infográfico de ${filter} publicado ainda.`}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => {
          const base = `/api/infographics/${item.id}`;
          const preview = item.hasCover ? `${base}/cover` : item.fileType !== "application/pdf" ? `${base}/file` : null;
          return (
            <button key={item.id} type="button" onClick={() => setSelected(item)}
              className="overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:border-purple-400 hover:shadow-md">
              <div className="flex aspect-[4/3] items-center justify-center bg-purple-50">
                {preview ? (
                  <img src={preview} alt="" loading="lazy" className="h-full w-full object-contain" />
                ) : (
                  <span className="flex items-center gap-2 text-purple-800"><FileText aria-hidden="true" /> PDF</span>
                )}
              </div>
              <div className="space-y-2 p-4">
                <p className="text-sm font-medium text-gray-600">{item.discipline} · {item.topic}</p>
                <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                <span className="font-medium text-purple-700">Ver infográfico</span>
              </div>
            </button>
          );
        })}
      </div>
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        {selected && (
          <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-auto sm:max-w-3xl">
            <DialogTitle className="pr-6">{selected.title}</DialogTitle>
            {selected.fileType === "application/pdf" ? (
              <div className="space-y-4">
                {selected.hasCover && <img src={`/api/infographics/${selected.id}/cover`} alt="" className="mx-auto max-h-[65dvh] object-contain" />}
                <div className="flex flex-wrap gap-4">
                  <a href={`/api/infographics/${selected.id}/file`} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-purple-700 underline">Abrir PDF em nova aba</a>
                  <a href={`/api/infographics/${selected.id}/file`} download="infografico.pdf"
                    className="font-medium text-purple-700 underline">Baixar PDF</a>
                </div>
              </div>
            ) : (
              <img src={`/api/infographics/${selected.id}/file`} alt={selected.title} className="mx-auto w-full" />
            )}
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
