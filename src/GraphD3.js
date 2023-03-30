function runGraph() {
    // Set colors, find node radii, find link sizes, and add zooming
    shuffle(VertexGraph.Config.colorSets); 
    colorSetter(); 
    sizeTyper(); 
    linkSizeTyper(); 
    addZoom(); 
    
    // Create static elements in the svg
    if (VertexGraph.Global.svgID.substring(0, 1) != '#') VertexGraph.Global.svgID = `#${VertexGraph.Global.svgID}`; 
    const web = d3.select(VertexGraph.Global.svgID)
        .style('position', 'relative')
        .style('width', VertexGraph.Global.svgWidth)
        .style('height', VertexGraph.Config.svgHeight); 
    
    if (!VertexGraph.Config.fullScreenMode) {
        web.style('left', '50%')
        .style('transform', 'translateX(-50%)')
        .style('margin-top', '5%')
        .style('border', '2px solid black'); 
    } else {
        d3.select('#body').style('margin', 0)
            .style('overflow-y', 'hidden'); 
    }

    web.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', VertexGraph.Global.svgWidth)
        .attr('height', VertexGraph.Config.svgHeight)
        .attr('id', 'zoomsquare')
        .attr('fill', VertexGraph.Config.backgroundColor)
        .call(d3.drag()
        .on('start', event => panStart(event))
        .on('drag', event => panning(event))
        .on('end', event => panEnd(event)));  
    
    const webGroup = web.append('g').attr('id', 'matrixGroup'); 
    VertexGraph.Global.matrixGroup = document.getElementById("matrixGroup");

    // Manage force VertexGraph.Global.simulation
    VertexGraph.Global.simulation = d3.forceSimulation(VertexGraph.Global.nodes)
        .force('charge', d3.forceManyBody().strength(VertexGraph.Config.baseStrength).distanceMax(VertexGraph.Config.regularForceDistance))
        .force('center', d3.forceCenter(VertexGraph.Global.centerX, VertexGraph.Global.centerY))
        .on('tick', ticked);
    
    refresh(); 
    VertexGraph.Global.firstRefresh = false; 

    function ticked() {
        seperateElements(); 
        update(); 
    }

    // Make sure webs are properly seperated
    // Lots of manual tweaking to get "right"
    function seperateElements() {
        // Make first separation uniquely strong
        if (!VertexGraph.Global.seperationActive) return; 
        const seperationEnhancement = VertexGraph.Global.nodes.filter(el => el.data.Type == 'Root').length * 0.005; 

        if (VertexGraph.Global.firstSeperation) {
            const enhancedDelay = VertexGraph.Config.startSeperateDelay * (1 + (seperationEnhancement / 5)); 
            const enhancedStrength = VertexGraph.Config.baseStrength * (1 + seperationEnhancement); 

            // Strengthen and activate forces for start delay
            if (VertexGraph.Global.ticks < enhancedDelay) {
                VertexGraph.Global.simulation.alphaTarget(VertexGraph.Config.seperationAlphaTarget)
                    .force('charge', d3.forceManyBody().strength(enhancedStrength))
                    .restart(); 
            } 

            // Slightly slow down seperation intensity
            if (VertexGraph.Global.ticks > (enhancedDelay / 2)) {
                const targetRatio = enhancedDelay / VertexGraph.Global.ticks; 
                VertexGraph.Global.simulation.alphaTarget(VertexGraph.Config.seperationAlphaTarget * (targetRatio - 1))
            }

            // End start seperation
            if (VertexGraph.Global.ticks >= enhancedDelay) {
                VertexGraph.Global.simulation.alphaTarget(0)
                    .force('center', null)
                    .force('charge', d3.forceManyBody().strength(VertexGraph.Config.baseStrength)); 
                VertexGraph.Global.firstSeperation = false; 
                VertexGraph.Global.seperationActive = false; 
            }; 
            VertexGraph.Global.ticks++; 
        } else {
            const enhancedDelay = VertexGraph.Config.clickSeperateDelay * (1 + (seperationEnhancement / 10));
            const enhancedStrength = VertexGraph.Config.baseStrength * (1 + (seperationEnhancement / 3)); 

            // Strengthen and activate forces for expansion delay
            if (VertexGraph.Global.ticks < enhancedDelay) {
                VertexGraph.Global.simulation.alphaTarget(VertexGraph.Config.seperationAlphaTarget)
                    .force('charge', d3.forceManyBody().strength(enhancedStrength))
                    .restart(); 
            }

            // Slightly slow down seperation intensity
            if (VertexGraph.Global.ticks > (enhancedDelay / 2)) {
                const targetRatio = enhancedDelay / VertexGraph.Global.ticks; 
                VertexGraph.Global.simulation.alphaTarget(VertexGraph.Config.seperationAlphaTarget * (targetRatio - 1))
            }

            // End click seperation
            if (VertexGraph.Global.ticks >= enhancedDelay) {
                VertexGraph.Global.simulation.alphaTarget(0).force('charge', d3.forceManyBody().strength(VertexGraph.Config.baseStrength)); 
                VertexGraph.Global.seperationActive = false;
            }
            VertexGraph.Global.ticks++; 
        }
    }

    // Run at start and when node is clicked
    // Creates and refreshes all web elements
    function refresh() {
        let activeNodes = []; 
        let rootNodes = []; 
        let anchoredNodes = []; 
        for (let i = 0; i < VertexGraph.Global.nodes.length; i++) { 
            const currentNode = VertexGraph.Global.nodes[i]; 

            if (currentNode.Active) activeNodes.push(currentNode); 
            if (currentNode.data.Type == 'Root') rootNodes.push(currentNode); 
            if (currentNode.Anchored) anchoredNodes.push(currentNode); 
        }

        // On startup, only open roots if set so
        if (VertexGraph.Global.firstRefresh && VertexGraph.Config.startCollapsed) {
            for (let i = (activeNodes.length - 1); i >= 0; i--) {
                const currentNode = activeNodes[i]; 
                if (currentNode.data.Type != 'Root') {
                    currentNode.Active = false; 
                    activeNodes.splice(i, 1); 
                }
            }
        }

        let links = createLinks(activeNodes); 

        // Refresh force simulation
        VertexGraph.Global.simulation.nodes(activeNodes)
            .force('link', d3.forceLink().links(links).distance(d => VertexGraph.Global.linkSizeTypes[d.source.data.Type]).strength(1))
            .restart(); 

        // Create and refresh lines to fit links
        const lines = webGroup.selectAll('.link'); 
        lines.data(links)
            .enter()
            .append('line')
            .attr('class', 'link'); 
        lines.data(links)
            .exit()
            .remove();

        // Create root indicator circles
        const indicatorCircles = webGroup.selectAll('.indicatorCircle'); 
        indicatorCircles.data(rootNodes)
            .enter()
            .append('circle')
            .attr('class', 'indicatorCircle')
            .attr('r', d => radiusMultiply(d) * 0.8)
            .attr('stroke-width', '4px')
            .style('stroke', d => d.data.Color)
            .style('fill', VertexGraph.Config.backgroundColor); 

        // Create anchored indicator signs
        const anchorSigns = webGroup.selectAll('.anchorSign'); 
        anchorSigns.data(anchoredNodes)
            .enter()
            .append('line')
            .attr('class', 'anchorSign')
            .style('stroke', d => d.data.Color)
            .style('stroke-width', 5); 
        anchorSigns.data(anchoredNodes)
            .exit()
            .remove(); 

        // Create and refresh circles to fit VertexGraph.Global.nodes
        // Create all VertexGraph.Global.nodes here and hide VertexGraph.Global.nodes if collapsed
        const circles = webGroup.selectAll('.node'); 
        circles.data(VertexGraph.Global.nodes)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('id', (d) => {
                VertexGraph.Global.IDnum++; 
                d.IDnum = VertexGraph.Global.IDnum; 
                return `node${VertexGraph.Global.IDnum}`; 
            })
            .attr('r', d => radiusMultiply(d))
            .attr('stroke-width', '8px')
            .style('stroke', d => d.data.Color)
            .style('fill', d => d.data.Color)
            .style('fill-opacity', d => opacityFinder(d))
            .on('mousemove', d => {
                const node = d.target.__data__; 
                const nodeD3 = d3.select(`#node${node.IDnum}`); 
                node.Hovered = true; 

                // Show cursor for link opening
                if (d.ctrlKey || d.altKey) nodeD3.attr('cursor', 'pointer'); 
                else nodeD3.attr('cursor', 'auto'); 

                // Open name if hovered
                node.Hovered = true; 
                if (node.data.cutName != undefined) {
                    const textD3 = d3.select(`#text${node.IDnum}`); 
                    textD3.text(node.data.Name); 
                }

                // Change node color
                if (node.children.length == 0) return; 
                nodeD3.style('fill-opacity', (VertexGraph.Config.collapsedOpacity + VertexGraph.Config.expandedOpacity) / 2); 
            })
            .on('mouseout', d => {
                const node = d.target.__data__; 
                const nodeD3 = d3.select(`#node${node.IDnum}`); 
                node.Hovered = false; 

                // Shorten name if unhovered
                if (node.data.cutName != undefined) {
                    const textD3 = d3.select(`#text${node.IDnum}`); 
                    textD3.text(node.data.cutName); 
                }

                // Reset normal attributes for node
                nodeD3.style('fill-opacity', opacityFinder(node)).attr('cursor', 'auto'); 
            })
            .on('click', d => { 
                if (d.ctrlKey) {
                    window.open(d.target.__data__.data.Link); 
                    return; 
                }
                if (d.altKey) {
                    d.target.__data__.Anchored = !d.target.__data__.Anchored; 
                    refresh();
                    return; 
                }

                updateBranch(d); 
                refresh();
            }); 
        circles.style('fill-opacity', d => opacityFinder(d)); 

        // Create and refresh text to fit VertexGraph.Global.nodes
        const text = webGroup.selectAll('text'); 
        text.data(VertexGraph.Global.nodes)
            .enter()
            .append('text')
            .attr('id', d => `text${d.IDnum}`)
            .text(d => {
                if (d.data.Name.length > 10) {
                    d.data.cutName = d.data.Name.substr(0, 10) + '...'; 
                    return d.data.cutName; 
                } 
                return d.data.Name; 
            })
            .attr('dy', 3.33)
            .attr('pointer-events', 'none')
            .style('font-size', 16)
            .style('font-family', 'monospace')
            .style('font-weight', 'bold')
            .style("text-anchor", "middle")
            .style('fill', VertexGraph.Config.textColor); 
    }

    // Update state every tick
    function update() {
        webGroup.selectAll('.node')
            .attr('r', d => {
                // Set later used positions differently depending on achoring
                if (d.Anchored && d.Active) d.x = d.oldX; 
                else {
                    d.Anchored = false; 
                    d.oldX = d.x; 
                }
                if (d.Anchored && d.Active) d.y = d.oldY; 
                else {
                    d.Anchored = false; 
                    d.oldY = d.y; 
                }

                return radiusMultiply(d); 
            })

        webGroup.selectAll('.anchorSign')
            .attr('x1', d => d.x)
            .attr('y1', d => d.y + radiusMultiply(d))
            .attr('x2', d => d.x)
            .attr('y2', d => d.y - radiusMultiply(d)); 

        webGroup.selectAll('.indicatorCircle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y); 
        
        // Update VertexGraph.Global.nodes' position and visibility
        // If active: sync force data pos with real pos
        // If inactive: Hide node behind parent
        webGroup.selectAll('.node')
            .attr('r', d => {
                if (!d.Active) return 0; 
                return radiusMultiply(d); 
            })
            .attr('cx', d => {
                if (!d.Active) {
                    const parent = findParentNode(d); 
                    
                    d.x = parent.x; 
                    return parent.x; 
                }

                return d.x; 
            })
            .attr('cy', d => {
                if (!d.Active) {
                    const parent = findParentNode(d); 
                    
                    d.y = parent.y; 
                    return parent.y; 
                }

                return d.y; 
            }); 

        webGroup.selectAll('.link')
            .attr('x1', d => adjustLinkStart(d, 'source', 'x'))
            .attr('y1', d => adjustLinkStart(d, 'source', 'y'))
            .attr('x2', d => adjustLinkStart(d, 'target', 'x'))
            .attr('y2', d => adjustLinkStart(d, 'target', 'y'))
            .attr('stroke-width', '5px')
            .style('stroke', d => d.source.data.Color); 
        
        // Update text pos and hide if node is inactive
        webGroup.selectAll('text')
            .text(d => {
                if (!d.Active) return ''; 
                if (d.data.cutName == undefined || d.Hovered) return d.data.Name; 
                return d.data.cutName
            })
            .attr('x', d => d.x)
            .attr('y', d => d.y); 
            
        // Add the ability to move VertexGraph.Global.nodes slightly after start
        // Gives time for VertexGraph.Global.nodes to seperate
        if (VertexGraph.Global.ticks > VertexGraph.Config.clickSeperateDelay) {
            movingActivated = true; 
            webGroup.selectAll('circle')
            .call(d3.drag()
            .on('start', event => moveStart(event))
            .on('drag', event => moving(event))
            .on('end', event => moveEnd(event))); 
        }
    }
}