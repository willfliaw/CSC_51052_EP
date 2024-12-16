const width = window.innerWidth,
    height = window.innerHeight * 0.9;
const margin = { top: 50, right: 250, bottom: 50, left: 80 };

const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .text("Cumulative Olympic Medals (1896-2022)");

const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

d3.csv("data/cumulative_olympic_medals.csv", d3.autoType).then((data) => {
    data.sort((a, b) => d3.ascending(a.year, b.year));

    // Get unique countries and years
    const countries = [...new Set(data.map((d) => d.country_name))];
    const years = [...new Set(data.map((d) => d.year))];

    // Prepare scales
    const xScale = d3
        .scaleLinear()
        .domain(d3.extent(years))
        .range([margin.left, width - margin.right]);
    const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.cumulative_total_medals)])
        .range([height - margin.bottom, margin.top]);
    const colorScale = d3.scaleOrdinal().domain(countries).range(d3.schemeSet3);

    // Draw axes
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

    // Line generator
    const line = d3
        .line()
        .x((d) => xScale(d.year))
        .y((d) => yScale(d.cumulative_total_medals))
        .curve(d3.curveCatmullRom);

    // Prepare country data
    const countryData = countries.map((country) => ({
        country,
        values: data.filter((d) => d.country_name === country),
    }));

    // Draw lines
    svg.selectAll(".line")
        .data(countryData)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("d", (d) => line(d.values))
        .attr("stroke", (d) => colorScale(d.country))
        .attr("fill", "none");

    // Add legend
    const legend = svg
        .selectAll(".legend")
        .data(countries)
        .enter()
        .append("text")
        .attr("x", width - margin.right + 10)
        .attr("y", (d, i) => margin.top + i * 15)
        .attr("class", "legend")
        .style("fill", (d) => colorScale(d))
        .text((d) => d)
        .on("click", (event, d) => {
            svg.selectAll(".line")
                .style("opacity", (l) => (l.country === d ? 1 : 0.1))
                .filter((l) => l.country === d)
                .raise();
        });

    // Add play/pause functionality
    const playPauseBtn = d3.select("#playPauseBtn");
    const yearLabel = d3.select("#yearLabel");

    let playing = false;
    let currentYear = years[0];
    let interval;

    function updateYear(year) {
        currentYear = year;
        yearLabel.text(`Year: ${currentYear}`);
        svg.selectAll(".line").attr("d", (d) =>
            line(d.values.filter((v) => v.year <= currentYear))
        );
    }

    playPauseBtn.on("click", () => {
        playing = !playing;
        playPauseBtn.text(playing ? "Pause" : "Play");

        if (playing) {
            interval = d3.interval(() => {
                if (currentYear < years[years.length - 1]) {
                    updateYear(currentYear + 1);
                } else {
                    interval.stop();
                    playing = false;
                    playPauseBtn.text("Play");
                }
            }, 500);
        } else if (interval) {
            interval.stop();
        }
    });

    // Initial drawing
    updateYear(currentYear);
});
