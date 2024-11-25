const ctx = {
    isChoropleth: true,
    tooltip: null,
    originalGeoData: null,
    countryData: null,
    colorScale: null,
    sizeScale: null,
    animationDuration: 500,
};

const CONFIG = {
    mapWidth: 960,
    mapHeight: 550,
    legend: {
        width: 300,
        height: 20,
        margin: { top: -50, right: 10, bottom: 30, left: 10 },
    },
    tooltipStyle: {
        position: "absolute",
        padding: "8px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        borderRadius: "4px",
        pointerEvents: "none",
        opacity: 0,
    },
};

function showTooltip(content, x, y) {
    ctx.tooltip.transition().duration(200).style("opacity", 0.9);
    ctx.tooltip
        .html(content)
        .style("left", `${x + 10}px`)
        .style("top", `${y - 28}px`);
}

function hideTooltip() {
    ctx.tooltip
        .transition()
        .duration(ctx.animationDuration)
        .style("opacity", 0);
}

function drawLegend(svgEl, colorScale, maxCount) {
    const { width, height, margin } = CONFIG.legend;

    const legendGroup = svgEl
        .append("g")
        .attr("id", "legend")
        .attr(
            "transform",
            `translate(${CONFIG.mapWidth / 2 - width / 2}, ${
                CONFIG.mapHeight + margin.top
            })`
        );

    const gradient = legendGroup
        .append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%");

    colorScale.ticks(10).forEach((t, i, arr) => {
        gradient
            .append("stop")
            .attr("offset", `${(i / (arr.length - 1)) * 100}%`)
            .attr("stop-color", colorScale(t));
    });

    legendGroup
        .append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "url(#legend-gradient)")
        .style("stroke", "#000")
        .style("stroke-width", 0.5);

    const legendScale = d3
        .scaleLinear()
        .domain([0, maxCount])
        .range([0, width]);

    const axisBottom = d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickSize(6)
        .tickFormat(d3.format(".0f"));

    legendGroup
        .append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(axisBottom)
        .select(".domain")
        .remove();

    legendGroup
        .append("text")
        .attr("x", -50)
        .attr("y", height / 1.5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Athletes");
}

function createProjection(geoData) {
    return d3
        .geoNaturalEarth1()
        .fitSize([CONFIG.mapWidth, CONFIG.mapHeight - 60], geoData);
}

function drawMap(svgEl, filteredGeoData) {
    const projection = createProjection(filteredGeoData);
    const geoPath = d3.geoPath().projection(projection);

    svgEl.select("#map").remove();

    svgEl
        .insert("g", ":first-child")
        .attr("id", "map")
        .selectAll("path")
        .data(filteredGeoData.features)
        .enter()
        .append("path")
        .attr("d", geoPath)
        .attr("fill", ctx.colorScale(0))
        .attr("stroke", "#000")
        .on("mouseover", (event, d) => {
            const count = ctx.countryData[d.id]?.count || 0;
            showTooltip(
                `<strong>${
                    ctx.countryData[d.id]?.full_name || d.properties.name
                }</strong><br>Athletes: ${count}`,
                event.pageX,
                event.pageY
            );
        })
        .on("mouseout", hideTooltip);

    if (ctx.isChoropleth) {
        drawChoropleth(svgEl);
    } else {
        drawBubbleMap(svgEl, projection, filteredGeoData);
    }
}

async function updateMap() {
    const svgEl = d3.select("svg");
    const selectedContinent = document.getElementById("continentSelect").value;

    let filteredGeoData = ctx.originalGeoData;
    if (selectedContinent !== "All") {
        filteredGeoData = {
            ...ctx.originalGeoData,
            features: ctx.originalGeoData.features.filter(
                (d) => d.properties.continent === selectedContinent
            ),
        };
    }

    const circles = svgEl.selectAll("circle");
    const path = svgEl.selectAll("path");
    const needsPathTransition = !path.empty() && !ctx.isChoropleth;

    if (!circles.empty()) {
        await circles
            .transition()
            .duration(ctx.animationDuration)
            .attr("r", ctx.sizeScale(0))
            .end();

        svgEl.select("#bubbles").remove();
    } else if (needsPathTransition) {
        svgEl
            .select("#legend")
            .transition()
            .duration(ctx.animationDuration)
            .style("opacity", 0)
            .end();
    }

    if (!path.empty() && !ctx.isChoropleth) {
        await path
            .transition()
            .duration(ctx.animationDuration)
            .attr("fill", ctx.colorScale(0))
            .end();
    }

    drawMap(svgEl, filteredGeoData);
}

