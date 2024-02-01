import { useState, useEffect, useRef } from 'react'
import 'chart.js/auto'
import 'chartjs-adapter-date-fns'
import { Line } from 'react-chartjs-2'
import { readString } from 'react-papaparse'
import axios from 'axios'
//import { publicPath } from '@next/env'

import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButtonGroup,
    ToggleButton,
    Switch,
    Typography,
} from '@mui/material'
import dynamic from 'next/dynamic'
import { Black_And_White_Picture } from 'next/font/google'
const zoomPlugin = dynamic(() => import('chartjs-plugin-zoom'), {
    ssr: false,
})

let globalMetadata = []
let fileList = {}
// const lineColorList = ['rgb(75, 192, 192)', 'rgb(255, 180, 48)', 'rgb(255, 230, 48)', 'rgb(255, 130, 48)']
const datasetLabels = ['Actual', 'Predictive', 'Upper Bound', 'Lower Bound']
const metadataRoute = `/metadata.txt`
//console.log(metadataRoute)

const determinePointColor = (pointType) => {
    console.log(pointType)
    if (pointType.includes("Upper Bound")){
            return "black";
    }
    else if(pointType.includes("Predictive")){
            return "red"
    }
    else if(pointType.includes("Lower Bound"))
    {
        return "green"
    }
    else{
            return "blue"
    }

};
const stateNames = {
  "01": "ALABAMA",
  "02": "ALASKA",
  "04": "ARIZONA",
  "05": "ARKANSAS",
  "06": "CALIFORNIA",
  "08": "COLORADO",
  "09": "CONNECTICUT",
  "10": "DELAWARE",
  "11": "DISTRICT OF COLUMBIA",
  "12": "FLORIDA",
  "13": "GEORGIA",
  "15": "HAWAII",
  "16": "IDAHO",
  "17": "ILLINOIS",
  "18": "INDIANA",
  "19": "IOWA",
  "20": "KANSAS",
  "21": "KENTUCKY",
  "22": "LOUISIANA",
  "23": "MAINE",
  "24": "MARYLAND",
  "25": "MASSACHUSETTS",
  "26": "MICHIGAN",
  "27": "MINNESOTA",
  "28": "MISSISSIPPI",
  "29": "MISSOURI",
  "30": "MONTANA",
  "31": "NEBRASKA",
  "32": "NEVADA",
  "33": "NEW HAMPSHIRE",
  "34": "NEW JERSEY",
  "35": "NEW MEXICO",
  "36": "NEW YORK",
  "37": "NORTH CAROLINA",
  "38": "NORTH DAKOTA",
  "39": "OHIO",
  "40": "OKLAHOMA",
  "41": "OREGON",
  "42": "PENNSYLVANIA",
  "44": "RHODE ISLAND",
  "45": "SOUTH CAROLINA",
  "46": "SOUTH DAKOTA",
  "47": "TENNESSEE",
  "48": "TEXAS",
  "49": "UTAH",
  "50": "VERMONT",
  "51": "VIRGINIA",
  "53": "WASHINGTON",
  "54": "WEST VIRGINIA",
  "55": "WISCONSIN",
  "56": "WYOMING",
  "72": "PUERTO RICO",
  "78": "Virgin Islands (U.S)",
  "US": "US"
};


