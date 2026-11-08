import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogTitle,
  DialogDescription, DialogClose,
} from "@/components/ui/dialog";

type Props = { src: string; label: string };

export default function ChoiceImagePreview({ src, label }: Props) {
  const [zoom, setZoom] = useState(1);
  return (
    <Dialog onOpenChange={() => setZoom(1)}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Ampliar imagem da alternativa ${label}`}
          className="ml-12 mb-3 mr-3 block max-w-[calc(100%-3.75rem)] cursor-zoom-in rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
        >
          <img src={src} alt={`Imagem alternativa ${label}`} className="max-h-48 max-w-full h-auto rounded border border-gray-300 object-contain" />
          <span className="mt-1 flex items-center gap-1 text-xs text-purple-700">
            <ZoomIn size={14} aria-hidden="true" /> Ampliar imagem
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[1000px] sm:max-w-[1000px] max-h-[95dvh] p-3 sm:p-6" showCloseButton={false}>
        <DialogTitle>Imagem da alternativa {label}</DialogTitle>
        <DialogDescription>Amplie para ver os detalhes. A visualização não seleciona uma resposta.</DialogDescription>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" aria-label="Diminuir zoom" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}><ZoomOut size={18} /></Button>
          <span className="text-sm" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="outline" size="sm" aria-label="Aumentar zoom" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.5))}><ZoomIn size={18} /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom(1)}>Ajustar</Button>
          <DialogClose asChild><Button type="button" variant="outline" size="sm" className="ml-auto">Fechar</Button></DialogClose>
        </div>
        <div className="max-h-[65dvh] overflow-auto rounded border bg-white" tabIndex={0} aria-label={`Imagem ampliada da alternativa ${label}; área com rolagem`}>
          <img src={src} alt={`Imagem ampliada da alternativa ${label}`} style={{ width: `${zoom * 100}%`, height: `${zoom * 60}dvh` }} className="block max-w-none object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
