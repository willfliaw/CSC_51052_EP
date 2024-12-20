const margin = { top: 40, right: 150, bottom: 80, left: 100 },
                width = 800 - margin.left - margin.right,
                height = 500 - margin.top - margin.bottom;

            const svg = d3
                .select("#chart")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            const tooltip = d3
                .select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("visibility", "hidden");

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

            const events = [
                { year: 1916, description: "World War I - No Olympics", type: "cancel" },
                { year: 1940, description: "World War II - No Olympics", type: "cancel" },
                { year: 1944, description: "World War II - No Olympics", type: "cancel" },
                { year: 1980, description: "USSR-led boycott of the Olympics", type: "boycott" },
                { year: 1984, description: "US-led boycott of the Olympics", type: "boycott" },
            ];

            const x = d3.scaleLinear().domain([1896, 2021]).range([0, width]);
            const y = d3
                .scaleLinear()
                .domain([0, d3.max(data, (d) => d.countries)])
                .nice()
                .range([height, 0]);

            // Add gridlines
            const makeXGridlines = () => d3.axisBottom(x).ticks(10);
            const makeYGridlines = () => d3.axisLeft(y).ticks(10);

            svg.append("g")
                .attr("class", "grid")
                .attr("transform", `translate(0, ${height})`)
                .call(
                    makeXGridlines()
                        .tickSize(-height)
                        .tickFormat("")
                );

            svg.append("g")
                .attr("class", "grid")
                .call(
                    makeYGridlines()
                        .tickSize(-width)
                        .tickFormat("")
                );            

            // Add axes with titles
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.format("d")))
                .append("text")
                .attr("x", width / 2)
                .attr("y", 40)
                .attr("fill", "black")
                .style("font-size", "14px")
                .style("text-anchor", "middle")
                .text("Year");

            svg.append("g")
                .call(d3.axisLeft(y))
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -60)
                .attr("fill", "black")
                .style("font-size", "14px")
                .style("text-anchor", "middle")
                .text("Number of Participating Countries");

            // Draw the line segments, excluding canceled years
            const lineSegments = [];
            for (let i = 0; i < data.length - 1; i++) {
                if (!events.some((e) => e.type === "cancel" && e.year >= data[i].year && e.year <= data[i + 1].year)) {
                    lineSegments.push([data[i], data[i + 1]]);
                }
            }

            lineSegments.forEach((segment) => {
                svg.append("path")
                    .datum(segment)
                    .attr("class", "line")
                    .attr("d", d3
                        .line()
                        .x((d) => x(d.year))
                        .y((d) => y(d.countries))
                    );
            });

            // Add Olympic markers
            svg.selectAll(".olympic-marker")
                .data(data)
                .enter()
                .append("circle")
                .attr("class", "olympic-marker")
                .attr("cx", (d) => x(d.year))
                .attr("cy", (d) => y(d.countries))
                .attr("r", 5)
                .on("mouseover", (event, d) => {
                    tooltip
                        .html(`<strong>${d.year}</strong><br>Olympics held: ${d.countries} countries`)
                        .style("left", event.pageX + 10 + "px")
                        .style("top", event.pageY - 30 + "px")
                        .style("visibility", "visible");
                })
                .on("mouseout", () => tooltip.style("visibility", "hidden"));

            // Add event markers aligned with the blue line
            svg.selectAll(".event-marker")
                .data(events)
                .enter()
                .append("circle")
                .attr("class", "event-marker")
                .attr("cx", (d) => x(d.year))
                .attr("cy", (d) => {
                    const point = data.find((p) => p.year === d.year);
                    return point ? y(point.countries) : y(0);
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

            // Add merged shaded region for 1940-1944
            svg.append("rect")
                .attr("class", "shaded-region")
                .attr("x", x(1940) - 15)
                .attr("y", 0)
                .attr("width", x(1944) - x(1940) + 30)
                .attr("height", height);

            // Highlight separate shaded region for 1916
            svg.append("rect")
                .attr("class", "shaded-region")
                .attr("x", x(1915) - 8)
                .attr("y", 0)
                .attr("width", x(1917) - x(1916) + 20) // Single year width
                .attr("height", height);
            

            // Legend
            const legend = d3.select("#chart-container").append("div").attr("class", "legend");

            const legendItems = [
                { color: "green", text: "Olympic years" },
                { color: "orange", text: "Event markers" },
                { color: "lightgray", text: "Canceled Olympics" },
            ];

            legendItems.forEach((item) => {
                const legendItem = legend.append("div").attr("class", "legend-item");

                legendItem
                    .append("div")
                    .attr("class", "legend-color")
                    .style("background", item.color);

                legendItem.append("span").text(item.text);
            });