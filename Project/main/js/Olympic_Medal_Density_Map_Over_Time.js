const width = window.innerWidth,
    height = window.innerHeight * 0.8;
const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 50]);

// Tooltip
const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Load data and GeoJSON
Promise.all([
    d3.json("data/world-countries.json"), // GeoJSON file for the world map
    d3.csv("data/medal_counts_by_country_year.csv", d3.autoType), // Medal data
]).then(([world, medalData]) => {
    const countries = world.features; // Access the features array directly

    // Group medal data by year and country code
    const medalByYear = d3.group(medalData, (d) => d.game_year);

    // Projection and path
    const projection = d3
        .geoNaturalEarth1()
        .scale(150)
        .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    // Create SVG
    const svg = d3
        .select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Draw map
    svg.append("g")
        .selectAll("path")
        .data(countries)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "country")
        .attr("fill", (d) => colorScale(0)) // Default color for countries with no data
        .attr("stroke", "#333")
        .on("mouseover", function (event, d) {
            const year = +d3.select("#yearSlider").property("value");
            const countryMedals = medalByYear
                .get(year)
                ?.find((m) => m.country_code === d.id);

            if (countryMedals) {
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip
                    .html(
                        `
                    <strong>${d.properties.name}</strong><br>
                    Gold: ${countryMedals.GOLD || 0}<br>
                    Silver: ${countryMedals.SILVER || 0}<br>
                    Bronze: ${countryMedals.BRONZE || 0}<br>
                    Total: ${countryMedals.total_medals || 0}
                `
                    )
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 28 + "px");
            }
        })
        .on("mouseout", () =>
            tooltip.transition().duration(500).style("opacity", 0)
        );

    // Update function for year change
    function updateMap(year) {
        d3.select("#yearLabel").text(year);

        svg.selectAll(".country").attr("fill", (d) => {
            const countryMedals = medalByYear
                .get(year)
                ?.find((m) => m.country_code === d.id);
            return countryMedals
                ? colorScale(countryMedals.total_medals)
                : "#e0e0e0";
        });
    }

    // Slider interaction
    d3.select("#yearSlider").on("input", function () {
        const year = +this.value;
        updateMap(year);
    });

    // Initial map setup
    updateMap(1980);

    // Create color bar legend
    const legendWidth = 300;
    const legendHeight = 10;

    const legendSvg = d3
        .select("#legend")
        .append("svg")
        .attr("width", legendWidth + 50)
        .attr("height", 50);

    // Define gradient for the color scale
    const defs = legendSvg.append("defs");
    const linearGradient = defs
        .append("linearGradient")
        .attr("id", "linear-gradient");

    linearGradient
        .selectAll("stop")
        .data(
            colorScale.ticks(10).map((d, i, nodes) => ({
                offset: `${(100 * i) / (nodes.length - 1)}%`,
                color: colorScale(d),
            }))
        )
        .enter()
        .append("stop")
        .attr("offset", (d) => d.offset)
        .attr("stop-color", (d) => d.color);

    // Draw the color bar
    legendSvg
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient)")
        .attr("transform", "translate(25,15)");

    // Add labels for the color bar
    const legendScale = d3
        .scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);

    const legendAxis = d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format("~s"));

    legendSvg
        .append("g")
        .attr("transform", `translate(25,${15 + legendHeight})`)
        .call(legendAxis);
});
