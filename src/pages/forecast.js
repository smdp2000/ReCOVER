import { useState, useEffect } from 'react'
import 'chart.js/auto'
import 'chartjs-adapter-date-fns'
import { Chart } from 'react-chartjs-2'
import { readString } from 'react-papaparse'
import axios from 'axios'
import { FormControl, InputLabel, Select, MenuItem, ToggleButtonGroup, ToggleButton } from '@mui/material'
import dynamic from 'next/dynamic'
const zoomPlugin = dynamic(() => import('chartjs-plugin-zoom'), {
    ssr: false,
})

const fileList = {
    // first index is actual, second is predictive, third is upper bound, fourth is lower bound
    cases: [
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_data.csv',
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_forecasts_current_0.csv',
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_forecasts_current_0_ub.csv',
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_forecasts_current_0_lb.csv',
    ],
    deaths: [
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths.csv',
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths_current_0.csv',
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths_current_0_ub.csv',
        'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths_current_0_lb.csv',
    ],
}

const lineColorList = ['rgb(75, 192, 192)', 'rgb(255, 180, 48)', 'rgb(255, 230, 48)', 'rgb(255, 130, 48)']
const datasetLabels = ['Actual', 'Predictive', 'Upper Bound', 'Lower Bound']

// const metadataUrls = [
//     "https://raw.githubusercontent.com/rangshah/401-CSV-Repository/main/metadata.txt",
// ];

// function parseMetadata(metadata) {
//     const regex = /@\w+\{([^}]+)\}/g;
//     let match;
//     const items = [];

//     while ((match = regex.exec(metadata)) !== null) {
//         const item = {};
//         const properties = match[1].split('\n').map(s => s.trim()).filter(s => s.length > 0);

//         for (const property of properties) {
//             const [key, value] = property.split('=').map(s => s.trim());
//             const cleanedValue = value.replace(/["{}]/g, '');
//             switch (key) {
//                 case 'url':
//                     item.url = cleanedValue;
//                     break;
//                 case 'url_lower':
//                     item.url_lower = cleanedValue;
//                     break;
//                 case 'url_upper':
//                     item.url_upper = cleanedValue;
//                     break;
//                 case 'url_quantile':
//                     item.url_quantile = cleanedValue;
//                     break;
//                 case 'target':
//                     item.target = cleanedValue;
//                     break;
//                 case 'data_type':
//                     item.data_type = cleanedValue;
//                     break;
//                 case 'data_level':
//                     item.data_level = cleanedValue;
//                     break;
//                 case 'data_period':
//                     item.data_period = cleanedValue;
//                     break;
//             }
//         }

//         items.push(item);
//     }

//     return items;
// }

// const fetchMetadataContent = async (url) => {
//     try {
//         const response = await axios.get(url);
//         return response.data;
//     } catch (error) {
//         console.error(`Failed to fetch metadata content from URL: ${url}`);
//         return "";
//     }
// };

// (async () => {
//     const metadataContentPromises = metadataUrls.map(fetchMetadataContent);
//     const metadataContents = await Promise.all(metadataContentPromises);

//     const metadata = (
//         await Promise.all(metadataContents.map(parseMetadata))
//     ).flat();

//     console.log(metadata);
// })();

// custom plugin for tooltip and vertical + horizontal guidelines on hover
const hoverLinePlugin = {
    afterDatasetsDraw(chart) {
        const {
            ctx,
            tooltip,
            chartArea: { bottom, left },
            scales: { x, y },
        } = chart

        if (tooltip && tooltip._active.length > 0) {
            const xCoor = x.getPixelForValue(tooltip.dataPoints[0].dataIndex)
            const yCoor = y.getPixelForValue(tooltip.dataPoints[0].parsed.y)

            ctx.save()
            ctx.beginPath()
            ctx.lineWidth = 3
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.setLineDash([6, 4])
            ctx.moveTo(xCoor, yCoor)
            ctx.lineTo(xCoor, bottom)
            ctx.stroke()
            ctx.closePath()
            ctx.beginPath()
            ctx.lineWidth = 3
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.setLineDash([6, 4])
            ctx.moveTo(xCoor, yCoor)
            ctx.lineTo(left, yCoor)
            ctx.stroke()
            ctx.closePath()
            ctx.setLineDash([])
        }
    },
}

