class GeoMap {
  constructor(_config, _data, _geoData, _regionFilter, _dispatcher) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 700,
      containerHeight: _config.containerHeight || 400,
      margin: _config.margin || {
        top: 10,
        right: 5,
        bottom: 25,
        left: 50,
      },
      tooltipPadding: _config.tooltipPadding || 15,
      projection: _config.projection || d3.geoMercator(),
    };
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.geoData = _geoData;
    this.regionFilter = _regionFilter;
    this.initVis();
  }

  /**
   * Initialize scales/axes and append static elements, such as axis titles
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    vis.chart = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    vis.tooltip = d3
      .select("#tooltip")
      .attr("class", "tooltip")
      .style("opacity", 0);

    vis.projection = d3
      .geoEquirectangular()
      .center([0, 50]) // set centre to further North
      .scale([vis.width / (2 * Math.PI)]) // scale to fit size of svg group
      .translate([vis.width / 2.6, vis.height / 2]); // ensure centered within svg group

    vis.geoPath = d3.geoPath().projection(vis.projection);

    vis.colorScale = d3
      .scaleLinear()
      .range(["#ffffff", "#1a1a1a"])
      .interpolate(d3.interpolateHcl);

    vis.regionLegend = vis.svg.append("g");

    vis.playerCountLegend = vis.svg.append("g");

    // initialize lineage gradient for player count legend
    vis.linearGradient = vis.svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient");

    vis.updateVis();
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    let vis = this;

    vis.regionCounts = d3.group(vis.data, (d) => d.region);

    const maxCount = d3.max(vis.regionCounts, (d) => d[1].length);

    vis.colorScale.domain([0, maxCount]);

    vis.playerCountLegendStops = [
      {
        color: "#ffffff",
        value: 0,
        offset: 0,
      },
      { color: "#1a1a1a", value: maxCount, offset: 100 },
    ];
    // close tooltip when update occurs
    vis.tooltip.transition().duration(500).style("opacity", 0);

    vis.renderLegends();
    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    const countries = topojson.feature(
      vis.geoData,
      vis.geoData.objects.countries
    );

    const geoPaths = vis.chart
      .selectAll(".geo-path")
      .data(countries.features)
      .join("path")
      .attr("class", "geo-path")
      .attr("id", (d) => {
        const region = vis.countryToRegionMap[d.properties.name];
        if (region === undefined) {
          return "other";
        }
        return region;
      })
      .attr("fill", (d) => {
        const region = vis.countryToRegionMap[d.properties.name];
        if (
          region === undefined ||
          (vis.regionFilter.length !== 0 && !vis.regionFilter.includes(region))
        ) {
          return "url(#lightstripe)";
        } else {
          if (vis.regionCounts.get(region) !== undefined) {
            return vis.colorScale(vis.regionCounts.get(region).length);
          } else {
            return vis.colorScale(0);
          }
        }
      })
      .attr("stroke", (d) => {
        const region = vis.countryToRegionMap[d.properties.name];
        if (region !== undefined) {
          return vis.regionToColourMap[region];
        } else {
          return "transparent";
        }
      })
      .attr("stroke-width", (d) => {
        const region = vis.countryToRegionMap[d.properties.name];
        return region !== undefined &&
          (vis.regionFilter.length === 0 || vis.regionFilter.includes(region))
          ? 2
          : 1;
      })
      .attr("d", vis.geoPath);

    geoPaths
      .on("mouseover", (e, d) => {
        const region = vis.countryToRegionMap[d.properties.name];
        if (region === undefined) return;
        const regionFullName = vis.regionFullNameMap[region];

        let regionCount = 0;
        if (vis.regionCounts.get(region) !== undefined) {
          regionCount = vis.regionCounts.get(region).length;
        }

        vis.tooltip.transition().duration(200).style("opacity", 0.9);
        vis.tooltip
          .html(
            `<strong>${regionFullName}</strong> <br>
              ${regionCount} players`
          )
          .style("left", e.pageX + "px")
          .style("top", e.pageY - 28 + "px");
      })
      .on("mouseout", (e, d) => {
        vis.tooltip.transition().duration(500).style("opacity", 0);
      })
      .on("click", (e, d) => {
        const region = vis.countryToRegionMap[d.properties.name];
        // console.log(d.properties.name);
        if (region === undefined) returt;
        vis.dispatcher.call("regionFilter", e, region);
      });
  }

  renderLegends() {
    let vis = this;
    const regions = ["AP", "BR", "EU", "KR", "LAT", "NA"];

    const regionLegend = vis.regionLegend
      .selectAll(".region-legend-group")
      .data(regions)
      .join("g")
      .attr("class", "region-legend-group")
      .attr("height", 100)
      .attr("width", 100)
      .attr("transform", (d, i) => {
        return `translate(${i * 60 + 4}  , ${vis.config.margin.top + 100})`;
      });

    regionLegend.on("click", function (e, d) {
      vis.dispatcher.call("regionFilter", e, d);
    });

    // Add legend color indicators
    regionLegend
      .append("rect")
      .attr("class", "region-legend-element")
      .attr("height", 15)
      .attr("width", 15)
      .attr("fill", (d) =>
        vis.regionFilter.length === 0 || vis.regionFilter.includes(d)
          ? vis.regionToColourMap[d]
          : "url(#lightstripe)"
      )
      .attr("stroke", (d) =>
        vis.regionFilter.length === 0 || vis.regionFilter.includes(d)
          ? "black"
          : vis.regionToColourMap[d]
      )
      .attr("stroke-width", 2)
      .text((d) => d);

    // Add legend labels
    regionLegend
      .append("text")
      .attr("class", "region-legend-label")
      .attr("x", 17)
      .attr("y", 14)
      .attr("text-anchor", "start")
      .attr("fill", (d) =>
        vis.regionFilter.length === 0 || vis.regionFilter.includes(d)
          ? "black"
          : "lightgray"
      )
      .text((d) => d);

    const playerCountLegend = vis.playerCountLegend
      .selectAll(".region-legend-group")
      .data(regions)
      .join("g")
      .attr("class", "region-legend-group")
      .attr("transform", `translate(424, ${vis.config.margin.top + 65})`);

    // Add legend labels
    playerCountLegend
      .selectAll(".region-legend-label")
      .data(vis.playerCountLegendStops)
      .join("text")
      .attr("class", "region-legend-label")
      .attr("text-anchor", "middle")
      .attr("y", 40)
      .attr("x", (d, index) => {
        return index == 0 ? 0 : 150;
      })
      .text((d) => d.value);

    // Add gradient rect
    vis.linearGradient
      .selectAll("stop")
      .data(vis.playerCountLegendStops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    playerCountLegend
      .append("rect")
      .attr("width", 150)
      .attr("height", 20)
      .attr("fill", "url(#legend-gradient)");

    // Add legend title
    playerCountLegend
      .append("text")
      .attr("class", ".region-legend-title")
      .attr("x", -10)
      .attr("y", -15)
      .text("Number of players in region");
  }

  regionFullNameMap = {
    LAT: "Latin America",
    BR: "Brazil",
    AP: "Southeast Asia/Asia Pacific",
    KR: "Korea",
    EU: "Europe",
    NA: "North America",
  };

  regionToColourMap = {
    LAT: "red",
    BR: "green",
    AP: "brown",
    KR: "blue",
    EU: "purple",
    NA: "orange",
  };
  countryToRegionMap = {
    // Latin America - LAT
    Argentina: "LAT",
    Bolivia: "LAT",
    Chile: "LAT",
    Colombia: "LAT",
    "Costa Rica": "LAT",
    Cuba: "LAT",
    "Dominican Rep.": "LAT",
    Ecuador: "LAT",
    "El Salvador": "LAT",
    Guatemala: "LAT",
    Haiti: "LAT",
    Honduras: "LAT",
    Mexico: "LAT",
    Nicaragua: "LAT",
    Panama: "LAT",
    Paraguay: "LAT",
    Peru: "LAT",
    "Puerto Rico": "LAT",
    Uruguay: "LAT",
    Venezuela: "LAT",
    // Brazil -  BR
    Brazil: "BR",
    // Asia Pacific - AP
    Afghanistan: "AP",
    Australia: "AP",
    Bangladesh: "AP",
    Brunei: "AP",
    Cambodia: "AP",
    China: "AP",
    Fiji: "AP",
    India: "AP",
    Indonesia: "AP",
    Japan: "AP",
    Laos: "AP",
    Malaysia: "AP",
    Mongolia: "AP",
    Nepal: "AP",
    "New Caledonia": "AP",
    "New Zealand": "AP",
    Pakistan: "AP",
    "Papua New Guinea": "AP",
    Philippines: "AP",
    Singapore: "AP",
    "Solomon Is.": "AP",
    "Sri Lanka": "AP",
    Taiwan: "AP",
    Thailand: "AP",
    Vietnam: "AP",
    // Korea - KR
    "South Korea": "KR",
    // Europe - EU
    Albania: "EU",
    Austria: "EU",
    Belarus: "EU",
    Belgium: "EU",
    "Bosnia and Herz.": "EU",
    Bulgaria: "EU",
    Croatia: "EU",
    Czechia: "EU",
    Denmark: "EU",
    Estonia: "EU",
    Finland: "EU",
    France: "EU",
    Germany: "EU",
    Greece: "EU",
    Hungary: "EU",
    Iceland: "EU",
    Ireland: "EU",
    Italy: "EU",
    Kosovo: "EU",
    Latvia: "EU",
    Lithuania: "EU",
    Luxembourg: "EU",
    Moldova: "EU",
    Montenegro: "EU",
    Netherlands: "EU",
    Macedonia: "EU",
    Norway: "EU",
    Poland: "EU",
    Portugal: "EU",
    Romania: "EU",
    Russia: "EU",
    Serbia: "EU",
    Slovakia: "EU",
    Slovenia: "EU",
    Spain: "EU",
    Sweden: "EU",
    Switzerland: "EU",
    Ukraine: "EU",
    "United Kingdom": "EU",
    // North America - NA
    Canada: "NA",
    "United States of America": "NA",
  };
}
