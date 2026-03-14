import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 1000, leftMargin = 60, height = 700, topMargin = 40, tableOfContentsWidth = 300, maxBarCount = 15
const costLabels = ["First Cost", "Landed Cost", "Hanger", "Packaging & Label", "Trim", "Wash","Yarn Cost", "Tertiary Cost"]
let index = 0;

//Each index: {id: string, color: string}
let clicked = []

let data = (await d3.csv("http://127.0.0.1:3000/CSE332 Dataset.csv")).map((entry)=>{
    return {
        ...entry,
        "Duty Rate": parseFloat(entry["Duty Rate"]),
        "Fabric (per yd/lb)": parseFloat(entry["Fabric (per yd/lb)"]),
        "First Cost": parseFloat(entry["First Cost"]),
        "Hanger": parseFloat(entry["Hanger"]),
        "Landed Cost": parseFloat(entry["Landed Cost"]),
        "Misc": parseFloat(entry["Misc"]),
        "Packaging & Label": parseFloat(entry["Packaging & Label"]),
        "Tertiary Cost": parseFloat(entry["Tertiary Cost"]),
        "Trim": parseFloat(entry["Trim"]),
        "Wash": parseFloat(entry["Wash"]),
        "YY": parseFloat(entry["YY"]),
        "Yarn Cost": parseFloat(entry["YY"])*parseFloat(entry["Fabric (per yd/lb)"])
    }
})
let eigenvalues = (await d3.csv("http://127.0.0.1:3000/eigenValues.csv")).reduce((acc,eigenvalue)=>{return {...acc, [eigenvalue["Property"]]: parseFloat(eigenvalue["Eigenvalue"])}},{})
let eigenVectors = (await d3.csv("http://127.0.0.1:3000/eigenVectors.csv")).reduce((acc,x)=>{return {...acc, [x["Property"]]:[...Array(Object.keys(eigenvalues).length).keys()].map((index)=>parseFloat(x[index]))}},{})
let mdsEuclideanData = (await d3.csv("http://127.0.0.1:3000/mdsEuclidian.csv")).map((point)=>[parseFloat(point["x"]),parseFloat(point["y"])])
let objectiveValues = (await d3.csv("http://127.0.0.1:3000/objectiveValues.csv"))["columns"].map((x)=>parseFloat(x))
let kMeansGroup = (await d3.csv("http://127.0.0.1:3000/kMeansGroup.csv")).map((x)=>{return {...x, ["Group"]:parseInt(x["Group"])}})
console.log(kMeansGroup)

let propertyAvg = Object.keys(data[0]).reduce((acc, property)=>{return {...acc,[property]: data.reduce((acc,dataEntry)=>(acc + dataEntry[property]),0)/data.length}},{})
let sampleStdDevAvg = Object.keys(data[0]).reduce((acc, property)=>{return {...acc,[property]: Math.sqrt(data.reduce((acc,dataEntry)=>(acc + Math.pow(dataEntry[property] - propertyAvg[property],2)),0)/(data.length - 1))}},{})

//HELPER FUNCTIONS
function randomColor(){
return [Math.floor(Math.random()*235 + 20),Math.floor(Math.random()*235 + 20),Math.floor(Math.random()*235 + 20)]
}

//Takes in a property in data that is numerical and returns the average per item ID as a JS object
function propertyAveragePerID(property){
let itemIDSums = data.reduce((acc,x)=>{
if(!acc[x["Item ID"]]){
    return {...acc,[x["Item ID"]]:{total: x[property], frequency: 1}}
}
return {...acc, [x["Item ID"]]:{total: acc[x["Item ID"]].total + x[property], frequency: acc[x["Item ID"]].frequency + 1}}
},{})
return Object.keys(itemIDSums).reduce((acc,itemID)=>{return {...acc, [itemID]:itemIDSums[itemID]["total"]/itemIDSums[itemID]["frequency"]}},{})
}

function addDropdownOptions(id, dropdownOptions){
document.getElementById(id).innerHTML =  dropdownOptions.reduce((acc, vendor) => acc + `<option value=\"${vendor}\">${vendor}</option> \n`,"");
}

