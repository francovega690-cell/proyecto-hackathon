// Definición de los 4 tipos de daltonismo que reconoce el test, y de cómo
// cambia la interfaz para cada uno. En vez de aplicarle un filtro matemático
// a toda la pantalla (que puede verse raro sobre colores ya elegidos a mano),
// la app cambia sus propias variables de color por una paleta pensada para
// cada tipo: eso es lo que activa `data-cvd-theme` en App.jsx.

export const ALL_CVD_TYPES = [
  'protanopia', 'protanomalia',
  'deuteranopia', 'deuteranomalia',
  'tritanopia', 'tritanomalia',
  'acromatopsia', 'acromatomalia',
];

// Tipos "totales" (el cono no funciona) vs. "anómalos" (funciona a medias).
// El test solo puede distinguir la familia, así que cada anomalía usa la
// misma paleta adaptada que su tipo total.
export const CVD_BASE = {
  protanopia: 'protanopia', protanomalia: 'protanopia',
  deuteranopia: 'deuteranopia', deuteranomalia: 'deuteranopia',
  tritanopia: 'tritanopia', tritanomalia: 'tritanopia',
  acromatopsia: 'acromatopsia', acromatomalia: 'acromatopsia',
};

export const CVD_INFO = {
  deuteranopia: {
    label: 'Deuteranopía / deuteranomalía',
    short: 'Deuteranopía',
    desc: 'Falla en el verde (el tipo más común). Cuesta diferenciar marrón de naranja, y rojo de verde.',
  },
  protanopia: {
    label: 'Protanopía / protanomalía',
    short: 'Protanopía',
    desc: 'Falla en el rojo. Cuesta diferenciar rojo de negro/gris, y rojo de verde.',
  },
  tritanopia: {
    label: 'Tritanopía / tritanomalía',
    short: 'Tritanopía',
    desc: 'Falla en el azul. Cuesta diferenciar azul de verde, y amarillo de violeta.',
  },
  acromatopsia: {
    label: 'Acromatopsia',
    short: 'Acromatopsia',
    desc: 'Sin visión de color (muy poco frecuente): todo se ve en escala de grises, además de sensibilidad a la luz.',
  },
  protanomalia: {
    label: 'Protanomalía',
    short: 'Protanomalía',
    desc: 'Rojo débil: los rojos se ven más apagados y se confunden con verdes y marrones.',
  },
  deuteranomalia: {
    label: 'Deuteranomalía',
    short: 'Deuteranomalía',
    desc: 'Verde débil (el daltonismo más frecuente): verdes y rojos se parecen entre sí.',
  },
  tritanomalia: {
    label: 'Tritanomalía',
    short: 'Tritanomalía',
    desc: 'Azul débil: cuesta distinguir azul de verde y amarillo de rosado.',
  },
  acromatomalia: {
    label: 'Acromatomalía',
    short: 'Acromatomalía',
    desc: 'Visión de color muy reducida: los colores se ven casi grises, apenas teñidos.',
  },
  normal: {
    label: 'Visión de color típica',
    short: 'Normal',
    desc: 'No se detectaron señales de daltonismo en esta prueba.',
  },
  inconclusivo: {
    label: 'Resultado no concluyente',
    short: 'No concluyente',
    desc: 'No pudimos confirmar el resultado. Revisá el brillo de la pantalla y repetí la prueba.',
  },
};

