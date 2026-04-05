import React from "react";
import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const STATO_COLOR = {
  da_fare: '#dc2626',
  in_corso: '#f97316',
  fatto: '#16a34a',
  pioggia: '#2563eb',
  sospeso: '#6b7280',
  non_accessibile: '#111827',
};

function buildMarkerIcon(stato = 'da_fare') {
  const color = STATO_COLOR[stato] || '#dc2626';
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function getMapCenter(impianti) {
  if (!impianti.length) return [41.9028, 12.4964];
  const validi = impianti.filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng));
  if (!validi.length) return [41.9028, 12.4964];

  const avgLat = validi.reduce((acc, i) => acc + i.lat, 0) / validi.length;
  const avgLng = validi.reduce((acc, i) => acc + i.lng, 0) / validi.length;
  return [avgLat, avgLng];
}

export default function MappaImpianti({ impianti }) {
  const center = useMemo(() => getMapCenter(impianti), [impianti]);

  return (
    <div className="card">
      <h2>Mappa impianti</h2>
      <div className="mapWrap">
        <MapContainer center={center} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {impianti
            .filter((impianto) => Number.isFinite(impianto.lat) && Number.isFinite(impianto.lng))
            .map((impianto) => (
              <Marker
                key={impianto.id}
                position={[impianto.lat, impianto.lng]}
                icon={buildMarkerIcon(impianto.stato)}
              >
                <Popup>
                  <strong>{impianto.nome || 'Senza nome'}</strong>
                  <br />
                  <span>ID SAP: {impianto.idSap || '-'}</span>
                  <br />
                  <span>Comune: {impianto.comune || '-'}</span>
                  <br />
                  <span>Indirizzo: {impianto.indirizzo || '-'}</span>
                  <br />
                  <span>Stato: {impianto.stato || '-'}</span>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
