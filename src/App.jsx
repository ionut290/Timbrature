import React, { useState } from "react";
import GestioneImpiantiLive from './components/GestioneImpiantiLive';
import './app.css';

export default function App() {
  const [activePage, setActivePage] = useState('timbratura');

  return (
    <main className="page pageShell">
      <header className="card appHeader">
        <h1>Timbrature</h1>
        <nav className="menuTabs" aria-label="Menu principale">
          <button
            type="button"
            className={activePage === 'timbratura' ? 'menuTab active' : 'menuTab'}
            onClick={() => setActivePage('timbratura')}
          >
            Timbratura
          </button>
          <button
            type="button"
            className={activePage === 'impianti' ? 'menuTab active' : 'menuTab'}
            onClick={() => setActivePage('impianti')}
          >
            Impianti
          </button>
        </nav>
      </header>

      {activePage === 'timbratura' ? (
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
