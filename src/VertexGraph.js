// CSV DATA SORTER
// Sorts csv data after being converted into JSON through d3
function CSVdataSorter(data) {
    VertexGraph.Global.webDepth = data.columns.length; 
    for (let i = 1; i < VertexGraph.Global.webDepth; i++) {
        VertexGraph.Global.index[`Layer${i}`] = []; 
    }

    // Find link attached to column
    // Used to attach a link to VertexGraph.Global.nodes during VertexGraph.Global.index creation
    function linkColumnFinder(column) {
        const columnIndex = data.columns.indexOf(column); 
        let matchingLinkCol = VertexGraph.Config.linkColumns.find(elem => (elem.Target == column || elem.Target == (columnIndex + 1)));

        if (matchingLinkCol == undefined) return undefined; 
        if (typeof matchingLinkCol.ID == 'string') return matchingLinkCol.ID; 
        if (typeof matchingLinkCol.ID == 'number') return matchingLinkCol.IDName; 
    }
    
    // Find all elems
    for (let i = 0; i < data.length; i++) {
        // Find unique Roots
        let currentRoot; 
        const matchingRoot = VertexGraph.Global.index.Root.find(elem => data[i][data.columns[0]] == elem.Name); 
        if (matchingRoot == undefined) {
            let indexObj = {
                Name: `${data[i][data.columns[0]]}`,
                familyID: i, 
                Type: 'Root'
            }
            const rootLinkCol = linkColumnFinder(data.columns[0]); 
            if (rootLinkCol != undefined) indexObj.Link = data[i][rootLinkCol]; 

            VertexGraph.Global.index.Root.push(indexObj); 
        }
        currentRoot = VertexGraph.Global.index.Root.find(elem => data[i][data.columns[0]] == elem.Name);

        // Find unique middle layers
        // Checks name uniqueness as well as if the parents match
        for (let j = 1; j < VertexGraph.Global.webDepth; j++) {

            // Name Check
            let potentialMatches = VertexGraph.Global.index[`Layer${j}`].filter(elem => elem.Name == data[i][data.columns[j]]); 
            // Root Check
            potentialMatches = potentialMatches.filter(elem => elem.Root == currentRoot.Name); 
            // Middle parent check
            for (let e = 2; e <= j; e++) {
                potentialMatches = potentialMatches.filter(elem => elem[`Parent${e - 1}`] == data[i][data.columns[e - 1]]);
            }
            const match = potentialMatches[0];  

            if (j != (VertexGraph.Global.webDepth - 1) && match != undefined) continue; 

            let indexObj = {
                Name: `${data[i][data.columns[j]]}`, 
                Root: `${data[i][data.columns[0]]}`, 
                familyID: i, 
                Type: `Layer${j}`
            }; 
            for (let e = 1; e < j; e++) {
                indexObj[`Parent${e}`] = `${data[i][data.columns[e]]}`; 
            }
            const rootLinkCol = linkColumnFinder(data.columns[j]); 
            if (rootLinkCol != undefined) indexObj.Link = data[i][rootLinkCol]; 

            VertexGraph.Global.index[`Layer${j}`].push(indexObj); 
        }
    } 

    // Delete midlayers in 2 configurable ways
    if (VertexGraph.Config.branchMode == 0) {
        branchChopper(); 
    } else if (VertexGraph.Config.branchMode == 1) {
        selectiveNodeDeleter(); 
    }

    // Remove families of roots outside root limit
    if (VertexGraph.Config.rootLimit >= 0) {
        VertexGraph.Global.index.Root.splice(VertexGraph.Config.rootLimit)
    }

    // Create deep JSON representation of data
    for (let i = 0; i < VertexGraph.Global.index.Root.length; i++) {
        // Create root
        const dataObj = {
            data: VertexGraph.Global.index.Root[i], 
            children: []
        }
        VertexGraph.Global.dataTree[i] = dataObj; 
        const currentRoot = VertexGraph.Global.dataTree[i]; 

        const layer1Children = VertexGraph.Global.index.Layer1.filter(elem => elem.Root == currentRoot.data.Name);
        for (let j = 0; j < layer1Children.length; j++) {
            const dataObj = {
                data: layer1Children[j], 
                children: []
            }
            currentRoot.children.push(dataObj); 
            const currentLayer1 = currentRoot.children[j]; 
            createMidChildren(currentLayer1, currentRoot); 
        }
    }

    // Create VertexGraph.Global.nodes of JSON
    flatten(VertexGraph.Global.dataTree); 
}

