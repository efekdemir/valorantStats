class BarChart {
  constructor(_config, _data, _dispatcher) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 710,
      containerHeight: _config.containerHeight || 500,
      margin: _config.margin || {
        top: 60,
        legendTop: 34,
        titleTop: 0,
        right: 5,
        bottom: 50,
        left: 50,
      },
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15,
      keys: _config.keys,
      xaxis: _config.xaxis || '',
      yaxis: _config.yaxis || '',
      title: _config.title || '',
    };
    this.data = _data;
    this.dispatcher = _dispatcher; 
    this.selected = []
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

    // Initialize scales and axes
    // Important: we flip array elements in the y output range to position the rectangles correctly
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    vis.xScale = d3.scaleBand().range([0, vis.width]).paddingInner(0.2);

    vis.xAxis = d3.axisBottom(vis.xScale).tickSizeOuter(0);

    vis.yAxis = d3.axisLeft(vis.yScale).ticks(6).tickSizeOuter(0);

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    // chart title
    vis.svg.append('text')
      .attr('class', 'axis-title')
      .attr('x', 0)
      .attr('y', vis.config.titleTop)
      .attr('dy', '.71em')
      .text(`${vis.config.title}`);

    // SVG Group containing the actual chart; D3 margin convention
    vis.chart = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    vis.legend = vis.svg.append("g");

    vis.clickedOnList = vis.svg.append("g");

    // Append empty x-axis group and move it to the bottom of the chart
    vis.xAxisG = vis.chart
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${vis.height})`);

    // Append y-axis group
    vis.yAxisG = vis.chart.append("g").attr("class", "axis y-axis");

    // y-axis
    vis.chart.append('text')
      .attr('class', 'axis-title')
      .attr('x', -200)
      .attr('y', -50)
      .attr('transform', 'rotate(-90)')
      .attr('dy', '.71em')
      .text(`${vis.config.yaxis}`);

    // x-axis
    vis.chart.append('text')
      .attr('class', 'axis-title')
      .attr('y', vis.height + 20)
      .attr('x', vis.width - 300)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text(`${vis.config.xaxis}`);

    vis.stack = d3.stack().keys(vis.config.keys.slice(1));
    // vis.stack = d3.stack().keys(vis.config.keys);

    this.updateVis();
  }

  /**
   * Prepare data and scales before we render it
   */

  getGroupedData() {
    let vis = this;

    let groupedData1 = d3.rollup(
      vis.data,
      (v) => v.length,
      (d) => d[this.config.keys[1]]
    );
    let groupedData2 = d3.rollup(
      vis.data,
      (v) => v.length,
      (d) => d[this.config.keys[2]]
    );
    let groupedData3 = d3.rollup(
      vis.data,
      (v) => v.length,
      (d) => d[this.config.keys[3]]
    );
    let allGrouped = [];
    
    let getAllKeys = (...maps) => {
      const allKeys = [];
    
      for (const map of maps) {
        for (const key of map.keys()) {
          allKeys.push(key);
        }
      }
    
      return [...new Set(allKeys)]; // Convert to Set to remove duplicates, then spread back into an array
    }

    let allGuns = getAllKeys(groupedData1, groupedData2, groupedData3)

    allGuns.forEach(key => {
      let groupStats = {};
      groupStats[this.config.keys[0]] = key;
      groupStats[this.config.keys[1]] = 
        groupedData1.get(key) === undefined ? 0 : groupedData1.get(key);
      groupStats[this.config.keys[2]] =
        groupedData2.get(key) === undefined ? 0 : groupedData2.get(key);
      groupStats[this.config.keys[3]] =
        groupedData3.get(key) === undefined ? 0 : groupedData3.get(key);
      allGrouped.push(groupStats);
    })
    return allGrouped;
  }

  updateVis() {
    let vis = this;

    vis.groupedData = vis.getGroupedData();

    // Specify x- and y-accessor functions
    vis.xValue = (d) => d[vis.config.keys[0]];
    vis.yValue = (d) =>
        d[vis.config.keys[1]] +
        d[vis.config.keys[2]] +
        d[vis.config.keys[3]]

    // Set the scale input domains
    vis.xScale.domain(vis.groupedData.map(vis.xValue));
    vis.yScale.domain([0, d3.max(vis.groupedData, vis.yValue)]);

    vis.stackedData = vis.stack(vis.groupedData);
    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;
    // console.log(vis.selected)
    // console.log(vis.stackedData)
    vis.stackedData.forEach((arr, i) => {
      arr.forEach(obj => {
        obj['type'] = vis.config.keys[i+1]
      })
    })
    // Add rectangles
    let bars = vis.chart
      .selectAll(".category")
      .data(vis.stackedData)
      .join("g")
      .attr("type", d => d.key)
      .attr("class", (d) => `category cat-${d.key}`);
    let stacks = bars
      .selectAll("rect")
      .data(d => d)
      .join("rect")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .attr("class", "bar")
      .attr("x", (d) => {
        return vis.xScale(d.data[vis.config.keys[0]])
      })
      .attr("width", vis.xScale.bandwidth())
      .attr("height", (d) => {
        return vis.yScale(d[0]) - vis.yScale(d[1])
      })
      .attr("y", (d) => vis.yScale(d[1]))
      .attr("type", d => {
        return d.type
      })
      .attr("stroke", d => {
        let retVal = false
        vis.selected.forEach(filterPair => {
          retVal = retVal || (filterPair.value === d.data[vis.config.keys[0]] && filterPair.key === d.type);
        });
        return retVal ? 'black' : 'none';
      })
      .attr("stroke-width", d => {
        let retVal = false
        vis.selected.forEach(filterPair => {
          retVal = retVal || (filterPair.value === d.data[vis.config.keys[0]] && filterPair.key === d.type);
        });
        return retVal ? '2' : 'none';
      })
    
    bars
      .selectAll("rect")
      .on("click", (e, d) => {
        let topRect = d['1']
        let category = 'Not init'
        let runningTotal = 0
        let keys = vis.config.keys.slice(1)
        for (let i in keys) {
          runningTotal += d.data[keys[i]]
          if (runningTotal == topRect) {
            category = keys[i]
            break
          }
        }
        let filterPair = {key: category, value:d.data[vis.config.keys[0]], data: d.data}
        vis.dispatcher.call('barChartFilter', e, filterPair);
      })

    const nameMapping = {
      'gun1_name': '1st Gun Choice',
      'gun2_name': '2nd Gun Choice',
      'gun3_name': '3rd Gun Choice',
      'agent_1': '1st Agent Choice',
      'agent_2': '2nd Agent Choice',
      'agent_3': '3rd Agent Choice',
    }
    const legend = vis.legend
      .selectAll(".legend-group")
      .data(vis.config.keys.slice(1))
      .join("g")

    const legendText = legend
      .selectAll(".legend-text")
      .data(vis.config.keys.slice(1))
      .join("text")
      .text(d => nameMapping[d])
      .attr("class", (d) => `text-${d}`)
      .attr("height", 100)
      .attr("width", 100)
      .attr("transform", (d, i) => {
        return `translate(${(i * 160)} , ${vis.config.margin.legendTop})`;
      })
      .attr("style", "font-size: 14px;");

    // Add legend color indicators
    legend
      .append("rect")
      .attr("class", d => `text-${d}`)
      .attr("height", 15)
      .attr("width", 15)
      .attr("fill", (d) =>
        "red"
      )
      .attr("stroke", (d) =>
        "black"
      )
      .attr("stroke-width", 2)
      .text((d) => d)
      .attr("transform", (d, i) => {
        return `translate(${(i * 160)} , ${vis.config.margin.legendTop + 5})`;
      });

    // Update axes
    vis.xAxisG.call(vis.xAxis);

    vis.yAxisG.call(vis.yAxis);
  }
}
