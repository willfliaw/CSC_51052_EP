const margin = { top: 100, right: 200, bottom: 80, left: 100 },
    width = 1000 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// Append SVG container
const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Tooltip
const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("visibility", "hidden");

// Sample data: Year and Number of Participating Countries
const data = [
    { year: 1896, countries: 14 },
    { year: 1900, countries: 24 },
    { year: 1904, countries: 12 },
    { year: 1908, countries: 22 },
    { year: 1912, countries: 28 },
    { year: 1920, countries: 29 },
    { year: 1924, countries: 44 },
    { year: 1928, countries: 46 },
    { year: 1932, countries: 37 },
    { year: 1936, countries: 49 },
    { year: 1948, countries: 59 },
    { year: 1952, countries: 69 },
    { year: 1956, countries: 67 },
    { year: 1960, countries: 84 },
    { year: 1964, countries: 93 },
    { year: 1968, countries: 112 },
    { year: 1972, countries: 121 },
    { year: 1976, countries: 92 },
    { year: 1980, countries: 80 },
    { year: 1984, countries: 140 },
    { year: 1988, countries: 159 },
    { year: 1992, countries: 169 },
    { year: 1996, countries: 197 },
    { year: 2000, countries: 199 },
    { year: 2004, countries: 201 },
    { year: 2008, countries: 204 },
    { year: 2012, countries: 204 },
    { year: 2016, countries: 206 },
    { year: 2021, countries: 206 },
];

// Event data with descriptions
const events = [
    { year: 1916, description: "World War I - No Olympics" },
    { year: 1940, description: "World War II - No Olympics" },
    { year: 1980, description: "USSR-led boycott of the Olympics" },
    { year: 1984, description: "US-led boycott of the Olympics" },
];

// Define scales
const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.year))
    .range([0, width]);

const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.countries)])
    .nice()
    .range([height, 0]);

// Add title
svg.append("text")
    .attr("class", "title")
    .attr("x", width / 2)
    .attr("y", -40)
    .text("Olympic Participation Trends Over Time");

// Add gridlines
svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));

// Add axes
svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", 50)
    .attr("fill", "#000")
    .text("Olympic Year");

svg.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(-70, ${height / 2}) rotate(-90)`)
    .text("Number of Participating Countries");

// Line path
const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.countries))
    .curve(d3.curveMonotoneX);

svg.append("path").datum(data).attr("class", "line").attr("d", line);

// Event markers
svg.selectAll(".event-marker")
    .data(events)
    .enter()
    .append("circle")
    .attr("class", "event-marker")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => {
        const participation =
            data.find((point) => point.year === d.year)?.countries || 0;
        return y(participation);
    })
    .attr("r", 8)
    .on("mouseover", (event, d) => {
        tooltip
            .html(`<strong>${d.year}</strong><br>${d.description}`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 30 + "px")
            .style("visibility", "visible");
    })
    .on("mouseout", () => tooltip.style("visibility", "hidden"));

// Add legend for events
const legend = svg
    .append("g")
    .attr("transform", `translate(${width + 20}, 50)`);

legend
    .append("rect")
    .attr("class", "legend-rect")
    .attr("width", 12)
    .attr("height", 12);

legend
    .append("text")
    .attr("class", "legend")
    .attr("x", 18)
    .attr("y", 10)
    .text("Significant Events");
