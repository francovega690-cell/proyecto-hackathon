// Adaptación del contenido del profesor según el perfil del alumno.
// Corre en el servidor: así todos los alumnos de la materia reciben el
// mismo contenido ya adaptado, sin depender de que cada navegador lo calcule.
//
// 1) Si existe N8N_WEBHOOK_URL, se le manda el contenido a n8n (IA) y se
//    espera { adapted: { comprension, dislexia, daltonismo } }.
// 2) Si no hay webhook (o falla), se usa una adaptación local automática.

const sentences = (text) =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const splitLong = (s) => {
  if (s.split(" ").length <= 20) return [s];
  const parts = s.split(/,\s+|;\s+/).filter(Boolean);
  return parts.length > 1 ? parts.map((p) => (/[.!?]$/.test(p) ? p : p + ".")) : [s];
};

export function localAdapt({ title, body }) {
  const sents = sentences(body);
  const points = sents.flatMap(splitLong);
  const paragraphs = [];
  for (let i = 0; i < sents.length; i += 2) paragraphs.push(sents.slice(i, i + 2).join(" "));

  return {
    comprension: { summary: sents[0] || title, points },
    dislexia: { paragraphs },
    daltonismo: {
      paragraphs: body.split("\n").filter((p) => p.trim()),
      note: "Los colores de esta página se corrigen automáticamente con tu filtro.",
    },
  };
}

export async function adaptContent({ title, body, type, courseName }) {
  const webhook = process.env.N8N_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, type, courseName, profiles: ["comprension", "dislexia", "daltonismo"] }),
      });
      if (!res.ok) throw new Error("n8n respondió " + res.status);
      const data = await res.json();
      if (data && data.adapted) return { source: "n8n", ...data.adapted };
    } catch (error) {
      console.warn("No se pudo usar n8n, se usa la adaptación local:", error.message);
    }
  }
  return { source: "local", ...localAdapt({ title, body }) };
}
