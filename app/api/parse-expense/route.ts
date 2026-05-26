import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIAS, TARJETAS } from "@/lib/data";

const client = new Anthropic();

const SYSTEM = `Eres un asistente de finanzas personales mexicano. El usuario describirá uno o varios gastos en lenguaje natural y tú extraes los campos del formulario.

Estructura de categorías disponibles:
${JSON.stringify(CATEGORIAS, null, 2)}

Tarjetas disponibles: ${TARJETAS.join(", ")}

Devuelve SIEMPRE un array JSON (aunque sea un solo gasto), sin markdown ni explicaciones:
[
  {
    "tipo": "Gasto" | "Ingreso" | "Ahorro",
    "categoria": string,
    "subcategoria": string,
    "nota": string,
    "monto": number | null,
    "tarjeta": string | null
  }
]

Reglas:
- Si el usuario menciona varios gastos separados (ej: "tacos y uber"), crea un objeto por cada gasto
- nota: descripción limpia y corta de cada gasto (ej: "Tacos", "Uber al trabajo")
- monto: número si se menciona ("cien" → 100, "50 pesos" → 50), si no → null
- tarjeta: solo si se menciona explícitamente, si no → null; si aplica a todos los gastos mencionados, ponla en cada uno
- Uber, taxi, Didi, gasolina, camión, metro → subcategoria "Transporte", categoria "Gastos Fijos"
- Comida, restaurant, café, lunch, antojitos, pizza, tacos → subcategoria "Comida fuera", categoria "Gastos Variables"
- Super, Walmart, Chedraui, mercado, despensa → subcategoria "Supermercado", categoria "Gastos Variables"
- Netflix, Spotify, suscripción → subcategoria "Suscripciones", categoria "Gastos Fijos"
- Farmacia, médico, medicamento → subcategoria "Salud", categoria "Gastos Variables"
- Ropa, zapatos, tienda → subcategoria "Ropa", categoria "Gastos Variables"
- Cine, evento, bar, concierto → subcategoria "Entretenimiento", categoria "Gastos Variables"
- Sueldo, salario, quincena → tipo "Ingreso", categoria "Ingreso", subcategoria "Sueldo"
- Ahorro, fondo → tipo "Ahorro", categoria "Ahorros"`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada" },
      { status: 500 }
    );
  }

  try {
    const { transcript } = await req.json();
    if (!transcript?.trim()) {
      return NextResponse.json({ error: "Transcript vacío" }, { status: 400 });
    }

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM,
      messages: [{ role: "user", content: transcript }],
    });

    const raw =
      msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";
    // Strip markdown code fences if the model wraps the JSON
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al interpretar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
