"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TARJETAS, CATEGORIAS, ExpensePayload } from "@/lib/data";
import CardSelect from "./CardSelect";

interface ParsedExpense {
  tipo: string;
  categoria: string;
  subcategoria: string;
  nota: string;
  monto: number | null;
  tarjeta: string | null;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function getSR(): AnySpeechRecognition | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

export default function VoiceInput({ onConfirm }: VoiceInputProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [monto, setMonto] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [supported, setSupported] = useState(true);
  const [textInput, setTextInput] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (!getSR()) setSupported(false);
  }, []);

  const startRecording = useCallback(() => {
    const SR = getSR();
    if (!SR) return;

    const r = new SR();
    r.lang = "es-MX";
    r.interimResults = true;
    r.continuous = false;
    recogRef.current = r;

    r.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const t = Array.from(Object.values(e.results) as { [key: number]: { transcript: string } }[])
        .map((res) => res[0].transcript)
        .join("");
      setTranscript(t);
    };

    r.onerror = () => {
      setStage("error");
      setErrorMsg("No se pudo acceder al micrófono");
    };

    r.onend = () => {
      // Will be handled by stopRecording
    };

    r.start();
    setTranscript("");
    setStage("recording");
  }, []);

  const stopRecording = useCallback(() => {
    recogRef.current?.stop();
    recogRef.current = null;
  }, []);

  const parseTranscript = useCallback(async (text: string) => {
    if (!text.trim()) {
      setStage("idle");
      return;
    }
    setStage("thinking");
    try {
      const res = await fetch("/api/parse-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error");
      setParsed(data);
      setMonto(data.monto != null ? String(data.monto) : "");
      setTarjeta(data.tarjeta ?? "");
      setStage("confirm");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setStage("error");
    }
  }, []);

  // When recording ends naturally (silence), parse automatically
  useEffect(() => {
    if (!recogRef.current) return;
    const r = recogRef.current;
    r.onend = () => {
      if (stage === "recording") {
        parseTranscript(transcript);
      }
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

  async function handleConfirm() {
    if (!parsed) return;
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) return;

    setStage("saving");
    try {
      const payload: ExpensePayload = {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: parsed.tipo,
        categoria: parsed.categoria,
        subcategoria: parsed.subcategoria,
        nota: parsed.nota,
        monto: montoNum,
        tarjeta,
        aMeses: false,
      };
      const res = await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error");
      setStage("done");
      setTimeout(() => {
        setStage("idle");
        setTranscript("");
        setParsed(null);
        setTextInput("");
      }, 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
      setStage("error");
    }
  }

  function handleEdit() {
    if (!parsed) return;
    onConfirm({
      tipo: parsed.tipo,
      categoria: parsed.categoria,
      subcategoria: parsed.subcategoria,
      nota: parsed.nota,
      monto: parseFloat(monto) || 0,
      tarjeta: tarjeta || undefined,
    });
    setStage("idle");
    setTranscript("");
    setParsed(null);
    setTextInput("");
  }

  function reset() {
    recogRef.current?.stop();
    recogRef.current = null;
    setStage("idle");
    setTranscript("");
    setParsed(null);
    setErrorMsg("");
    setTextInput("");
  }

  const catOptions = parsed
    ? Object.keys(CATEGORIAS[parsed.tipo] ?? {})
    : [];
  const subOptions =
    parsed && parsed.categoria
      ? (CATEGORIAS[parsed.tipo]?.[parsed.categoria] ?? [])
      : [];

  // ── Idle / text fallback ──────────────────────────────────────────────────
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

        {supported ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <button
              type="button"
              onClick={handleMicClick}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 shadow-lg shadow-violet-900/40 transition-all text-2xl"
              aria-label="Dictar gasto"
            >
              🎙️
            </button>
            <p className="text-xs text-gray-500">
              Toca y describe el gasto
            </p>
          </div>
        ) : null}

        {/* Text fallback (always available) */}
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && parseTranscript(textInput)}
            placeholder={
              supported
                ? "O escribe: Uber al trabajo 85 pesos"
                : "Describe el gasto: Uber al trabajo 85 pesos"
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

  // ── Recording ─────────────────────────────────────────────────────────────
  if (stage === "recording") {
    return (
      <div className="rounded-2xl bg-gray-900 border border-violet-700 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-violet-400 font-medium animate-pulse">
            ● Escuchando…
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Cancelar
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={handleMicClick}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/50 animate-pulse transition-all text-2xl"
            aria-label="Detener grabación"
          >
            🎙️
          </button>
          <p className="text-xs text-gray-400">Toca para detener</p>
        </div>
        {transcript && (
          <p className="text-sm text-gray-300 text-center italic">
            &ldquo;{transcript}&rdquo;
          </p>
        )}
      </div>
    );
  }

  // ── Thinking ──────────────────────────────────────────────────────────────
  if (stage === "thinking") {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Interpretando…</p>
          {transcript && (
            <p className="text-xs text-gray-600 italic text-center">
              &ldquo;{transcript}&rdquo;
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (stage === "confirm" && parsed) {
    const montoNum = parseFloat(monto);
    const canSave = montoNum > 0 && tarjeta;

    return (
      <div className="rounded-2xl bg-gray-900 border border-emerald-800/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-400">
            ✦ Claude interpretó
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            ✕ Cancelar
          </button>
        </div>

        {transcript && (
          <p className="text-xs text-gray-500 italic">
            &ldquo;{transcript || textInput}&rdquo;
          </p>
        )}

        {/* Parsed fields */}
        <div className="space-y-2.5">
          {/* Tipo / Categoría / Subcategoría read-only pills */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-gray-800 border border-gray-700 text-gray-300 px-2.5 py-1 text-xs">
              {parsed.tipo}
            </span>
            <span className="rounded-full bg-gray-800 border border-gray-700 text-gray-300 px-2.5 py-1 text-xs">
              {parsed.categoria}
            </span>
            <span className="rounded-full bg-violet-950/50 border border-violet-800/50 text-violet-300 px-2.5 py-1 text-xs font-medium">
              {parsed.subcategoria}
            </span>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nota</label>
            <input
              type="text"
              value={parsed.nota}
              onChange={(e) =>
                setParsed((p) => p && { ...p, nota: e.target.value })
              }
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Categoría override (if wrong) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Categoría
              </label>
              <select
                value={parsed.categoria}
                onChange={(e) => {
                  const cat = e.target.value;
                  const subs = CATEGORIAS[parsed.tipo]?.[cat] ?? [];
                  setParsed((p) =>
                    p && { ...p, categoria: cat, subcategoria: subs[0] ?? "" }
                  );
                }}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {catOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Subcategoría
              </label>
              <select
                value={parsed.subcategoria}
                onChange={(e) =>
                  setParsed((p) => p && { ...p, subcategoria: e.target.value })
                }
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {subOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Monto ($){" "}
              {!monto && (
                <span className="text-amber-500">— ingresa el monto</span>
              )}
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500"
              autoFocus={!monto}
            />
          </div>

          {/* Tarjeta */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Tarjeta{" "}
              {!tarjeta && (
                <span className="text-amber-500">— selecciona</span>
              )}
            </label>
            <CardSelect value={tarjeta} onChange={setTarjeta} id="voice-tarjeta" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleEdit}
            className="flex-1 rounded-xl border border-gray-700 text-gray-300 py-3 text-sm hover:bg-gray-800 transition-colors"
          >
            Editar en formulario
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSave}
            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-3 text-sm transition-colors"
          >
            Guardar ✓
          </button>
        </div>
      </div>
    );
  }

  // ── Saving ────────────────────────────────────────────────────────────────
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

  // ── Done ──────────────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <div className="rounded-2xl bg-emerald-900/30 border border-emerald-700 p-4">
        <div className="flex flex-col items-center gap-2 py-3">
          <p className="text-2xl">✓</p>
          <p className="text-sm font-medium text-emerald-300">
            Guardado en Google Sheets
          </p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
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
