// CSV DATA SORTER
// Sorts csv data after being converted into JSON through d3
function CSVdataSorter(data, currentGraph) {
    currentGraph.Global.webDepth = data.columns.length; 
    for (let i = 1; i < currentGraph.Global.webDepth; i++) {
        currentGraph.Global.index[`Layer${i}`] = []; 
    }

    // Find link attached to column
    // Used to attach a link to currentGraph.Global.nodes during currentGraph.Global.index creation
    function linkColumnFinder(column) {
        const columnIndex = data.columns.indexOf(column); 
        let matchingLinkCol = currentGraph.Config.linkColumns.find(elem => (elem.Target == column || elem.Target == (columnIndex + 1)));

        if (matchingLinkCol == undefined) return undefined; 
        if (typeof matchingLinkCol.ID == 'string') return matchingLinkCol.ID; 
        if (typeof matchingLinkCol.ID == 'number') return matchingLinkCol.IDName; 
    }
    
    // Find all elems
    for (let i = 0; i < data.length; i++) {
        // Find unique Roots
        let currentRoot; 
        const matchingRoot = currentGraph.Global.index.Root.find(elem => data[i][data.columns[0]] == elem.Name); 
        if (matchingRoot == undefined) {
            let indexObj = {
                Name: `${data[i][data.columns[0]]}`,
                familyID: i, 
                Type: 'Root'
            }
            const rootLinkCol = linkColumnFinder(data.columns[0]); 
            if (rootLinkCol != undefined) indexObj.Link = data[i][rootLinkCol]; 

            currentGraph.Global.index.Root.push(indexObj); 
        }
        currentRoot = currentGraph.Global.index.Root.find(elem => data[i][data.columns[0]] == elem.Name);

        // Find unique middle layers
        // Checks name uniqueness as well as if the parents match
        for (let j = 1; j < currentGraph.Global.webDepth; j++) {

            // Name Check
            let potentialMatches = currentGraph.Global.index[`Layer${j}`].filter(elem => elem.Name == data[i][data.columns[j]]); 
            // Root Check
            potentialMatches = potentialMatches.filter(elem => elem.Root == currentRoot.Name); 
            // Middle parent check
            for (let e = 2; e <= j; e++) {
                potentialMatches = potentialMatches.filter(elem => elem[`Parent${e - 1}`] == data[i][data.columns[e - 1]]);
            }
            const match = potentialMatches[0];  

            if (j != (currentGraph.Global.webDepth - 1) && match != undefined) continue; 

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

            currentGraph.Global.index[`Layer${j}`].push(indexObj); 
        }
    } 

    // Delete midlayers in 2 configurable ways
    if (currentGraph.Config.branchMode == 0) {
        branchChopper(currentGraph); 
    } else if (currentGraph.Config.branchMode == 1) {
        selectiveNodeDeleter(currentGraph); 
    }

    // Remove families of roots outside root limit
    if (currentGraph.Config.rootLimit >= 0) {
        currentGraph.Global.index.Root.splice(currentGraph.Config.rootLimit)
    }

    // Create deep JSON representation of data
    for (let i = 0; i < currentGraph.Global.index.Root.length; i++) {
        // Create root
        const dataObj = {
            data: currentGraph.Global.index.Root[i], 
            children: []
        }
        currentGraph.Global.dataTree[i] = dataObj; 
        const currentRoot = currentGraph.Global.dataTree[i]; 

        const layer1Children = currentGraph.Global.index.Layer1.filter(elem => elem.Root == currentRoot.data.Name);
        for (let j = 0; j < layer1Children.length; j++) {
            const dataObj = {
                data: layer1Children[j], 
                children: []
            }
            currentRoot.children.push(dataObj); 
            const currentLayer1 = currentRoot.children[j]; 
            createMidChildren(currentLayer1, currentRoot, currentGraph); 
        }
    }

    // Create currentGraph.Global.nodes of JSON
    flatten(currentGraph.Global.dataTree, currentGraph); 
}

