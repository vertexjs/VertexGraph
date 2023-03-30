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