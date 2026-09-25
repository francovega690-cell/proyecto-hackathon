import { Link } from "react-router-dom";

// Pantalla de bienvenida (la primera que se ve sin sesión): el nombre en el
// centro, un fondo con manchas de colores y un botón que lleva al login.
// Colores de la paleta Okabe-Ito, que se distinguen con cualquier daltonismo.
const CHIPS = [
  { icon: "bi-fonts", label: "Dislexia", cls: "c1" },
  { icon: "bi-palette", label: "Daltonismo", cls: "c2" },
  { icon: "bi-chat-square-text", label: "Comprensión", cls: "c3" },
];

export default function Landing() {
  return (
    <main className="landing">
      <div className="landing-blob b1" aria-hidden="true" />
      <div className="landing-blob b2" aria-hidden="true" />
      <div className="landing-blob b3" aria-hidden="true" />
      <div className="landing-blob b4" aria-hidden="true" />

      <div className="landing-center">
        <span className="landing-badge">
          <i className="bi bi-mortarboard-fill" aria-hidden="true" />
        </span>
        <h1 className="landing-title">Aula Formosa</h1>
        <p className="landing-sub">Un aula que se adapta a cada alumno.</p>
        <ul className="landing-chips" aria-label="Adaptaciones">
          {CHIPS.map((c) => (
            <li key={c.label} className={`landing-chip ${c.cls}`}>
              <i className={`bi ${c.icon}`} aria-hidden="true" /> {c.label}
            </li>
          ))}
        </ul>
        <Link to="/login" className="landing-btn">
          Empezar <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
