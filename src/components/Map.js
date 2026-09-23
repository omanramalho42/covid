import React from "react";
import { MapContainer as LeafletMap, TileLayer } from "react-leaflet";

import "./Map.css";

import { showDataOnMap } from "../util";

// A CARTO passou a exigir uma API key nas tiles de basemap (gratuita até 5M
// requisições/mês no uso não comercial). Sem ela, as tiles carregam mas vêm
// com um selo "API KEY REQUIRED" por cima. A chave fica em .env como
// REACT_APP_CARTO_KEY (CRA só expõe variáveis com esse prefixo ao bundle).
const CARTO_KEY = "cb1_3vkz_1_4ee907f87e0b09e799dbf211"

function Map({ countries, casesType, center, zoom }) {
  return (
    <div className="map">
      <LeafletMap
        center={center}
        zoom={zoom}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
      >
        <TileLayer
          url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${
            CARTO_KEY ? `?key=${CARTO_KEY}` : ""
          }`}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {showDataOnMap(countries, casesType)}
      </LeafletMap>
    </div>
  );
}

export default Map;