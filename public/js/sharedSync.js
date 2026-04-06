(function initSharedSyncModule(global){
  'use strict';

  function createSharedSyncService(config = {}) {
    const state = {
      rtdbRef: null,
      rtdbUnsubscribe: null,
      firestoreUnsubscribe: null,
      legacyDocUnsubscribe: null,
      legacyCollectionUnsubscribe: null,
      commesseUnsubscribe: null,
      commesseTimer: null,
      pushTimer: null,
      lastReport: null
    };

    const resolve = {
      firebase: () => config.firebase || global.firebase,
      scopeKey: () => String(config.getScopeKey?.() || 'default').trim() || 'default',
      deviceId: () => String(config.getDeviceId?.() || ''),
      syncIdentity: () => config.getSyncIdentity?.() || null,
      app: async () => {
        if (typeof config.resolveFirebaseApp !== 'function') {
          throw new Error('Resolver Firebase app mancante.');
        }
        return config.resolveFirebaseApp();
      }
    };

    function channelError(channel, error, context = '') {
      const message = error?.message || String(error || 'errore sconosciuto');
      const report = { channel, message, context, at: new Date().toISOString(), error };
      state.lastReport = report;
      if (typeof config.onChannelError === 'function') config.onChannelError(report);
      return report;
    }

    function summarizeResults(operations, results) {
      return results.map((entry, idx) => {
        const channel = operations[idx]?.channel || 'sconosciuto';
        if (entry?.status === 'fulfilled') return `${channel}: ok`;
        const reason = entry?.reason?.message || entry?.reason || 'errore sconosciuto';
        return `${channel}: ${reason}`;
      }).join(' | ');
    }

    async function initFirebaseSharedSync() {
      const app = await resolve.app();
      const firebase = resolve.firebase();
      if (!firebase?.database) throw new Error('Realtime Database non disponibile.');
      if (!firebase?.firestore) throw new Error('Firestore non disponibile.');

      const scopeKey = resolve.scopeKey();
      const pathRoot = String(config.rtdbPathRoot || 'timbrature_shared/app_scopes').trim();
      const docBase = String(config.firestoreDocBasename || 'global_app_data_v1').trim();
      const scopesCollection = String(config.firestoreScopesCollection || '_shared_scopes').trim();
      const legacyCollectionName = String(config.legacyCollection || 'timbrature_sync').trim();

      if (!state.rtdbRef) {
        const db = firebase.database(app);
        state.rtdbRef = db.ref(`${pathRoot}/${scopeKey}/app_data_v1`);
      }

      const firestore = firebase.firestore(app);
      const firestoreDocRef = firestore
        .collection(scopesCollection)
        .doc(scopeKey)
        .collection('_shared')
        .doc(docBase);

      const legacyCollectionRef = firestore
        .collection(scopesCollection)
        .doc(scopeKey)
        .collection(legacyCollectionName);

      const legacyDocRef = legacyCollectionRef.doc(docBase);

      return {
        app,
        rtdbRef: state.rtdbRef,
        firestoreDocRef,
        legacyCollectionRef,
        legacyDocRef
      };
    }

    async function writeShared({ envelope, key, value, reason = 'manual', throwOnFailure = false } = {}) {
      const syncIdentity = resolve.syncIdentity();
      if (!syncIdentity) return false;

      const ctx = await initFirebaseSharedSync();
      const effectiveEnvelope = envelope || {
        updated_at: new Date().toISOString(),
        updated_by: syncIdentity.email || syncIdentity.uid || '',
        reason,
        payload: key ? { [key]: value } : {}
      };

      const operations = [
        {
          channel: 'rtdb/timbrature_shared/app_data_v1',
          run: async () => {
            if (key) {
              await ctx.rtdbRef.child('updated_at').set(effectiveEnvelope.updated_at);
              await ctx.rtdbRef.child('updated_by').set(effectiveEnvelope.updated_by);
              await ctx.rtdbRef.child('reason').set(effectiveEnvelope.reason);
              await ctx.rtdbRef.child(`payload/${key}`).set(value);
            } else {
              await ctx.rtdbRef.set(effectiveEnvelope);
            }
          }
        },
        {
          channel: '_shared/global_app_data_v1',
          run: async () => {
            await ctx.firestoreDocRef.set(effectiveEnvelope, { merge: true });
          }
        },
        {
          channel: 'timbrature_sync/global_app_data_v1',
          run: async () => {
            await ctx.legacyDocRef.set({
              ...effectiveEnvelope,
              updatedAt: effectiveEnvelope.updated_at,
              updatedBy: effectiveEnvelope.updated_by,
              uid: syncIdentity?.uid || '',
              deviceId: resolve.deviceId()
            }, { merge: true });
          }
        }
      ];

      const results = await Promise.allSettled(operations.map((op) => op.run().catch((error) => {
        channelError(op.channel, error, reason);
        throw error;
      })));
      const successCount = results.filter((entry) => entry.status === 'fulfilled').length;
      if (!successCount) {
        const details = summarizeResults(operations, results);
        const err = new Error(`Impossibile sincronizzare su Firebase (${details || 'nessun canale disponibile'}).`);
        err.code = 'NO_SHARED_SYNC_CHANNEL';
        if (throwOnFailure) throw err;
        return false;
      }
      return true;
    }

    async function readShared({ reason = 'manual', handlers = {} } = {}) {
      const ctx = await initFirebaseSharedSync();
      let checked = false;
      const results = { applied: false, checkedAnyChannel: false };

      const readers = [
        {
          channel: 'rtdb/timbrature_shared/app_data_v1',
          run: async () => {
            const snap = await ctx.rtdbRef.get();
            const data = snap?.val?.() || null;
            checked = true;
            if (typeof handlers.onRtdbData === 'function') {
              results.applied = handlers.onRtdbData(data, `pull-rtdb:${reason}`) || results.applied;
            }
          }
        },
        {
          channel: '_shared/global_app_data_v1',
          run: async () => {
            const doc = await ctx.firestoreDocRef.get();
            const data = doc?.data?.() || null;
            checked = true;
            if (typeof handlers.onFirestoreData === 'function') {
              results.applied = handlers.onFirestoreData(data, `pull-firestore:${reason}`) || results.applied;
            }
          }
        },
        {
          channel: 'timbrature_sync/global_app_data_v1',
          run: async () => {
            const doc = await ctx.legacyDocRef.get();
            const raw = doc?.data?.() || {};
            const normalized = typeof handlers.normalizeLegacyEnvelope === 'function'
              ? handlers.normalizeLegacyEnvelope(raw, String(config.firestoreDocBasename || 'global_app_data_v1'))
              : raw;
            checked = true;
            if (normalized?.payload && typeof handlers.onLegacyData === 'function') {
              results.applied = handlers.onLegacyData(normalized, `pull-firestore-legacy-doc:${reason}`) || results.applied;
            }
          }
        }
      ];

      for (const reader of readers) {
        try {
          await reader.run();
        } catch (error) {
          channelError(reader.channel, error, reason);
        }
      }

      results.checkedAnyChannel = checked;
      return results;
    }

    async function startLiveSync(handlers = {}) {
      await stopLiveSync();
      const ctx = await initFirebaseSharedSync();

      const onRtdbValue = (snapshot) => handlers.onRtdbValue?.(snapshot?.val?.() || null, 'live-rtdb');
      ctx.rtdbRef.on('value', onRtdbValue);
      state.rtdbUnsubscribe = () => ctx.rtdbRef.off('value', onRtdbValue);

      state.firestoreUnsubscribe = ctx.firestoreDocRef.onSnapshot((docSnap) => {
        handlers.onFirestoreDoc?.(docSnap?.data?.() || null, 'live-firestore');
      }, (error) => channelError('_shared/global_app_data_v1', error, 'live-firestore'));

      state.legacyDocUnsubscribe = ctx.legacyDocRef.onSnapshot((docSnap) => {
        handlers.onLegacyDoc?.(docSnap?.data?.() || {}, 'live-firestore-legacy-doc');
      }, (error) => channelError('timbrature_sync/global_app_data_v1', error, 'live-firestore-legacy-doc'));

      state.legacyCollectionUnsubscribe = ctx.legacyCollectionRef
        .orderBy('updated_at', 'desc')
        .limit(20)
        .onSnapshot((querySnap) => {
          handlers.onLegacyCollection?.(querySnap, 'live-firestore-legacy');
        }, (error) => channelError('timbrature_sync/*', error, 'live-firestore-legacy'));

      if (typeof handlers.onReady === 'function') handlers.onReady();
    }

    async function stopLiveSync() {
      if (state.pushTimer) {
        clearTimeout(state.pushTimer);
        state.pushTimer = null;
      }
      if (state.commesseTimer) {
        clearTimeout(state.commesseTimer);
        state.commesseTimer = null;
      }

      ['rtdbUnsubscribe', 'firestoreUnsubscribe', 'legacyDocUnsubscribe', 'legacyCollectionUnsubscribe', 'commesseUnsubscribe'].forEach((field) => {
        if (!state[field]) return;
        try { state[field](); } catch (_) {}
        state[field] = null;
      });
    }

    return {
      initFirebaseSharedSync,
      writeShared,
      readShared,
      startLiveSync,
      stopLiveSync,
      reportChannelError: channelError,
      summarizeResults,
      state
    };
  }

  global.SharedSyncService = { createSharedSyncService };
})(window);
