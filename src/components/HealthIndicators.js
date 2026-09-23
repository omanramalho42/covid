import React, { useState, useEffect, useRef } from "react";
import {
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

import "./HealthIndicators.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Fonte: WHO Global Health Observatory (GHO) OData API — gratuita, sem chave.
// Aviso: a própria OMS marcou esta API (ghoapi.azureedge.net) como "deprecated"
// a partir do fim de 2025, anunciando uma substituta ("World Health Data Hub")
// que ainda não tem endpoint público documentado. Ela continua no ar por ora,
// mas vale checar https://www.who.int/data/gho/info/gho-odata-api de tempos em
// tempos e trocar GHO_BASE_URL se/quando a nova API for publicada.
// Em produção/deploy real, troque isto por um endpoint seu (função serverless,
// Netlify/Vercel function, backend próprio) que faça esta mesma chamada no
// servidor. O caminho relativo abaixo só funciona com "npm start" (dev
// server do CRA), porque é ele quem lê src/setupProxy.js e repassa a chamada
// para ghoapi.azureedge.net do lado do servidor — contornando o bloqueio de
// CORS do navegador. Um "npm run build" servido estaticamente NÃO tem esse
// proxy, então a chamada direta ao domínio da OMS voltaria a ser bloqueada.
const GHO_BASE_URL = "/gho-api";

// Em vez de fixar códigos de indicador "no chute" (um código errado retorna
// silenciosamente uma lista vazia), resolvemos o código certo em tempo de
// execução buscando pelo nome oficial do indicador na própria API.
const INDICATOR_GROUPS = {
  lifeMortality: {
    label: "Expectativa de vida e mortalidade",
    indicators: [
      { label: "Expectativa de vida ao nascer", search: "Life expectancy at birth" },
      { label: "Mortalidade infantil (menores de 5 anos)", search: "Under-five mortality rate" },
      { label: "Mortalidade materna", search: "Maternal mortality ratio" },
    ],
  },
  infectious: {
    label: "Doenças infecciosas",
    indicators: [
      { label: "Incidência de tuberculose", search: "incidence of tuberculosis" },
      { label: "Incidência de malária", search: "malaria incidence" },
      { label: "Incidência de HIV", search: "HIV infections" },
    ],
  },
  immunization: {
    label: "Vacinação e imunização",
    indicators: [
      { label: "Cobertura vacinal DTP3", search: "DTP3" },
      { label: "Cobertura vacinal Sarampo (MCV1)", search: "measles-containing-vaccine" },
    ],
  },
};

const chartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { display: false } },
  },
};

// Resolve o IndicatorCode oficial buscando pelo nome, e guarda em cache
// (fora do componente) para não repetir a busca ao trocar de aba e voltar.
const indicatorCodeCache = {};

