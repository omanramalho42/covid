import React, { useState, useEffect } from 'react'

import {
  MenuItem,
  FormControl,
  Select,
  Card,
  CardContent
} from '@mui/material'

import { sortData, prettyPrintStat } from './util';

import LineGraph from './components/LineGraph';
import Table from './components/Table';
import InfoBox from './components/InfoBox';
import Map from './components/Map';

import './App.css'
import "leaflet/dist/leaflet.css";
import numeral from 'numeral';

function App() {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('worldwide');
  const [countryInfo, setCountryInfo] = useState({});
  const [tableData, setTableData] = useState([]);
  // Padronizado como array [lat, lng], que é o formato aceito pelo react-leaflet
  const [mapCenter, setMapCenter] = useState([34.80746, -40.4796]);
  const [mapZoom, setMapZoom] = useState(3);
  const [mapCountries, setMapCountries] = useState([]);
  const [casesType, setCasesType] = useState("cases");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllCountries = async () => {
      try {
        const res = await fetch("https://disease.sh/v3/covid-19/all");
        if (!res.ok) throw new Error(`Erro ${res.status} ao buscar dados globais`);
        const data = await res.json();
        setCountryInfo(data);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar os dados globais.");
      }
    };

    fetchAllCountries();
  }, []);

  const handleCountryChange = async (event) => {
    const countryCode = event.target.value;

    const url =
      countryCode === 'worldwide'
        ? 'https://disease.sh/v3/covid-19/all'
        : `https://disease.sh/v3/covid-19/countries/${countryCode}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erro ${res.status} ao buscar dados de ${countryCode}`);
      const data = await res.json();

      setCountry(countryCode);
      setCountryInfo(data);

      if (countryCode === 'worldwide') {
        setMapCenter([34.80746, -40.4796]);
        setMapZoom(3);
      } else if (data?.countryInfo?.lat && data?.countryInfo?.long) {
        // Correção: era "lgn" (typo), o campo correto retornado pela API é "long"
        setMapCenter([data.countryInfo.lat, data.countryInfo.long]);
        setMapZoom(4);
      }
    } catch (err) {
      console.error(err);
      setError(`Não foi possível carregar dados de ${countryCode}.`);
    }
  };

  useEffect(() => {
    const getCountriesData = async () => {
      try {
        const res = await fetch('https://disease.sh/v3/covid-19/countries');
        if (!res.ok) throw new Error(`Erro ${res.status} ao buscar países`);
        const data = await res.json();

        const countriesList = data.map((country) => ({
          name: country.country,
          value: country.countryInfo.iso2, // UK, USA, FR
        }));

        setTableData(sortData(data));
        setMapCountries(data);
        setCountries(countriesList);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar a lista de países.");
      }
    };

    getCountriesData();
  }, []);

  return (
    <div className="app">
      <div className="app__left">
        <div className='app__header'>
          <h1>Covid 19 🦠</h1>
          <FormControl className="app__dropdown">
            <Select
              variant="outlined"
              value={country}
              onChange={handleCountryChange}
            >
              <MenuItem value="worldwide">Worldwide</MenuItem>
              {countries?.map(({ name }, idx) => (
                <MenuItem
                  key={idx}
                  value={name}
                >
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {error && <p className="app__error">{error}</p>}

        <div className='app__stats'>
          <InfoBox
            isRed
            active={casesType === 'cases'}
            onClick={() => setCasesType('cases')}
            title="Casos de coronavírus"
            cases={prettyPrintStat(countryInfo.todayCases)}
            total={numeral(countryInfo.cases).format("0.0a")}
          />
          <InfoBox
            active={casesType === 'recovered'}
            onClick={() => setCasesType('recovered')}
            title="Recuperações"
            cases={prettyPrintStat(countryInfo.todayRecovered)}
            total={numeral(countryInfo.recovered).format("0.0a")}
          />
          <InfoBox
            active={casesType === 'deaths'}
            onClick={() => setCasesType('deaths')}
            title="Mortes"
            isRed
            cases={prettyPrintStat(countryInfo.todayDeaths)}
            total={numeral(countryInfo.deaths).format("0.0a")}
          />
        </div>
        <Map
          center={mapCenter}
          zoom={mapZoom}
          countries={mapCountries}
          casesType={casesType}
        />
      </div>

      <Card className="app__right">
        <CardContent>
          <h3>Acompanhe casos por país.</h3>
          <Table countries={tableData} />
          <h3 className='app__graphTitle'>Novos casos no mundo — {casesType}</h3>
          <LineGraph className="app_graph" casesType={casesType} />
        </CardContent>
      </Card>
    </div>
  );
}

export default App;