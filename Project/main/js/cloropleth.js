const ctx = {
    MAP_W: 960,
    MAP_H: 500,
};

let originalWorld = null;
let athletesByCountry = {};

function enrichWorldWithContinents(world, isoData) {
    const isoToContinent = {
        SDS: "Africa",
    };
    isoData.forEach((row) => {
        isoToContinent[row["alpha-3"]] = row["region"];
    });

    world.features.forEach((feature) => {
        const countryCode = feature.id;
        feature.properties.continent = isoToContinent[countryCode] || "Unknown";
    });
}

function loadData() {
    let promises = [
        d3.json(
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        ),
        d3.csv("data/clean/olympic_athletes.csv"),
        d3.csv(
            "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/refs/heads/master/all/all.csv"
        ),
    ];

    Promise.all(promises).then(([world, data, isoData]) => {
        originalWorld = world;
        enrichWorldWithContinents(world, isoData);
        console.log(world);
        data.forEach((d) => {
            const countryCode = d.country_3_letter_code;
            athletesByCountry[countryCode] =
                (athletesByCountry[countryCode] || 0) + 1;
        });

        cloropleth(originalWorld, athletesByCountry);
    });
}

function cloropleth(world, athletesByCountry) {
    let maxCount = d3.max(Object.values(athletesByCountry)) || 1;
    const colorScale = d3
        .scaleSequential(d3.interpolateReds)
        .domain([0, maxCount]);
    const tooltip = d3.select("#tooltip");

    ctx.proj = d3
        .geoIdentity()
        .reflectY(true)
        .fitSize([ctx.MAP_W, ctx.MAP_H], world);

    const geo_path = d3.geoPath().projection(ctx.proj);

    d3.select("svg").selectAll("*").remove();

    d3.select("svg")
        .append("g")
        .selectAll("path")
        .data(world.features)
        .join("path")
        .attr("d", geo_path)
        .attr("fill", (d) => {
            const count = athletesByCountry[d.id] || 0;
            return colorScale(count);
        })
        .attr("stroke", "#000")
        .on("mouseover", (event, d) => {
            const count = athletesByCountry[d.id] || 0;
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip
                .html(
                    `<strong>${d.properties.name}</strong><br>Athletes: ${count}`
                )
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    drawLegend(colorScale, maxCount);
}

function drawLegend(colorScale, maxCount) {
    const legendWidth = 300;
    const legendHeight = 20;
    const legendMargin = { top: -20, right: 10, bottom: 30, left: 10 };

    const legendSvg = d3
        .select("svg")
        .append("g")
        .attr("class", "legend")
        .attr(
            "transform",
            `translate(${ctx.MAP_W / 2 - legendWidth / 2}, ${
                ctx.MAP_H + legendMargin.top
            })`
        );

    const gradient = legendSvg
        .append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    gradient
        .selectAll("stop")
        .data(
            colorScale.ticks(10).map((t, i, arr) => ({
                offset: `${(i / (arr.length - 1)) * 100}%`,
                color: colorScale(t),
            }))
        )
        .enter()
        .append("stop")
        .attr("offset", (d) => d.offset)
        .attr("stop-color", (d) => d.color);

    legendSvg
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5);

    const legendScale = d3
        .scaleLinear()
        .domain([0, maxCount])
        .range([0, legendWidth]);

    const axisBottom = d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickSize(6)
        .tickFormat(d3.format(".0f"));

    legendSvg
        .append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(axisBottom)
        .select(".domain")
        .remove();

    legendSvg
        .append("text")
        .attr("x", -55)
        .attr("y", legendHeight / 1.5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Athletes");
}

function updateMap() {
    const selectedContinent = document.getElementById("continentSelect").value;

    let filteredWorld = originalWorld;
    if (selectedContinent !== "All") {
        filteredWorld = {
            ...originalWorld,
            features: originalWorld.features.filter(
                (d) => d.properties.continent === selectedContinent
            ),
        };
    }

    cloropleth(filteredWorld, athletesByCountry);
}

function createViz() {
    console.log("Using D3 v" + d3.version);
    document.getElementById("continentSelect").value = "All";
    d3.select("#mapContainer")
        .append("svg")
        .attr("width", ctx.MAP_W)
        .attr("height", ctx.MAP_H);
    loadData();
}
