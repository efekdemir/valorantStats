class BodyChart {
  constructor(_config, _data) {
    // Configuration object with defaults\
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 300,
      containerHeight: _config.containerHeight || 500,
      margin: _config.margin || {
        top: 50,
        right: 5,
        bottom: 25,
        left: 50,
      },
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15,
    };
    this.data = _data;
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

    vis.legend = vis.svg
        .append("g")
        .attr("id", "legend")

    vis.colorGradient = vis.svg
      .append('defs')
      .append("linearGradient")
      .attr("id", "color-gradient");

    vis.updateVis();
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    let vis = this;

    // TODO during linkage
    vis.summed = {};
    vis.summed["head"] = 0;
    vis.summed["body"] = 0;
    vis.summed["legs"] = 0;
    vis.summed["count"] = 0;

    vis.data.forEach((d) => {
      vis.summed["head"] +=
        d.gun1_head / 100 + d.gun2_head / 100 + d.gun3_head / 100;
      vis.summed["body"] +=
        d.gun1_body / 100 + d.gun2_body / 100 + d.gun3_body / 100;
      vis.summed["legs"] +=
        d.gun1_legs / 100 + d.gun2_legs / 100 + d.gun3_legs / 100;
      vis.summed["count"] += 3;
    });

    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    vis.chart.selectAll(".bodychart").remove();
    vis.chart.selectAll(".jett").remove();

    vis.chart.append("image")
      .attr("class", "jett")
      .attr("x", -125)
      .attr("y", -75)
      .attr("width", 500)
      .attr("height", 500)
      .attr("opacity", 0.2)
      .attr("href", "assets/Jett_Artwork_Full.webp")

    // Append a 'circle' element to the SVG container
    let headshot_percent = vis.summed["head"] / vis.summed["count"];
    vis.chart
      .append("circle")
      .attr("class", "bodychart head")
      .attr("cx", 120)
      .attr("cy", 35)
      .attr("r", 30)
      .attr("fill-opacity", headshot_percent.toFixed(2))
      .style("fill", "red")
      .style("stroke", "black");

    vis.chart
      .append("text")
      .attr("class", "bodychart headtext")
      .attr("x", 170)
      .attr("y", 20)
      .text(`${String((headshot_percent * 100).toFixed(0))}%`);

    let bodyshot_percent = vis.summed["body"] / vis.summed["count"];
    vis.chart
      .append("rect")
      .attr("class", "bodychart body")
      .attr("x", 80)
      .attr("y", 70)
      .attr("width", 70)
      .attr("height", 100)
      .attr("fill-opacity", bodyshot_percent.toFixed(2))
      .style("fill", "red")
      .style("stroke", "black");

    vis.chart
      .append("text")
      .attr("class", "bodychart bodytext")
      .attr("x", 170)
      .attr("y", 80)
      .text(`${String((bodyshot_percent * 100).toFixed(0))}%`);

    let legshot_percent = vis.summed["legs"] / vis.summed["count"];
    vis.chart
      .append("rect")
      .attr("class", "bodychart leg")
      .attr("x", 85)
      .attr("y", 175)
      .attr("width", 50)
      .attr("height", 220)
      .attr("fill-opacity", legshot_percent.toFixed(2))
      .style("fill", "red")
      .style("stroke", "black");

    vis.chart
      .append("rect")
      .attr("class", "bodychart leg")
      .attr("x", 10)
      .attr("y", 225)
      .attr("width", 50)
      .attr("height", 220)
      .attr("transform", "rotate(-25)")
      .attr("fill-opacity", legshot_percent.toFixed(2))
      .style("fill", "red")
      .style("stroke", "black");

    vis.chart
      .append("text")
      .attr("class", "bodychart legtext")
      .attr("x", 170)
      .attr("y", 185)
      .text(`${String((legshot_percent * 100).toFixed(0))}%`);

    vis.chart
      .append("text")
      .attr("class", "bodychart legend 0")
      .attr("x", 10)
      .attr("y", 60)
      .text("0%");

    vis.chart
      .append("text")
      .attr("class", "bodychart legend 1")
      .attr("x", 10)
      .attr("y", 240)
      .text("100%");

    let colorGradient = [
      {
        color: "white",
        value: 0,
        offset: 0,
      },
      { color: "red", value: 50, offset: 50 },
    ];

    vis.colorGradient
      .selectAll("stop")
      .data(colorGradient)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    vis.legend
      .append("rect")
      .attr('x', 120)
      .attr('y', -80)
      .attr("transform", "rotate(90)")
      .attr("width", 150)
      .attr("height", 20)
      .attr("fill", "url(#color-gradient)");

    // Update axes
    // vis.xAxisG.call(vis.xAxis);

    // vis.yAxisG.call(vis.yAxis);
  }
}
