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

  useEffect(() => {
    const onDocumentClick = () => setMenuOpen(false);
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  const goToPage = (page) => {
    const target = page === PAGE_IMPIANTI ? PAGE_IMPIANTI : PAGE_TIMBRATURA;
    if (target === PAGE_TIMBRATURA) {
      window.location.hash = '';
    } else {
      window.location.hash = `#${target}`;
    }
    setMenuOpen(false);
  };

  return (
    <main className={activePage === PAGE_TIMBRATURA ? 'appRoot appRootTimbratura' : 'appRoot'}>
      <div className="floatingMenu" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="kebabButton"
          aria-label="Apri menu principale"
          aria-expanded={menuOpen ? 'true' : 'false'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ⋮
        </button>
        {menuOpen ? (
          <div className="kebabMenu">
            <button
              type="button"
              className={activePage === PAGE_TIMBRATURA ? 'kebabItem active' : 'kebabItem'}
              onClick={() => goToPage(PAGE_TIMBRATURA)}
            >
              Timbratura (app)
            </button>
            <button
              type="button"
              className={activePage === PAGE_IMPIANTI ? 'kebabItem active' : 'kebabItem'}
              onClick={() => goToPage(PAGE_IMPIANTI)}
            >
              Impianti (app9)
            </button>
          </div>
        ) : null}
      </div>
      {activePage === PAGE_TIMBRATURA ? (
        <iframe
          title="Timbratura"
          src="/timbratura-home.html"
          className="timbraturaFrameFull"
        />
      ) : (
        <section className="page pageShell">
          <GestioneImpiantiLive />
        </section>
      )}
    </main>
  );
}
