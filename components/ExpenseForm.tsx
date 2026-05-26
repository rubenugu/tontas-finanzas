"use client";

import { useState, useEffect } from "react";
import { CATEGORIAS, ExpensePayload } from "@/lib/data";
import CardSelect from "./CardSelect";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: ExpensePayload = {
  fecha: todayISO(),
  tipo: "Gasto",
  categoria: "Gastos Variables",
  subcategoria: "Comida fuera",
  monto: 0,
  tarjeta: "",
  nota: "",
  aMeses: false,
  mesesRestantes: "",
  pagoMensualMSI: "",
  idMSI: "",
};

interface ExpenseFormProps {
  prefill: Partial<ExpensePayload> | null;
  onPrefillConsumed: () => void;
}

export default function ExpenseForm({
  prefill,
  onPrefillConsumed,
}: ExpenseFormProps) {
  const [form, setForm] = useState<ExpensePayload>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  // Apply quick-fill prefill
  useEffect(() => {
    if (!prefill) return;
    setForm((prev) => {
      const next = { ...prev, ...prefill };
      // Keep tarjeta if prefill doesn't specify one
      if (!prefill.tarjeta) next.tarjeta = prev.tarjeta;
      return next;
    });
    onPrefillConsumed();
  }, [prefill, onPrefillConsumed]);

  const categorias = form.tipo ? Object.keys(CATEGORIAS[form.tipo] ?? {}) : [];
  const subcategorias =
    form.tipo && form.categoria
      ? (CATEGORIAS[form.tipo]?.[form.categoria] ?? [])
      : [];

  function set<K extends keyof ExpensePayload>(key: K, val: ExpensePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleTipoChange(tipo: string) {
    const cats = Object.keys(CATEGORIAS[tipo] ?? {});
    const cat = cats[0] ?? "";
    const subs = CATEGORIAS[tipo]?.[cat] ?? [];
    setForm((prev) => ({
      ...prev,
      tipo,
      categoria: cat,
      subcategoria: subs[0] ?? "",
    }));
  }

  function handleCatChange(cat: string) {
    const subs = CATEGORIAS[form.tipo]?.[cat] ?? [];
    setForm((prev) => ({ ...prev, categoria: cat, subcategoria: subs[0] ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Error al guardar");
      setStatus("ok");
      // Reset form keeping last tarjeta and today's date
      setForm({
        ...EMPTY,
        fecha: todayISO(),
        tarjeta: form.tarjeta,
      });
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const inputCls =
    "w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-500";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Fecha */}
      <div>
        <label htmlFor="fecha" className={labelCls}>
          Fecha
        </label>
        <input
          id="fecha"
          type="date"
          value={form.fecha}
          onChange={(e) => set("fecha", e.target.value)}
          required
          className={inputCls}
        />
      </div>

      {/* Tipo */}
      <div>
        <label htmlFor="tipo" className={labelCls}>
          Tipo
        </label>
        <select
          id="tipo"
          value={form.tipo}
          onChange={(e) => handleTipoChange(e.target.value)}
          className={inputCls}
        >
          {Object.keys(CATEGORIAS).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="categoria" className={labelCls}>
          Categoría
        </label>
        <select
          id="categoria"
          value={form.categoria}
          onChange={(e) => handleCatChange(e.target.value)}
          className={inputCls}
        >
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategoría */}
      <div>
        <label htmlFor="subcategoria" className={labelCls}>
          Subcategoría
        </label>
        <select
          id="subcategoria"
          value={form.subcategoria}
          onChange={(e) => set("subcategoria", e.target.value)}
          className={inputCls}
        >
          {subcategorias.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Monto */}
      <div>
        <label htmlFor="monto" className={labelCls}>
          Monto ($)
        </label>
        <input
          id="monto"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.monto === 0 ? "" : form.monto}
          onChange={(e) => set("monto", parseFloat(e.target.value) || 0)}
          required
          placeholder="0.00"
          className={inputCls}
        />
      </div>

      {/* Tarjeta */}
      <div>
        <label htmlFor="tarjeta" className={labelCls}>
          Tarjeta / Método de pago
        </label>
        <CardSelect
          value={form.tarjeta}
          onChange={(v) => set("tarjeta", v)}
          required
        />
      </div>

      {/* Nota */}
      <div>
        <label htmlFor="nota" className={labelCls}>
          Nota{" "}
          <span className="text-gray-600">(opcional)</span>
        </label>
        <input
          id="nota"
          type="text"
          value={form.nota}
          onChange={(e) => set("nota", e.target.value)}
          placeholder="Descripción breve…"
          className={inputCls}
        />
      </div>

      {/* ¿A meses? */}
      <div className="flex items-center gap-3">
        <input
          id="ameses"
          type="checkbox"
          checked={form.aMeses}
          onChange={(e) => set("aMeses", e.target.checked)}
          className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-violet-500 focus:ring-violet-500"
        />
        <label htmlFor="ameses" className="text-sm text-gray-300">
          ¿A meses sin intereses?
        </label>
      </div>

      {/* MSI fields */}
      {form.aMeses && (
        <div className="rounded-lg border border-violet-800 bg-violet-950/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
            Detalle MSI
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="meses" className={labelCls}>
                # Meses restantes
              </label>
              <input
                id="meses"
                type="number"
                inputMode="numeric"
                min="1"
                value={form.mesesRestantes}
                onChange={(e) =>
                  set("mesesRestantes", parseInt(e.target.value) || "")
                }
                placeholder="12"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="pago" className={labelCls}>
                Pago mensual
              </label>
              <input
                id="pago"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.pagoMensualMSI}
                onChange={(e) =>
                  set("pagoMensualMSI", parseFloat(e.target.value) || "")
                }
                placeholder="0.00"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label htmlFor="idmsi" className={labelCls}>
              ID MSI{" "}
              <span className="text-gray-600">(opcional)</span>
            </label>
            <input
              id="idmsi"
              type="text"
              value={form.idMSI}
              onChange={(e) => set("idMSI", e.target.value)}
              placeholder="MSI-001"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3.5 text-base transition-colors"
      >
        {status === "loading" ? "Guardando…" : "Guardar gasto"}
      </button>

      {/* Feedback */}
      {status === "ok" && (
        <div className="rounded-lg bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-sm text-center py-2.5 px-4">
          ✓ Guardado en Google Sheets
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg bg-red-900/60 border border-red-700 text-red-300 text-sm text-center py-2.5 px-4">
          ✗ {errorMsg}
        </div>
      )}
    </form>
  );
}
