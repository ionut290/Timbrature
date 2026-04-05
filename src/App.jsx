import React, { useEffect, useState } from "react";
import GestioneImpiantiLive from './components/GestioneImpiantiLive';
import './app.css';

const PAGE_TIMBRATURA = 'timbratura';
const PAGE_IMPIANTI = 'impianti';

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  return hash === PAGE_IMPIANTI ? PAGE_IMPIANTI : PAGE_TIMBRATURA;
}

export default function App() {
  const [activePage, setActivePage] = useState(getPageFromHash());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setActivePage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function goTo(page) {
    window.location.hash = page;
    setMenuOpen(false);
  }

  return (
    <main className="page pageShell">
      <header className="appTopbar">
        <button
          type="button"
          className="kebabButton"
          aria-label="Apri menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ⋮
        </button>

        {menuOpen ? (
          <nav className="kebabMenu" aria-label="Menu principale">
            <button
              type="button"
              className={activePage === PAGE_TIMBRATURA ? 'kebabItem active' : 'kebabItem'}
              onClick={() => goTo(PAGE_TIMBRATURA)}
            >
              Timbratura
            </button>
            <button
              type="button"
              className={activePage === PAGE_IMPIANTI ? 'kebabItem active' : 'kebabItem'}
              onClick={() => goTo(PAGE_IMPIANTI)}
            >
              Impianti
            </button>
          </nav>
        ) : null}
      </header>

      {activePage === PAGE_TIMBRATURA ? (
        <section className="card timbraturaSection">
          <iframe
            title="Timbratura"
            src="/timbratura-home.html"
            className="timbraturaFrame"
          />
        </section>
      ) : (
        <GestioneImpiantiLive />
      )}
    </main>
  );
}
