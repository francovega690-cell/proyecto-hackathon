// Láminas pseudo-isocromáticas (estilo Ishihara) generadas por código.
// IMPORTANTE: son láminas propias, de demostración. Para uso clínico real,
// reemplazalas por láminas licenciadas: cada lámina acepta `image: '/plates/x.png'`
// en lugar de `segments`, y el resto del test funciona igual.

const NONE = { label: 'No veo ningún número', tag: 'none' };

export const PLATES = [
  {
    id: 'control',
    title: 'Lámina de control',
    seed: 11,
    ground: ['#f0dfae', '#e9d497', '#f4e6bd', '#e2cb86'],
    segments: [{ text: '12', x: 0.5, size: 270, palette: ['#1f5fa8', '#2a6fb8', '#1a4f94', '#3a7fc4'] }],
    options: [
      { label: '12', tag: 'ok' },
      { label: '17', tag: 'wrong' },
      { label: '21', tag: 'wrong' },
      NONE,
    ],
  },
  {
    id: 's1',
    title: 'Rojo-verde · lámina 1',
    seed: 23,
    ground: ['#e2894a', '#d97a3f', '#eea55f', '#cf6c3a', '#e6b071'],
    segments: [{ text: '6', x: 0.5, size: 330, palette: ['#8bb04f', '#9cc05a', '#7aa142', '#a6c96a'] }],
    options: [
      { label: '6', tag: 'normal' },
      { label: '5', tag: 'rg' },
      { label: '8', tag: 'rg' },
      NONE,
    ],
  },
  {
    id: 's2',
    title: 'Rojo-verde · lámina 2',
    seed: 37,
    ground: ['#8db06c', '#a0bf7e', '#7c9e5c', '#b1c98f', '#94ad6b'],
    segments: [{ text: '29', x: 0.5, size: 260, palette: ['#d9534a', '#e2695a', '#c94540', '#e57b6c'] }],
    options: [
      { label: '29', tag: 'normal' },
      { label: '70', tag: 'rg' },
      { label: '20', tag: 'rg' },
      NONE,
    ],
  },
  {
    id: 'c1',
    title: 'Clasificación · lámina 1',
    seed: 41,
    ground: ['#8fa6a3', '#9db3ae', '#7f9894', '#a8bab5'],
    segments: [
      { text: '4', x: 0.3, size: 250, palette: ['#c8556b', '#d0607a', '#bf4a63', '#d56b83'] },
      { text: '2', x: 0.7, size: 250, palette: ['#a9a04a', '#b5ad55', '#9c9440', '#bdb663'] },
    ],
    options: [
      { label: '42', tag: 'normal' },
      { label: '2', tag: 'protan' },
      { label: '4', tag: 'deutan' },
      NONE,
    ],
  },
  {
    id: 'c2',
    title: 'Clasificación · lámina 2',
    seed: 53,
    ground: ['#8fa6a3', '#9db3ae', '#7f9894', '#a8bab5'],
    segments: [
      { text: '7', x: 0.3, size: 250, palette: ['#a9a04a', '#b5ad55', '#9c9440', '#bdb663'] },
      { text: '3', x: 0.7, size: 250, palette: ['#c8556b', '#d0607a', '#bf4a63', '#d56b83'] },
    ],
    options: [
      { label: '73', tag: 'normal' },
      { label: '7', tag: 'protan' },
      { label: '3', tag: 'deutan' },
      NONE,
    ],
  },
  {
    id: 't1',
    title: 'Azul-amarillo',
    seed: 67,
    ground: ['#c9b458', '#bfa84c', '#d3c26c', '#b89f44'],
    segments: [{ text: '5', x: 0.5, size: 330, palette: ['#9a6bb5', '#a87cc2', '#8b5da8', '#b48ccb'] }],
    options: [
      { label: '5', tag: 'normal' },
      { label: '8', tag: 'tritan' },
      { label: '3', tag: 'tritan' },
      NONE,
    ],
  },
];

// Preguntas de confirmación para acromatopsia. Las láminas de color por sí
// solas no alcanzan para distinguir "falla total de color" de un daltonismo
// rojo-verde muy marcado, así que cuando alguien falla casi todas las
// láminas (incluida la de control) se le hacen estas dos preguntas antes
// de decidir el resultado.
export const CONFIRM_QUESTIONS = [
  {
    id: 'grayscale',
    text: '¿Los colores en general te resultan difíciles de diferenciar, como si vieras casi todo en tonos de gris?',
  },
  {
    id: 'light',
    text: '¿La luz brillante te encandila o te molesta más que a otras personas?',
  },
];

// answers: { [plateId]: tag }
// Primera pasada: decide si hace falta confirmar acromatopsia antes de dar un resultado final.
export function precheck(a) {
  const normalCount = PLATES.filter((p) => a[p.id] === 'ok' || a[p.id] === 'normal').length;
  // Si falló prácticamente todas las láminas -incluida la de control-, puede
  // ser una falla total de color y no un daltonismo rojo-verde o azul-amarillo.
  const suspectAcromatopsia = normalCount <= 1;
  return { suspectAcromatopsia, normalCount };
}

// answers: { [plateId]: tag }, confirm: { grayscale: bool, light: bool } | null
export function evaluate(a, confirm = null) {
  if (a.control !== 'ok') {
    if (confirm && confirm.grayscale && confirm.light) {
      return { type: 'acromatopsia', confidence: 'media', normalCount: 0 };
    }
    return { type: 'inconclusivo', confidence: 'ninguna', normalCount: 0 };
  }
  const normalCount = PLATES.filter((p) => a[p.id] === 'ok' || a[p.id] === 'normal').length;
  if (confirm && confirm.grayscale && confirm.light && normalCount <= 1) {
    return { type: 'acromatopsia', confidence: 'alta', normalCount };
  }

  const screeningFails = ['s1', 's2'].filter((id) => a[id] !== 'normal').length;
  const cls = ['c1', 'c2'].map((id) => a[id]);
  const protan = cls.filter((t) => t === 'protan').length;
  const deutan = cls.filter((t) => t === 'deutan').length;
  const rgOther = cls.filter((t) => t === 'rg').length;
  const rgSuspect = screeningFails > 0 || protan + deutan + rgOther > 0;
  const tritan = a.t1 === 'tritan';

  if (rgSuspect) {
    let type = 'deuteranopia';
    let confidence = 'baja';
    if (protan > deutan) {
      type = 'protanopia';
      confidence = screeningFails > 0 ? 'alta' : 'media';
    } else if (deutan > protan) {
      confidence = screeningFails > 0 ? 'alta' : 'media';
    }
    return { type, confidence, normalCount, tritanAlso: tritan };
  }
  if (tritan) return { type: 'tritanopia', confidence: 'media', normalCount };
  return { type: 'normal', confidence: 'alta', normalCount };
}