// Prevent link columns from being VertexGraph.Global.nodes
function linkColumnUpdater(data) {
    for (let i = 0; i < VertexGraph.Config.linkColumns.length; i++) {
        const currentColumn = VertexGraph.Config.linkColumns[i]; 
        if (typeof currentColumn.ID == 'string') {
            const colLocation = data.columns.indexOf(currentColumn.ID); 
            data.columns.splice(colLocation, 1); 
        } else if (typeof currentColumn.ID == 'number') {
            const colIndex = currentColumn.ID - 1; 
            currentColumn.IDName = data.columns[colIndex]; 
            data.columns.splice(colIndex, 1); 
        }
    }
}

// Alter column order to fit manual setting
function orderColumns(data) {
    if (VertexGraph.Config.manualOrderSet == '') return; 

    let newColumns = []; 
    for (let i = 0; i < VertexGraph.Config.manualOrderSet.length; i++) {
        const selectedColumn = VertexGraph.Config.manualOrderSet[i]; 
        if (typeof selectedColumn == 'string') {
            const currentColumn = data.columns.find(elem => elem == selectedColumn); 
            newColumns.push(currentColumn); 
        } else if (typeof selectedColumn == 'number') {
            const currentColumn = data.columns[selectedColumn - 1]; 
            newColumns.push(currentColumn); 
        }
    }
    data.columns = newColumns; 
}

// Create children in VertexGraph.Global.index for JSON
function createMidChildren(item, root) {
    const itemLayerNum = parseInt(item.data.Type.substring(5)); 
    const childLayerNum = itemLayerNum + 1; 
    let childLayer = VertexGraph.Global.index[`Layer${childLayerNum}`]; 

    if (childLayer == undefined) return; 

    // Filter for: correct name to first parent => matching root => matching higher parents
    let potentialChildren = childLayer.filter(elem => elem[`Parent${itemLayerNum}`] == item.data.Name); 
    potentialChildren = potentialChildren.filter(elem => elem.Root == root.data.Name)
    for (let i = 1; i < itemLayerNum; i++) {
        potentialChildren = potentialChildren.filter(elem => elem[`Parent${i}`] == item.data[`Parent${i}`]); 
    }
    
    for (let i = 0; i < potentialChildren.length; i++) {
        const dataObj = {
            data: potentialChildren[i], 
            children: []
        }
        item.children.push(dataObj); 
        const currentLayer = item.children[i]; 
        createMidChildren(currentLayer, root); 
    }
}

// Entirely remove branches once there is an empty node
function branchChopper() {
    for (let i = (VertexGraph.Global.webDepth - 1); i > 0; i--) {
        const currentLayer = VertexGraph.Global.index[`Layer${i}`]; 

        for (let j = (currentLayer.length - 1); j > -1; j--) {
            const currentItem = currentLayer[j]; 

            let inBrokenBranch = false; 
            if (currentItem.Name == '') {
                inBrokenBranch = true; 
            }
            for (let e = 1; e < i; e++) {
                if (currentItem[`Parent${e}`] == '') {
                    inBrokenBranch = true; 
                }
            }

            if (inBrokenBranch) {
                currentLayer.splice(j, 1); 
            }
        }
    } 
}

