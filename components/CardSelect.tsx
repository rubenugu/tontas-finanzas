"use client";

import { TARJETAS } from "@/lib/data";

interface CardSelectProps {
  value: string;
  onChange: (val: string) => void;
  id?: string;
  required?: boolean;
}

export default function CardSelect({
  value,
  onChange,
  id = "tarjeta",
  required,
}: CardSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      <option value="">Selecciona tarjeta…</option>
      {TARJETAS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
