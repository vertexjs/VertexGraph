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