function supplyDropdowns(){
addDropdownOptions("vendorDropdown",Array.from(new Set(data.map((x)=>x["Supplier Name"]))))
addDropdownOptions("costDropdown", costLabels)
}

function clearSVGCanvas(svgCanvas){
svgCanvas.selectAll("g").remove()
svgCanvas.selectAll("text").remove()
}

function rgbString(r,g,b,a=1){
return `rgba(${r},${g},${b},${a})`
}

//Chart creations
let svgBarReference = d3.select("#barChart").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`) 

let svgParallelReference = d3.select("#parallelChart").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`) 

let svgBiReference = d3.select("#biChart").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`) 

let svgMDSReference = d3.select("#mdsChart").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`) 

supplyDropdowns()


//Event Listeners
document.getElementById("leftBarChartButton").addEventListener("click",function(){
if(index < 0){
index = 0;
}
else if(index > 0){
index--;
clicked = clicked.filter((x)=>document.getElementById("vendorDropdown").value !== x.id)
refreshGraphs();
}
})
document.getElementById("rightBarChartButton").addEventListener("click",function(){
if([...new Set(data.filter((x)=>x["Supplier Name"] === document.getElementById("vendorDropdown").value).map((x)=>x["Item ID"]))].length - index * maxBarCount > maxBarCount){
index++;
clicked = clicked.filter((x)=>document.getElementById("vendorDropdown").value !== x.id)
refreshGraphs()
}
})
document.getElementById("clearColors").addEventListener("click",function(){
clicked = []
refreshGraphs()
})
document.getElementById("vendorDropdown").addEventListener("change", function(){
index = 0;
clicked = []
refreshBarGraph(svgBarReference);
})
document.getElementById("costDropdown").addEventListener("change", function(){
index = 0;
clicked = clicked.filter((x)=>document.getElementById("vendorDropdown").value === x.id)
refreshBarGraph(svgBarReference);
})

//Handle Item Clicks
function handleVendorClick(){
    if(clicked.some((x)=>document.getElementById("vendorDropdown").value===x.id)){
        clicked = clicked.filter((x)=>document.getElementById("vendorDropdown").value !== x.id)
    }
    else{
        clicked.push({id: document.getElementById("vendorDropdown").value, color: randomColor()})
    }
    refreshGraphs()
}
function handleItemIDClick(id){
    if(clicked.some((x)=>id===x.id)){
        clicked = clicked.filter((x)=>id!== x.id)
    }
    else{
        clicked.push({id: id, color: randomColor()})
    }
    refreshGraphs()
}

//Bar Graph Functions
function addXAxisTitle(svgCanvas, text){
    svgCanvas.append("text")
    .attr("transform",`translate(${width/2-leftMargin},${height + 2*topMargin})`).attr("font-size","2em").text(text);
}
function addYAxisTitle(svgCanvas, text){
    svgCanvas.append("text")
    .attr("transform",`translate(${-10},${height/2 + topMargin}), rotate(-90)`).attr("font-size","2em").text(text);
}
function addChartTitle(svgCanvas, text){
    svgCanvas.append("text")
    .attr("transform",`translate(${width/2},-${topMargin})`).attr("text-anchor","middle").attr("font-size","2em").text(text);
    // .attr("x","50%").attr("font-size","2em").text(text);
}
function addLegend(svgCanvas, contents){  //contents: JS Object {[name]: color string}
    let tableOfContentsGroup = svgCanvas.append("g")
    .attr("transform", `translate(${width + 2*leftMargin},${2*topMargin})`)
    .attr("style", "outline: thick solid black; outline-offset: 10px;")
    Object.keys(contents).forEach((name,i)=>{
        tableOfContentsGroup.append("circle")
        .attr("cx", 10)
        .attr("cy", 5 + 40*i)
        .attr("r", 15)
        .attr("fill", contents[name])
        tableOfContentsGroup.append("text")
        .attr("x", 40)
        .attr("y", 10 + 40*i)
        .attr("font-size", "1.5em")
        .text(name)
    })
}

