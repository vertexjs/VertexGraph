# VertexGraph


VertexJS or VertexGraph is a JavaScript library for creating interactive visualizations of relations and nodes provided in CSV or JSON format. It is designed to be easy to use, highly customizable, and compatible with a wide range of browsers.

## Installation

To use VertexGraph  in your project, simply include the following scripts tag in the head section of your HTML file (alternatively you can download source files and include them to your project):

```html
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3-scale@4"></script>
    <script src="../../src/VertexGraph.js"></script>
```


## Usage

VertexGraph provides a simple and intuitive API for creating visualizations. Here's a basic example:

```html
    <script>
        const csvUrl = 'animals.csv';   
        VertexGraph = new VertexGraphClass();
        VertexGraph.RunCSV(csvUrl, '#VertexGraph'); 
    </script>
```


This code will create a simple relations graph presenting notes and edges between them and display it in a svg with the ID "VertexGraph".

 ![1680180141001.png](./1680180141001.png)

### Features

VertexGraph also includes multiple features to improve the usability of the generated graph.  
1. Mouse drag on node -> Change position of nodes
2. Mouse drag on background -> Pan the graph center
3. Scroll wheel -> Zoom in and out of the graph
4. Left click on node -> Expand or collapse nodes' children if applicable
5. Alt + left click on node -> Toggle locking the node in place ignoring forces 
6. Ctrl + left click on node -> Open applicable link attached to the node

## Settings

VertexGraph also includes a wide assortment of configurable variables for graph customzation. Each configurable variable is given a default value that can be changed before running an instance of a VertexGraph. 

### General

_VertexGraph.Config._**branchMode**  
0 -> Chop graph branches once an empty node is found  
1 -> Chop graph branches once an empty node is found that only has empty children  

_VertexGraph.Config._**expandMode**  
0 -> Expand out all connected children when a collapsed node is clicked  
1 -> Expand 1 layer at a time when a collapsed node is clicked  

_VertexGraph.Config._**startCollapsed**  
true -> Only reveal root nodes on startup  
false -> Reveal all nodes on startup  

_VertexGraph.Config._**rootLimit**  
n -> Limit graph to n roots  
-1 -> Load all roots  

_VertexGraph.Config._**nodeLimit**  
n -> Limit graph to n nodes  
-1 -> Load all nodes  

### CSV Only

_VertexGraph.Config._**manualOrderSet**  
Input array of desired order of CSV columns. Columns names and index number (starting at 1) can be used interchangeably. An empty array assumes sequential order.  

_VertexGraph.Config._**linkColumns**  
*Example:* [{ID: (name or index), Target: (name or index)}]  
Input array of objects to determine which CSV columns store links for other columns. The ID key determines which column is a link columns. The target key determines the target columns for the links stored in the link column. Columns names and index number (starting at 1) can be used interchangeably.  

### Resolution  

_VertexGraph.Config._**fullScreenMode**  
true -> Use full screen of the webpage for the graph  
false -> Use assigned sizes for the graph resolution  

***When not in fullscreen mode***  

_VertexGraph.Config._**svgHeight**  
Pixel height of the graph  

_VertexGraph.Config._**svgWidth**  
Pixel width of the graph  
-1 -> Disregard svgWidth and use set ratio below  

***When svgWidth is disregarded and not in fullscreen mode***  

_VertexGraph.Config._**svgWidthRatio**  
Value between 0 - 1 determining percent size of graph width  

### Display  

#### Color

_VertexGraph.Config._**backgroundColor**  
Input color of graph background  

_VertexGraph.Config._**textColor**  
Input color of graph background  

_VertexGraph.Config._**colorSets**  
Input array of arrays of colors randomly used in the graph  

_VertexGraph.Config._**expandedOpacity**  
Value between 0 - 1 for a nodes' color opacity when the node is expanded (nodes' children are visible)  

_VertexGraph.Config._**collapsedOpacity**  
Value between 0 - 1 for a nodes' color opacity when the node is collapsed (nodes' children are hidden)

#### Sizing

_VertexGraph.Config._**maxLinkDistance**  
Maximum size of links between nodes (this will given to the nodes connected to the root)   

_VertexGraph.Config._**minLinkDistance**  
Minimum size of links between nodes (this will given to the nodes connected to the last created node layer)  

_VertexGraph.Config._**circleMax**  
Maximum base size of nodes (this will be given to root nodes)  

_VertexGraph.Config._**circleMin**  
Minimum base size of nodes (this will be given to the last created node layer)  

_VertexGraph.Config._**radiusMultiplier**  
Ideally a value between 0 - 1 that additionally multiplies the size of nodes depending on the number of children the node contains

_VertexGraph.Config._**maxMultipliedRadiusRatio**  
Ideally a value above 1 that limits the potential multiplied size of nodes to the base size multiplied by this value

#### Forces

_VertexGraph.Config._**baseStrength**  
Ideally a negative value for the base strength of the repulsion of nodes  

_VertexGraph.Config._**regularForceDistance**  
The maximum distance where nodes get affected by other nodes in the force simulation

_VertexGraph.Config._**seperationAlphaTarget**  
Ideally a number between 1 - 2 that increases the alpha target of the force simulation during a seperation event

_VertexGraph.Config._**startSeperateDelay**  
The base value of ticks that a starting seperation event is active

_VertexGraph.Config._**clickSeperateDelay**  
The base value of ticks that a click seperation event is active

#### Misc

_VertexGraph.Config._**panMultiplier**  
A multiplier on the severity of the graph's panning

For more examples and documentation, please visit our website.

## Contributing

We welcome contributions from the community! If you would like to contribute to VertexGraph, please read our [contribution guidelines](https://chat.openai.com/chat/CONTRIBUTING.md) and [code of conduct](https://chat.openai.com/chat/CODE_OF_CONDUCT.md) before getting started.



## License

VertexGraph is open-source software licensed under the [MIT License](https://chat.openai.com/chat/LICENSE).