// Remove empty midlayers that dont have children with content
function selectiveNodeDeleter() {
    for (let i = 1; i < VertexGraph.Global.webDepth; i++) {
        const currentLayer = VertexGraph.Global.index[`Layer${i}`]; 

        for (let j = (currentLayer.length - 1); j > -1; j--) {
            const currentItem = currentLayer[j]; 
            if (currentItem.Name != '') continue; 

            // Find every node down the branch of the current midlayer
            let branchIsEmpty = true; 
            let lowerLayerContent = []; 
            for (let e = (VertexGraph.Global.webDepth - 2); e > i; e--) {
                let potentialLowerItems = VertexGraph.Global.index[`Layer${e}`].filter(elem => elem.familyID == currentItem.familyID); 
                potentialLowerItems = potentialLowerItems.filter(elem => elem[`Parent${i}`] == currentItem.Name); 
                const currentLowerItem = potentialLowerItems[0]; 
                
                lowerLayerContent.push(currentLowerItem.Name); 
            }

            // Change boolean if the branch isnt empty
            for (let a = 0; a < lowerLayerContent.length; a++) {
                if (lowerLayerContent[a] != '') {
                    branchIsEmpty = false; 
                }
            } 

            if (branchIsEmpty) {
                currentLayer.splice(j, 1); 
            }
        }
    }
}

// GENERAL DATA FUNCTIONS
// flatten deep JSON
function flatten(tree) {
    // Create node array based on tree
    function flattenRoot(data) {
        let nodes = []; 
        function recurse(node) {
            if (node.children) node.children.forEach(recurse);
            nodes.push(node);
        }
        recurse(data);

        // Sort node family in order of layers
        nodes.sort((a, b) => {
            const layerA = a.data.Type.substring(5); 
            const layerB = b.data.Type.substring(5); 

            if (layerA == '') return -1; 
            if (layerB == '') return 1; 

            const difference = layerA - layerB; 
            return difference; 

        })

        return nodes;
    }
    for (let i = 0; i < tree.length; i++) {
        const currentRootNodes = flattenRoot(tree[i]); 
        for (let j = 0; j < currentRootNodes.length; j++) {
            VertexGraph.Global.nodes.push(currentRootNodes[j]); 
        }
    }

    if (VertexGraph.Config.nodeLimit >= 0) VertexGraph.Global.nodes.splice(VertexGraph.Config.nodeLimit); 
    for (let i = 0; i < VertexGraph.Global.nodes.length; i++) {
        VertexGraph.Global.nodes[i].Active = true; 
        VertexGraph.Global.nodes[i].Hovered = false; 
        VertexGraph.Global.nodes[i].Anchored = false; 
        VertexGraph.Global.nodes[i].shouldBeAnchored = false; 
    }
}

// Create links of nodes
function createLinks(nodes) {
    let links = []; 
    for (let i = 0; i < nodes.length; i++) {
        const currentNode = nodes[i]; 
        for (let j = 0; j < currentNode.children.length; j++) {
            const currentChild = currentNode.children[j]; 

            const matchingChild = VertexGraph.Global.nodes.find(el => el.data == currentChild.data); 
            if (matchingChild == undefined) continue; 
            if (currentChild.Active == false) continue; 

            const linkObj = {
                source: currentNode, 
                target: currentChild
            }
            links.push(linkObj); 
        }
    }
    return links; 
}

function findParentNode(node) {
    const parent = VertexGraph.Global.nodes.find(elem => {
        const child = elem.children.find(el => el == node); 
        if (child == undefined) return false; 
        else return true; 
    })
    return parent; 
}

// When node clicked:
// If children all exist => remove children
// If children dont all exist => create all children OR create next layer
function updateBranch(d) {
    const data = d.target.__data__; 

    let childrenActive = true; 
    for (let i = 0; i < data.children.length; i++) {
        const currentChild = data.children[i]; 

        const matchingChild = VertexGraph.Global.nodes.find(el => el.data == currentChild.data); 
        if (matchingChild != undefined && !currentChild.Active) childrenActive = false; 
    }

    // Always collapse all children if applicable
    // Collapsing will always activate the same way
    // Otherwise, If expanding and VertexGraph.Config.expandMode set to 1, only expand next layer
    if (childrenActive || VertexGraph.Config.expandMode == 0) {
        function recurse(node) {
            for (let i = 0; i < node.children.length; i++) {
                const currentChild = node.children[i]; 
                currentChild.Active = !childrenActive; 
                recurse(currentChild); 
            }
        }
        recurse(data); 
    } else if (VertexGraph.Config.expandMode == 1) {
        for (let i = 0; i < data.children.length; i++) {
            const currentChild = data.children[i]; 
            currentChild.Active = !childrenActive; 
        }
    }
    
    if (!childrenActive) {
        VertexGraph.Global.ticks = 0; 
        VertexGraph.Global.seperationActive = true; 
    }
}