// Paleta de interfaz por tipo. Cada clave sobreescribe una variable CSS
// (ver :root y los bloques [data-cvd-theme="…"] en styles.css).
// La idea en cada caso es dejar de usar el par de colores que ese tipo
// confunde y apoyarse en el que sí distingue con claridad, más íconos.
export const CVD_THEME = {
  deuteranopia: {
    // Confunde rojo/verde y marrón/naranja → el verde deja de ser "éxito"
    // y todo el acento pasa a azul + ámbar, que sí distingue bien.
    '--moss': '#0d5f8a',
    '--moss-dark': '#0a4a6b',
    '--clay': '#a15b00',
    '--sun': '#d69a00',
    '--sky': '#0d5f8a',
    '--ok-bg': '#dcebf5', '--ok-fg': '#0a4a6b',
    '--warn-bg': '#f7e6c4', '--warn-fg': '#7a5410',
    '--bad-bg': '#f3ddc2', '--bad-fg': '#7a4400',
    '--info-bg': '#dcebf5', '--info-fg': '#0a4a6b',
  },
  protanopia: {
    // El rojo se ve muy oscuro/negro para este tipo: se reemplaza por
    // azul + ámbar bien saturado, evitando rojos oscuros como advertencia.
    '--moss': '#0d5f8a',
    '--moss-dark': '#0a4a6b',
    '--clay': '#b3790a',
    '--sun': '#e0ab00',
    '--sky': '#0d5f8a',
    '--ok-bg': '#dcebf5', '--ok-fg': '#0a4a6b',
    '--warn-bg': '#f7e6c4', '--warn-fg': '#7a5410',
    '--bad-bg': '#f4e4bd', '--bad-fg': '#8a5a00',
    '--info-bg': '#dcebf5', '--info-fg': '#0a4a6b',
  },
  tritanopia: {
    // Confunde azul/verde y amarillo/violeta → el acento se aleja del
    // azul y del amarillo, y pasa a un rosado/rojo bien distinguible.
    '--moss': '#b6295f',
    '--moss-dark': '#8c1f49',
    '--clay': '#b6295f',
    '--sun': '#495057',
    '--sky': '#2f9e64',
    '--ok-bg': '#dcf1e4', '--ok-fg': '#1d6b40',
    '--warn-bg': '#e7e4e0', '--warn-fg': '#495057',
    '--bad-bg': '#f6dbe5', '--bad-fg': '#8c1f49',
    '--info-bg': '#f6dbe5', '--info-fg': '#8c1f49',
  },
  acromatopsia: {
    // Sin percepción de color: todo pasa a una escala de grises con
    // buen contraste de claridad, y el fondo se oscurece un poco para
    // no encandilar (suele venir con fotosensibilidad).
    '--paper': '#e6e4df',
    '--paper-raised': '#f5f4f1',
    '--ink': '#161616',
    '--line': '#b9b7b1',
    '--muted': '#5a5a5a',
    '--moss': '#2b2b2b',
    '--moss-dark': '#111111',
    '--clay': '#3a3a3a',
    '--sun': '#4d4d4d',
    '--sky': '#2b2b2b',
    '--ok-bg': '#d9d9d6', '--ok-fg': '#161616',
    '--warn-bg': '#c9c8c4', '--warn-fg': '#161616',
    '--bad-bg': '#b3b2ae', '--bad-fg': '#111111',
    '--info-bg': '#d9d9d6', '--info-fg': '#161616',
  },
};

// Las anomalías comparten la paleta de su tipo total.
Object.entries(CVD_BASE).forEach(([type, base]) => {
  if (!CVD_THEME[type]) CVD_THEME[type] = CVD_THEME[base];
});

// ─────────────────────────────────────────────────────────────
// Simulador (como coblind.com): muestra la pantalla tal como la ve una
// persona con cada tipo de daltonismo. Sirve para que profes y alumnos
// comprueben si un material se entiende sin depender del color.
//
// Matrices de Machado, Oliveira y Fernandes (2009), pensadas para aplicarse
// en RGB lineal (el espacio por defecto de feColorMatrix en SVG).
// Tipos totales = severidad 1.0; anomalías = severidad 0.6.
// ─────────────────────────────────────────────────────────────
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const LUMA = [0.2126, 0.7152, 0.0722];
const ACHROMA = [...LUMA, ...LUMA, ...LUMA];
const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);