async function resolveIndicatorCode(searchTerm) {
  if (indicatorCodeCache[searchTerm]) return indicatorCodeCache[searchTerm];

  // tolower() nos dois lados evita falhar a busca só por causa de
  // maiúscula/minúscula diferente do nome oficial do indicador.
  const needle = searchTerm.toLowerCase().replace(/'/g, "''");
  const filter = `contains(tolower(IndicatorName),'${needle}')`;
  const url = `${GHO_BASE_URL}/Indicator?$filter=${encodeURIComponent(filter)}`;

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    // Isso captura falha de CORS/rede: o fetch nem chega a ter uma resposta.
    console.error("Falha de rede/CORS ao chamar a API da OMS:", networkErr);
    throw new Error("network_or_cors");
  }

  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar indicador`);
  const json = await res.json();

  const match = json.value?.[0];
  if (!match) {
    console.warn(`Nenhum indicador da OMS bateu com "${searchTerm}". Resposta:`, json);
    throw new Error(`indicator_not_found:${searchTerm}`);
  }

  indicatorCodeCache[searchTerm] = match;
  return match;
}

async function fetchIndicatorSeries(indicatorCode, iso3) {
  const filter = `SpatialDim eq '${iso3}'`;
  const url = `${GHO_BASE_URL}/${indicatorCode}?$filter=${encodeURIComponent(filter)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar série do indicador`);
  const json = await res.json();

  // Alguns indicadores trazem várias linhas por ano (por sexo/idade).
  // Preferimos a linha "ambos os sexos" (Dim1 = BTSX); na ausência dela,
  // fazemos a média das linhas daquele ano.
  const byYear = {};
  (json.value || []).forEach((row) => {
    const year = row.TimeDim;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(row);
  });

  return Object.entries(byYear)
    .map(([year, rows]) => {
      const preferred = rows.find((r) => !r.Dim1 || r.Dim1 === "BTSX");
      const value = preferred
        ? preferred.NumericValue
        : rows.reduce((sum, r) => sum + (r.NumericValue || 0), 0) / rows.length;
      return { x: Number(year), y: value };
    })
    .filter((p) => p.y !== null && p.y !== undefined && !Number.isNaN(p.y))
    .sort((a, b) => a.x - b.x);
}

function HealthIndicators({ countries }) {
  const [category, setCategory] = useState("lifeMortality");
  const [indicatorIdx, setIndicatorIdx] = useState(0);
  const [countryIso3, setCountryIso3] = useState("BRA");
  const [series, setSeries] = useState([]);
  const [indicatorName, setIndicatorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const group = INDICATOR_GROUPS[category];
  const indicatorDef = group.indicators[indicatorIdx] || group.indicators[0];

  useEffect(() => {
    // Evita que uma resposta antiga sobrescreva o gráfico se o usuário
    // trocar de indicador/país rapidamente antes do fetch anterior voltar.
    const thisRequest = ++requestId.current;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const indicator = await resolveIndicatorCode(indicatorDef.search);
        const points = await fetchIndicatorSeries(indicator.IndicatorCode, countryIso3);

        if (requestId.current !== thisRequest) return;

        setIndicatorName(indicator.IndicatorName);
        if (points.length === 0) {
          setSeries([]);
          setError("Sem dados para este país neste indicador.");
        } else {
          setSeries(points);
        }
      } catch (err) {
        if (requestId.current !== thisRequest) return;
        console.error(err);

        if (err.message === "network_or_cors") {
          setError(
            "Não foi possível conectar à API da OMS (pode ser bloqueio de CORS ou falta de conexão). Veja o console do navegador para detalhes."
          );
        } else if (err.message?.startsWith("indicator_not_found")) {
          setError(`Não achei esse indicador no catálogo da OMS ("${indicatorDef.label}").`);
        } else {
          setError("Não foi possível carregar os dados da OMS agora.");
        }
        setSeries([]);
      } finally {
        if (requestId.current === thisRequest) setLoading(false);
      }
    };

    load();
  }, [category, indicatorIdx, countryIso3, indicatorDef.search]);

  return (
    <div className="health">
      <h2 className="health__title">Saúde Global — dados da OMS</h2>
      <p className="health__source">
        Fonte: WHO Global Health Observatory. Cobertura e atualização variam por indicador e país.
      </p>

      <Tabs
        value={category}
        onChange={(e, value) => {
          setCategory(value);
          setIndicatorIdx(0);
        }}
        variant="scrollable"
        scrollButtons="auto"
        className="health__tabs"
      >
        {Object.entries(INDICATOR_GROUPS).map(([key, g]) => (
          <Tab key={key} value={key} label={g.label} />
        ))}
      </Tabs>

      <div className="health__controls">
        <FormControl className="health__select">
          <InputLabel>Indicador</InputLabel>
          <Select
            value={indicatorIdx}
            label="Indicador"
            onChange={(e) => setIndicatorIdx(e.target.value)}
          >
            {group.indicators.map((ind, idx) => (
              <MenuItem key={ind.search} value={idx}>
                {ind.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl className="health__select">
          <InputLabel>País</InputLabel>
          <Select
            value={countryIso3}
            label="País"
            onChange={(e) => setCountryIso3(e.target.value)}
          >
            {countries?.map(({ name, iso3 }) => (
              iso3 && (
                <MenuItem key={iso3} value={iso3}>
                  {name}
                </MenuItem>
              )
            ))}
          </Select>
        </FormControl>
      </div>

      <div className="health__chartWrapper">
        {loading && (
          <div className="health__loading">
            <CircularProgress size={28} />
          </div>
        )}

        {!loading && error && <p className="health__error">{error}</p>}

        {!loading && !error && series.length > 0 && (
          <Line
            data={{
              labels: series.map((p) => p.x),
              datasets: [
                {
                  label: indicatorName,
                  data: series.map((p) => p.y),
                  borderColor: "#3f8efc",
                  backgroundColor: "rgba(63, 142, 252, 0.2)",
                  tension: 0.2,
                },
              ],
            }}
            options={chartOptions}
          />
        )}
      </div>
    </div>
  );
}

export default HealthIndicators;