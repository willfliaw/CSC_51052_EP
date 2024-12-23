const width = window.innerWidth;
const height = window.innerHeight - 100; // Adjusted for title and controls height
const initialLinkDistance = 100;

// Tooltip for interactivity
const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("visibility", "hidden");

// Load data
Promise.all([
    d3.csv("data/medal_tally_nodes_with_medals.csv"),
    d3.csv("data/medal_tally_edges.csv"),
]).then(([nodes, links]) => {
    const nodesMap = new Map(nodes.map((d) => [d.id, d]));

    // Prepare links to reference actual node objects instead of just IDs
    links.forEach((link) => {
        link.source = nodesMap.get(link.source);
        link.target = nodesMap.get(link.target);
        link.weight = +link.weight;
    });

    // Set up a scale for node sizes based on total_medals
    const medalScale = d3
        .scaleSqrt()
        .domain([0, d3.max(nodes, (d) => +d.total_medals)])
        .range([5, 30]); // Adjusted for better visibility

    const simulation = d3
        .forceSimulation(nodes)
        .force(
            "link",
            d3
                .forceLink(links)
                .id((d) => d.id)
                .distance(initialLinkDistance)
        )
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const svg = d3
        .select("#network")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(
            d3.zoom().on("zoom", (event) => {
                svg.attr("transform", event.transform);
            })
        )
        .append("g");

    const link = svg
        .append("g")
        .attr("stroke", "#aaa")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke-width", (d) => Math.sqrt(d.weight))
        .attr("class", "link");

    const node = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", (d) => medalScale(+d.total_medals)) // Scale node sizes
        .attr("fill", "#69b3a2")
        .attr("class", "node")
        .on("mouseover", (event, d) => {
            tooltip
                .html(
                    `
                <strong>Country:</strong> ${d.id}<br>
                <strong>Total Medals:</strong> ${d.total_medals || 0}<br>
                <strong>Gold:</strong> ${d.gold || 0}, Silver: ${
                        d.silver || 0
                    }, Bronze: ${d.bronze || 0}`
                )
                .style("left", event.pageX + 5 + "px")
                .style("top", event.pageY - 28 + "px")
                .style("visibility", "visible");
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", event.pageX + 5 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"))
        .on("click", (event, d) => highlightRivals(d))
        .call(
            d3
                .drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
        );

    svg.selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text((d) => d.id);

    simulation.on("tick", () => {
        link.attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y);
        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        svg.selectAll("text")
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y);
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Adjust link distance with slider
    d3.select("#linkDistance").on("input", function () {
        const distance = +this.value;
        simulation.force("link").distance(distance);
        simulation.alpha(1).restart();
    });

    // Function to highlight top 3 rivals
    function highlightRivals(selectedNode) {
        console.log("Selected node:", selectedNode.id);

        // Reset previous highlights
        svg.selectAll(".node")
            .classed("selected", false)
            .classed("rival", false);
        svg.selectAll(".link").classed("highlight", false);

        // Highlight the selected node
        svg.selectAll(".node")
            .filter((d) => d.id === selectedNode.id)
            .classed("selected", true);

        // Find and sort links connected to the selected node by weight
        const rivalLinks = links
            .filter(
                (link) =>
                    link.source === selectedNode || link.target === selectedNode
            )
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 3); // Top 3 rivals

        console.log("Top 3 rivals links:", rivalLinks);

        // Highlight top rivals and their links
        rivalLinks.forEach((link) => {
            const rivalNode =
                link.source === selectedNode ? link.target : link.source;

            svg.selectAll(".node")
                .filter((d) => d.id === rivalNode.id)
                .classed("rival", true);

            svg.selectAll(".link")
                .filter((d) => d === link)
                .classed("highlight", true);
        });
    }
});