export const CVD_SIM_MATRIX = {
  protanopia: [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281, 0.099216,
    -0.003882, -0.048116, 1.051998,
  ],
  protanomalia: [
    0.385450, 0.769005, -0.154455,
    0.100526, 0.829802, 0.069673,
    -0.007442, -0.022190, 1.029632,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968,
    0.280085, 0.672501, 0.047413,
    -0.011820, 0.042940, 0.968881,
  ],
  deuteranomalia: [
    0.498864, 0.674741, -0.173604,
    0.205199, 0.754872, 0.039929,
    -0.011131, 0.030969, 0.980162,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779,
    -0.078411, 0.930809, 0.147602,
    0.004733, 0.691367, 0.303900,
  ],
  tritanomalia: [
    1.104996, -0.046633, -0.058363,
    -0.032137, 0.971635, 0.060503,
    0.001336, 0.317922, 0.680742,
  ],
  acromatopsia: ACHROMA,
  acromatomalia: mix(IDENTITY, ACHROMA, 0.75),
};

// 3x3 → los 20 valores que espera <feColorMatrix type="matrix">.
export const toFeMatrix = (m) =>
  [
    m[0], m[1], m[2], 0, 0,
    m[3], m[4], m[5], 0, 0,
    m[6], m[7], m[8], 0, 0,
    0, 0, 0, 1, 0,
  ].map((n) => +n.toFixed(6)).join(' ');

// Agrupado como en coblind: por el cono que falla.
export const CVD_SIM_GROUPS = [
  { label: 'Rojo (cono L)', types: ['protanopia', 'protanomalia'] },
  { label: 'Verde (cono M)', types: ['deuteranopia', 'deuteranomalia'] },
  { label: 'Azul (cono S)', types: ['tritanopia', 'tritanomalia'] },
  { label: 'Sin color', types: ['acromatopsia', 'acromatomalia'] },
];

export const CVD_SIM_LABEL = {
  protanopia: 'Protanopía', protanomalia: 'Protanomalía',
  deuteranopia: 'Deuteranopía', deuteranomalia: 'Deuteranomalía',
  tritanopia: 'Tritanopía', tritanomalia: 'Tritanomalía',
  acromatopsia: 'Acromatopsia', acromatomalia: 'Acromatomalía',
};

export const cvdFilterId = (type) => `cvd-sim-${type}`;

// ─────────────────────────────────────────────────────────────
// Corrección de color ("daltonización", Fidaner et al.) para los PDF que
// ve el alumno con daltonismo. Se calcula lo que su tipo NO distingue
// (original − simulación) y esa diferencia se reparte en los canales que
// sí ve bien. Como todo es lineal, queda una sola matriz 3x3:
//   M = I + D · (I − S)
// y se aplica con un <feColorMatrix> sobre las páginas del PDF.
// ─────────────────────────────────────────────────────────────
const mul3 = (a, b) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
const sub3 = (a, b) => a.map((v, i) => v - b[i]);
const add3 = (a, b) => a.map((v, i) => v + b[i]);

// Rojo/verde: el error se pasa a verde y azul. Azul: se pasa a rojo y verde.
const SHIFT_RG = [0, 0, 0, 0.7, 1, 0, 0.7, 0, 1];
const SHIFT_B = [1, 0, 0.7, 0, 1, 0.7, 0, 0, 0];
const SHIFT_BY_BASE = { protanopia: SHIFT_RG, deuteranopia: SHIFT_RG, tritanopia: SHIFT_B };

export const CVD_FIX_MATRIX = Object.fromEntries(
  ALL_CVD_TYPES
    .filter((t) => SHIFT_BY_BASE[CVD_BASE[t]])
    .map((t) => [t, add3(IDENTITY, mul3(SHIFT_BY_BASE[CVD_BASE[t]], sub3(IDENTITY, CVD_SIM_MATRIX[t])))]),
);

export const cvdFixFilterId = (type) => `cvd-fix-${type}`;

// Filtro CSS para las páginas del PDF según el tipo del alumno.
// Acromatopsia no tiene color que corregir: se refuerza el contraste de
// claridad y se baja el brillo (fotosensibilidad).
export function cvdDocFilter(type, { brightness = 1 } = {}) {
  if (!type) return 'none';
  if (CVD_BASE[type] === 'acromatopsia') return `grayscale(1) contrast(1.25) brightness(${brightness})`;
  return CVD_FIX_MATRIX[type] ? `url(#${cvdFixFilterId(type)})` : 'none';
}
