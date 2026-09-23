import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
// Necessário para a escala "time" funcionar no Chart.js v3/v4.
// Instale com: npm install chartjs-adapter-date-fns date-fns
import 'chartjs-adapter-date-fns';

import { Line } from "react-chartjs-2";
import numeral from "numeral";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Opções reescritas no formato do Chart.js v3/v4
// (a sintaxe antiga com legend/tooltips/scales.xAxes é do Chart.js v2 e era ignorada)
const options = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: "index",
      intersect: false,
      callbacks: {
        label: function (context) {
          return numeral(context.parsed.y).format("+0,0");
        },
      },
    },
  },
  elements: {
    point: {
      radius: 0,
    },
  },
  scales: {
    x: {
      type: "time",
      time: {
        parser: "MM/dd/yy",
        tooltipFormat: "MMM d, yyyy",
      },
      grid: {
        display: false,
      },
    },
    y: {
      grid: {
        display: false,
      },
      ticks: {
        callback: function (value) {
          return numeral(value).format("0a");
        },
      },
    },
  },
};

const buildChartData = (data, casesType) => {
  const chartData = [];
  let lastDataPoint;
  for (let date in data[casesType]) {
    if (lastDataPoint) {
      chartData.push({
        x: date,
        y: data[casesType][date] - lastDataPoint,
      });
    }
    lastDataPoint = data[casesType][date];
  }
  return chartData;
};

function LineGraph({ casesType = "cases" }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://disease.sh/v3/covid-19/historical/all?lastdays=120"
        );
        if (!response.ok) throw new Error(`Erro ${response.status} ao buscar histórico`);
        const json = await response.json();
        setData(buildChartData(json, casesType));
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [casesType]);

  return (
    <div style={{ height: "300px" }}>
      {data?.length > 0 && (
        <Line
          data={{
            datasets: [
              {
                backgroundColor: "rgba(204, 16, 52, 0.5)",
                borderColor: "#CC1034",
                data: data,
              },
            ],
          }}
          options={options}
        />
      )}
    </div>
  );
}

export default LineGraph;