//Has hardcoded reference
function refreshBarGraph(svgCanvas){
    let vendorData = data.filter((x)=>x["Supplier Name"] === document.getElementById("vendorDropdown").value).slice(index*maxBarCount,(index+1)*maxBarCount);
    clearSVGCanvas(svgCanvas);
    let yLinScale = addBarAxisToD3(svgCanvas, vendorData);
    addBars(svgCanvas, vendorData, yLinScale)
    addChartTitle(svgCanvas, `${document.getElementById("vendorDropdown").value}'s ${document.getElementById("costDropdown").value} Performance`)
}

function addXAxisToBar(vendorData){
    return d3.axisBottom(
        d3.scaleBand() 
        .domain([...new Set(vendorData.map((x)=>x["Item ID"]))]) //Range of data 
        .range([0, width-leftMargin]) //Height of line
    );
}
function addYAxisToD3(svgCanvas, vendorData, property, additionalMax){    
    if(!additionalMax)
        additionalMax = 0

    let yLinScale = d3.scaleLinear() 
    .domain([0, Math.max(additionalMax, vendorData.map((x)=>x[property]).reduce((acc,x)=> acc < x? x:acc,0))])
    .range([height, 0])

    svgCanvas.append("g")
        .attr("transform", `translate(${leftMargin},0)`)
        .call(d3.axisLeft(yLinScale)).selectAll("text")
        .attr("transform", "scale(2)")

    return yLinScale; 
}
function addBarAxisToD3(svgCanvas, vendorData){
    svgCanvas.append("g")
        .attr("transform", `translate(${leftMargin},${height})`)
        .call(addXAxisToBar(vendorData)).selectAll("text")
        .attr("transform", "scale(2)")
    
    let averages = propertyAveragePerID(document.getElementById("costDropdown").value)
    
    let yLinScale = addYAxisToD3(svgCanvas, vendorData, document.getElementById("costDropdown").value, vendorData.map((x)=>averages[x["Item ID"]]).reduce((acc,x)=>acc>x? acc:x,0))

    addXAxisTitle(svgCanvas, "Item ID")
    addYAxisTitle(svgCanvas, `${document.getElementById("costDropdown").value} ($)`);
    return yLinScale;
}
function addBars(svgCanvas, vendorData, yLinScale){
    let barGroup = svgCanvas.append("g")
    let distance = (width - leftMargin)/vendorData.length;
    let propertyAverages = propertyAveragePerID(document.getElementById("costDropdown").value)
    for(let i = 0; i < maxBarCount; i++){
        if(!vendorData[i]){
            continue;
        }

        let vendorColor = clicked.find((x)=>document.getElementById("vendorDropdown").value === x.id)

        //Vendor Averages Bar
        let vendorBarHeight = yLinScale(vendorData[i][document.getElementById("costDropdown").value])
        barGroup.append("rect")
        .attr("x", leftMargin + (i+.5)*distance - (width - leftMargin)/(vendorData.length * 4))
        .attr("y", vendorBarHeight)
        .attr("width", (width - leftMargin)/(vendorData.length * 4))
        .attr("height", height - vendorBarHeight)
        .attr("fill", vendorColor? rgbString(...vendorColor.color):"rgb(0,0,0)").on('click',function(data,index){
            handleVendorClick()
        })

        let avgBarHeight = yLinScale(propertyAverages[vendorData[i]["Item ID"]]);
        let itemIDColor = clicked.find((x)=> vendorData[i]["Item ID"] === x.id)

        //Averages Bar
        barGroup.append("rect")
        .attr("x", leftMargin + (i+.5)*distance)
        .attr("y", avgBarHeight)
        .attr("width", (width - leftMargin)/(vendorData.length * 4))
        .attr("height", height - avgBarHeight)
        .attr("stroke", "rgb(255,255,255)")
        .attr("fill", itemIDColor? rgbString(...itemIDColor.color):"rgb(0,0,0)").on("click", function(data,index){
            handleItemIDClick(vendorData[i]["Item ID"])
        })
    }
}

let propertyRanges = Object.keys(data[0]).reduce((acc, property)=>{return {...acc,[property]: d3.extent(data.map((dataEntry)=>dataEntry[property]))}},{})

