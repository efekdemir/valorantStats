export class PlayerChart {
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1200,
      containerHeight: _config.containerHeight || 700,
      margin: _config.margin || { top: 35, right: 20, bottom: 75, left: 50 },
      tooltipPadding: _config.tooltipPadding || 15,
    };
    this.data = _data;
    this.dispatcher = _dispatcher;

    // Call initialization method
    this.initVis();
  }

  initVis() {
    let vis = this;

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

    vis.simulation = d3
      .forceSimulation(vis.data)
      .force("charge", d3.forceManyBody().strength(0.6))
      .force(
        "center",
        d3.forceCenter(vis.width / 2, vis.height / 2).strength(0.4)
      );

    vis.legend = vis.svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${vis.width / 2 - 200},${vis.height + 30})`);

    vis.legendData = [
      { rating: "Radiant", color: "yellow" },
      { rating: "Immortal 1", color: "blue" },
      { rating: "Immortal 2", color: "red" },
      { rating: "Immortal 3", color: "green" },
      { rating: "Other", color: "black" }
    ];

    vis.legendItems = vis.legend.selectAll(".legend-item")
        .data(vis.legendData)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 120}, 0)`);

    vis.legendItems.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color)
        .attr("stroke", "black");

    vis.legendItems.append("text")
        .text(d => d.rating)
        .attr("x", 30)
        .attr("y", 10)
        .attr("alignment-baseline", "middle");

    vis.updateVis();
  }

  updatePlayers(_data) {
    let vis = this;


    const arrow = vis.svg
        .append("g")
        .attr("class", "arrow")
        .attr("transform", `translate(${vis.width / 2},${vis.height})`);

    arrow.append("line")
        .attr("x1", -450)
        .attr("x2", 450)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "black")

    arrow.append("text")
        .text("Best")
        .attr("x", -450)
        .attr("y", -10)
        .attr("text-anchor", "middle");

    arrow.append("text")
        .text("Worst")
        .attr("x", 450)
        .attr("y", -10)
        .attr("text-anchor", "middle");

    vis.data = _data;

    let forceXSections = d3
      .scaleLinear()
      .domain([0, 9])
      .range([100, vis.width - 100]);

    vis.simulation = d3
      .forceSimulation(vis.data)
      .force("charge", d3.forceManyBody().strength(0.1))
      .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
      .force(
        "x",
        d3
          .forceX()
          .x((d) =>
            forceXSections(Math.floor(d.index / (vis.data.length / 10)))
          )
      )
      .force(
        "y",
        d3.forceY().y((d) => (d.index % (vis.data.length / 10)) * 5)
      )
      .force(
        "collision",
        d3.forceCollide().radius(function (d) {
          return 8;
        })
      );

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    vis.simulation.nodes(vis.data);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.svg.selectAll("circle").remove();

    vis.playerCircles = vis.svg
      .selectAll("circle")
      .data(vis.data)
      .enter()
      .append("circle")
      .attr("stroke", "black")
      .attr("fill", (d) => {
        if (d.rating === "Radiant") {
          return "yellow";
        } else if (d.rating === "Immortal 1") {
          return "blue";
        } else if (d.rating === "Immortal 2") {
          return "red";
        } else if (d.rating === "Immortal 3") {
          return "green";
        }
        return "black";
      })
      .attr("r", 3)
      .on("mouseover", (event, d) => handleMouseOver(event, d))
      .on("mouseout", handleMouseOut);

    vis.simulation.on("tick", () => {
      vis.playerCircles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    function handleMouseOver(event, d) {
      let currentVis = vis;
      currentVis.tooltip.transition().duration(200).style("opacity", 0.9);

      currentVis.tooltip
        .html(
          `
        <strong>${d.name}</strong><br>
        Rating: ${d.rating}<br>
        Wins: ${d.wins}<br>
        Region: ${d.region}<br>
        Average Damage / Round: ${d.damage_round}<br>
        Kills per Round: ${d.kills_round}<br>
        Headshot Percentage: ${d.headshot_percent}%<br>
        Win Rate: ${d.win_percent}%<br>
        Kill/Death Ratio: ${d.kd_ratio}<br>
        First Bloods: ${d.first_bloods}<br>    `
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 28 + "px");

      currentVis.playerCircles.on("click", function (event, d) {
        const isActive = d3.select(this).classed("active");
        d3.select(this).classed("active", !isActive);

        currentVis.dispatcher.call("toRadar", event, [d]);
      });
    }

    function handleMouseOut() {
      vis.tooltip.transition().duration(500).style("opacity", 0);
    }
  }
}
