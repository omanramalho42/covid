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
  const [mapCenter, setMapCenter] = useState(
    { lat: 34.80746, lng: -40.4796 }
  );
  const [mapZoom, setMapZoom] = useState(3);
  const [mapCountries, setMapCountries] = useState([]);
  const [casesType, setCasesType] = useState("cases");
  
  useEffect(() => {
    const fetchAllCountries = async () => {
      await fetch("https://disease.sh/v3/covid-19/all")
      .then(res => res.json())
      .then(data => {
        setCountryInfo(data);
      })
    }

    fetchAllCountries();  
  },[]);

  const handleCountryChange = async (event) => {
    // event.preventDefault();

    const countryCode = event.target.value;
    setCountry(countryCode);

    const url = 
      countryCode === 'worldwide' 
      ? 'https://disease.sh/v3/covid-19/all' 
      : `https://disease.sh/v3/covid-19/countries/${countryCode}`

    await fetch(url)
      .then(res => res.json())
      .then(data => {
        setCountry(countryCode);
        setCountryInfo(data);

        setMapCenter([data.countryInfo.lat, data.countryInfo.lgn]);
        setMapZoom(4);
      });
  }

  useEffect(() => {
    const getCountriesData = async () => {
      await fetch('https://disease.sh/v3/covid-19/countries')
        .then((res) => res.json())
        .then((data) => {
          const countries = data.map((country) => ({
            name: country.country,
            value: country.countryInfo.iso2, //UK, USA, FR
          }));
          let sortedData = sortData(data);
          setTableData(sortedData);
          setMapCountries(data);
          setCountries(countries);
        });
    };
    
    getCountriesData();
  },[]);

  // console.log(casesType);

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
                  { name }
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>


        <div className='app__stats'>
          <InfoBox
            isRed
            active={casesType === 'cases'}
            onClick={(e) => setCasesType('cases')}
            title="Casos de coronavírus" 
            cases={prettyPrintStat(countryInfo.todayCases)} 
            total={numeral(countryInfo.cases).format("0.0a")} 
          />
          <InfoBox 
            active={casesType === 'recovered'}
            onClick={(e) => setCasesType('recovered')}
            title="Recuperações" 
            cases={prettyPrintStat(countryInfo.todayRecovered)} 
            total={numeral(countryInfo.recovered).format("0.0a")} 
          />
          <InfoBox
            active={casesType === 'deaths'}
            onClick={(e) => setCasesType('deaths')} 
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
          <h3>Acompoanhe Casos por país.</h3>
          <Table countries={tableData} />
          <h3 className='app__graphTitle'>Novos casos no mundo {casesType} </h3>
          <LineGraph className="app_graph" casesType={casesType} />
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
