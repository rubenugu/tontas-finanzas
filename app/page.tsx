"use client";

import { useState, useCallback } from "react";
import ExpenseForm from "@/components/ExpenseForm";
import QuickFillBar from "@/components/QuickFillBar";
import VoiceInput from "@/components/VoiceInput";
import { ExpensePayload } from "@/lib/data";

export default function Home() {
  const [prefill, setPrefill] = useState<Partial<ExpensePayload> | null>(null);

  const handleFill = useCallback((fields: Partial<ExpensePayload>) => {
    setPrefill(fields);
    document
      .getElementById("form-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handlePrefillConsumed = useCallback(() => {
    setPrefill(null);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-md px-4 pb-16 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">💸 Tontas Finanzas</h1>
          <p className="text-xs text-gray-500 mt-0.5">Registro de gastos</p>
        </div>

        {/* Quick-fill section */}
        <section className="mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Accesos rápidos
          </p>
          <QuickFillBar onFill={handleFill} />
        </section>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-6" />

        {/* Voice / AI input */}
        <section className="mb-6">
          <VoiceInput onConfirm={handleFill} />
        </section>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-6" />

        {/* Form */}
        <section id="form-section">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
            Nuevo registro
          </p>
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
            <ExpenseForm
              prefill={prefill}
              onPrefillConsumed={handlePrefillConsumed}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
