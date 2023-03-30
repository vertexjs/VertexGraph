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