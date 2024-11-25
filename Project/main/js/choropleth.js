const ctx = {
    MAP_W: 960,
    MAP_H: 550,
    isChoropleth: true,
};

function drawLegend(svgEl, maxCount) {
    const legendWidth = 300;
    const legendHeight = 20;
    const legendMargin = { top: -50, right: 10, bottom: 30, left: 10 };

    const legendSvg = svgEl
        .append("g")
        .attr("id", "legend")
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
            ctx.colorScale.ticks(10).map((t, i, arr) => ({
                offset: `${(i / (arr.length - 1)) * 100}%`,
                color: ctx.colorScale(t),
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

function handleMouseOut() {
    ctx.tooltip.transition().duration(500).style("opacity", 0);
}

function updateMap() {
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

    const projection = d3
        .geoNaturalEarth1()
        .fitSize([ctx.MAP_W, ctx.MAP_H - 60], filteredGeoData);

    const geoPath = d3.geoPath().projection(projection);

    ctx.tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "8px")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const handleMouseOverMap = (event, d) => {
        const count = ctx.countryData[d.id]?.count || 0;
        ctx.tooltip.transition().duration(200).style("opacity", 0.9);
        ctx.tooltip
            .html(`<strong>${ctx.countryData[d.id]?.full_name || d.properties.name}</strong><br>Athletes: ${count}`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
    };

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
        .on("mouseover", handleMouseOverMap)
        .on("mouseout", handleMouseOut);

    if (ctx.isChoropleth) {
        drawChoropleth(svgEl);
    } else {
        drawBubbleMap(svgEl, projection, filteredGeoData);
    }
}

function toggleView() {
    ctx.isChoropleth = !ctx.isChoropleth;
    document.getElementById("toggleView").innerText = ctx.isChoropleth
        ? "Switch to Bubble Map"
        : "Switch to Choropleth";
    updateMap();
}

function drawBubbleMap(svgEl, projection, filteredGeoData) {
    const handleMouseOverBubble = (event, d) => {
        ctx.tooltip.transition().duration(200).style("opacity", 0.9);
        ctx.tooltip
            .html(`<strong>${d.full_name}</strong><br>Athletes: ${d.count}`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
    };

    const filteredCountryData = Object.fromEntries(
        Object.entries(ctx.countryData).filter(([key, value]) =>
            filteredGeoData.features.some((feature) => feature.id === key)
        )
    );

    const bubbles = svgEl
        .append("g")
        .attr("id", "bubbles")
        .selectAll("circle")
        .data(Object.values(filteredCountryData), (d) => d.country_code);

    bubbles
        .enter()
        .append("circle")
        .on("mouseover", handleMouseOverBubble)
        .on("mouseout", handleMouseOut)
        .attr("id", (d) => `bubble_${d.country_code}`)
        .attr("class", "bubble")
        .attr("cx", (d) => projection([d.lon, d.lat])[0])
        .attr("cy", (d) => projection([d.lon, d.lat])[1])
        .attr("fill", "steelblue")
        .attr("r", 0)
        .transition()
        .delay((_, i) => i * 50)
        .duration(1000)
        .ease(d3.easeElasticOut)
        .attr("r", (d) => ctx.sizeScale(d.count));

    svgEl.select("#legend").transition().duration(500).style("opacity", 0);
    svgEl
        .selectAll("path")
        .transition()
        .duration(500)
        .attr("fill", ctx.colorScale(0));
}

function drawChoropleth(svgEl) {
    const drawMap = () => {
        svgEl
            .selectAll("path")
            .transition()
            .duration(500)
            .attr("fill", (d) => {
                const count = ctx.countryData[d.id]?.count || 0;
                return ctx.colorScale(count);
            });

        svgEl
            .select("#legend")
            .raise()
            .transition()
            .duration(500)
            .style("opacity", 1);
    };

    const removeCirclesAndDrawMap = () => {
        const circles = svgEl.selectAll("circle");

        if (!circles.empty()) {
            circles
                .transition()
                .duration(500)
                .attr("r", ctx.sizeScale(0))
                .on("end", () => {
                    svgEl.select("#bubbles").remove();
                    drawMap();
                });
        } else {
            drawMap();
        }
    };

    removeCirclesAndDrawMap();
}

function enrichGeoDataWithContinents(geoData, regionData) {
    const isoToContinent = {
        SDS: "Africa",
    };
    regionData.forEach((row) => {
        isoToContinent[row["alpha-3"]] = row["region"];
    });

    geoData.features.forEach((feature) => {
        const countryCode = feature.id;
        feature.properties.continent = isoToContinent[countryCode] || "Unknown";
    });
}

function transformData(data) {
    const countryData = {};

    data.forEach((row) => {
        const countryKey = row.country_3_letter_code;

        if (!countryData[countryKey]) {
            const centroid = d3.geoCentroid(
                ctx.originalGeoData.features.find(
                    (country) => country.id === row.country_3_letter_code
                )
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

function loadData(svgEl) {
    let promises = [
        d3.json(
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        ),
        d3.csv(
            "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/refs/heads/master/all/all.csv"
        ),
        d3.csv("data/clean/olympic_athletes.csv"),
    ];

    Promise.all(promises).then(([geoData, regionData, data]) => {
        ctx.originalGeoData = geoData;

        enrichGeoDataWithContinents(geoData, regionData);

        ctx.countryData = transformData(data);

        const maxCount = d3.max(
            Object.values(ctx.countryData).map((item) => item.count)
        );

        ctx.colorScale = d3
            .scaleSequential(d3.interpolateReds)
            .domain([0, maxCount]);
        ctx.sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([0, 30]);

        drawLegend(svgEl, maxCount);
        updateMap();
    });
}

function createViz() {
    console.log("Using D3 v" + d3.version);
    document.getElementById("continentSelect").value = "All";
    const svgEl = d3
        .select("#mapContainer")
        .append("svg")
        .attr("width", ctx.MAP_W)
        .attr("height", ctx.MAP_H);
    loadData(svgEl);
}