function toggleView() {
    ctx.isChoropleth = !ctx.isChoropleth;
    document.getElementById("toggleView").innerText = ctx.isChoropleth
        ? "Switch to Bubble Map"
        : "Switch to Choropleth";
    updateMap();
}

function drawBubbleMap(svgEl, projection, filteredGeoData) {
    const featureIds = new Set(
        filteredGeoData.features.map((feature) => feature.id)
    );

    const filteredCountryData = Object.entries(ctx.countryData)
        .filter(([key]) => featureIds.has(key))
        .map(([, value]) => value);

    const bubbles = svgEl
        .append("g")
        .attr("id", "bubbles")
        .selectAll("circle")
        .data(filteredCountryData, (d) => d.country_code);

    bubbles
        .enter()
        .append("circle")
        .attr("cx", (d) => projection([d.lon, d.lat])[0])
        .attr("cy", (d) => projection([d.lon, d.lat])[1])
        .attr("r", 0)
        .attr("class", "bubble")
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
            showTooltip(
                `<strong>${d.full_name}</strong><br>Athletes: ${d.count}`,
                event.pageX,
                event.pageY
            );
        })
        .on("mouseout", hideTooltip)
        .merge(bubbles)
        .transition()
        .delay((_, i) => i * 50)
        .duration(1.5 * ctx.animationDuration)
        .ease(d3.easeElasticOut)
        .attr("r", (d) => ctx.sizeScale(d.count));

    bubbles.exit().remove();
}

function drawChoropleth(svgEl) {
    svgEl
        .selectAll("path")
        .transition()
        .duration(ctx.animationDuration)
        .attr("fill", (d) => {
            const count = ctx.countryData[d.id]?.count || 0;
            return ctx.colorScale(count);
        });

    svgEl
        .select("#legend")
        .raise()
        .transition()
        .duration(ctx.animationDuration)
        .style("opacity", 1);
}

function enrichGeoDataWithContinents(geoData, regionData) {
    const isoToContinent = Object.fromEntries(
        regionData.map((row) => [row["alpha-3"], row.region])
    );
    isoToContinent.SDS = "Africa";

    geoData.features.forEach((feature) => {
        feature.properties.continent = isoToContinent[feature.id] || "Unknown";
    });
}

function transformData(data) {
    const countryData = {};

    data.forEach((row) => {
        const countryKey = row.country_3_letter_code;

        if (!countryData[countryKey]) {
            const centroid = d3.geoCentroid(
                ctx.originalGeoData.features.find((d) => d.id === countryKey)
            );

            countryData[countryKey] = {
                country_code: row.country_code,
                full_name: row.first_game_country,
                count: 0,
                lon: centroid ? centroid[0] : null,
                lat: centroid ? centroid[1] : null,
            };
        }

        countryData[countryKey].count += 1;
    });

    return countryData;
}

async function loadData(svgEl) {
    const [geoData, regionData, data] = await Promise.all([
        d3.json(
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        ),
        d3.csv(
            "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/refs/heads/master/all/all.csv"
        ),
        d3.csv("data/clean/olympic_athletes.csv"),
    ]);

    ctx.originalGeoData = geoData;
    enrichGeoDataWithContinents(geoData, regionData);
    ctx.countryData = transformData(data);

    const maxCount = d3.max(Object.values(ctx.countryData), (d) => d.count);

    ctx.colorScale = d3
        .scaleSequential(d3.interpolateReds)
        .domain([0, maxCount]);
    ctx.sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([0, 30]);

    drawLegend(svgEl, ctx.colorScale, maxCount);
    updateMap();
}

function createViz() {
    console.log("Using D3 v" + d3.version);
    document.getElementById("continentSelect").value = "All";
    const svgEl = d3
        .select("#mapContainer")
        .append("svg")
        .attr("width", CONFIG.mapWidth)
        .attr("height", CONFIG.mapHeight);

    ctx.tooltip = d3.select("body").append("div").attr("class", "tooltip");
    ctx.tooltip.style(CONFIG.tooltipStyle);

    loadData(svgEl);
}
