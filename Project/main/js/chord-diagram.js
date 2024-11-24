const ctx = {
    CHART_WIDTH: 1000,
    CHART_HEIGHT: 1000,
    INNER_RADIUS: 200,
    OUTER_RADIUS: 250,
    CONTINENTS: [],
    COUNTRIES: [],
    CONTINENT_TO_COUNTRIES: {},
    COLOR_SCHEME: d3.schemeCategory10,
};

const continentColorFamilies = {
    Europe: d3.interpolateBlues,
    "Eastern Europe/Central Asia": d3.interpolateReds,
    "Eastern Asia": d3.interpolateYlOrBr,
    "Western Asia": d3.interpolatePuRd,
    "Southern Asia": d3.interpolateBuPu,
    Africa: d3.interpolateGreens,
    "Northern America": d3.interpolatePurples,
    "Latin America": d3.interpolateOranges,
    Oceania: d3.interpolateGreys,
    "Refugee Olympic Team": d3.interpolatePuBuGn,
};

function generateCountryColors() {
    const countryColors = {};

    Object.entries(ctx.CONTINENT_TO_COUNTRIES).forEach(
        ([continent, countries]) => {
            const colorScale = continentColorFamilies[continent];

            const step = (0.7 - 0.1) / (countries.length || 1);
            countries.forEach((country, index) => {
                countryColors[country] = colorScale(0.5 + index * step);
            });
        }
    );
    console.log("countryColors", countryColors);
    return countryColors;
}

function loadData() {
    d3.csv("data/chord-diagram.csv")
        .then(function (data) {
            ctx.refugeeTeam = "Refugee Olympic Team";

            ctx.CONTINENTS = [
                ...new Set(data.map((d) => d.birth_continent_name)),
            ];
            ctx.CONTINENTS.push(ctx.refugeeTeam);
            console.log("ctx.CONTINENTS", ctx.CONTINENTS);

            ctx.COUNTRIES = [...new Set(data.map((d) => d.birth_country))];
            if (!ctx.COUNTRIES.includes(ctx.refugeeTeam)) {
                ctx.COUNTRIES.push(ctx.refugeeTeam);
            }

            const countryCounts = {};
            data.forEach((d) => {
                const birthCountry = d.birth_country;
                const countryName = d.country_name;

                if (!countryCounts[birthCountry])
                    countryCounts[birthCountry] = { in: 0, out: 0 };
                if (!countryCounts[countryName])
                    countryCounts[countryName] = { in: 0, out: 0 };
                countryCounts[birthCountry].out++;
                countryCounts[countryName].in++;
            });

            const validCountries = Object.keys(countryCounts).filter(
                (country) =>
                    countryCounts[country].in > 50 ||
                    countryCounts[country].out > 10
            );

            console.log("validCountries ", validCountries);
            if (!validCountries.includes(ctx.refugeeTeam)) {
                validCountries.push(ctx.refugeeTeam);
            }

            const filteredData = data.filter(
                (d) =>
                    validCountries.includes(d.birth_country) &&
                    validCountries.includes(d.country_name)
            );
            console.log("data ", data);
            console.log("filteredData ", filteredData);

            ctx.CONTINENT_TO_COUNTRIES = ctx.CONTINENTS.reduce(
                (acc, continent) => {
                    if (continent === ctx.refugeeTeam) {
                        acc[continent] = [ctx.refugeeTeam];
                    } else {
                        acc[continent] = filteredData
                            .filter((d) => d.birth_continent_name === continent)
                            .map((d) => d.birth_country);
                    }
                    acc[continent] = [...new Set(acc[continent])];
                    return acc;
                },
                {}
            );

            ctx.COUNTRIES = Object.values(ctx.CONTINENT_TO_COUNTRIES).flat();

            ctx.COUNTRY_COLORS = generateCountryColors();

            const matrix = Array.from({ length: ctx.COUNTRIES.length }, () =>
                Array(ctx.COUNTRIES.length).fill(0)
            );
            filteredData.forEach((d) => {
                const fromIndex = ctx.COUNTRIES.indexOf(d.birth_country);
                const toIndex = ctx.COUNTRIES.indexOf(d.country_name);
                if (fromIndex >= 0 && toIndex >= 0) {
                    matrix[fromIndex][toIndex]++;
                }
            });

            ctx.COUNTRIES.forEach((country, index) => {
                if (country === ctx.refugeeTeam) {
                    matrix[index][index] = 0;
                }
            });

            createDirectedChordDiagram(matrix, countryCounts);
        })
        .catch(function (error) {
            console.error(error);
        });
}

