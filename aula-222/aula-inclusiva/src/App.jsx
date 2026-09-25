import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store.jsx';
import { CVD_THEME } from './lib/cvd.js';
import { hasSupport } from './components/ui.jsx';
import Navbar from './components/Navbar.jsx';
import { CvdFilterDefs } from './components/ColorBlindSimulator.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import TestDaltonismo from './pages/TestDaltonismo.jsx';
import TeacherHome from './pages/TeacherHome.jsx';
import StudentHome from './pages/StudentHome.jsx';
import CoursePage from './pages/CoursePage.jsx';

function Private({ children }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (hasSupport(user, 'daltonismo') && !user.testDone) {
    return <Navigate to="/test-daltonismo" replace />;
  }
  return children;
}

function RootRedirect() {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (hasSupport(user, 'daltonismo') && !user.testDone) {
    return <Navigate to="/test-daltonismo" replace />;
  }
  return <Navigate to="/inicio" replace />;
}

// Aplica (o quita) la paleta de daltonismo sobre <html>, así el cambio de
// color alcanza a toda la página -incluido el fondo del body- y no solo a
// lo que está dentro de un contenedor de React.
function useCvdTheme(cvdType, active) {
  useEffect(() => {
    const root = document.documentElement;
    const vars = active && cvdType ? CVD_THEME[cvdType] : null;

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    }
    root.classList.toggle('cvd-mono', Boolean(vars) && cvdType === 'acromatopsia');

    return () => {
      if (vars) Object.keys(vars).forEach((k) => root.style.removeProperty(k));
      root.classList.remove('cvd-mono');
    };
  }, [cvdType, active]);
}

export default function App() {
  const { user, authReady } = useStore();
  const cvdType = hasSupport(user, 'daltonismo') ? user.cvdType : null;
  const themeActive = Boolean(cvdType && CVD_THEME[cvdType] && user.prefs?.filterOn !== false);

  useCvdTheme(cvdType, themeActive);

  // La sesión vive en una cookie del backend, no en localStorage: al abrir
  // o refrescar la app hay que preguntar primero quién está logueado antes
  // de decidir a qué pantalla mandar a la persona.
  if (!authReady) {
    return (
      <>
        <CvdFilterDefs />
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
          <div className="text-muted-strong">
            <i className="bi bi-mortarboard-fill me-2" aria-hidden="true" /> Cargando Aula Inclusiva…
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CvdFilterDefs />
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/registro" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route
          path="/test-daltonismo"
          element={!user ? <Navigate to="/login" replace /> : <TestDaltonismo />}
        />
        <Route
          path="/inicio"
          element={
            <Private>
              {user?.role === 'teacher' ? <TeacherHome /> : <StudentHome />}
            </Private>
          }
        />
        <Route
          path="/materia/:courseId"
          element={
            <Private>
              <CoursePage />
            </Private>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </>
  );
}
