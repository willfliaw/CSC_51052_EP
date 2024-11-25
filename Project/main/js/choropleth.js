const ctx = {
    MAP_W: 960,
    MAP_H: 500,
    countryCodeTranslation: {},
};

let originalGeoData = null;
let isChoropleth = true;
let athletesByCountry = {};

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

    let filteredGeoData = originalGeoData;
    if (selectedContinent !== "All") {
        filteredGeoData = {
            ...originalGeoData,
            features: originalGeoData.features.filter(
                (d) => d.properties.continent === selectedContinent
            ),
        };
    }

    drawChoropleth(filteredGeoData);
    if (!isChoropleth) {
        drawBubbleMap(filteredGeoData);
    }
}

function toggleView() {
    isChoropleth = !isChoropleth;
    document.getElementById("toggleView").innerText = isChoropleth
        ? "Switch to Bubble Map"
        : "Switch to Choropleth";
    updateMap();
}

function drawBubbleMap(geoData) {
    let projection = d3
        .geoIdentity()
        .reflectY(true)
        .fitSize([ctx.MAP_W, ctx.MAP_H], geoData);

    const maxCount = d3.max(Object.values(athletesByCountry)) || 1;
    ctx.sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([0, 30]);

    console.log(geoData);

    const athletesArray = Object.entries(athletesByCountry)
        .map(([country_3_letter_code, count]) => {
            const country = ctx.geoDataCenter.find(
                (c) =>
                    c.short_name ===
                    ctx.countryCodeTranslation[country_3_letter_code]
            );

            const isIdInAdditionalArray = geoData.features.some(
                (obj) => obj.id === country_3_letter_code
            );

            if (country && isIdInAdditionalArray) {
                return {
                    name: country.long_name,
                    count,
                    lat: +country.center_lat,
                    lon: +country.center_lng,
                };
            }
            return null;
        })
        .filter(Boolean);

    const bubbles = d3
        .select("svg")
        .selectAll("circle")
        .data(athletesArray)
        .enter()
        .append("circle")
        .attr("class", "bubble")
        .attr("cx", (d) => projection([d.lon, d.lat])[0])
        .attr("cy", (d) => projection([d.lon, d.lat])[1])
        .attr("fill", "steelblue")
        .attr("r", ctx.sizeScale(0));

    bubbles
        .transition()
        .duration(1000)
        .ease(d3.easeElasticOut)
        .attr("r", (d) => ctx.sizeScale(d.count));

    bubbles.on("mouseover", function (event, d) {
        const tooltip = d3.select("#tooltip");
        tooltip
            .style("opacity", 1)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .html(`<strong>${d.name}</strong><br>Value: ${d.count}`);
    });

    bubbles.on("mouseout", function () {
        d3.select("#tooltip").style("opacity", 0);
    });
}

function drawChoropleth(geoData) {
    d3.select("#mapContainer").html("");
    const svg = d3
        .select("#mapContainer")
        .append("svg")
        .attr("width", ctx.MAP_W)
        .attr("height", ctx.MAP_H);

    const maxCount = d3.max(Object.values(athletesByCountry)) || 1;
    const colorScale = d3
        .scaleSequential(d3.interpolateReds)
        .domain([0, maxCount]);
    const tooltip = d3.select("#tooltip");

    let projection = d3
        .geoIdentity()
        .reflectY(true)
        .fitSize([ctx.MAP_W, ctx.MAP_H], geoData);

    const geo_path = d3.geoPath().projection(projection);

    svg.selectAll("*").remove();

    svg.append("g")
        .selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
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

function enrichGeoDataWithContinents(geoData, isoData) {
    const isoToContinent = {
        SDS: "Africa",
    };
    isoData.forEach((row) => {
        isoToContinent[row["alpha-3"]] = row["region"];
    });

    geoData.features.forEach((feature) => {
        const countryCode = feature.id;
        feature.properties.continent = isoToContinent[countryCode] || "Unknown";
    });
}

function loadData() {
    let promises = [
        d3.json(
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        ),
        d3.json(
            "https://raw.githubusercontent.com/mihai-craita/countries_center_box/refs/heads/master/countries.json"
        ),
        d3.csv(
            "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/refs/heads/master/all/all.csv"
        ),
        d3.csv("data/clean/olympic_athletes.csv"),
    ];

    Promise.all(promises).then(([geoData, geoDataCenter, isoData, data]) => {
        originalGeoData = geoData;
        ctx.geoDataCenter = geoDataCenter;

        enrichGeoDataWithContinents(geoData, isoData);

        data.forEach((d) => {
            const country_3_letter_code = d.country_3_letter_code;
            const country_code = d.country_code;
            athletesByCountry[country_3_letter_code] =
                (athletesByCountry[country_3_letter_code] || 0) + 1;

            if (!(country_3_letter_code in ctx.countryCodeTranslation)) {
                ctx.countryCodeTranslation[country_3_letter_code] =
                    country_code;
            }
        });

        updateMap();
    });
}

function createViz() {
    console.log("Using D3 v" + d3.version);
    document.getElementById("continentSelect").value = "All";
    loadData();
}
