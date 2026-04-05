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

  useEffect(() => {
    const onHashChange = () => setActivePage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function goTo(page) {
    window.location.hash = page;
  }

  return (
    <main className="page pageShell">
      <header className="card appHeader">
        <h1>Timbrature</h1>
        <nav className="menuTabs" aria-label="Menu principale">
          <button
            type="button"
            className={activePage === PAGE_TIMBRATURA ? 'menuTab active' : 'menuTab'}
            onClick={() => goTo(PAGE_TIMBRATURA)}
          >
            Timbratura
          </button>
          <button
            type="button"
            className={activePage === PAGE_IMPIANTI ? 'menuTab active' : 'menuTab'}
            onClick={() => goTo(PAGE_IMPIANTI)}
          >
            Impianti
          </button>
        </nav>
      </header>

      {activePage === PAGE_TIMBRATURA ? (
        <section className="card timbraturaSection">
          <div className="timbraturaHint">
            <p>
              Sei nella home principale della Timbratura. Se il browser blocca l&apos;anteprima, apri la pagina completa.
            </p>
            <a href="/timbratura-home.html" className="openTimbraturaLink">
              Apri Timbratura completa
            </a>
          </div>
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