function generateColor(quantile) {
    if (quantile === "0" || quantile === "1") { // Check if it's a bound
        return (quantile === "0") ? 'green' : 'black'; // Assign specific colors for bounds
    }
    let hash = 0;
    if (quantile.length === 0) return hash;
    for (let i = 0; i < quantile.length; i++) {
        const char = quantile.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const color = 'hsl(' + hash % 360 + ', 100%, 70%)';
    return color;
}


function parseMetadata(metadata) {
    const regex = /\{\s*([^}]+)\s*\}/g; 
    let match;
    const items = [];
    let lastIncident = 1;
    let lastCumulative = 0;
    let lastDataFreq = 'inc';
    let lasttitle = ''
    let lastxtitle = ''
    let lastytitle = ''

    while ((match = regex.exec(metadata)) !== null) {
        const item = {
            data_type: 'prediction',
            quantile: 'mean',
            data_freq: lastDataFreq,
            incident: lastIncident,
            cumulative: lastCumulative,
            title: lasttitle,
            xtitle:  lastxtitle,
            ytitle: lastytitle
        };
        
        const properties = match[1]
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        for (const property of properties) {
            const [key, value] = property.split('=').map((s) => s.trim());
            const cleanedValue = value.replace(/["{}]/g, ''); 

            item[key] = cleanedValue;
            console.log("PAIR")
            console.log(key)
            console.log(cleanedValue)
            
        }
        if (item.data_type === 'truth') {
            delete item.quantile;
        }
        if (item.data_freq !== undefined) {
            lastDataFreq = item.data_freq;
        }
        if (item.incident !== undefined) {
            lastIncident = parseInt(item.incident, 10);
        }
        if (item.cumulative !== undefined) {
            lastCumulative = parseInt(item.cumulative, 10);
        }
        if (item.title) lasttitle = item.title;
        if (item.xtitle) lastxtitle = item.xtitle;
        if (item.ytitle) lastytitle = item.ytitle;
      
        items.push(item);
    }
    console.log(items)

    const result = {};

    items.forEach(dataObj => {
        // Determine the target
        const target = dataObj.target;
        




        if (!result[target]) {
            result[target] = { target: target, urls:{}};
        }

        if (dataObj.data_type === "truth" || dataObj.data_type === "ground_truth") {
            result[target].urls['truth'] = dataObj.url;
        } else if (dataObj.quantile !== undefined) {
            result[target].urls[dataObj.quantile] = dataObj.url_quantile || dataObj.url_lower || dataObj.url_upper || dataObj.url;
        }
        console.log("CHECK CUMULATIVE")
        console.log(dataObj.cumulative)
        if (!result[target].data_freq && dataObj.data_freq != undefined) {
            result[target]["data_freq"] = dataObj.data_freq; // Set to 'incident' if specified as "1"
        }
        if (!result[target].cumulative&& dataObj.cumulative != undefined) {
            result[target].cumulative = dataObj.cumulative; // Set to 'incident' if specified as "1"
        }
        if (dataObj.incident != undefined) {
            result[target].incident = dataObj.incident; // Set to 'incident' if specified as "1"
        }
        if (!result[target].title && dataObj.title != undefined) {
            result[target]["title"] = dataObj.title // Set to 'incident' if specified as "1"
        }
        if (!result[target].xtitle&& dataObj.xtitle != undefined) {
            result[target]["xtitle"] = dataObj.xtitle; // Set to 'incident' if specified as "1"
        }
        if (!result[target].ytitle&& dataObj.ytitle != undefined) {
            result[target]["ytitle"]= dataObj.ytitle; // Set to 'incident' if specified as "1"
        }
    });
    console.log(result)
    return result;
}

const getMetadata = async () => {
    const metadataResponse = await fetch(metadataRoute)
    //console.log(metadataResponse)
    const metadataContent = await metadataResponse.text()
    const metadata = parseMetadata(metadataContent)
    console.log(metadata)
    return metadata
}

const getUrls = () => {
    let urlObj = {}
    for (const target in globalMetadata) {
        let urls = []
        const item = globalMetadata[target]
        urls.push(item.url)
        if ('url_lower' in item) urls.push(item.url_lower)
        if ('url_upper' in item) urls.push(item.url_upper)
        if ('url_quantile' in item) urls.push(item.url_quantile)
        urlObj[target] = urls
    }
    return urlObj
}

// custom plugin for tooltip and vertical + horizontal guidelines on hover
// const hoverLinePlugin = {
//     afterDatasetsDraw(chart) {
//         const {
//             ctx,
//             tooltip,
//             chartArea: { bottom, left },
//             scales: { x, y },
//         } = chart

//         if (tooltip && tooltip._active.length > 0) {
//             const xCoor = x.getPixelForValue(tooltip.dataPoints[0].dataIndex)
//             const yCoor = y.getPixelForValue(tooltip.dataPoints[0].parsed.y)

//             ctx.save()
//             ctx.beginPath()
//             ctx.lineWidth = 3
//             ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
//             ctx.setLineDash([6, 4])
//             ctx.moveTo(xCoor, yCoor)
//             ctx.lineTo(xCoor, bottom)
//             ctx.stroke()
//             ctx.closePath()
//             ctx.beginPath()
//             ctx.lineWidth = 3
//             ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
//             ctx.setLineDash([6, 4])
//             ctx.moveTo(xCoor, yCoor)
//             ctx.lineTo(left, yCoor)
//             ctx.stroke()
//             ctx.closePath()
//             ctx.setLineDash([])
//         }
//     },
// }

function Forecast() {
    const [fileState, setFileState] = useState({
        name: '',
        urls: [],
        disp_second: false,
        disp1: "INCIDENT",
        disp2: "CUMULATIVE",
        title: '',
    xtitle: '',
    ytitle: ''
    })

    useEffect(() => {
        getMetadata().then((result) => {
            //console.log(result)
            globalMetadata = result
            console.log(globalMetadata)
            fileList = getUrls()
            const initalFileName = Object.keys(globalMetadata)[0]
            console.log("INITIALLL FILENAMEEEE")
            
            console.log(initalFileName)
            console.log(globalMetadata)
            console.log("*************")
            let disp = false
            let disp1 = "INCIDENT"
            let disp2 = "CUMULATIVE"
            console.log("DISPLAY CHECKKKK")
            console.log(globalMetadata[initalFileName].cumulative)
            if (globalMetadata[initalFileName].cumulative==0){
                disp = false
                if(globalMetadata[initalFileName].data_freq=="inc"){
                    disp1= "INCIDENT"

                }
                else{
                    disp1 = "CUMULATIVR"
                }
            }
            else{
                disp = true
                if(globalMetadata[initalFileName].data_freq=="inc"){
                    disp2= "CUMULATIVE"

                }
                else{
                    disp1 = "CUMULATIVE"
                    disp2 = "INCIDENT"
                }
                console.log("DISPLAY CHECKKKK")
                console.log(disp)

            }
            console.log("DISPLAY CHECKKKK")
                console.log(disp)
            
            setFileState({
                name: initalFileName,
                urls: globalMetadata[initalFileName].urls,
                disp_second: disp,
                disp1: disp1,
                disp2 : disp2,
                title: globalMetadata[initalFileName].title,
        xtitle: globalMetadata[initalFileName].xtitle,
        ytitle: globalMetadata[initalFileName].ytitle
                
            })
        })
    }, [])

    const [chartState, setChartState] = useState({
        
        multiple_plot: false,
        cum_or_inc: 'cum',
        category: '', // category of labels ie. country
        current_label: '', // current label to be displayed
        labels: [], // list of labels (ie. countries)
        cases: {
            // cases, actual and predictive, each index is a list of cases
            actual: {
                cases: [],
                dates: [],
            },
            pred: []
        },
        current_dataset: {
            // current dataset to be displayed
            datasets: [
                // list of datasets, more can be added to display different lines on the same chart
                {
                    label: 'loading data',
                    data: [], // cases (y axis)
                    fill: false,
                    tension: 0.1,
                },
            ],
        },
    })

    // fetch data from the actual data file
    const fetchData = async () => {
        if (fileState.name === '') return
        console.log("NAMEEEEEEEEE")
        console.log(fileState.name)

        let datasets = []

        let allBaseData = []
        let baseDates = []
        let category = ''

        let allPredData = []
        let predDates = []
        let labels = []
        //console.log(fileState)
        // set the colors for the actual and predictive data
        console.log("**********************")
        console.log(fileState.urls);
        for (const [quantile, url] of Object.entries(fileState.urls)) {
            let i=0;
            if(quantile == 'truth'){
                continue;
            }
            await axios.get(url).then((response) => {
                readString(response.data, {
                    worker: true,
                    complete: (results) => {
                        let cases = []
                        let predData = []
                        console.log("RESULTS LENGTH")
                        console.log(results.data)
                        // get label and cases array at each label


                        for (let j = 1; j < results.data.length; ++j) {
                            console.log("CHECKING LABELS")
                            if(results.data[j][1]!='US' && results.data[j][1]!=undefined ){
                                console.log(results.data[j][1])
                                console.log(stateNames[results.data[j][1].toString()])
                            }
                                
                            
                            if (results.data[j].length > 2) {
                                if(stateNames[results.data[j][1].toString()]!= undefined){
                                    labels[j - 1] = stateNames[results.data[j][1].toString()]
                                }
                                else{
                                    labels[j - 1] = results.data[j][1]
                                }
                                     // get the label
                                cases.push(results.data[j].slice(2)) // slice to remove the id and label from cases array
                            }
                        }
                        console.log("LABELS LENGTH")
                        console.log(labels.length)
                        console.log("**********************")
                        console.log(labels)

                        console.log("**********************")
                        console.log(cases)

                        console.log("**********************")
                        console.log(quantile)
                        console.log(results.data[0].slice(2))

                        console.log("**********************")

                        predDates.push(results.data[0].slice(2)) // slice to remove the id and label from dates array
                        allPredData.push({
                            quantile: quantile,
                            data: cases,})
                        console.log(predDates)
                        console.log("check**********************")
                        console.log(i);
                        console.log(predDates[i]);

                        if (predDates[i]) { // Check if predDates[i] exists
                            for (let j = 0; j < cases[0].length; ++j) {
                                if (predDates[i][j]) { // Check if the date exists
                                    predData.push({
                                        x: predDates[i][j],
                                        y: cases[0][j],
                                    });
                                }
                            }
                        }
                        i++;
                        let color;
         
            color = generateColor(quantile);
        
        let label;
        if (quantile === "0") {
            label = `${labels[0]} Lower Bound`;
        } else if (quantile === "1") {
            label = `${labels[0]} Upper Bound`;
        } else {
            label = `${labels[0]} quantile-${quantile}`;
        }
        
        datasets.push({
            label: label,
            data: predData,
            borderColor: color,
            backgroundColor: color,
        });
                    },
                })
            })
        }
        console.log("FILESTATE")
        console.log(fileState)
        await axios.get(fileState.urls['truth']).then((response) => {
            readString(response.data, {
                worker: true,
                complete: (results) => {
                    let cases = []
                    let baseData = []

                    category = results.data[0][1]

                    // get cases array at each label
                    for (let i = 1; i < results.data.length; ++i) {
                        if (results.data[i].length > 2) cases.push(results.data[i].slice(2)) // slice to remove the id and label from cases array
                    }
                    cases = cases.filter(row => labels.includes(stateNames[ row[0].toString()]));
                    baseDates = results.data[0].slice(2) // slice to remove the id and label from dates array
                    allBaseData = cases
                    console.log("ALL BASE DATA")
                    console.log(allBaseData)
                    for (let i = 0; i < baseDates.length; ++i) {
                        baseData.push({
                            x: baseDates[i],
                            y: cases[0][i],
                        })
                    }

                    datasets.unshift({
                        label: labels[0] + ' ' + "truth",
                        data: baseData,
                        fill: false,
                        tension: 0.1,
                        // borderColor: lineColorList[0],
                        // backgroundColor: lineColorList[0],
                    })

                    setChartState({
                        // set the chart state
                        ...chartState,
                        category: category,
                        current_label: labels[0],
                        labels: labels,
                        cases: {
                            actual: {
                                cases: allBaseData,
                                dates: baseDates,
                            },
                            pred: {
                                cases: allPredData,
                                dates: predDates,
                            },
                        },
                        current_dataset: {
                            datasets: datasets,
                        },
                    })
                },
            })
        })
    }

    // fetch data on file change
    useEffect(() => {
        fetchData()
    }, [fileState])

    const getBaseData = (index) => {
        let baseData = []
        console.log("CHECK BASE DATA")
        console.log(index)
        console.log(chartState.cases['actual']['cases'])

        for (let j = 0; j < chartState.cases['actual']['dates'].length; ++j) {
            if (index==53){
                console.log(chartState.cases['actual']['cases'][index][j])
            }
            baseData.push({
                x: chartState.cases['actual']['dates'][j],
                y: chartState.cases['actual']['cases'][index][j],
            })
        }

        return baseData
    }

    const getPredData = (index) => {
        /*let allPredData = []

        for (let j = 0; j < chartState.cases['pred']['cases'].length; ++j) {
            let predData = []

            // loop through each date in the predictive dataset`
            for (let k = 0; k < chartState.cases['pred']['dates'][j].length; ++k) {
                predData.push({
                    x: chartState.cases['pred']['dates'][j][k],
                    y: chartState.cases['pred']['cases'][j][index][k],
                })
            }

            allPredData.push(predData)
        }
        */
        let allPredData = []

        for(let i=0; i<chartState.cases.pred.cases.length; i++ ){
            let predData = [];
            for(let j=0; j<chartState.cases.pred.dates[i].length; j++){
            predData.push({
                x: chartState.cases.pred.dates[i][j], // Using dates from predCaseDates
                y: chartState.cases.pred.cases[i].data[index][j],
            });
        }
            

        allPredData.push(predData)
        }

        return allPredData
    }

    const generateCumDatasets = (index) => {
        let datasets = []

        const baseData = getBaseData(index)
        //const predData = getPredData(index)

        datasets.push({
            label: chartState.labels[index] + ' ' + datasetLabels[0],
            data: baseData,
            fill: false,
            tension: 0.1,
            // borderColor: lineColorList[0],
            // backgroundColor: lineColorList[0],
        })
        console.log("CUMU CHECKS")
        console.log(index)

        console.log(chartState.cases.pred)
       
        for(let i=0; i<chartState.cases.pred.cases.length; i++ ){
            let predData = [];
            for(let j=0; j<chartState.cases.pred.dates[i].length; j++){
            predData.push({
                x: chartState.cases.pred.dates[i][j], // Using dates from predCaseDates
                y: chartState.cases.pred.cases[i].data[index][j],
            });
        }
            let color = generateColor(chartState.cases.pred.cases[i].quantile);
            let label;
            if (chartState.cases.pred.cases[i].quantile === "0") {
                label = `${chartState.labels[index]} Lower Bound`;
            } else if (chartState.cases.pred.cases[i].quantile === "1") {
                label = `${chartState.labels[index]} Upper Bound`;
            } else {
            label = `${chartState.labels[index]} quantile-${chartState.cases.pred.cases[i].quantile}`;
            }

            datasets.push({
                label: label,
                data: predData,
                borderColor: color,
                backgroundColor: color,
            });
        }
        console.log(datasets)
/*
    chartState.cases.pred.cases.forEach(predCase => {
        let predData = [];
        const predCaseDates = chartState.cases.pred.dates[predIndex]; // Accessing the dates corresponding to the predCase

        for (let i = 0; i < predCase.data[index].length; i++) {
            predData.push({
                x: predCaseDates[i], // Using dates from predCaseDates
                y: predCase.data[index][i],
            });
        }
        let color = generateColor(predCase.quantile);
        datasets.push({
            label: `${chartState.labels[index]} Quantile ${predCase.quantile}`,
            data: predData,
            borderColor: color,
            backgroundColor: color,
        });

        
    });
        */
        return datasets
    }

    const generateIncDatasets = (index) => {
        const baseData = getBaseData(index)
        const predData = getPredData(index)
        let baseDiffData = []
        let predDiffData = []
        let datasets = []
        let diff = 0

        for (let i = 1; i < baseData.length; ++i) {
            diff = baseData[i]['y'] - baseData[i - 1]['y']
            if (diff < 0 || baseData[i - 1]['y'] <= 0) diff = 0

            baseDiffData.push({
                x: baseData[i]['x'],
                y: diff,
            })
        }

        if (predData.length > 0) {
            diff = predData[0][0]['y'] - baseData[baseData.length - 1]['y']
            if (diff < 0 || baseData[baseData.length - 1]['y'] <= 0) diff = 0

            predDiffData.push({
                x: baseDiffData[baseDiffData.length - 1]['x'],
                y: baseDiffData[baseDiffData.length - 1]['y'],
            })

            predDiffData.push({
                x: predData[0][0]['x'],
                y: diff,
            })

            for (let i = 1; i < predData[0].length; ++i) {
                diff = predData[0][i]['y'] - predData[0][i - 1]['y']
                if (diff < 0 || baseData[i - 1]['y'] <= 0) diff = 0

                predDiffData.push({
                    x: predData[0][i]['x'],
                    y: diff,
                })
            }
        }

        datasets.push({
            label: chartState.labels[index] + ' Ground Truth',
            data: baseDiffData,
            fill: false,
            tension: 0.1,
            // borderColor: lineColorList[0],
            // backgroundColor: lineColorList[0],
        })

        datasets.push({
            label: chartState.labels[index] + ' Prediction',
            data: predDiffData,
            fill: false,
            tension: 0.1,
            // borderColor: lineColorList[1],
            // backgroundColor: lineColorList[1],
        })

        return datasets
    }

    // file change handler
    const handleFileChange = (e) => {
        const newFile = e.target.value

        console.log(newFile)
        //console.log(globalMetadata)
        console.log("*************")
        let disp = false
        let disp1 = "INCIDENT"
        let disp2 = "CUMULATIVE"
        console.log("DISPLAY CHECKKKK")
        console.log(globalMetadata[newFile].cumulative)
        if (globalMetadata[newFile].cumulative==0){
            disp = false
            if(globalMetadata[newFile].data_freq=="inc"){
                disp1= "INCIDENT"

            }
            else{
                disp1 = "CUMULATIVR"
            }
        }
        else{
            disp = true
            if(globalMetadata[newFile].data_freq=="inc"){
                disp2= "CUMULATIVE"

            }
            else{
                disp1 = "CUMULATIVE"
                disp2 = "INCIDENT"
            }
            console.log("DISPLAY CHECKKKK")
            console.log(disp)

        }
        console.log("DISPLAY CHECKKKK")
            console.log(disp)
        
        setFileState({
            name: newFile,
            urls: globalMetadata[newFile].urls,
            disp_second: disp,
            disp1: disp1,
            disp2 : disp2,
            title: globalMetadata[newFile].title,
        xtitle: globalMetadata[newFile].xtitle,
        ytitle: globalMetadata[newFile].ytitle
            
        })
        
        setChartState({
            ...chartState,
            cum_or_inc: 'cum',
        })
    }

    // label change handler
    const handleLabelChange = (e) => {
        console.log("CHANGE HAPPENED1")
        const newLabel = e.target.value // get the selected label (ie. country)
        console.log(newLabel)
        console.log(chartState.current_label)
        let i

        if (newLabel == chartState.current_label) return
        console.log("CHANGE HAPPENED2")
        for (let j = 0; j < chartState.current_dataset.datasets.length; ++j) {
            console.log(chartState.current_dataset.datasets[j].label)

            if (chartState.current_dataset.datasets[j].label.split(' ')[0] === newLabel) {
                console.log("CHANGE HAPPENED2.1")

                setChartState({
                    ...chartState,
                    current_label: newLabel,
                })
                return
            }
        }

        console.log("CHANGE HAPPENED3")


        // find the index of the label
        for (i = 0; i < chartState.labels.length; ++i) if (chartState.labels[i] === newLabel) break
            console.log("CHANGE HAPPENED")
            console.log(chartState.labels[i])
            console.log(i)
        let newDataset
        if (chartState.cum_or_inc == 'cum') newDataset = generateCumDatasets(i)
        else newDataset = generateIncDatasets(i)

        if (chartState.multiple_plot) {
            let datasets = chartState.current_dataset.datasets
            datasets = datasets.concat(newDataset)

            setChartState({
                ...chartState,
                current_label: newLabel,
                current_dataset: {
                    datasets: datasets,
                },
            })
        } else {
            setChartState({
                ...chartState,
                current_label: newLabel,
                current_dataset: {
                    datasets: newDataset,
                },
            })
        }
    }

    // umulative or incremental change handler
    const handleCumOrIncChange = (e) => {
        const cumOrInc = e.target.value // get the selected value
        let i

        if (cumOrInc == chartState.cum_or_inc) return

        // find the index of the label
        for (i = 0; i < chartState.labels.length; ++i) if (chartState.labels[i] === chartState.current_label) break
        console.log("CHANGE HAPPENED")
        console.log(i)
        if (cumOrInc === 'cum') {
            setChartState({
                ...chartState,
                cum_or_inc: 'cum',
                current_dataset: {
                    datasets: generateCumDatasets(i),
                },
            })
        } else {
            // if incremental, calculate the difference between consecutive values
            setChartState({
                ...chartState,
                cum_or_inc: 'inc',
                current_dataset: {
                    datasets: generateIncDatasets(i),
                },
            })
        }
    }

    const handleMultiplePlotChange = () => {
        const isMultiplePlot = chartState.multiple_plot

        if (isMultiplePlot) {
            let datasets
            if (chartState.cum_or_inc == 'cum')
                datasets = generateCumDatasets(chartState.labels.indexOf(chartState.current_label))
            else datasets = datasets = generateIncDatasets(chartState.labels.indexOf(chartState.current_label))

            setChartState({
                ...chartState,
                multiple_plot: !isMultiplePlot,
                current_dataset: {
                    datasets: datasets,
                },
            })
        } else {
            setChartState({
                ...chartState,
                multiple_plot: !isMultiplePlot,
            })
        }
    }

    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    
    

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (!Array.isArray(entries) || !entries.length) {
                return;
            }
    
            setContainerWidth(entries[0].contentRect.width);
        });
    
        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }
    
        return () => resizeObserver.disconnect();
    
    }, []);
    

    return (
        <div>
            <div className="menu">
                <FormControl sx={{ mr: '20px' }}>
                    <InputLabel id="input-label">Target</InputLabel>
                    <Select
                        labelId="file-id"
                        id="select"
                        value={fileState.name}
                        label="category"
                        onChange={handleFileChange}
                    >
                        {Object.keys(fileList).map((fileName, index) => {
                            return (
                                <MenuItem key={index} value={fileName}>
                                    {fileName}
                                </MenuItem>
                            )
                        })}
                    </Select>
                </FormControl>
                <FormControl sx={{ mr: '20px' }}>
                    <InputLabel id="input-label">Region</InputLabel>
                    <Select
                        labelId="label-id"
                        id="select"
                        value={chartState.current_label}
                        label="category"
                        onChange={handleLabelChange}
                    >
                        {chartState.labels.map((label, index) => {
                            return (
                                <MenuItem key={index} value={label}>
                                    {label}
                                </MenuItem>
                            )
                        })}
                    </Select>
                </FormControl>
                <ToggleButtonGroup
                    aria-label="outlined primary button group"
                    value={chartState.cum_or_inc}
                    onChange={handleCumOrIncChange}
                    exclusive
                >
                     <ToggleButton value="cum">{fileState.disp1}</ToggleButton>
    {fileState.disp_second && (
        <ToggleButton value="inc">{fileState.disp2}</ToggleButton>
    )}
                </ToggleButtonGroup>
                <Typography ml={2} display="inline">
                    Multiple Plots
                </Typography>
                <Switch
                    checked={chartState.multiple_plot}
                    onChange={handleMultiplePlotChange}
                    inputProps={{ 'aria-label': 'controlled' }}
                />
            </div>
            <div className="chart" ref={chartContainerRef} style={{ position: "relative", margin: "auto", width: '100%' }}>
                <Line
                    ref={chartRef}
                    key={containerWidth}
                    data={{
                        ...chartState.current_dataset,
                        datasets: chartState.current_dataset.datasets.map(dataset => ({
                            ...dataset,
                            borderWidth: 2,
                            pointHoverRadius:12,

                            
                        }))
                    }}
                    // plugins={[hoverLinePlugin]}
                    options={{
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: fileState.title
                            }
                        },
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: 'week',
                                },
                                title: {
                                    display: true,
                                    text: fileState.xtitle
                                }
                            },
                            y: {
                                // other y-axis settings...
                                title: {
                                    display: true,
                                    text: fileState.ytitle
                                }
                            }
                        },
                        colors: {
                            enabled: true,
                        },
                        responsive: true,
                    }}
                />
            </div>
        </div>
    )
}

export default Forecast
