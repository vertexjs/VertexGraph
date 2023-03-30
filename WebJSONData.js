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
    WebGraph.Global.webDepth = Math.max(...allWebDepths); 
}