function refreshParallelCoordinatesGraph(svgCanvas, properties){
    clearSVGCanvas(svgCanvas);
    let axesScale = properties.map((property)=>d3.scaleLinear().domain(propertyRanges[property]).range([height,0])) 
    data.forEach((entry)=>{
        let color = determineClickedColor(entry["Supplier Name"], entry["Item ID"])
        let entryGroup = svgCanvas.append("g");
        for(let i = 0; i < properties.length - 1; i++){
            entryGroup.append("line")
            .attr("x1",leftMargin + (i+.5)*((width - leftMargin)/properties.length))
            .attr("x2",leftMargin + (i+1.5)*((width - leftMargin)/properties.length))
            .attr("y1",topMargin + axesScale[i](entry[properties[i]]))
            .attr("y2",topMargin + axesScale[i+1](entry[properties[i+1]]))
            .attr("stroke",((color)? rgbString(...color):rgbString(0,0,0,(clicked.length === 0)? .6:.05)))
            .attr("stroke-width", (color)? 1.5:1)
        }
    })
    axesScale.forEach((axis,i)=>{
        svgCanvas.append("g")
        .attr("transform",`translate(${leftMargin + (i+.5)*((width - leftMargin)/properties.length)},${topMargin})`)
        .call(d3.axisLeft(axis))
    })
    svgCanvas.append("g").attr("transform",`translate(${leftMargin},${height + topMargin})`)
    .call(d3.axisBottom(
        d3.scaleBand() 
        .domain(properties) //Range of data 
        .range([0,width-leftMargin]) //Height of line
    ));
}

function determineClickedColor(vendor, itemID){
    let vendorColor;
    let itemIDColor;
    clicked.forEach((x)=>{
        if(x.id === vendor)
            vendorColor = x.color
        else if(x.id === itemID)
            itemIDColor = x.color
    })
    if(vendorColor && itemIDColor)
        return vendorColor.map((x,i)=>(x+itemIDColor[i])/2)
    if(vendorColor)
        return vendorColor
    if(itemIDColor)
        return itemIDColor
}

function refreshGraphs(){
    refreshBarGraph(svgBarReference)
    refreshParallelCoordinatesGraph(svgParallelReference, ["Tertiary Cost", "First Cost", "Landed Cost", "Yarn Cost", "Hanger", "Wash", "Trim", "Packaging & Label"])
    refreshBiPlot(svgBiReference,[...Object.keys(eigenvalues).toSorted((a,b)=>eigenvalues[b] - eigenvalues[a]).slice(0,2).map((property)=>eigenVectors[property]),["First Cost", "Landed Cost", "Hanger", "Packaging & Label", "Trim", "Wash","Yarn Cost", "Tertiary Cost"]])
    refreshEuclidDistancePlot(svgMDSReference,mdsEuclideanData)
}

function dot(vector1, vector2){
    if(vector1.length !== vector2.length){
        console.warn("Length of vector 1 is not equal to vector 2. Ensure data formatted correctly:", vector1, vector2);
    }
    return vector1.reduce((acc,x,i)=>acc + x*vector2[i],0);
}

