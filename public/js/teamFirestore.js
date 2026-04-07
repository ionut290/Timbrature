(function initTeamFirestoreModel(global) {
  'use strict';

  const FIXED_TEAM_ID = 'hera_bologna';

  function createPathHelpers(teamId = FIXED_TEAM_ID) {
    const tid = String(teamId || FIXED_TEAM_ID).trim() || FIXED_TEAM_ID;
    return {
      teamId: tid,
      teamRoot: () => `teams/${tid}`,
      teamMembers: () => `teams/${tid}/members`,
      teamMemberDoc: (uid = '') => `teams/${tid}/members/${String(uid || '').trim()}`,
      teamCommesse: () => `teams/${tid}/commesse`,
      teamCommessaDoc: (commessaId = '') => `teams/${tid}/commesse/${String(commessaId || '').trim()}`,
      teamCantieri: (commessaId = '') => `teams/${tid}/commesse/${String(commessaId || '').trim()}/cantieri`,
      teamCantiereDoc: (commessaId = '', cantiereId = '') => `teams/${tid}/commesse/${String(commessaId || '').trim()}/cantieri/${String(cantiereId || '').trim()}`,
      teamTimbrature: () => `teams/${tid}/timbrature`,
      teamTimbraturaDoc: (timbraturaId = '') => `teams/${tid}/timbrature/${String(timbraturaId || '').trim()}`,
      userRoot: (uid = '') => `users/${String(uid || '').trim()}`,
      userProfile: (uid = '') => `users/${String(uid || '').trim()}/profile`,
      userPreferences: (uid = '') => `users/${String(uid || '').trim()}/preferences`,
      userNotificationSettings: (uid = '') => `users/${String(uid || '').trim()}/notificationSettings`,
      userDeviceState: (uid = '') => `users/${String(uid || '').trim()}/deviceState`
    };
  }

  function createTeamFirestoreService({ firebase, app, teamId = FIXED_TEAM_ID, onError } = {}) {
    const paths = createPathHelpers(teamId);
    const db = firebase?.firestore ? firebase.firestore(app) : null;
    const state = { commesseUnsubscribe: null, timbratureUnsubscribe: null };

    function guardDb() {
      if (!db) throw new Error('Firestore non disponibile per il modello team.');
    }

    function reportError(context, error) {
      const payload = {
        context,
        message: String(error?.message || error || 'errore sconosciuto'),
        error,
        at: new Date().toISOString()
      };
      if (typeof onError === 'function') onError(payload);
      return payload;
    }

    async function pushCommesse(rows = [], actor = {}) {
      guardDb();
      const marker = String(actor?.email || actor?.uid || 'unknown');
      const normalizedRows = Array.isArray(rows) ? rows : [];
      const batch = db.batch();
      normalizedRows.forEach((row) => {
        const commessaId = String(row?.id || row?.nome || '').trim();
        if (!commessaId) return;
        const commessaRef = db.doc(paths.teamCommessaDoc(commessaId));
        const cantieri = Array.isArray(row?.cantieri) ? row.cantieri : [];
        batch.set(commessaRef, {
          id: commessaId,
          nome: String(row?.nome || commessaId).trim(),
          impianto: String(row?.impianto || '').trim(),
          updated_at: String(row?.updated_at || new Date().toISOString()),
          updated_by: marker,
          cantieri_cache: cantieri
        }, { merge: true });
        cantieri.forEach((cantiere) => {
          const cantiereId = String(cantiere?.id || cantiere?.code || cantiere?.name || '').trim();
          if (!cantiereId) return;
          const cantiereRef = db.doc(paths.teamCantiereDoc(commessaId, cantiereId));
          batch.set(cantiereRef, {
            ...cantiere,
            id: cantiereId,
            updated_at: String(cantiere?.updated_at || row?.updated_at || new Date().toISOString()),
            updated_by: marker
          }, { merge: true });
        });
      });
      await batch.commit();
    }

    async function pushTimbrature(rows = [], actor = {}) {
      guardDb();
      const marker = String(actor?.email || actor?.uid || 'unknown');
      const uid = String(actor?.uid || 'unknown');
      const batch = db.batch();
      (Array.isArray(rows) ? rows : []).forEach((row, idx) => {
        const docId = String(row?.id || `${uid}_${row?.data || 'nd'}_${idx}`).trim();
        if (!docId) return;
        const ref = db.doc(paths.teamTimbraturaDoc(docId));
        batch.set(ref, {
          ...row,
          id: docId,
          teamId: paths.teamId,
          updated_at: String(row?.updated_at || new Date().toISOString()),
          updated_by: marker
        }, { merge: true });
      });
      await batch.commit();
    }

    function subscribeCommesse(onRows, onErrorCallback) {
      guardDb();
      if (state.commesseUnsubscribe) state.commesseUnsubscribe();
      state.commesseUnsubscribe = db.collection(paths.teamCommesse()).onSnapshot((snap) => {
        const rows = (snap?.docs || []).map((docSnap) => {
          const data = docSnap?.data?.() || {};
          return {
            id: String(data?.id || docSnap?.id || '').trim(),
            nome: String(data?.nome || '').trim(),
            impianto: String(data?.impianto || '').trim(),
            cantieri: Array.isArray(data?.cantieri_cache) ? data.cantieri_cache : [],
            updated_at: String(data?.updated_at || '')
          };
        }).filter((row) => row.id || row.nome);
        onRows?.(rows);
      }, (error) => {
        reportError('subscribeCommesse', error);
        onErrorCallback?.(error);
      });
      return state.commesseUnsubscribe;
    }

    function subscribeTimbrature(onRows, onErrorCallback) {
      guardDb();
      if (state.timbratureUnsubscribe) state.timbratureUnsubscribe();
      state.timbratureUnsubscribe = db.collection(paths.teamTimbrature()).onSnapshot((snap) => {
        const rows = (snap?.docs || []).map((docSnap) => ({
          ...(docSnap?.data?.() || {}),
          id: String(docSnap?.id || '')
        }));
        onRows?.(rows);
      }, (error) => {
        reportError('subscribeTimbrature', error);
        onErrorCallback?.(error);
      });
      return state.timbratureUnsubscribe;
    }

    function stop() {
      if (state.commesseUnsubscribe) state.commesseUnsubscribe();
      if (state.timbratureUnsubscribe) state.timbratureUnsubscribe();
      state.commesseUnsubscribe = null;
      state.timbratureUnsubscribe = null;
    }

    return { paths, pushCommesse, pushTimbrature, subscribeCommesse, subscribeTimbrature, stop, reportError };
  }

  global.TeamFirestoreModel = {
    FIXED_TEAM_ID,
    createPathHelpers,
    createTeamFirestoreService
  };
})(window);
