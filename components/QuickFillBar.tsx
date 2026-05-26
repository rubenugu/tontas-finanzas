"use client";

import { useState } from "react";
import { QUICK_FILLS, QuickFill, ExpensePayload, TARJETAS } from "@/lib/data";
import CardSelect from "./CardSelect";

interface QuickFillBarProps {
  onFill: (fields: Partial<ExpensePayload>) => void;
}

export default function QuickFillBar({ onFill }: QuickFillBarProps) {
  const [cardPickerFor, setCardPickerFor] = useState<QuickFill | null>(null);
  const [pickedCard, setPickedCard] = useState<string>(TARJETAS[0]);

  function handleClick(qf: QuickFill) {
    if (qf.requiresCardPicker) {
      setCardPickerFor(qf);
    } else {
      onFill(qf.fields);
    }
  }

  function confirmCardPick() {
    if (!cardPickerFor) return;
    onFill({ ...cardPickerFor.fields, tarjeta: pickedCard });
    setCardPickerFor(null);
  }

  return (
    <>
      {/* Quick-fill buttons */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_FILLS.map((qf) => (
          <button
            key={qf.id}
            type="button"
            onClick={() => handleClick(qf)}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-gray-800 hover:bg-violet-900/60 active:bg-violet-800 border border-gray-700 hover:border-violet-600 px-3.5 py-2 text-sm text-gray-200 transition-colors whitespace-nowrap"
          >
            <span>{qf.emoji}</span>
            <span>{qf.label}</span>
          </button>
        ))}
      </div>

      {/* Card picker modal */}
      {cardPickerFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-2xl bg-gray-900 border border-gray-700 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-200">
              {cardPickerFor.emoji} {cardPickerFor.label} — ¿con qué tarjeta?
            </p>
            <CardSelect
              value={pickedCard}
              onChange={setPickedCard}
              id="card-picker"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCardPickerFor(null)}
                className="flex-1 rounded-xl border border-gray-700 text-gray-400 py-3 text-sm hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCardPick}
                disabled={!pickedCard}
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 text-sm transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