// GENERAL WEB FUNCTIONS
// Randomly generate colors from a VertexGraph.Config.colorSets array with no immediate repetition
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

// Set colors based on layer type
function colorSetter() {
    let roots = []; 
    let setNum = 0; 

    // Find all roots and give each a color set
    for (let i = 0; i < VertexGraph.Global.nodes.length; i++) {
        const currentNode = VertexGraph.Global.nodes[i]; 
        const nodeType = currentNode.data.Type;

        if (nodeType == 'Root') {
            roots.push(currentNode); 
            setNum++; 
            if (setNum >= VertexGraph.Config.colorSets.length) setNum = 0; 
            currentNode.data.ColorSet = VertexGraph.Config.colorSets[setNum]; 
        }
    }
    
    // Find root families and set colors within based on assigned root color sets
    for (let i = 0; i < roots.length; i++) {
        const currentRoot = roots[i]; 
        const rootColorSet = currentRoot.data.ColorSet; 
        let rootFamily = [currentRoot]; 

        // Find all potential colors for layers
        let layerColors = {Root: rootColorSet[0]}; 
        let inReverse = false; 
        let setIndex = 1; 
        for (let j = 1; j < VertexGraph.Global.webDepth; j++) {
            layerColors[`Layer${j}`] = rootColorSet[setIndex]; 
            if (j % (rootColorSet.length - 1) == 0) {
                inReverse = !inReverse; 
            }
            if (inReverse) setIndex--; 
            else setIndex++; 
        }

        // Find root's family
        for (let j = 0; j < VertexGraph.Global.nodes.length; j++) {
            const currentNode = VertexGraph.Global.nodes[j]; 

            if (currentNode.data.Type != 'Root' && ((currentNode.data.Root == currentRoot.data.Name) || (currentNode.data.Root == currentRoot))) {
                rootFamily.push(currentNode); 
            }
        }

        // Set colors for each node in the family
        for (let j = 0; j < rootFamily.length; j++) {
            const currentNode = rootFamily[j]; 
            if (currentNode.data.Type == 'Root') currentNode.data.Color = layerColors.Root; 
            else  currentNode.data.Color = layerColors[currentNode.data.Type]; 
        }
    }
}

// Assigns opacity value depending on if there are collapsed children
function opacityFinder(d) {
    for (let i = 0; i < d.children.length; i++) {
        const currentChild = d.children[i];  

        const matchingChild = VertexGraph.Global.nodes.find(el => el.data == currentChild.data); 
        if (matchingChild != undefined && !currentChild.Active) {
            return VertexGraph.Config.collapsedOpacity; 
        }
    }
    return VertexGraph.Config.expandedOpacity; 
}

// Create proper types of circles with corresponding size
function sizeTyper() {
    const sizeIncrement = Math.abs(VertexGraph.Config.circleMax - VertexGraph.Config.circleMin) / (VertexGraph.Global.webDepth - 1); 
    VertexGraph.Global.sizeTypes.Root = VertexGraph.Config.circleMax; 
    VertexGraph.Global.sizeTypes[`Layer${VertexGraph.Global.webDepth - 1}`] = VertexGraph.Config.circleMin; 
    for (let i = 1; i < (VertexGraph.Global.webDepth - 1); i++) {
        const currentSize = VertexGraph.Config.circleMax - sizeIncrement * i; 
        VertexGraph.Global.sizeTypes[`Layer${i}`] = currentSize; 
    }
}

// Give each size type a link size for children
function linkSizeTyper() {
    const sizeIncrement = Math.abs(VertexGraph.Config.maxLinkDistance - VertexGraph.Config.minLinkDistance) / (VertexGraph.Global.webDepth - 2); 
    VertexGraph.Global.linkSizeTypes.Root = VertexGraph.Config.maxLinkDistance; 
    VertexGraph.Global.linkSizeTypes[`Layer${VertexGraph.Global.webDepth - 2}`] = VertexGraph.Config.minLinkDistance; 
    for (let i = 1; i < (VertexGraph.Global.webDepth - 2); i++) {
        const currentSize = VertexGraph.Config.maxLinkDistance - sizeIncrement * i; 
        VertexGraph.Global.linkSizeTypes[`Layer${i}`] = currentSize; 
    }
}

