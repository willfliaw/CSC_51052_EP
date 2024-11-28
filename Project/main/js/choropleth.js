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
    bottomMargin: 100,
    legend: {
        width: 300,
        height: 20,
        bubbleSpacing: 10,
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

function toggleView() {
    ctx.isChoropleth = !ctx.isChoropleth;
    document.getElementById("toggleView").innerText = ctx.isChoropleth
        ? "Switch to Bubble Map"
        : "Switch to Choropleth";
    updateMap();
}

function changeSelectData() {
    loadMainData();
    updateMap();
}

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

function drawLegend(maxCount) {
    const svgEl = d3.select("svg");

    svgEl.select("#legend").remove();

    const legendGroup = svgEl
        .append("g")
        .attr("id", "legend")
        .attr(
            "transform",
            `translate(${CONFIG.mapWidth / 2 - CONFIG.legend.width / 2}, ${
                CONFIG.mapHeight - CONFIG.bottomMargin / 2
            })`
        );

    const gradient = legendGroup
        .append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%");

    ctx.colorScale.ticks(10).forEach((t, i, arr) => {
        gradient
            .append("stop")
            .attr("offset", `${(i / (arr.length - 1)) * 100}%`)
            .attr("stop-color", ctx.colorScale(t));
    });

    legendGroup
        .append("rect")
        .attr("width", CONFIG.legend.width)
        .attr("height", CONFIG.legend.height)
        .style("fill", "url(#legend-gradient)")
        .style("stroke", "#000")
        .style("stroke-width", 0.5);

    const legendScale = d3
        .scaleLinear()
        .domain([0, maxCount])
        .range([0, CONFIG.legend.width]);

    const axisBottom = d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickSize(6)
        .tickFormat(d3.format(".0f"));

    legendGroup
        .append("g")
        .attr("transform", `translate(0, ${CONFIG.legend.height})`)
        .call(axisBottom)
        .select(".domain")
        .remove();

    legendGroup
        .append("text")
        .attr("x", -10)
        .attr("y", CONFIG.legend.height / 1.5)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text(`Number of ${ctx.counted}`);
}

function drawBubbleLegend(maxCount) {
    const svgEl = d3.select("svg");

    svgEl.select("#bubble-legend").remove();

    const percentages = [0.1, 0.4, 0.7, 1.0];
    const legendValues = percentages.map((p) => Math.round(maxCount * p));
    const radiusValues = legendValues.map(ctx.sizeScale);

    const totalWidth =
        radiusValues.reduce((sum, r) => sum + 2 * r, 0) +
        CONFIG.legend.bubbleSpacing * (radiusValues.length - 1);

    const legendGroup = svgEl
        .append("g")
        .attr("id", "bubble-legend")
        .attr("class", "bubble-legend")
        .attr(
            "transform",
            `translate(${(CONFIG.mapWidth - totalWidth) / 2}, ${
                CONFIG.mapHeight - d3.max(radiusValues) - 30
            })`
        );

    let cumulativeX = 0;
    legendValues.forEach((value, index) => {
        const radius = radiusValues[index];

        legendGroup
            .append("circle")
            .attr("cx", cumulativeX + radius)
            .attr("cy", 0)
            .attr("r", radius)
            .attr("class", "bubble")
            .attr("fill", "steelblue")
            .attr("fill-opacity", 0.7);

        legendGroup
            .append("text")
            .attr("x", cumulativeX + radius)
            .attr("y", radius + 10)
            .attr("dy", "0.35em")
            .text(`${value}`)
            .style("font-size", "10px")
            .style("fill", "black")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle");

        cumulativeX += 2 * radius + CONFIG.legend.bubbleSpacing;
    });
}

function createProjection(geoData) {
    return d3
        .geoNaturalEarth1()
        .fitSize(
            [CONFIG.mapWidth, CONFIG.mapHeight - CONFIG.bottomMargin],
            geoData
        );
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
                }</strong><br>${ctx.counted}: ${count}`,
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
    const selectedSubRegion = document.getElementById("subRegionSelect").value;

    let filteredGeoData = ctx.originalGeoData;
    if (selectedContinent !== "All") {
        filteredGeoData = {
            ...ctx.originalGeoData,
            features: ctx.originalGeoData.features.filter(
                (d) => d.properties.continent === selectedContinent
            ),
        };
    }
    if (selectedSubRegion !== "All") {
        filteredGeoData = {
            ...ctx.originalGeoData,
            features: ctx.originalGeoData.features.filter(
                (d) => d.properties.sub_region === selectedSubRegion
            ),
        };
    }

    const circles = svgEl.selectAll("#bubbles circle");
    const path = svgEl.selectAll("path");
    const needsPathTransition = !path.empty() && !ctx.isChoropleth;

    if (!circles.empty()) {
        svgEl
            .select("#bubble-legend")
            .transition()
            .duration(ctx.animationDuration)
            .style("opacity", 0)
            .end();

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
    } else if (ctx.isChoropleth) {
        await svgEl
            .select("#bubble-legend")
            .transition()
            .duration(ctx.animationDuration)
            .style("opacity", 0)
            .end();
    }

    if (needsPathTransition) {
        await path
            .transition()
            .duration(ctx.animationDuration)
            .attr("fill", ctx.colorScale(0))
            .end();
    }

    drawMap(svgEl, filteredGeoData);
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
                `<strong>${d.full_name}</strong><br>${ctx.counted}: ${d.count}`,
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

    svgEl
        .select("#bubble-legend")
        .raise()
        .transition()
        .duration(ctx.animationDuration)
        .style("opacity", 1);
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

function enrichGeoDataWithRegion() {
    const isoToRegion = Object.fromEntries(
        ctx.regionData.map((row) => [
            row["alpha-3"],
            [row.region, row["sub-region"]],
        ])
    );
    isoToRegion.SDS = ["Africa", "Sub-Saharan Africa"];
    ctx.originalGeoData.features.forEach((feature) => {
        if (feature.id in isoToRegion) {
            feature.properties.continent =
                isoToRegion[feature.id][0] || "Unknown";
            feature.properties.sub_region =
                isoToRegion[feature.id][1] || "Unknown";
        }
    });
}

function populateContinentSelect() {
    const continentSelect = document.getElementById("continentSelect");
    continentSelect.innerHTML = '<option value="All">All Continents</option>';

    const continents = new Set();

    ctx.regionData.forEach((country) => {
        continents.add(country["region"]);
    });

    Array.from(continents)
        .sort()
        .forEach((continent) => {
            if (continent) {
                const option = document.createElement("option");
                option.value = continent;
                option.textContent = continent;
                continentSelect.appendChild(option);
            }
        });
}

function populateSubRegionSelect(selectedContinent) {
    const subRegionSelect = document.getElementById("subRegionSelect");
    subRegionSelect.innerHTML = '<option value="All">All Sub-regions</option>';

    const subRegions = new Set();

    ctx.regionData.forEach((country) => {
        if (
            selectedContinent === "All" ||
            country.region === selectedContinent
        ) {
            subRegions.add(country["sub-region"]);
        }
    });

    Array.from(subRegions)
        .sort()
        .forEach((subRegion) => {
            if (subRegion) {
                const option = document.createElement("option");
                option.value = subRegion;
                option.textContent = subRegion;
                subRegionSelect.appendChild(option);
            }
        });
}

function transformData(data) {
    const selectedData = document.getElementById("dataSelect").value;
    const countryData = {};

    const geoDataMap = new Map(
        ctx.originalGeoData.features.map((feature) => [feature.id, feature])
    );

    data.forEach((row) => {
        const countryKey = row.country_3_letter_code;
        if (!countryKey) return;

        const geoCountry = geoDataMap.get(countryKey);
        if (!geoCountry) {
            console.log(`Not in map: ${row.country_3_letter_code}`);
            return;
        }

        if (!countryData[countryKey]) {
            const centroid = d3.geoCentroid(geoCountry);

            countryData[countryKey] = {
                country_code: row.country_code,
                full_name: geoCountry.properties?.name || "Unknown",
                count: 0,
                lon: centroid?.[0] || null,
                lat: centroid?.[1] || null,
            };
        }

        if (
            ["athletesData", "hostsData", "medalsData"].includes(selectedData)
        ) {
            countryData[countryKey].count += 1;
        }
    });

    return countryData;
}

async function loadMainData() {
    const selectedData = document.getElementById("dataSelect").value;
    let data;
    const title = document.getElementById("mapTitle");

    if (selectedData === "athletesData") {
        data = await d3.csv("data/clean/olympic_athletes.csv");
        title.textContent = "Olympic Debuts Count";
        ctx.counted = "Athletes";
    } else if (selectedData === "hostsData") {
        data = await d3.csv("data/clean/olympic_hosts.csv");
        title.textContent = "Olympic Hosting Count";
        ctx.counted = "Times Hosted";
    } else if (selectedData === "medalsData") {
        data = await d3.csv("data/clean/olympic_medals.csv");
        title.textContent = "Olympic Medals Count";
        ctx.counted = "Medals";
    }
    ctx.countryData = transformData(data);

    const maxCount = d3.max(Object.values(ctx.countryData), (d) => d.count);

    ctx.colorScale = d3
        .scaleSequential(d3.interpolateReds)
        .domain([0, maxCount]);
    ctx.sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([0, 30]);

    drawLegend(maxCount);
    drawBubbleLegend(maxCount);

    d3.select("#bubble-legend").style("opacity", 0);
    d3.select("#legend").style("opacity", 0);
}

async function loadData() {
    const [geoData, regionData] = await Promise.all([
        d3.json(
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        ),
        d3.csv(
            "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/refs/heads/master/all/all.csv"
        ),
    ]);

    ctx.originalGeoData = geoData;
    ctx.regionData = regionData;
    await loadMainData();

    populateContinentSelect();
    populateSubRegionSelect("All");

    enrichGeoDataWithRegion();

    updateMap();
}

function createViz() {
    console.log("Using D3 v" + d3.version);
    document.getElementById("dataSelect").value = "athletesData";
    d3.select("#mapContainer")
        .append("svg")
        .attr("width", CONFIG.mapWidth)
        .attr("height", CONFIG.mapHeight);

    ctx.tooltip = d3.select("body").append("div").attr("class", "tooltip");
    ctx.tooltip.style(CONFIG.tooltipStyle);

    loadData();
}
