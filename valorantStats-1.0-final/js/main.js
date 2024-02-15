import { PlayerChart } from "/js/playerChart.js";

let data,
  globalFilter = "kills_round",
  playerChart,
  gunBarChart,
  agentBarChart,
  bodyChart,
  radarChart,
  geoMap,
  regionFilter = [],
  barChartFilter = [],
  geoData;

const dispatcher = d3.dispatch(
  "regionFilter",
  "userFilter",
  "toRadar",
  "barChartFilter"
);

const GUN_NAME_KEYS = ["gun_name", "gun1_name", "gun2_name", "gun3_name"];
const AGENT_KEYS = ["agent_name", "agent_1", "agent_2", "agent_3"];

function cleanData(data) {
  data.forEach((d) => {
    d.damage_round = +d.damage_round;
    d.headshots = +d.headshots;
    d.headshot_percent = +d.headshot_percent;
    d.aces = +d.aces;
    d.clutches = +d.clutches;
    d.flawless = +d.flawless;
    d.first_bloods = +d.first_bloods;
    d.kills = parseFloat(d.kills.replace(/,/g, ""));
    d.deaths = parseFloat(d.deaths.replace(/,/g, ""));
    d.assists = +d.assists;
    d.kd_ratio = +d.kd_ratio;
    d.kills_round = +d.kills_round;
    d.most_kills = +d.most_kills;
    d.score_round = +d.score_round;
    d.wins = +d.wins;
    d.win_percent = +d.win_percent;
    d.gun1_head = +d.gun1_head;
    d.gun1_body = +d.gun1_body;
    d.gun1_legs = +d.gun1_legs;
    d.gun1_kills = +d.gun1_kills;
    d.gun2_head = +d.gun2_head;
    d.gun2_body = +d.gun2_body;
    d.gun2_legs = +d.gun2_legs;
    d.gun2_kills = +d.gun2_kills;
    d.gun3_head = +d.gun3_head;
    d.gun3_body = +d.gun3_body;
    d.gun3_legs = +d.gun3_legs;
    d.gun3_kills = +d.gun3_kills;
  });

  return data.filter((player) => {
    return player.wins > 70;
  });
}

Promise.all([d3.csv("data/val_stats.csv"), d3.json("data/countries-110m.json")])
  .then((_data) => {
    data = _data[0];
    geoData = _data[1];

    data = cleanData(data);
    data = getFilteredData();

    playerChart = new PlayerChart(
      {
        parentElement: "#playerChart",
      },
      data,
      dispatcher
    );

    gunBarChart = new BarChart(
      {
        parentElement: "#barChart1",
        keys: GUN_NAME_KEYS,
        xaxis: 'Guns',
        yaxis: 'Player Count',
        title: 'Gun Choices'
      },
      data,
      dispatcher
    );

    agentBarChart = new BarChart(
      {
        parentElement: "#barChart2",
        keys: AGENT_KEYS,
        xaxis: 'Agents',
        yaxis: 'Player Count',
        title: 'Agent Choices'
      },
      data,
      dispatcher
    );

    radarChart = new RadarChart(
      {
        parentElement: "#radarChart",
      },
      data,
      []
    );

    bodyChart = new BodyChart(
      {
        parentElement: "#bodyChart",
      },
      data
    );

    geoMap = new GeoMap(
      {
        parentElement: "#geoMap",
      },
      data,
      geoData,
      regionFilter,
      dispatcher
    );
  })
  .catch((error) => {
    console.error("Error loading CSV:", error);
  });

function applyGlobalFilter(filteredData) {
  if (globalFilter === undefined || globalFilter === "none") {
    return filteredData;
  }

  return filteredData
    .sort((a, b) => {
      if (a[globalFilter] < b[globalFilter]) {
        return 1;
      }
      if (a[globalFilter] > b[globalFilter]) {
        return -1;
      }
      return 0;
    })
    .slice(0, 1000);
}

function applyGeoFilter(filteredData) {
  if (regionFilter.length === 0) {
    return filteredData;
  }

  return filteredData.filter((d) => regionFilter.includes(d.region));
}

function applyBarChartCategoryFilter(filteredData) {
  if (barChartFilter.length === 0) {
    return filteredData;
  }

  let dd = filteredData.filter((d) => {
    let retVal = true;
    barChartFilter.forEach((filterPair) => {
      retVal = retVal && d[filterPair.key] === filterPair.value;
    });
    return retVal;
  });
  return dd;
}

function getFilteredData() {
  let filteredData = data;

  [applyGlobalFilter, applyGeoFilter, applyBarChartCategoryFilter].forEach(
    (filterFunc) => {
      filteredData = filterFunc(filteredData);
    }
  );

  return filteredData;
}

d3.select("#filter").on("change", function () {
  globalFilter = d3.select(this).property("value");
  let filteredData = getFilteredData();

  // TODO: pass new data and call update on all the charts
  gunBarChart.data = filteredData;
  gunBarChart.updateVis();

  agentBarChart.data = filteredData;
  agentBarChart.updateVis();

  bodyChart.data = filteredData;
  bodyChart.updateVis();

  geoMap.data = filteredData;
  geoMap.updateVis();

  playerChart.updatePlayers(filteredData);
});

dispatcher.on("regionFilter", function (region) {
  if (regionFilter.includes(region)) {
    regionFilter = regionFilter.filter((d) => d !== region);
  } else {
    regionFilter.push(region);
  }

  let filteredData = getFilteredData();

  gunBarChart.data = filteredData;
  gunBarChart.updateVis();

  agentBarChart.data = filteredData;
  agentBarChart.updateVis();

  bodyChart.data = filteredData;
  bodyChart.updateVis();

  geoMap.data = filteredData;
  geoMap.regionFilter = regionFilter;
  geoMap.updateVis();

  playerChart.updatePlayers(filteredData);
  playerChart.updateVis();
});

dispatcher.on("barChartFilter", function (newFilterPair) {
  const filterPairComparator = (obj1, obj2) => {
    return obj1.key === obj2.key && obj1.value === obj2.value;
  };

  if (
    barChartFilter.find((filterPair) =>
      filterPairComparator(filterPair, newFilterPair)
    ) !== undefined
  ) {
    barChartFilter = barChartFilter.filter(
      (filterPair) => !filterPairComparator(filterPair, newFilterPair)
    );
  } else {
    if (barChartFilter.map((d) => d.value).includes(newFilterPair.value)) {
      return;
    }
    barChartFilter.push(newFilterPair);
  }

  let filteredData = getFilteredData();

  gunBarChart.data = filteredData;
  gunBarChart.selected = barChartFilter;
  gunBarChart.updateVis();

  agentBarChart.data = filteredData;
  agentBarChart.selected = barChartFilter;
  agentBarChart.updateVis();

  bodyChart.data = filteredData;
  bodyChart.updateVis();

  geoMap.data = filteredData;
  geoMap.regionFilter = regionFilter;
  geoMap.updateVis();

  playerChart.updatePlayers(filteredData);
  playerChart.updateVis();
});

dispatcher.on("toRadar", (playerData) => {

  radarChart.playerData = playerData;
  radarChart.updateVis();
});