// Make radius individually larger based on quantity of children
// Up until the maximum size ratio based on the default VertexGraph.Global.sizeTypes
function radiusMultiply(d) {
    const multiplier = 1 + (d.children.length * VertexGraph.Config.radiusMultiplier); 
    let multipiedSize = VertexGraph.Global.sizeTypes[d.data.Type] * multiplier; 

    const maxMultipliedSize = VertexGraph.Global.sizeTypes[d.data.Type] * VertexGraph.Config.maxMultipliedRadiusRatio; 
    if (multipiedSize > maxMultipliedSize) multipiedSize = maxMultipliedSize; 

    return multipiedSize; 
}

// Find new start point for links
// This allows transparent nodes without normal overlapping link lines
// hierarchyPos should be 'source' or 'target', axis should be 'x' or 'y'
function adjustLinkStart(data, hierarchyPos, axis) {
    let oppositePos; 
    if (hierarchyPos == 'source') oppositePos = 'target'; 
    else if (hierarchyPos == 'target') oppositePos = 'source'; 

    const difference = {
        x: data[oppositePos].x - data[hierarchyPos].x, 
        y: data[oppositePos].y - data[hierarchyPos].y
    }

    const fullLink = Math.sqrt(Math.pow(difference.x, 2) + Math.pow(difference.y, 2)); 
    const ratio = radiusMultiply(data[hierarchyPos]) / fullLink; 
    
    const adjustment = difference[axis] * ratio; 

    return data[hierarchyPos][axis] + adjustment; 
}

// Functions for panning svg
function pan(dx, dy) {     	
    VertexGraph.Global.transformMatrix[4] += dx;
    VertexGraph.Global.transformMatrix[5] += dy;
              
    const newMatrix = "matrix(" +  VertexGraph.Global.transformMatrix.join(' ') + ")";
    VertexGraph.Global.matrixGroup.setAttributeNS(null, "transform", newMatrix);
}
function panStart(event) {
    VertexGraph.Global.lastX = event.x; 
    VertexGraph.Global.lastY = event.y; 
}
function panning(event) {
    dx = VertexGraph.Global.lastX - event.x; 
    dy = VertexGraph.Global.lastY - event.y; 
    pan(-dx * VertexGraph.Config.panMultiplier, -dy * VertexGraph.Config.panMultiplier); 
    VertexGraph.Global.lastX = event.x; 
    VertexGraph.Global.lastY = event.y; 
}
function panEnd(event) {
    dx = VertexGraph.Global.lastX - event.x; 
    dy = VertexGraph.Global.lastY - event.y; 
    pan(-dx * VertexGraph.Config.panMultiplier, -dy * VertexGraph.Config.panMultiplier); 
}

// Function for moving elements in the svg (Breaks if in a different file)
function moveStart(event) {
    if (!event.active) VertexGraph.Global.simulation.alphaTarget(0.3).restart();
    if (event.subject.Anchored) {
        event.subject.Anchored = false; 
        event.subject.shouldBeAnchored = true; 
    }
    VertexGraph.Global.lastX = event.x; 
    VertexGraph.Global.lastY = event.y; 
}
function moving(event) {
    dx = VertexGraph.Global.lastX - event.x; 
    dy = VertexGraph.Global.lastY - event.y; 
    event.subject.fx = event.x + dx; 
    event.subject.fy = event.y + dy; 
    VertexGraph.Global.lastX = event.x; 
    VertexGraph.Global.lastY = event.y; 
}
function moveEnd(event) {
    if (!event.active) VertexGraph.Global.simulation.alphaTarget(0);
    if (event.subject.shouldBeAnchored) {
        event.subject.shouldBeAnchored = false; 
        event.subject.Anchored = true; 
    }
    event.subject.fx = null;
    event.subject.fy = null;
}

