import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { infographicsQueryKey } from "@/pages/Infographic";
import { disciplines, imageTypes, infographicTypes, maxInfographicBytes, infographicTopics, type InfographicDiscipline } from "@shared/infographics";

async function encodeFile(file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
  return { type: file.type, data };
}

export default function AdminInfographics() {
  const queryClient = useQueryClient();
  const [discipline, setDiscipline] = useState<InfographicDiscipline | "">("");
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("file");
    const cover = values.get("cover");
    const coverFile = cover instanceof File && cover.size > 0 ? cover : undefined;

    if (!(file instanceof File) || !file.size) {
      setFeedback({ error: true, message: "Selecione o arquivo do infográfico." });
      return;
    }
    if (file.size + (coverFile?.size ?? 0) > maxInfographicBytes) {
      setFeedback({ error: true, message: "O arquivo e a capa juntos devem ter até 3 MB." });
      return;
    }
    setPublishing(true);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/admin/infographics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.get("title"),
          topic: values.get("topic"),
          discipline: values.get("discipline"),
          file: await encodeFile(file),
          cover: coverFile ? await encodeFile(coverFile) : undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Não foi possível publicar o infográfico.");
      }
      form.reset();
      setDiscipline("");
      await queryClient.invalidateQueries({ queryKey: infographicsQueryKey });
      setFeedback({ error: false, message: "Infográfico publicado." });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Falha na publicação." });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Gerenciar infográficos</h2>
      <form onSubmit={publish} className="mt-5 max-w-xl space-y-4">
        <fieldset disabled={publishing} className="space-y-4">
          <label className="block space-y-1">
            <span>Título</span>
            <Input name="title" required maxLength={160} />
          </label>
          <label className="block space-y-1">
            <span>Disciplina</span>
            <select name="discipline" required value={discipline}
              onChange={event => setDiscipline(disciplines.find(option => option === event.target.value) ?? "")}
              className="block w-full rounded-md border bg-white p-2">
              <option value="" disabled>Selecione a disciplina</option>
              {disciplines.map(discipline => <option key={discipline}>{discipline}</option>)}
            </select>
          </label>
          {discipline && (
            <label className="block space-y-1">
              <span>Tópico de {discipline}</span>
              <select key={discipline} name="topic" required defaultValue="" className="block w-full rounded-md border bg-white p-2">
                <option value="" disabled>Selecione o tópico</option>
                {infographicTopics[discipline].map(topic => <option key={topic}>{topic}</option>)}
              </select>
            </label>
          )}
          <label className="block space-y-1">
            <span>Arquivo (PNG, JPEG, WebP ou PDF)</span>
            <Input name="file" type="file" required accept={infographicTypes.join(",")} aria-describedby="infographic-size" />
          </label>
          <label className="block space-y-1">
            <span>Imagem de capa (opcional)</span>
            <Input name="cover" type="file" accept={imageTypes.join(",")} aria-describedby="infographic-size" />
          </label>
          <p id="infographic-size" className="text-sm text-gray-600">Limite de 3 MB para o arquivo e a capa juntos.</p>
          <Button type="submit">{publishing ? "Publicando…" : "Publicar infográfico"}</Button>
        </fieldset>
        {feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
      </form>
    </section>
  );
}
