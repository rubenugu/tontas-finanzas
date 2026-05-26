export const TARJETAS = [
  "Plata",
  "Revolut Crédito",
  "Revolut Débito",
  "Nu Crédito",
  "Nu Débito",
  "Santander",
  "Efectivo",
] as const;

export type Tarjeta = (typeof TARJETAS)[number];

export const CATEGORIAS: Record<string, Record<string, string[]>> = {
  Gasto: {
    "Gastos Fijos": [
      "Renta",
      "Servicios",
      "Transporte",
      "Meses sin intereses",
      "Suscripciones",
    ],
    "Gastos Variables": [
      "Supermercado",
      "Comida fuera",
      "Salud",
      "Educación",
      "Ropa",
      "Entretenimiento",
      "Gastos independencia",
      "Otros",
    ],
  },
  Ingreso: {
    Ingreso: ["Sueldo", "Freelance", "Otros"],
  },
  Ahorro: {
    Ahorros: ["Fondo emergencia", "Fondo independencia", "Fondo maestría"],
  },
};

export interface QuickFill {
  id: string;
  label: string;
  emoji: string;
  fields: {
    tipo: string;
    categoria: string;
    subcategoria: string;
    nota: string;
    monto?: number;
  };
  requiresCardPicker?: boolean;
}

export const QUICK_FILLS: QuickFill[] = [
  {
    id: "comedor",
    label: "Comedor",
    emoji: "🍽️",
    fields: {
      tipo: "Gasto",
      categoria: "Gastos Variables",
      subcategoria: "Comida fuera",
      nota: "Comedor trabajo",
    },
  },
  {
    id: "autobus",
    label: "Recarga camión",
    emoji: "🚌",
    fields: {
      tipo: "Gasto",
      categoria: "Gastos Fijos",
      subcategoria: "Transporte",
      nota: "Recarga autobús",
    },
  },
  {
    id: "metro",
    label: "Metro tap",
    emoji: "🚇",
    fields: {
      tipo: "Gasto",
      categoria: "Gastos Fijos",
      subcategoria: "Transporte",
      nota: "Metro tap",
    },
    requiresCardPicker: true,
  },
  {
    id: "gym",
    label: "Gym / Sus.",
    emoji: "💪",
    fields: {
      tipo: "Gasto",
      categoria: "Gastos Fijos",
      subcategoria: "Suscripciones",
      nota: "",
    },
  },
];

export interface ExpensePayload {
  fecha: string;
  tipo: string;
  categoria: string;
  subcategoria: string;
  monto: number;
  tarjeta: string;
  nota: string;
  aMeses: boolean;
  mesesRestantes?: number | "";
  pagoMensualMSI?: number | "";
  idMSI?: string;
}