function refreshBiPlot(svgCanvas, flags){ //Properties: eigenvector 1, eigenvector 2, property array, 
    clearSVGCanvas(svgCanvas)
    let normalizedData = data.map((dataEntry)=>Object.keys(dataEntry).reduce((acc,property)=>{return {...acc,[property]:(Number.isNaN(Number(dataEntry[property])))? dataEntry[property]:(dataEntry[property] - propertyAvg[property])/sampleStdDevAvg[property], "Item ID":dataEntry["Item ID"]}},{}))
    let xDataValues = normalizedData.map((dataEntry)=>{
        let color = determineClickedColor(dataEntry["Supplier Name"], dataEntry["Item ID"])
        return {data:dot(flags[2].map((property)=>dataEntry[property]), flags[0]), color: color}}
    )
    let yDataValues = normalizedData.map((dataEntry)=>dot(flags[2].map((property)=>dataEntry[property]), flags[1]))
    let xLinearScale = d3.scaleLinear().domain(d3.extent([...xDataValues.map((x)=>x["data"]),0])).range([0, width - leftMargin]);
    let yLinearScale = d3.scaleLinear().domain(d3.extent([...yDataValues,0])).range([height - topMargin,0]);
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${height})`).call(d3.axisBottom(xLinearScale))
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`).call(d3.axisLeft(yLinearScale))
    let pointGroups = svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`)
    xDataValues.forEach((dataPoint,i)=>{
        pointGroups.append("circle")
        .attr("cx", xLinearScale(dataPoint["data"]))
        .attr("cy", yLinearScale(yDataValues[i]))
        .attr("r",(dataPoint["color"])?4:2)
        .style("fill",(dataPoint["color"])? rgbString(...dataPoint["color"]):rgbString(0,0,0,(clicked.length === 0)? 1:.3))
    })
    let biPlotPCAVectorGroup = svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`);
    flags[0].forEach((x,i)=>{
        biPlotPCAVectorGroup.append("line")
        .attr("x1",xLinearScale(0))
        .attr("y1",yLinearScale(0))
        .attr("x2",xLinearScale(x))
        .attr("y2",yLinearScale(flags[1][i]))
        .attr("stroke", "#000000")
        .style("stroke-width","2px")
        biPlotPCAVectorGroup.append("text")
        .attr("transform", `translate(${xLinearScale(x) /*+ ((xLinearScale(x) > 0)? 30:0)*/},${yLinearScale(flags[1][i]) + ((flags[1][i] < 0)? 10:-5)})`).attr("text-anchor",((x > 0)? "start":"end")).text(flags[2][i])
    })
    svgCanvas.append("text").attr("transform",`translate(${width/2-leftMargin},${height + 2*topMargin})`).attr("font-size","2em").text("PCA1");
    svgCanvas.append("text").attr("transform",`translate(${0},${(height+topMargin)/2}) rotate(-90)`).attr("font-size","2em").text("PCA2");
}