function linetest() {
    const [fileState, setFileState] = useState({
        name: 'cases',
        urls: fileList['cases'],
    })

    const [chartState, setChartState] = useState({
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
            pred: {
                cases: [],
                dates: [],
            },
        },
        current_dataset: {
            // current dataset to be displayed
            datasets: [
                // list of datasets, more can be added to display different lines on the same chart
                {
                    label: 'loading data',
                    data: [], // cases (y axis)
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                },
            ],
        },
    })

    // fetch data from the actual data file
    const fetchData = async () => {
        let datasets = []

        let allBaseData = []
        let baseDates = []
        let category = ''

        let allPredData = []
        let predDates = []
        let labels = []

        // set the colors for the actual and predictive data

        for (let i = 1; i < fileState.urls.length; ++i) {
            await axios.get(fileState.urls[i]).then((response) => {
                readString(response.data, {
                    worker: true,
                    complete: (results) => {
                        let cases = []
                        let predData = []

                        // get label and cases array at each label
                        for (let j = 1; j < results.data.length; ++j) {
                            if (results.data[j].length > 2) {
                                labels[j - 1] = results.data[j][1] // get the label
                                cases.push(results.data[j].slice(2)) // slice to remove the id and label from cases array
                            }
                        }

                        predDates.push(results.data[0].slice(2)) // slice to remove the id and label from dates array
                        allPredData.push(cases)

                        for (let j = 0; j < cases[0].length; ++j) {
                            predData.push({
                                x: predDates[i - 1][j],
                                y: cases[0][j],
                            })
                        }

                        datasets.push({
                            label: datasetLabels[i],
                            data: predData,
                            fill: false,
                            tension: 0.1,
                            borderColor: lineColorList[i],
                            backgroundColor: lineColorList[i],
                        })
                    },
                })
            })
        }

        await axios.get(fileState.urls[0]).then((response) => {
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

                    baseDates = results.data[0].slice(2) // slice to remove the id and label from dates array
                    allBaseData = cases

                    for (let i = 0; i < baseDates.length; ++i) {
                        baseData.push({
                            x: baseDates[i],
                            y: cases[0][i],
                        })
                    }

                    datasets.unshift({
                        label: datasetLabels[0],
                        data: baseData,
                        fill: false,
                        tension: 0.1,
                        borderColor: lineColorList[0],
                        backgroundColor: lineColorList[0],
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

        for (let j = 0; j < chartState.cases['actual']['dates'].length; ++j) {
            baseData.push({
                x: chartState.cases['actual']['dates'][j],
                y: chartState.cases['actual']['cases'][index][j],
            })
        }

        return baseData
    }

    const getPredData = (index) => {
        let allPredData = []

        for (let j = 0; j < chartState.cases['pred']['cases'].length; ++j) {
            let predData = []

            // loop through each date in the predictive dataset
            for (let k = 0; k < chartState.cases['pred']['dates'][j][index].length; ++k) {
                predData.push({
                    x: chartState.cases['pred']['dates'][j][k],
                    y: chartState.cases['pred']['cases'][j][index][k],
                })
            }

            allPredData.push(predData)
        }

        return allPredData
    }

    const generateDatasets = (index) => {
        let datasets = []

        const baseData = getBaseData(index)
        const predData = getPredData(index)

        datasets.push({
            label: datasetLabels[0],
            data: baseData,
            fill: false,
            tension: 0.1,
            borderColor: lineColorList[0],
            backgroundColor: lineColorList[0],
        })

        for (let i = 0; i < predData.length; ++i) {
            datasets.push({
                label: datasetLabels[i + 1],
                data: predData[i],
                fill: false,
                tension: 0.1,
                borderColor: lineColorList[i + 1],
                backgroundColor: lineColorList[i + 1],
            })
        }

        return datasets
    }

    // file change handler
    const handleFileChange = (e) => {
        const newFile = e.target.value
        setFileState({
            name: newFile,
            urls: fileList[newFile],
        })
        setChartState({
            ...chartState,
            cum_or_inc: 'cum',
        })
    }

    // label change handler
    const handleLabelChange = (e) => {
        const newLabel = e.target.value // get the selected label (ie. country)
        let i

        if (newLabel == chartState.current_label) return

        // find the index of the label
        for (i = 0; i < chartState.labels.length; ++i) if (chartState.labels[i] === newLabel) break

        setChartState({
            ...chartState,
            cum_or_inc: 'cum',
            current_label: newLabel,
            current_dataset: {
                datasets: generateDatasets(i),
            },
        })
    }

    // umulative or incremental change handler
    const handleCumOrIncChange = (e) => {
        const cumOrInc = e.target.value // get the selected value
        let i

        if (cumOrInc == chartState.cum_or_inc) return

        // find the index of the label
        for (i = 0; i < chartState.labels.length; ++i) if (chartState.labels[i] === chartState.current_label) break

        let data = []

        if (cumOrInc === 'cum') {
            setChartState({
                ...chartState,
                cum_or_inc: 'cum',
                current_dataset: {
                    datasets: generateDatasets(i),
                },
            })
        } else {
            // if incremental, calculate the difference between consecutive values
            const baseData = getBaseData(i)
            const predData = getPredData(i)
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
                label: 'Actual Diff',
                data: baseDiffData,
                fill: false,
                tension: 0.1,
                borderColor: lineColorList[0],
                backgroundColor: lineColorList[0],
            })

            datasets.push({
                label: 'Predictive Diff',
                data: predDiffData,
                fill: false,
                tension: 0.1,
                borderColor: lineColorList[1],
                backgroundColor: lineColorList[1],
            })

            setChartState({
                ...chartState,
                cum_or_inc: 'inc',
                current_dataset: {
                    datasets: datasets,
                },
            })
        }
    }

    return (
        <div>
            <div className="menu">
                <FormControl sx={{ mr: '20px' }}>
                    <InputLabel id="input-label">File</InputLabel>
                    <Select
                        labelId="file-id"
                        id="select"
                        value={fileState.name}
                        label="category"
                        onChange={handleFileChange}
                    >
                        {Object.keys(fileList).map((fileName) => {
                            return <MenuItem value={fileName}>{fileName}</MenuItem>
                        })}
                    </Select>
                </FormControl>
                <FormControl sx={{ mr: '20px' }}>
                    <InputLabel id="input-label">{chartState.category}</InputLabel>
                    <Select
                        labelId="label-id"
                        id="select"
                        value={chartState.current_label}
                        label="category"
                        onChange={handleLabelChange}
                    >
                        {chartState.labels.map((label) => {
                            return <MenuItem value={label}>{label}</MenuItem>
                        })}
                    </Select>
                </FormControl>
                <ToggleButtonGroup
                    aria-label="outlined primary button group"
                    value={chartState.cum_or_inc}
                    onChange={handleCumOrIncChange}
                    exclusive
                >
                    <ToggleButton value="cum">Cumulative</ToggleButton>
                    <ToggleButton value="inc"> Weekly New</ToggleButton>
                </ToggleButtonGroup>
            </div>
            <div className="chart">
                <Chart
                    type="line"
                    data={chartState.current_dataset}
                    plugins={[hoverLinePlugin, zoomPlugin]}
                    options={{
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: 'week',
                                },
                            },
                        },
                    }}
                />
            </div>
        </div>
    )
}

export default linetest