// Prevent link columns from being currentGraph.Global.nodes
function linkColumnUpdater(data, currentGraph) {
    for (let i = 0; i < currentGraph.Config.linkColumns.length; i++) {
        const currentColumn = currentGraph.Config.linkColumns[i]; 
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
function orderColumns(data, currentGraph) {
    if (currentGraph.Config.manualOrderSet == '') return; 

    let newColumns = []; 
    for (let i = 0; i < currentGraph.Config.manualOrderSet.length; i++) {
        const selectedColumn = currentGraph.Config.manualOrderSet[i]; 
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

// Create children in currentGraph.Global.index for JSON
function createMidChildren(item, root, currentGraph) {
    const itemLayerNum = parseInt(item.data.Type.substring(5)); 
    const childLayerNum = itemLayerNum + 1; 
    let childLayer = currentGraph.Global.index[`Layer${childLayerNum}`]; 

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
        createMidChildren(currentLayer, root, currentGraph); 
    }
}

// Entirely remove branches once there is an empty node
function branchChopper(currentGraph) {
    for (let i = (currentGraph.Global.webDepth - 1); i > 0; i--) {
        const currentLayer = currentGraph.Global.index[`Layer${i}`]; 

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
function selectiveNodeDeleter(currentGraph) {
    for (let i = 1; i < currentGraph.Global.webDepth; i++) {
        const currentLayer = currentGraph.Global.index[`Layer${i}`]; 

        for (let j = (currentLayer.length - 1); j > -1; j--) {
            const currentItem = currentLayer[j]; 
            if (currentItem.Name != '') continue; 

            // Find every node down the branch of the current midlayer
            let branchIsEmpty = true; 
            let lowerLayerContent = []; 
            for (let e = (currentGraph.Global.webDepth - 2); e > i; e--) {
                let potentialLowerItems = currentGraph.Global.index[`Layer${e}`].filter(elem => elem.familyID == currentItem.familyID); 
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
function flatten(tree, currentGraph) {
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
            currentGraph.Global.nodes.push(currentRootNodes[j]); 
        }
    }

    if (currentGraph.Config.nodeLimit >= 0) currentGraph.Global.nodes.splice(currentGraph.Config.nodeLimit); 
    for (let i = 0; i < currentGraph.Global.nodes.length; i++) {
        currentGraph.Global.nodes[i].Active = true; 
        currentGraph.Global.nodes[i].Hovered = false; 
        currentGraph.Global.nodes[i].Anchored = false; 
        currentGraph.Global.nodes[i].shouldBeAnchored = false; 
    }
}

// Create links of nodes
function createLinks(nodes, currentGraph) {
    let links = []; 
    for (let i = 0; i < nodes.length; i++) {
        const currentNode = nodes[i]; 
        for (let j = 0; j < currentNode.children.length; j++) {
            const currentChild = currentNode.children[j]; 

            const matchingChild = currentGraph.Global.nodes.find(el => el.data == currentChild.data); 
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

function findParentNode(node, currentGraph) {
    const parent = currentGraph.Global.nodes.find(elem => {
        const child = elem.children.find(el => el == node); 
        if (child == undefined) return false; 
        else return true; 
    })
    return parent; 
}

// When node clicked:
// If children all exist => remove children
// If children dont all exist => create all children OR create next layer
function updateBranch(d, currentGraph) {
    const data = d.target.__data__; 

    let childrenActive = true; 
    for (let i = 0; i < data.children.length; i++) {
        const currentChild = data.children[i]; 

        const matchingChild = currentGraph.Global.nodes.find(el => el.data == currentChild.data); 
        if (matchingChild != undefined && !currentChild.Active) childrenActive = false; 
    }

    // Always collapse all children if applicable
    // Collapsing will always activate the same way
    // Otherwise, If expanding and currentGraph.Config.expandMode set to 1, only expand next layer
    if (childrenActive || currentGraph.Config.expandMode == 0) {
        function recurse(node) {
            for (let i = 0; i < node.children.length; i++) {
                const currentChild = node.children[i]; 
                currentChild.Active = !childrenActive; 
                recurse(currentChild); 
            }
        }
        recurse(data); 
    } else if (currentGraph.Config.expandMode == 1) {
        for (let i = 0; i < data.children.length; i++) {
            const currentChild = data.children[i]; 
            currentChild.Active = !childrenActive; 
        }
    }
    
    if (!childrenActive) {
        currentGraph.Global.ticks = 0; 
        currentGraph.Global.seperationActive = true; 
    }
}

// GENERAL WEB FUNCTIONS
// Randomly generate colors from a currentGraph.Config.colorSets array with no immediate repetition
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
function colorSetter(currentGraph) {
    let roots = []; 
    let setNum = 0; 

    // Find all roots and give each a color set
    for (let i = 0; i < currentGraph.Global.nodes.length; i++) {
        const currentNode = currentGraph.Global.nodes[i]; 
        const nodeType = currentNode.data.Type;

        if (nodeType == 'Root') {
            roots.push(currentNode); 
            setNum++; 
            if (setNum >= currentGraph.Config.colorSets.length) setNum = 0; 
            currentNode.data.ColorSet = currentGraph.Config.colorSets[setNum]; 
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
        for (let j = 1; j < currentGraph.Global.webDepth; j++) {
            layerColors[`Layer${j}`] = rootColorSet[setIndex]; 
            if (j % (rootColorSet.length - 1) == 0) {
                inReverse = !inReverse; 
            }
            if (inReverse) setIndex--; 
            else setIndex++; 
        }

        // Find root's family
        for (let j = 0; j < currentGraph.Global.nodes.length; j++) {
            const currentNode = currentGraph.Global.nodes[j]; 

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
function opacityFinder(d, currentGraph) {
    for (let i = 0; i < d.children.length; i++) {
        const currentChild = d.children[i];  

        const matchingChild = currentGraph.Global.nodes.find(el => el.data == currentChild.data); 
        if (matchingChild != undefined && !currentChild.Active) {
            return currentGraph.Config.collapsedOpacity; 
        }
    }
    return currentGraph.Config.expandedOpacity; 
}

// Create proper types of circles with corresponding size
function sizeTyper(currentGraph) {
    const sizeIncrement = Math.abs(currentGraph.Config.circleMax - currentGraph.Config.circleMin) / (currentGraph.Global.webDepth - 1); 
    currentGraph.Global.sizeTypes.Root = currentGraph.Config.circleMax; 
    currentGraph.Global.sizeTypes[`Layer${currentGraph.Global.webDepth - 1}`] = currentGraph.Config.circleMin; 
    for (let i = 1; i < (currentGraph.Global.webDepth - 1); i++) {
        const currentSize = currentGraph.Config.circleMax - sizeIncrement * i; 
        currentGraph.Global.sizeTypes[`Layer${i}`] = currentSize; 
    }
}

// Give each size type a link size for children
function linkSizeTyper(currentGraph) {
    const sizeIncrement = Math.abs(currentGraph.Config.maxLinkDistance - currentGraph.Config.minLinkDistance) / (currentGraph.Global.webDepth - 2); 
    currentGraph.Global.linkSizeTypes.Root = currentGraph.Config.maxLinkDistance; 
    currentGraph.Global.linkSizeTypes[`Layer${currentGraph.Global.webDepth - 2}`] = currentGraph.Config.minLinkDistance; 
    for (let i = 1; i < (currentGraph.Global.webDepth - 2); i++) {
        const currentSize = currentGraph.Config.maxLinkDistance - sizeIncrement * i; 
        currentGraph.Global.linkSizeTypes[`Layer${i}`] = currentSize; 
    }
}

// Make radius individually larger based on quantity of children
// Up until the maximum size ratio based on the default currentGraph.Global.sizeTypes
function radiusMultiply(d, currentGraph) {
    const multiplier = 1 + (d.children.length * currentGraph.Config.radiusMultiplier); 
    let multipiedSize = currentGraph.Global.sizeTypes[d.data.Type] * multiplier; 

    const maxMultipliedSize = currentGraph.Global.sizeTypes[d.data.Type] * currentGraph.Config.maxMultipliedRadiusRatio; 
    if (multipiedSize > maxMultipliedSize) multipiedSize = maxMultipliedSize; 

    return multipiedSize; 
}

// Find new start point for links
// AdjustLinkStart allows transparent nodes without normal overlapping link lines
// hierarchyPos should be 'source' or 'target', axis should be 'x' or 'y'
function adjustLinkStart(data, hierarchyPos, axis, currentGraph) {
    let oppositePos; 
    if (hierarchyPos == 'source') oppositePos = 'target'; 
    else if (hierarchyPos == 'target') oppositePos = 'source'; 

    const difference = {
        x: data[oppositePos].x - data[hierarchyPos].x, 
        y: data[oppositePos].y - data[hierarchyPos].y
    }

    const fullLink = Math.sqrt(Math.pow(difference.x, 2) + Math.pow(difference.y, 2)); 
    const ratio = radiusMultiply(data[hierarchyPos], currentGraph) / fullLink; 
    
    const adjustment = difference[axis] * ratio; 

    return data[hierarchyPos][axis] + adjustment; 
}

// Functions for panning svg
function pan(dx, dy, currentGraph) {     	
    currentGraph.Global.transformMatrix[4] += dx;
    currentGraph.Global.transformMatrix[5] += dy;
              
    const newMatrix = "matrix(" +  currentGraph.Global.transformMatrix.join(' ') + ")";
    currentGraph.Global.matrixGroup.setAttributeNS(null, "transform", newMatrix);
}
function panStart(event, currentGraph) {
    currentGraph.Global.lastX = event.x; 
    currentGraph.Global.lastY = event.y; 
}
function panning(event, currentGraph) {
    dx = currentGraph.Global.lastX - event.x; 
    dy = currentGraph.Global.lastY - event.y; 
    pan(-dx * currentGraph.Config.panMultiplier, -dy * currentGraph.Config.panMultiplier, currentGraph); 
    currentGraph.Global.lastX = event.x; 
    currentGraph.Global.lastY = event.y; 
}
function panEnd(event, currentGraph) {
    dx = currentGraph.Global.lastX - event.x; 
    dy = currentGraph.Global.lastY - event.y; 
    pan(-dx * currentGraph.Config.panMultiplier, -dy * currentGraph.Config.panMultiplier, currentGraph); 
}

// Function for moving elements in the svg (Breaks if in a different file)
function moveStart(event, currentGraph) {
    if (!event.active) currentGraph.Global.simulation.alphaTarget(0.3).restart();
    if (event.subject.Anchored) {
        event.subject.Anchored = false; 
        event.subject.shouldBeAnchored = true; 
    }
    currentGraph.Global.lastX = event.x; 
    currentGraph.Global.lastY = event.y; 
}
function moving(event, currentGraph) {
    dx = currentGraph.Global.lastX - event.x; 
    dy = currentGraph.Global.lastY - event.y; 
    event.subject.fx = event.x + dx; 
    event.subject.fy = event.y + dy; 
    currentGraph.Global.lastX = event.x; 
    currentGraph.Global.lastY = event.y; 
}
function moveEnd(event, currentGraph) {
    if (!event.active) currentGraph.Global.simulation.alphaTarget(0);
    if (event.subject.shouldBeAnchored) {
        event.subject.shouldBeAnchored = false; 
        event.subject.Anchored = true; 
    }
    event.subject.fx = null;
    event.subject.fy = null;
}

// Functions for zooming svg
function zoom(scale, currentGraph) {
    for (let i = 0; i < 6; i++) {
      currentGraph.Global.transformMatrix[i] *= scale;
    }
    currentGraph.Global.transformMatrix[4] += (1 - scale) * currentGraph.Global.centerX;
    currentGraph.Global.transformMatrix[5] += (1 - scale) * currentGraph.Global.centerY;
                  
    const newMatrix = "matrix(" +  currentGraph.Global.transformMatrix.join(' ') + ")";
    currentGraph.Global.matrixGroup.setAttributeNS(null, "transform", newMatrix);
}
function addZoom(currentGraph) {
    let svgElement = document.getElementById(currentGraph.Global.svgID); 
    if (svgElement == null) svgElement = document.getElementById(currentGraph.Global.svgID.substring(1)); 
    svgElement.addEventListener('mousewheel', (event) => {
        event.preventDefault();
        if (event.deltaY > 0) {
            zoom(0.8, currentGraph); 
        } else if (event.deltaY < 0) {
            zoom(1.2, currentGraph); 
        }
    });
}

// D3 GRAPH
function runGraph(currentGraph) {
    // Set colors, find node radii, find link sizes, and add zooming
    shuffle(currentGraph.Config.colorSets); 
    colorSetter(currentGraph); 
    sizeTyper(currentGraph); 
    linkSizeTyper(currentGraph); 
    addZoom(currentGraph); 
    
    // Create static elements in the svg
    if (currentGraph.Global.svgID.substring(0, 1) != '#') currentGraph.Global.svgID = `#${currentGraph.Global.svgID}`; 
    const web = d3.select(currentGraph.Global.svgID)
        .style('position', 'relative')
        .style('width', currentGraph.Global.svgWidth)
        .style('height', currentGraph.Config.svgHeight); 
    
    if (currentGraph.Config.fullScreenMode) {
        d3.select('#body').style('margin', 0)
            .style('overflow-y', 'hidden'); 
    } 

    web.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', currentGraph.Global.svgWidth)
        .attr('height', currentGraph.Config.svgHeight)
        .attr('id', currentGraph.Global.svgID.substring(1) + '-zoomsquare')
        .attr('fill', currentGraph.Config.backgroundColor)
        .call(d3.drag()
        .on('start', event => panStart(event, currentGraph))
        .on('drag', event => panning(event, currentGraph))
        .on('end', event => panEnd(event, currentGraph)));  
    
    const webGroup = web.append('g').attr('id', currentGraph.Global.svgID.substring(1) + '-matrixGroup'); 
    currentGraph.Global.matrixGroup = document.getElementById(currentGraph.Global.svgID.substring(1) + '-matrixGroup');

    // Manage force currentGraph.Global.simulation
    currentGraph.Global.simulation = d3.forceSimulation(currentGraph.Global.nodes)
        .force('charge', d3.forceManyBody().strength(currentGraph.Config.baseStrength).distanceMax(currentGraph.Config.regularForceDistance))
        .force('center', d3.forceCenter(currentGraph.Global.centerX, currentGraph.Global.centerY))
        .on('tick', ticked);
    
    refresh(); 
    currentGraph.Global.firstRefresh = false; 

    function ticked() {
        seperateElements(); 
        update(); 
    }

    // Make sure webs are properly seperated
    // Lots of manual tweaking to get "right"
    function seperateElements() {
        // Make first separation uniquely strong
        if (!currentGraph.Global.seperationActive) return; 
        const seperationEnhancement = currentGraph.Global.nodes.filter(el => el.data.Type == 'Root').length * 0.005; 

        if (currentGraph.Global.firstSeperation) {
            const enhancedDelay = currentGraph.Config.startSeperateDelay * (1 + (seperationEnhancement / 5)); 
            const enhancedStrength = currentGraph.Config.baseStrength * (1 + seperationEnhancement); 

            // Strengthen and activate forces for start delay
            if (currentGraph.Global.ticks < enhancedDelay) {
                currentGraph.Global.simulation.alphaTarget(currentGraph.Config.seperationAlphaTarget)
                    .force('charge', d3.forceManyBody().strength(enhancedStrength))
                    .restart(); 
            } 

            // Slightly slow down seperation intensity
            if (currentGraph.Global.ticks > (enhancedDelay / 2)) {
                const targetRatio = enhancedDelay / currentGraph.Global.ticks; 
                currentGraph.Global.simulation.alphaTarget(currentGraph.Config.seperationAlphaTarget * (targetRatio - 1))
            }

            // End start seperation
            if (currentGraph.Global.ticks >= enhancedDelay) {
                currentGraph.Global.simulation.alphaTarget(0)
                    .force('center', null)
                    .force('charge', d3.forceManyBody().strength(currentGraph.Config.baseStrength)); 
                currentGraph.Global.firstSeperation = false; 
                currentGraph.Global.seperationActive = false; 
            }; 
            currentGraph.Global.ticks++; 
        } else {
            const enhancedDelay = currentGraph.Config.clickSeperateDelay * (1 + (seperationEnhancement / 10));
            const enhancedStrength = currentGraph.Config.baseStrength * (1 + (seperationEnhancement / 3)); 

            // Strengthen and activate forces for expansion delay
            if (currentGraph.Global.ticks < enhancedDelay) {
                currentGraph.Global.simulation.alphaTarget(currentGraph.Config.seperationAlphaTarget)
                    .force('charge', d3.forceManyBody().strength(enhancedStrength))
                    .restart(); 
            }

            // Slightly slow down seperation intensity
            if (currentGraph.Global.ticks > (enhancedDelay / 2)) {
                const targetRatio = enhancedDelay / currentGraph.Global.ticks; 
                currentGraph.Global.simulation.alphaTarget(currentGraph.Config.seperationAlphaTarget * (targetRatio - 1))
            }

            // End click seperation
            if (currentGraph.Global.ticks >= enhancedDelay) {
                currentGraph.Global.simulation.alphaTarget(0).force('charge', d3.forceManyBody().strength(currentGraph.Config.baseStrength)); 
                currentGraph.Global.seperationActive = false;
            }
            currentGraph.Global.ticks++; 
        }
    }

    // Run at start and when node is clicked
    // Creates and refreshes all web elements
    function refresh() {
        let activeNodes = []; 
        let rootNodes = []; 
        let anchoredNodes = []; 
        for (let i = 0; i < currentGraph.Global.nodes.length; i++) { 
            const currentNode = currentGraph.Global.nodes[i]; 

            if (currentNode.Active) activeNodes.push(currentNode); 
            if (currentNode.data.Type == 'Root') rootNodes.push(currentNode); 
            if (currentNode.Anchored) anchoredNodes.push(currentNode); 
        }

        // On startup, only open roots if set so
        if (currentGraph.Global.firstRefresh && currentGraph.Config.startCollapsed) {
            for (let i = (activeNodes.length - 1); i >= 0; i--) {
                const currentNode = activeNodes[i]; 
                if (currentNode.data.Type != 'Root') {
                    currentNode.Active = false; 
                    activeNodes.splice(i, 1); 
                }
            }
        }

        let links = createLinks(activeNodes, currentGraph); 

        // Refresh force simulation
        currentGraph.Global.simulation.nodes(activeNodes)
            .force('link', d3.forceLink().links(links).distance(d => currentGraph.Global.linkSizeTypes[d.source.data.Type]).strength(1))
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
            .attr('r', d => radiusMultiply(d, currentGraph) * 0.8)
            .attr('stroke-width', '4px')
            .style('stroke', d => d.data.Color)
            .style('fill', currentGraph.Config.backgroundColor); 

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

        // Create and refresh circles to fit currentGraph.Global.nodes
        // Create all currentGraph.Global.nodes here and hide currentGraph.Global.nodes if collapsed
        const circles = webGroup.selectAll('.node'); 
        circles.data(currentGraph.Global.nodes)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('id', d => {
                currentGraph.Global.IDnum++; 
                d.IDnum = currentGraph.Global.IDnum; 
                return `node${currentGraph.Global.IDnum}`; 
            })
            .attr('r', d => radiusMultiply(d, currentGraph))
            .attr('stroke-width', '8px')
            .style('stroke', d => d.data.Color)
            .style('fill', d => d.data.Color)
            .style('fill-opacity', d => opacityFinder(d, currentGraph))
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
                nodeD3.style('fill-opacity', (currentGraph.Config.collapsedOpacity + currentGraph.Config.expandedOpacity) / 2); 
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
                nodeD3.style('fill-opacity', opacityFinder(node, currentGraph)).attr('cursor', 'auto'); 
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

                updateBranch(d, currentGraph); 
                refresh();
            }); 
        circles.style('fill-opacity', d => opacityFinder(d, currentGraph)); 

        // Create and refresh text to fit currentGraph.Global.nodes
        const text = webGroup.selectAll('text'); 
        text.data(currentGraph.Global.nodes)
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
            .style('fill', currentGraph.Config.textColor); 
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

                return radiusMultiply(d, currentGraph); 
            })

        webGroup.selectAll('.anchorSign')
            .style('stroke', d => d.data.Color)
            .attr('x1', d => d.x)
            .attr('y1', d => d.y + radiusMultiply(d, currentGraph))
            .attr('x2', d => d.x)
            .attr('y2', d => d.y - radiusMultiply(d, currentGraph)); 

        webGroup.selectAll('.indicatorCircle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y); 
        
        // Update currentGraph.Global.nodes' position and visibility
        // If active: sync force data pos with real pos
        // If inactive: Hide node behind parent
        webGroup.selectAll('.node')
            .attr('r', d => {
                if (!d.Active) return 0; 
                return radiusMultiply(d, currentGraph); 
            })
            .attr('cx', d => {
                if (!d.Active) {
                    const parent = findParentNode(d, currentGraph); 
                    
                    d.x = parent.x; 
                    return parent.x; 
                }

                return d.x; 
            })
            .attr('cy', d => {
                if (!d.Active) {
                    const parent = findParentNode(d, currentGraph); 
                    
                    d.y = parent.y; 
                    return parent.y; 
                }

                return d.y; 
            }); 

        webGroup.selectAll('.link')
            .attr('x1', d => adjustLinkStart(d, 'source', 'x', currentGraph))
            .attr('y1', d => adjustLinkStart(d, 'source', 'y', currentGraph))
            .attr('x2', d => adjustLinkStart(d, 'target', 'x', currentGraph))
            .attr('y2', d => adjustLinkStart(d, 'target', 'y', currentGraph))
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
            
        // Add the ability to move currentGraph.Global.nodes slightly after start
        // Gives time for currentGraph.Global.nodes to seperate
        if (currentGraph.Global.ticks > currentGraph.Config.clickSeperateDelay) {
            movingActivated = true; 
            webGroup.selectAll('circle')
            .call(d3.drag()
            .on('start', event => moveStart(event, currentGraph))
            .on('drag', event => moving(event, currentGraph))
            .on('end', event => moveEnd(event, currentGraph))); 
        }
    }
}

function JSONdataSorter(tree, currentGraph) {
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
    currentGraph.Global.webDepth = Math.max(...allWebDepths); 
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

        maxLinkDistance: 400, 
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
        let currentGraph = this; 
        // Find and set svg height
        if (currentGraph.Config.fullScreenMode) {
            const body = document.body,
            html = document.documentElement;
            currentGraph.Config.svgHeight = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
            currentGraph.Config.svgWidthRatio = 1
        } 

        // Find and set svg width
        currentGraph.Global.svgWidth = currentGraph.Config.svgWidth; 
        if (currentGraph.Config.svgWidth == -1) {
            if (window.innerWidth !== undefined) { 
                currentGraph.Global.svgWidth = window.innerWidth * currentGraph.Config.svgWidthRatio;
            } else {  
                currentGraph.Global.svgWidth = document.documentElement.clientWidth * currentGraph.Config.svgWidthRatio;
            }
        }

        // Reset global variables effected by svg width and height
        currentGraph.Global.svgID = divID;
        currentGraph.Global.centerX = currentGraph.Global.svgWidth / 2; 
        currentGraph.Global.centerY = currentGraph.Config.svgHeight / 2; 

        d3.csv(url).then(dataInfo => {
            // Arrange columns
            linkColumnUpdater(dataInfo, currentGraph); 
            orderColumns(dataInfo, currentGraph); 
    
            // Convert d3 csv JSON into proper nodes
            CSVdataSorter(dataInfo, currentGraph); 
            runGraph(currentGraph); 
        }); 
    };

    RunJSON(data, divID) {
        let currentGraph = this; 
        // Find and set svg height
        if (currentGraph.Config.fullScreenMode) {
            const body = document.body,
            html = document.documentElement;
            currentGraph.Config.svgHeight = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
            currentGraph.Config.svgWidthRatio = 1
        } 

        // Find and set svg width
        currentGraph.Global.svgWidth = currentGraph.Config.svgWidth; 
        if (currentGraph.Config.svgWidth == -1) {
            if (window.innerWidth !== undefined) { 
                currentGraph.Global.svgWidth = window.innerWidth * currentGraph.Config.svgWidthRatio;
            } else {  
                currentGraph.Global.svgWidth = document.documentElement.clientWidth * currentGraph.Config.svgWidthRatio;
            }
        }

        // Reset global variables effected by svg width and height
        currentGraph.Global.svgID = divID;
        currentGraph.Global.centerX = currentGraph.Global.svgWidth / 2; 
        currentGraph.Global.centerY = currentGraph.Config.svgHeight / 2; 

        JSONdataSorter(data, currentGraph); 
        flatten(data, currentGraph); 
        runGraph(currentGraph); 
    }; 
};