function refreshEuclidDistancePlot(svgCanvas, euclidData){
    let xDataValues = euclidData.map((dataEntry,i)=>{
        let color = determineClickedColor(data[i]["Supplier Name"], data[i]["Item ID"]);
        return {data:dataEntry[0], color:rgbString(...((color)? color:[0,0,0]))}})
    let yDataValues = euclidData.map((dataEntry)=>dataEntry[1])
    let xLinearScale = d3.scaleLinear().domain(d3.extent(xDataValues.map((x)=>x["data"]))).range([0, width - leftMargin]);
    let yLinearScale = d3.scaleLinear().domain(d3.extent(yDataValues)).range([height - topMargin,0]);
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${height})`).call(d3.axisBottom(xLinearScale))
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`).call(d3.axisLeft(yLinearScale))
    let pointGroups = svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`)
    xDataValues.forEach((dataPoint,i)=>{
        pointGroups.append("circle")
        .attr("cx", xLinearScale(dataPoint["data"]))
        .attr("cy", yLinearScale(yDataValues[i]))
        .attr("r",3)
        .style("fill",dataPoint["color"])
    })
}

function refreshScreePlot(svgCanvas, properties){ //properties = eigenvalues
    let axesScale = d3.scaleLinear().domain(d3.extent([...properties, 0])).range([height - topMargin, 0])
    svgCanvas.append("g")
        .attr("transform",`translate(${leftMargin + (.5)*((width - leftMargin)/properties.length)},${topMargin})`)
        .call(d3.axisLeft(axesScale))
    svgCanvas.append("g")
        .attr("transform",`translate(${leftMargin},${height})`)
        .call(d3.axisBottom(d3.scaleBand().domain([...Array(properties.length).keys()].map((x)=>x+1)).range([0,width - leftMargin])))
    let screeLineGroup = svgCanvas.append("g");
    let supportingLineGroup = svgCanvas.append("g")
    let sortedEigenvalues = properties.sort((a,b)=>b-a);
    for(let i = 0; i < properties.length - 1; i++){
        screeLineGroup.append("line")
        .attr("x1",leftMargin + (i+.5)*((width - leftMargin)/properties.length))
        .attr("x2",leftMargin + (i+1.5)*((width - leftMargin)/properties.length))
        .attr("y1",topMargin + axesScale(sortedEigenvalues[i]))
        .attr("y2",topMargin + axesScale(sortedEigenvalues[i+1]))
        .attr("stroke","#000000")
        supportingLineGroup.append("line") 

        .attr("x1",leftMargin + (i+1.5)*((width - leftMargin)/properties.length))
        .attr("x2",leftMargin + (i+1.5)*((width - leftMargin)/properties.length))
        .attr("y1",topMargin + axesScale(0))
        .attr("y2",topMargin + axesScale(sortedEigenvalues[i+1]))
        .attr("stroke","#00000055")
    }
    svgCanvas.append("text").attr("transform",`translate(${width/2-leftMargin},${height + 2*topMargin})`).attr("font-size","2em").text("Number of clusters");
    svgCanvas.append("text").attr("transform",`translate(${0},${(height+topMargin)/1.3}) rotate(-90)`).attr("font-size","2em").text("Objective Function Square Error");
}

let groupColors = [randomColor(),randomColor(),randomColor()].map((x)=>rgbString(...x))

function findGroupColor(vendor, id){
    let group = kMeansGroup.find((entry)=>entry["Supplier Name"] === vendor && entry["Item ID"] === id)
    if(group)
        return groupColors[group["Group"]]
    return rgbString(0,0,0)
}

//Clutersing K-Means Graphs
function refreshParallelCoordinatesKMeans(svgCanvas, properties){
    clearSVGCanvas(svgCanvas);
    let axesScale = properties.map((property)=>d3.scaleLinear().domain(propertyRanges[property]).range([height,0])) 
    data.forEach((entry)=>{
        let color = determineClickedColor(entry["Supplier Name"], entry["Item ID"])
        let entryGroup = svgCanvas.append("g");
        for(let i = 0; i < properties.length - 1; i++){
            entryGroup.append("line")
            .attr("x1",leftMargin + (i+.5)*((width - leftMargin)/properties.length))
            .attr("x2",leftMargin + (i+1.5)*((width - leftMargin)/properties.length))
            .attr("y1",topMargin + axesScale[i](entry[properties[i]]))
            .attr("y2",topMargin + axesScale[i+1](entry[properties[i+1]]))
            .attr("stroke", findGroupColor(entry["Supplier Name"], entry["Item ID"]))
            .attr("stroke-width", (color)? 1.5:1)
        }
    })
    axesScale.forEach((axis,i)=>{
        svgCanvas.append("g")
        .attr("transform",`translate(${leftMargin + (i+.5)*((width - leftMargin)/properties.length)},${topMargin})`)
        .call(d3.axisLeft(axis))
    })
    svgCanvas.append("g").attr("transform",`translate(${leftMargin},${height + topMargin})`)
    .call(d3.axisBottom(
        d3.scaleBand() 
        .domain(properties) //Range of data 
        .range([0,width-leftMargin]) //Height of line
    ));
}
function refreshBiPlotKMeans(svgCanvas, flags){ //Properties: eigenvector 1, eigenvector 2, property array, 
    clearSVGCanvas(svgCanvas)
    let normalizedData = data.map((dataEntry)=>Object.keys(dataEntry).reduce((acc,property)=>{return {...acc,[property]:(Number.isNaN(Number(dataEntry[property])))? dataEntry[property]:(dataEntry[property] - propertyAvg[property])/sampleStdDevAvg[property], "Item ID":dataEntry["Item ID"]}},{}))
    let xDataValues = normalizedData.map((dataEntry)=>{
        let color = findGroupColor(dataEntry["Supplier Name"], dataEntry["Item ID"])
        return {data:dot(flags[2].map((property)=>dataEntry[property]), flags[0]), color: color}}
    )
    let yDataValues = normalizedData.map((dataEntry)=>dot(flags[2].map((property)=>dataEntry[property]), flags[1]))
    let xLinearScale = d3.scaleLinear().domain(d3.extent([...xDataValues.map((x)=>x["data"]),0])).range([0, width - leftMargin]);
    let yLinearScale = d3.scaleLinear().domain(d3.extent([...yDataValues,0])).range([height - topMargin,0]);
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${height})`).call(d3.axisBottom(xLinearScale))
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`).call(d3.axisLeft(yLinearScale))
    let pointGroups = svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`)
    xDataValues.forEach((dataPoint,i)=>{
        pointGroups.append("circle")
        .attr("cx", xLinearScale(dataPoint["data"]))
        .attr("cy", yLinearScale(yDataValues[i]))
        .attr("r",(dataPoint["color"])?4:2)
        .style("fill",(dataPoint["color"])? dataPoint["color"]:rgbString(0,0,0,(clicked.length === 0)? 1:.3))
    })
    let biPlotPCAVectorGroup = svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`);
    flags[0].forEach((x,i)=>{
        biPlotPCAVectorGroup.append("line")
        .attr("x1",xLinearScale(0))
        .attr("y1",yLinearScale(0))
        .attr("x2",xLinearScale(x))
        .attr("y2",yLinearScale(flags[1][i]))
        .attr("stroke", "#000000")
        .style("stroke-width","2px")
        biPlotPCAVectorGroup.append("text")
        .attr("transform", `translate(${xLinearScale(x) /*+ ((xLinearScale(x) > 0)? 30:0)*/},${yLinearScale(flags[1][i]) + ((flags[1][i] < 0)? 10:-5)})`).attr("text-anchor",((x > 0)? "start":"end")).text(flags[2][i])
    })
    svgCanvas.append("text").attr("transform",`translate(${width/2-leftMargin},${height + 2*topMargin})`).attr("font-size","2em").text("PCA1");
    svgCanvas.append("text").attr("transform",`translate(${0},${(height+topMargin)/2}) rotate(-90)`).attr("font-size","2em").text("PCA2");
}

function refreshEuclidDistanceKMeans(svgCanvas, euclidData){
    let xDataValues = euclidData.map((dataEntry,i)=>{
        let color = findGroupColor(data[i]["Supplier Name"], data[i]["Item ID"]);
        return {data:dataEntry[0], color:color}})
    let yDataValues = euclidData.map((dataEntry)=>dataEntry[1])
    let xLinearScale = d3.scaleLinear().domain(d3.extent(xDataValues.map((x)=>x["data"]))).range([0, width - leftMargin]);
    let yLinearScale = d3.scaleLinear().domain(d3.extent(yDataValues)).range([height - topMargin,0]);
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${height})`).call(d3.axisBottom(xLinearScale))
    svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`).call(d3.axisLeft(yLinearScale))
    let pointGroups = svgCanvas.append("g").attr("transform", `translate(${leftMargin},${topMargin})`)
    xDataValues.forEach((dataPoint,i)=>{
        pointGroups.append("circle")
        .attr("cx", xLinearScale(dataPoint["data"]))
        .attr("cy", yLinearScale(yDataValues[i]))
        .attr("r",3)
        .style("fill",dataPoint["color"])
    })
}



refreshGraphs()
refreshScreePlot(d3.select("#elbowChart").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`), objectiveValues)
refreshParallelCoordinatesKMeans(d3.select("#kMeansParallelCoordinates").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`), ["Tertiary Cost", "First Cost", "Landed Cost", "Yarn Cost", "Hanger", "Wash", "Trim", "Packaging & Label"])
refreshBiPlotKMeans(d3.select("#kMeansBiPlot").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`), [...Object.keys(eigenvalues).toSorted((a,b)=>eigenvalues[b] - eigenvalues[a]).slice(0,2).map((property)=>eigenVectors[property]),["First Cost", "Landed Cost", "Hanger", "Packaging & Label", "Trim", "Wash","Yarn Cost", "Tertiary Cost"]])
refreshEuclidDistanceKMeans(d3.select("#kMeansMDS").append("svg")
.attr("width", width + 2*leftMargin + tableOfContentsWidth) //For y axis + table of contents
.attr("height", height + 5*topMargin) //For title + graph + bottom x axis
.append("g")
.attr("transform",`translate(${leftMargin},${2*topMargin})`), mdsEuclideanData)
