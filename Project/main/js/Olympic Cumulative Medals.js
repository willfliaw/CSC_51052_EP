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

d3.csv("data/cumulative_olympic_medals.csv", d3.autoType).then((data) => {
    if (!data || !data.length || !data[0].cumulative_total_medals) {
        console.error(
            "Data appears invalid or missing 'cumulative_total_medals'."
        );
        return;
    }

    data.sort((a, b) => d3.ascending(a.year, b.year));

    const medalSums = d3.rollups(
        data,
        (v) => d3.sum(v, (d) => d.cumulative_total_medals),
        (d) => d.country_name
    );
    const topCountries = medalSums
        .sort((a, b) => d3.descending(a[1], b[1]))
        .slice(0, 20)
        .map((d) => d[0]);

    data = data.filter((d) => topCountries.includes(d.country_name));

    const countries = [...new Set(data.map((d) => d.country_name))];
    const years = [...new Set(data.map((d) => d.year))];

    const xScale = d3
        .scaleLinear()
        .domain(d3.extent(years))
        .range([margin.left, width - margin.right]);
    const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.cumulative_total_medals)])
        .range([height - margin.bottom, margin.top]);
    const colorScale = d3
        .scaleOrdinal()
        .domain(countries)
        .range(d3.schemeCategory10);

    const xGrid = svg
        .append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(
            d3
                .axisBottom(xScale)
                .tickSize(-height + margin.top + margin.bottom)
                .tickFormat("")
        );

    const yGrid = svg
        .append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(
            d3
                .axisLeft(yScale)
                .tickSize(-width + margin.left + margin.right)
                .tickFormat("")
        );

    const countryPanel = d3.select("#countryPanel");
    countryPanel.append("h3").text("Select Countries");
    countries.forEach((country) => {
        const option = countryPanel
            .append("div")
            .attr("class", "country-option");
        option
            .append("span")
            .attr("class", "country-color")
            .style("background-color", colorScale(country));
        option
            .append("input")
            .attr("type", "checkbox")
            .attr("value", country)
            .attr("id", `country-${country}`);
        option.append("label").attr("for", `country-${country}`).text(country);
    });

    let selectedCountries = [];
    let speed = 1000;

    const speedSlider = d3.select("#speedSlider");
    speedSlider.on("input", () => {
        speed = +speedSlider.property("value");
    });

    function updateSelectedCountries() {
        selectedCountries = countryPanel
            .selectAll("input:checked")
            .nodes()
            .map((input) => input.value);
    }

    countryPanel.selectAll("input").on("change", updateSelectedCountries);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

    const precomputeData = () => {
        const interpolatedData = [];
        selectedCountries.forEach((country) => {
            const countryData = data.filter((d) => d.country_name === country);
            const interpolated = [];
            for (let i = 1; i < countryData.length; i++) {
                const start = countryData[i - 1];
                const end = countryData[i];
                const stepCount = 50;
                for (let j = 0; j <= stepCount; j++) {
                    const t = j / stepCount;
                    interpolated.push({
                        year: start.year + t * (end.year - start.year),
                        cumulative_total_medals:
                            start.cumulative_total_medals +
                            t *
                                (end.cumulative_total_medals -
                                    start.cumulative_total_medals),
                        country: country,
                    });
                }
            }
            interpolatedData.push(interpolated);
        });
        return interpolatedData;
    };

    function startAnimation() {
        const interpolatedData = precomputeData();
    
        const totalFrames = 1500; // Maintain high frame count for smoothness
        const frameDuration = 3000 / speed; // Inverse the relationship for correct behavior
    
        const frames = [];
        for (let i = 0; i <= totalFrames; i++) {
            const t = i / totalFrames;
            const currentYear = d3.interpolate(d3.min(years), d3.max(years))(t);
    
            const currentData = interpolatedData.map((countryData) =>
                countryData.filter((d) => d.year <= currentYear)
            );
    
            const maxYear = d3.max(currentData, (data) => d3.max(data, (d) => d.year));
            const maxMedals = d3.max(
                currentData,
                (data) => d3.max(data, (d) => d.cumulative_total_medals)
            );
    
            frames.push({
                year: currentYear,
                data: currentData,
                xDomain: [d3.min(years), maxYear],
                yDomain: [0, maxMedals],
            });
        }
    
        const paths = svg
            .selectAll(".line")
            .data(interpolatedData)
            .join("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", (d) => colorScale(d[0].country))
            .attr("stroke-width", 2);
    
        function renderFrame(frame) {
            const { year, data, xDomain, yDomain } = frame;
    
            xScale.domain(xDomain);
            yScale.domain(yDomain);
    
            xGrid.call(
                d3
                    .axisBottom(xScale)
                    .tickSize(-height + margin.top + margin.bottom)
                    .tickFormat("")
            );
            yGrid.call(
                d3
                    .axisLeft(yScale)
                    .tickSize(-width + margin.left + margin.right)
                    .tickFormat("")
            );
    
            svg.select(".x-axis").call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
            svg.select(".y-axis").call(d3.axisLeft(yScale));
    
            paths.attr("d", (d, i) =>
                d3
                    .line()
                    .x((d) => xScale(d.year))
                    .y((d) => yScale(d.cumulative_total_medals))
                    .curve(d3.curveLinear)(data[i])
            );
    
            d3.select("#yearLabel").text(`Year: ${Math.round(year)}`);
        }
    
        let frameIndex = 0;
        function animate() {
            if (frameIndex < frames.length) {
                renderFrame(frames[frameIndex]);
                frameIndex++;
                setTimeout(animate, frameDuration);
            }
        }
    
        animate();
    }
    
    

    d3.select("#playPauseBtn").on("click", () => {
        if (selectedCountries.length === 0) {
            alert("Please select at least one country to start.");
            return;
        }
        startAnimation();
    });
});