// Functions for zooming svg
function zoom(scale) {
    for (let i = 0; i < 6; i++) {
      VertexGraph.Global.transformMatrix[i] *= scale;
    }
    VertexGraph.Global.transformMatrix[4] += (1 - scale) * VertexGraph.Global.centerX;
    VertexGraph.Global.transformMatrix[5] += (1 - scale) * VertexGraph.Global.centerY;
                  
    const newMatrix = "matrix(" +  VertexGraph.Global.transformMatrix.join(' ') + ")";
    VertexGraph.Global.matrixGroup.setAttributeNS(null, "transform", newMatrix);
}
function addZoom() {
    let svgElement = document.getElementById(VertexGraph.Global.svgID); 
    if (svgElement == null) svgElement = document.getElementById(VertexGraph.Global.svgID.substring(1)); 
    svgElement.addEventListener('mousewheel', (event) => {
        event.preventDefault();
        if (event.deltaY > 0) {
            zoom(0.8); 
        } else if (event.deltaY < 0) {
            zoom(1.2); 
        }
    });
}

// D3 GRAPH
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
        web.style('border', '2px solid black'); 
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
            .attr('id', d => {
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
            .style('stroke', d => d.data.Color)
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

function JSONdataSorter(tree) {
    // Find webDepth of tree and set types accordingly
    let allWebDepths = []; 
    function setTypes(treeNode, layerDepth, root) {
        treeNode.data.Type = `Layer${++layerDepth}`; 
        treeNode.data.Root = root; 
        for (let i = 0; i < treeNode.children.length; i++) {
            const currentChild = treeNode.children[i]; 
            setTypes(currentChild, layerDepth, root); 
        }
        allWebDepths.push(layerDepth + 1); 
    }
    for (let i = 0; i < tree.length; i++) {
        const currentRoot = tree[i]; 
        let layerDepth = 0; 
        
        currentRoot.data.Type = 'Root'; 
        for (let j = 0; j < currentRoot.children.length; j++) {
            const currentChild = currentRoot.children[j]; 
            setTypes(currentChild, layerDepth, currentRoot); 
        }
    }
    VertexGraph.Global.webDepth = Math.max(...allWebDepths); 
}

//class for creating a web graph
class VertexGraphClass {
    constructor()
    {

    }

    Config = {
        /////////////////////////////////////////////////////////////////////////////
        //                                                                         //
        //                          GENERAL DATA SETTINGS                          //
        //                                                                         //
        /////////////////////////////////////////////////////////////////////////////

        branchMode: 0, 
        // 0: Chop branches once an empty node comes up
        // 1: Chop branches that only have empty children
        expandMode: 0, 
        // 0: Default - expand out all connected children
        // 1: Expand 1 layer at a time
        startCollapsed: false, 
        // Begin graph with just collapsed roots
        rootLimit: -1, 
        nodeLimit: -1, 
        // -1: All are loaded

        // CSV ONLY
        manualOrderSet: [], 
        // Input column numbers or names in desired order, root is index 1
        // If left empty, columns will be arranged in sequential order
        linkColumns: [], 
        // Structure: {ID: (name or index), Target: (name or index)}
        // Input CSV column numbers or names for ID, root is index 1
        // Target is index number or name of column link is attached to

        fullScreenMode: true, 
        // if false: 
        svgHeight: 1000, 
        svgWidthRatio: 0.7, 
        svgWidth: -1, 
        // Set svgWidth to -1 in order to use ratio

        backgroundColor: 'white', 
        colorSets: [
            ['#54B5F7', '#69D6FA', '#57E6FA', '#4CD7D5', '#49D6B0', '#5CED9E', '#4EE667', '#6BF754'], 
            ['#F20789', '#F23DB7', '#F541E7', '#D346FC', '#AB46E6', '#953EFF', '#4D3DF2', '#004ED4'], 
            ['#F2CD0C', '#F2B10C', '#FCA00D', '#E57B17', '#FC5E0D', '#F2380C', '#F50701'], 
            ['#51FA26', '#89DE21', '#B8DE2C', '#CCDE2C', '#E5DA3C', '#FAD626', '#FAAC01', '#FF7D00', '#FF5A00'], 
            ['#8763FF', '#A749EB', '#D149EB', '#F162FA', '#E34D94', '#FB5E8D', '#FB5E55'], 
            ['#F07DFA', '#C67DFA', '#896BE3', '#6978E3', '#699FE3', '#81B2FA', '#81CCFA', '#6EEBE5', '#6EEBC2', '#85FFA5'], 
            ['#FD760D', '#E3450B', '#FA1900', '#E6093E', '#FD0D8A', '#FD0DD1', '#F814FF']
        ], 
        textColor: 'black', 
        expandedOpacity: 0.25, 
        collapsedOpacity: 0.6, 

        maxLinkDistance: 500, 
        minLinkDistance: 150, 
        circleMax: 45, 
        circleMin: 20, 
        radiusMultiplier: 0.15, 
        maxMultipliedRadiusRatio: 2, 

        baseStrength: -200, 
        regularForceDistance: 500, 
        seperationAlphaTarget: 1.8, 
        startSeperateDelay: 100, 
        clickSeperateDelay: 40, 

        panMultiplier: 1
    };

      
    Global= {
        // Contain circle types with sizes
        webDepth: undefined,
        sizeTypes: {}, 
        linkSizeTypes: {}, 
        svgWidth: undefined, 

        // Data containers
        // CSV specific
        index: {Root: []}, 
        dataTree: [], 
        // General
        nodes: [], 
        IDnum: 0, 

        // Variables for modifying position and scale of svg elements
        svgID: undefined, 
        centerX: undefined, 
        centerY: undefined, 
        transformMatrix: [1, 0, 0, 1, 0, 0], 
        matrixGroup: undefined, 
        lastX: undefined, 
        lastY: undefined, 

        // D3 global variables
        simulation: undefined, 
        ticks: 0, 
        firstSeperation: true, 
        seperationActive: true, 
        firstRefresh: true
    };

    RunCSV(url, divID) {
        // Find and set svg height
        if (VertexGraph.Config.fullScreenMode) {
            const body = document.body,
            html = document.documentElement;
            VertexGraph.Config.svgHeight = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
            VertexGraph.Config.svgWidthRatio = 1
        } 

        // Find and set svg width
        VertexGraph.Global.svgWidth = VertexGraph.Config.svgWidth; 
        if (VertexGraph.Config.svgWidth == -1) {
            if (window.innerWidth !== undefined) { 
                VertexGraph.Global.svgWidth = window.innerWidth * VertexGraph.Config.svgWidthRatio;
            } else {  
                VertexGraph.Global.svgWidth = document.documentElement.clientWidth * VertexGraph.Config.svgWidthRatio;
            }
        }

        // Reset global variables effected by svg width and height
        VertexGraph.Global.svgID = divID;
        VertexGraph.Global.centerX = VertexGraph.Global.svgWidth / 2; 
        VertexGraph.Global.centerY = VertexGraph.Config.svgHeight / 2; 

        d3.csv(url).then(dataInfo => {
            // Arrange columns
            linkColumnUpdater(dataInfo); 
            orderColumns(dataInfo); 
    
            // Convert d3 csv JSON into proper nodes
            CSVdataSorter(dataInfo); 
            runGraph(); 
        }); 
    };

    RunJSON(data, divID) {
        // Find and set svg height
        if (VertexGraph.Config.fullScreenMode) {
            const body = document.body,
            html = document.documentElement;
            VertexGraph.Config.svgHeight = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
            VertexGraph.Config.svgWidthRatio = 1
        } 

        // Find and set svg width
        VertexGraph.Global.svgWidth = VertexGraph.Config.svgWidth; 
        if (VertexGraph.Config.svgWidth == -1) {
            if (window.innerWidth !== undefined) { 
                VertexGraph.Global.svgWidth = window.innerWidth * VertexGraph.Config.svgWidthRatio;
            } else {  
                VertexGraph.Global.svgWidth = document.documentElement.clientWidth * VertexGraph.Config.svgWidthRatio;
            }
        }

        // Reset global variables effected by svg width and height
        VertexGraph.Global.svgID = divID;
        VertexGraph.Global.centerX = VertexGraph.Global.svgWidth / 2; 
        VertexGraph.Global.centerY = VertexGraph.Config.svgHeight / 2; 

        JSONdataSorter(data); 
        flatten(data); 
        runGraph(); 
    }; 
};