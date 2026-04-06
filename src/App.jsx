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

  return (
    <main className={activePage === PAGE_TIMBRATURA ? 'appRoot appRootTimbratura' : 'appRoot'}>
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