function createDirectedChordDiagram(matrix, countryCounts) {
    const svg = d3
        .select("#main")
        .append("svg")
        .attr("width", ctx.CHART_WIDTH)
        .attr("height", ctx.CHART_HEIGHT)
        .append("g")
        .attr(
            "transform",
            `translate(${ctx.CHART_WIDTH / 2}, ${ctx.CHART_HEIGHT / 2})`
        );

    svg.append("text")
        .attr("x", 0)
        .attr("y", -ctx.CHART_HEIGHT / 2 + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("font-weight", "bold")
        .style("fill", "White")
        .text("Athletes' Migration Flow Sine 2010");

    const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("color", "black");

    const chord = d3
        .chordDirected()
        .padAngle(0.05)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending)(matrix);

    const arc = d3
        .arc()
        .innerRadius(ctx.INNER_RADIUS)
        .outerRadius(ctx.OUTER_RADIUS);

    const ribbon = d3.ribbonArrow().radius(ctx.INNER_RADIUS);

    //const color = d3.scaleOrdinal(ctx.COLOR_SCHEME).domain(ctx.CONTINENTS);

    const legend = d3
        .select("svg")
        .append("g")
        .attr("transform", `translate(820, ${ctx.CHART_HEIGHT - 450})`);

    const legendItems = Object.keys(ctx.CONTINENT_TO_COUNTRIES);

    legend
        .selectAll("g")
        .data(legendItems)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`)
        .each(function (d) {
            if (d === ctx.refugeeTeam) return;
            const colorScale = continentColorFamilies[d];
            d3.select(this)
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", colorScale(0.5));

            d3.select(this)
                .append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("fill", "white")
                .style("font-size", "12px")
                .text(d);
        });

    const group = svg
        .append("g")
        .selectAll("g")
        .data(chord.groups)
        .enter()
        .append("g");

    group
        .append("path")
        // .style("fill", d => {
        //   const continent = Object.keys(ctx.CONTINENT_TO_COUNTRIES).find(continent =>
        //     ctx.CONTINENT_TO_COUNTRIES[continent].includes(ctx.COUNTRIES[d.index])
        //  );
        //  return color(continent);
        //})
        .style("fill", (d) => ctx.COUNTRY_COLORS[ctx.COUNTRIES[d.index]])
        .style("stroke", (d) =>
            d3.rgb(ctx.COUNTRY_COLORS[ctx.COUNTRIES[d.index]]).darker()
        )

        //.style("stroke", d => d3.rgb(color(ctx.COUNTRIES[d.index])).darker())
        .attr("d", arc)
        .on("mouseover", (event, d) => {
            svg.selectAll(".ribbon").style("opacity", 0.08);
            svg.selectAll(
                `.ribbon.source-${d.index}, .ribbon.target-${d.index}`
            ).style("opacity", 1);

            const country = ctx.COUNTRIES[d.index];
            tooltip
                .html(
                    `
                <strong>${country}</strong><br>
                Total in: ${countryCounts[country].in}<br>
                Total out: ${countryCounts[country].out}
            `
                )
                .style("visibility", "visible")
                .style("top", `${event.pageY + 10}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => {
            svg.selectAll(".ribbon").style("opacity", 0.7);
            tooltip.style("visibility", "hidden");
        });

    group
        .append("text")
        .each((d) => {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .attr("dy", ".65em")
        .attr(
            "transform",
            (d) => `
            rotate(${(d.angle * 180) / Math.PI - 90})
            translate(${ctx.OUTER_RADIUS + 20})
            ${d.angle > Math.PI ? "rotate(180)" : ""}`
        )
        .style("text-anchor", (d) => (d.angle > Math.PI ? "end" : null))
        .text((d) => ctx.COUNTRIES[d.index])
        .style("fill", "white");

    svg.append("g")
        .selectAll("path")
        .data(chord)
        .enter()
        .append("path")
        .attr(
            "class",
            (d) => `ribbon source-${d.source.index} target-${d.target.index}`
        )
        .attr("d", ribbon)
        // .style("fill", d => {
        //    const continent = Object.keys(ctx.CONTINENT_TO_COUNTRIES).find(continent =>
        //         ctx.CONTINENT_TO_COUNTRIES[continent].includes(ctx.COUNTRIES[d.target.index])
        //      );
        //     return color(continent);
        // })
        // .style("stroke", d => d3.rgb(color(ctx.COUNTRIES[d.target.index])).darker())
        .style("fill", (d) => ctx.COUNTRY_COLORS[ctx.COUNTRIES[d.target.index]])
        .style("stroke", (d) =>
            d3.rgb(ctx.COUNTRY_COLORS[ctx.COUNTRIES[d.target.index]]).darker()
        )
        .style("opacity", 0.7);

    console.log("ctx.CONTINENT_TO_COUNTRIES", ctx.CONTINENT_TO_COUNTRIES);
    const continentGroups = Object.entries(ctx.CONTINENT_TO_COUNTRIES);
    continentGroups.forEach(([continent, countries]) => {
        if (countries.length === 0) return;

        const startIndex = ctx.COUNTRIES.indexOf(countries[0]);
        const endIndex = ctx.COUNTRIES.indexOf(countries[countries.length - 1]);

        if (startIndex === -1 || endIndex === -1) return;
        if (continent === ctx.refugeeTeam) return;

        const startAngle = chord.groups[startIndex]?.startAngle;
        const endAngle = chord.groups[endIndex]?.endAngle;

        if (startAngle === undefined || endAngle === undefined) return;

        const middleAngle = (startAngle + endAngle) / 2;

        console.log(
            `Continent: ${continent}, StartAngle: ${startAngle}, EndAngle: ${endAngle}`
        );
        const colorScale = continentColorFamilies[continent];
        const continentColor = colorScale ? colorScale(0.5) : "#ccc";

        const curveRadius = ctx.OUTER_RADIUS + 10;
        const arcPath = d3
            .arc()
            .innerRadius(curveRadius)
            .outerRadius(curveRadius + 5)
            .startAngle(startAngle)
            .endAngle(endAngle);

        svg.append("path")
            .attr("d", arcPath)
            .attr("fill", continentColor)
            .attr("stroke", continentColor)
            .attr("stroke-width", 20);

        // const textRadius = curveRadius + 110;
        // const textAngle = middleAngle - Math.PI / 2;

        // svg.append("text")
        //     .attr("dy", ".35em")
        //     .attr("transform", `
        //         rotate(${(textAngle * 180 / Math.PI)})
        //         translate(${textRadius}, 0)
        //         rotate(${textAngle > Math.PI / 2 && textAngle < (3 * Math.PI) / 2 ? 90 : 90})
        //     `)
        //     .style("text-anchor", "middle")
        //     .style("fill", continentColor)
        //     //.style("font-weight", "bold")
        //     .text(continent);
    });
}

function createViz() {
    console.log("Using D3 v" + d3.version);
    loadData();
}
