class RadarChart {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _playerData) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 550,
      containerHeight: _config.containerHeight || 600,
      margin: _config.margin || {
        top: 25,
        right: 20,
        bottom: 20,
        left: 35,
      },
      tooltipPadding: _config.tooltipPadding || 15,
    };
    this.data = _data;
    this.playerData = _playerData;
    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
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

    vis.sidecount = 6;
    vis.offset = Math.PI;
    vis.polyangle = (Math.PI * 2) / vis.sidecount;
    vis.size = 400;
    vis.r = 0.8 * vis.size;
    vis.r_0 = vis.r / 2;
    vis.centre = { x: vis.width / 2, y: vis.height / 2 };

    vis.RADARSIZE = 60;

    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.width)
      .attr("height", vis.height);

    vis.tooltip = d3
      .select("#tooltip")
      .attr("class", "tooltip")
      .style("opacity", 0);

    vis.chart = vis.svg.append("g");

    vis.scale = d3.scaleLinear().domain([0, 100]).range([0, vis.r_0]);

    vis.updateVis();
  }

  /**
   * Prepare the data and scales before we render it.
   */
  updateVis() {
    let vis = this;
    const generatePoint = ({ length, angle, size = 0 }) => {
      const point = {
        x: Math.floor(
          vis.width / 2 + (length + size) * Math.sin(vis.offset - angle)
        ),
        y: Math.floor(
          vis.height / 2 + (length + size) * Math.cos(vis.offset - angle)
        ),
        name: "hello2",
      };
      return point;
    };

    let points = [];
    const length = 100;
    for (let vertex = 0; vertex < vis.sidecount; vertex++) {
      const theta = vertex * vis.polyangle;

      points.push({
        ...generatePoint({ length, angle: theta, size: vis.RADARSIZE }),
        name: vertex,
      });
    }

    const p = vis.playerData[0];
    //hardcode for labels, if it works it works
    points[0].name = "Kills per Round";
    points[1].name = "Damage per Round";
    points[2].name = "Win Rate";
    points[3].name = "Kill/Death Ratio";
    points[4].name = "Headshot Percentage";
    points[5].name = "First Bloods";

    points[0].display_value = p?.kills_round ?? 0;
    points[1].display_value = p?.damage_round ?? 0;
    points[2].display_value = p?.win_percent ?? 0;
    points[3].display_value = p?.kd_ratio ?? 0;
    points[4].display_value = p?.headshot_percent ?? 0;
    points[5].display_value = p?.first_bloods ?? 0;

    points.push(points[0]);
    //////////////////////////////////////////////////////
    const inner_radar_data_points = [];
    //mock data to be replaced by actual csv data

    const kill_scale = d3.scaleLinear().domain([0, 1.2]);
    const damage_scale = d3.scaleLinear().domain([0, 205]);
    const win_scale = d3.scaleLinear().domain([0, 92]);
    const hs_scale = d3.scaleLinear().domain([0, 60]);
    const kd_scale = d3.scaleLinear().domain([0, 1.9]);
    const fb_scale = d3.scaleLinear().domain([0, 998]);

    const dataPoints = [
      {
        name: "kills",
        value: kill_scale(p?.kills_round ?? 0) * 100,
      },
      {
        name: "damage",
        value: damage_scale(p?.damage_round ?? 0) * 100,
      },
      {
        name: "winrate",
        value: win_scale(p?.win_percent ?? 0) * 100,
      },
      { name: "k/d", value: kd_scale(p?.kd_ratio ?? 0) * 100 },
      {
        name: "headshot %",
        value: hs_scale(p?.headshot_percent ?? 0) * 100,
      },
      {
        name: "first bloods",
        value: fb_scale(p?.first_bloods ?? 0) * 100,
      },
    ];

    //console.log(vis.playerData, "YEYEYUE", p);

    dataPoints.forEach((d, i) => {
      //const len = vis.scale(d.value);
      const theta = i * ((2 * Math.PI) / vis.sidecount);
      inner_radar_data_points.push({
        ...generatePoint({
          length: d.value,
          angle: theta,
          size: d.value > 0 ? vis.RADARSIZE : 0,
        }),
        value: d.value,
      });
    });
    inner_radar_data_points.push(inner_radar_data_points[0]);

    //give points data values for tooltip
    for (let i = 0; i < dataPoints.length; i++) {
      const dataPoint = dataPoints[i];
      const index = points.findIndex((point) => point.name === dataPoint.name);

      if (index !== -1) {
        // If the name already exists in points, update the value
        points[index].value = dataPoint.value;
      }
    }

    vis.renderVis(points, inner_radar_data_points, p);
  }

  /**
   * Bind data to visual elements.
   */
  renderVis(points, data_points, p) {
    let vis = this;

    //outside border
    const radar = vis.chart
      .selectAll(".line")
      .data([points])
      .join("path")
      .attr("class", "line")
      .attr(
        "d",
        d3
          .line()
          .x((d) => d.x)
          .y((d) => d.y)
      )
      .attr("fill", "none") // Set fill to none for a hollow hexagon
      .attr("stroke", "lightblue") // Set border color
      .attr("stroke-width", 3); // Set border thickness

    //data fill
    const radar2 = vis.chart
      .selectAll(".lines")
      .data([data_points])
      .join("path")
      .transition() // Add transition here
      .duration(1000) // Set duration after attributes
      .attr("class", "line")
      .attr(
        "d",
        d3
          .line()
          .x((d) => d.x)
          .y((d) => d.y)
      )
      .attr("fill", "lightgreen") // Set fill to none for a hollow hexagon
      .attr("stroke", "darkgreen") // Set border color
      .attr("opacity", 0.8)
      .attr("stroke-width", 2);

    //Text labels
    const textElements = vis.chart
      .selectAll(".text")
      .data(points)
      .join("text")
      .attr("class", "text")
      .attr("x", (d) => {
        // Offset text based on its position relative to a hypothetical hexagon
        //console.log(d.x, "vs X", Math.floor(vis.width / 2), d.name);
        if (d.x == Math.floor(vis.width / 2)) {
          return d.x;
        }
        return d.x - (d.x < vis.width / 2 ? 40 : -40);
      })
      .attr("y", (d) => {
        if (d.y == Math.floor(vis.height / 2)) {
          return d.y;
        }
        return d.y - (d.y < vis.height / 2 ? 10 : -20);
      })
      .text((d) => d.name) // Use text() to set the text content
      .style("text-anchor", "middle")
      .attr("fill", "darkgrey")
      .style("font-size", "12px")
      .style("font-family", "sans-serif");

    //Player Text Label
    const playerText = vis.chart
      .selectAll(".playertext")
      .data([{ name: "Gnaff", region: "NA", rank: "Radiant" }])
      .join("text")
      .attr("class", "text")
      .attr("x", vis.centre.x)
      .attr("y", vis.centre.y + 200)
      .html(
        (d) => `
      <tspan  style="font-weight: bold; font-size:25px">${p?.name ?? ""}</tspan>
      <tspan  style="font-size:20px">${p?.region ?? ""}</tspan>
      <tspan style="font-size:20px">${p?.rating ?? ""}</tspan>
    `
      )
      .style("text-anchor", "middle")
      .attr("fill", "darkgrey")
      .style("font-size", "30px")
      .style("font-family", "sans-serif");

    //tooltip
    textElements
      .on("mouseover", (event, d) => handleMouseOver(event, d)) // Use arrow function here
      .on("mouseout", handleMouseOut);

    //tooltip helpers taken from PlayerChart.js
    function handleMouseOver(event, d) {
      let currentVis = vis;
      currentVis.tooltip.transition().duration(200).style("opacity", 0.6);
      currentVis.tooltip
        .html(
          `
        <strong>${d.display_value}</strong><br>
        `
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 28 + "px");
    }

    function handleMouseOut() {
      vis.tooltip.transition().duration(500).style("opacity", 0);
    }
    // Style lines from center to the point
    vis.chart
      .selectAll(".lines")
      .data(points)
      .join("path")
      .attr("class", "line")
      .attr("d", (d) => {
        return `M ${vis.centre.x} ${vis.centre.y} L ${d.x} ${d.y}`;
      })
      .attr("fill", "none")
      .attr("stroke", "lightgray")
      .attr("opacity", 0.5)
      .attr("stroke-width", 2);
  }
}
