"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CATEGORIAS, ExpensePayload } from "@/lib/data";
import CardSelect from "./CardSelect";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedExpense {
  tipo: string;
  categoria: string;
  subcategoria: string;
  nota: string;
  monto: number | null;
  tarjeta: string | null;
}

// Editable item in the confirm stage
interface ConfirmItem {
  tipo: string;
  categoria: string;
  subcategoria: string;
  nota: string;
  monto: string;
  tarjeta: string;
}

type Stage =
  | "idle"
  | "recording"
  | "thinking"
  | "confirm"
  | "saving"
  | "done"
  | "error";

interface VoiceInputProps {
  onConfirm: (fields: Partial<ExpensePayload>) => void;
}

// ── Speech recognition ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSR(): any | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

function toItems(data: ParsedExpense | ParsedExpense[]): ConfirmItem[] {
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((d) => ({
    tipo: d.tipo ?? "Gasto",
    categoria: d.categoria ?? "",
    subcategoria: d.subcategoria ?? "",
    nota: d.nota ?? "",
    monto: d.monto != null ? String(d.monto) : "",
    tarjeta: d.tarjeta ?? "",
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceInput({ onConfirm }: VoiceInputProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<ConfirmItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [supported, setSupported] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (!getSR()) setSupported(false);
  }, []);

  // Update a single field of a single item
  function setField<K extends keyof ConfirmItem>(
    idx: number,
    key: K,
    val: ConfirmItem[K]
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: val } : item))
    );
  }

  // When category changes, reset subcategory to first available
  function handleCatChange(idx: number, cat: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const subs = CATEGORIAS[item.tipo]?.[cat] ?? [];
        return { ...item, categoria: cat, subcategoria: subs[0] ?? "" };
      })
    );
  }

  // ── Recording ────────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    const SR = getSR();
    if (!SR) return;
    const r = new SR();
    r.lang = "es-MX";
    r.interimResults = true;
    r.continuous = false;
    recogRef.current = r;
    r.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const t = Array.from(
        Object.values(e.results) as { [k: number]: { transcript: string } }[]
      )
        .map((res) => res[0].transcript)
        .join("");
      setTranscript(t);
    };
    r.onerror = () => {
      setStage("error");
      setErrorMsg("No se pudo acceder al micrófono");
    };
    r.start();
    setTranscript("");
    setStage("recording");
  }, []);

  const stopRecording = useCallback(() => {
    recogRef.current?.stop();
    recogRef.current = null;
  }, []);

  // ── Parse ────────────────────────────────────────────────────────────────────

  const parseTranscript = useCallback(async (text: string) => {
    if (!text.trim()) { setStage("idle"); return; }
    setStage("thinking");
    try {
      const res = await fetch("/api/parse-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error");
      setItems(toItems(data));
      setStage("confirm");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setStage("error");
    }
  }, []);

  // Auto-parse when speech recognition ends naturally
  useEffect(() => {
    if (!recogRef.current) return;
    const r = recogRef.current;
    r.onend = () => {
      if (stage === "recording") parseTranscript(transcript);
    };
  }, [stage, transcript, parseTranscript]);

  function handleMicClick() {
    if (stage === "recording") {
      stopRecording();
      parseTranscript(transcript);
    } else {
      startRecording();
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    const allValid = items.every(
      (it) => parseFloat(it.monto) > 0 && it.tarjeta
    );
    if (!allValid) return;

    setStage("saving");
    const today = new Date().toISOString().slice(0, 10);
    try {
      for (const it of items) {
        const payload: ExpensePayload = {
          fecha: today,
          tipo: it.tipo,
          categoria: it.categoria,
          subcategoria: it.subcategoria,
          nota: it.nota,
          monto: parseFloat(it.monto),
          tarjeta: it.tarjeta,
          aMeses: false,
        };
        const res = await fetch("/api/expense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "Error");
      }
      setSavedCount(items.length);
      setStage("done");
      setTimeout(() => {
        setStage("idle");
        setTranscript("");
        setItems([]);
        setTextInput("");
      }, 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
      setStage("error");
    }
  }

  // Send first item to main form (only shown for single-item results)
  function handleEdit() {
    if (!items.length) return;
    const it = items[0];
    onConfirm({
      tipo: it.tipo,
      categoria: it.categoria,
      subcategoria: it.subcategoria,
      nota: it.nota,
      monto: parseFloat(it.monto) || 0,
      tarjeta: it.tarjeta || undefined,
    });
    reset();
  }

  function reset() {
    recogRef.current?.stop();
    recogRef.current = null;
    setStage("idle");
    setTranscript("");
    setItems([]);
    setErrorMsg("");
    setTextInput("");
  }

  // ── Can save? ─────────────────────────────────────────────────────────────────

  const canSave =
    items.length > 0 &&
    items.every((it) => parseFloat(it.monto) > 0 && it.tarjeta);

  const missingMonto = items.some((it) => !parseFloat(it.monto));
  const missingTarjeta = items.some((it) => !it.tarjeta);

  // ── Render ────────────────────────────────────────────────────────────────────

  // Idle
  if (stage === "idle") {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Dictar con Claude
          </span>
          <span className="text-xs text-violet-400 bg-violet-950/40 border border-violet-800/50 rounded-full px-2 py-0.5">
            IA
          </span>
        </div>

        {supported && (
          <div className="flex flex-col items-center gap-2 py-2">
            <button
              type="button"
              onClick={handleMicClick}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 shadow-lg shadow-violet-900/40 transition-all text-2xl"
              aria-label="Dictar gasto"
            >
              🎙️
            </button>
            <p className="text-xs text-gray-500">Toca y describe el gasto</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && parseTranscript(textInput)}
            placeholder={
              supported
                ? "O escribe: Tacos y Uber al trabajo"
                : "Describe el gasto: Tacos y Uber al trabajo"
            }
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={() => parseTranscript(textInput)}
            disabled={!textInput.trim()}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-3 py-2 text-sm text-white transition-colors"
          >
            →
          </button>
        </div>
      </div>
    );
  }

  // Recording
  if (stage === "recording") {
    return (
      <div className="rounded-2xl bg-gray-900 border border-violet-700 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-violet-400 font-medium animate-pulse">
            ● Escuchando…
          </span>
          <button type="button" onClick={reset} className="text-xs text-gray-500 hover:text-gray-300">
            Cancelar
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={handleMicClick}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/50 animate-pulse transition-all text-2xl"
          >
            🎙️
          </button>
          <p className="text-xs text-gray-400">Toca para detener</p>
        </div>
        {transcript && (
          <p className="text-sm text-gray-300 text-center italic">&ldquo;{transcript}&rdquo;</p>
        )}
      </div>
    );
  }

  // Thinking
  if (stage === "thinking") {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Interpretando…</p>
          {transcript && (
            <p className="text-xs text-gray-600 italic text-center">&ldquo;{transcript}&rdquo;</p>
          )}
        </div>
      </div>
    );
  }

  // Confirm — one card per parsed expense
  if (stage === "confirm" && items.length > 0) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-emerald-800/60 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-400">
              ✦ Claude interpretó
            </span>
            {items.length > 1 && (
              <span className="text-xs bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-full px-2 py-0.5">
                {items.length} gastos
              </span>
            )}
          </div>
          <button type="button" onClick={reset} className="text-xs text-gray-500 hover:text-gray-300">
            ✕ Cancelar
          </button>
        </div>

        {(transcript || textInput) && (
          <p className="text-xs text-gray-500 italic">
            &ldquo;{transcript || textInput}&rdquo;
          </p>
        )}

        {/* One card per expense */}
        <div className="space-y-3">
          {items.map((item, idx) => {
            const catOptions = Object.keys(CATEGORIAS[item.tipo] ?? {});
            const subOptions = CATEGORIAS[item.tipo]?.[item.categoria] ?? [];

            return (
              <div
                key={idx}
                className="rounded-xl bg-gray-800/60 border border-gray-700 p-3 space-y-2.5"
              >
                {/* Category pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-gray-700 text-gray-300 px-2.5 py-1 text-xs">
                    {item.tipo}
                  </span>
                  <span className="rounded-full bg-violet-950/60 border border-violet-800/50 text-violet-300 px-2.5 py-1 text-xs font-medium">
                    {item.subcategoria}
                  </span>
                </div>

                {/* Nota */}
                <input
                  type="text"
                  value={item.nota}
                  onChange={(e) => setField(idx, "nota", e.target.value)}
                  placeholder="Nota"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />

                {/* Categoría / Subcategoría */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={item.categoria}
                    onChange={(e) => handleCatChange(idx, e.target.value)}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {catOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={item.subcategoria}
                    onChange={(e) => setField(idx, "subcategoria", e.target.value)}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {subOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Monto + Tarjeta */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Monto ($)
                      {!item.monto && <span className="text-amber-500 ml-1">*</span>}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={item.monto}
                      onChange={(e) => setField(idx, "monto", e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Tarjeta
                      {!item.tarjeta && <span className="text-amber-500 ml-1">*</span>}
                    </label>
                    <CardSelect
                      value={item.tarjeta}
                      onChange={(v) => setField(idx, "tarjeta", v)}
                      id={`voice-tarjeta-${idx}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Missing fields hint */}
        {(missingMonto || missingTarjeta) && (
          <p className="text-xs text-amber-400">
            * Completa los campos marcados para guardar
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {items.length === 1 && (
            <button
              type="button"
              onClick={handleEdit}
              className="flex-1 rounded-xl border border-gray-700 text-gray-300 py-3 text-sm hover:bg-gray-800 transition-colors"
            >
              Editar en formulario
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSave}
            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-3 text-sm transition-colors"
          >
            {items.length > 1 ? `Guardar los ${items.length} ✓` : "Guardar ✓"}
          </button>
        </div>
      </div>
    );
  }

  // Saving
  if (stage === "saving") {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Guardando en Sheets…</p>
        </div>
      </div>
    );
  }

  // Done
  if (stage === "done") {
    return (
      <div className="rounded-2xl bg-emerald-900/30 border border-emerald-700 p-4">
        <div className="flex flex-col items-center gap-2 py-3">
          <p className="text-2xl">✓</p>
          <p className="text-sm font-medium text-emerald-300">
            {savedCount > 1
              ? `${savedCount} gastos guardados en Google Sheets`
              : "Guardado en Google Sheets"}
          </p>
        </div>
      </div>
    );
  }

  // Error
  return (
    <div className="rounded-2xl bg-red-900/30 border border-red-700 p-4 space-y-3">
      <p className="text-sm text-red-300">✗ {errorMsg}</p>
      <button
        type="button"
        onClick={reset}
        className="text-xs text-gray-400 hover:text-gray-200 underline"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
