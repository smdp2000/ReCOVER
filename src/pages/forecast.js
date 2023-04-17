import { useState, useEffect } from "react"
import "chart.js/auto"
import { Chart } from "react-chartjs-2"
import { readString } from "react-papaparse"
import axios from "axios"
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButtonGroup,
    ToggleButton,
} from "@mui/material"
import dynamic from "next/dynamic"
const zoomPlugin = dynamic(() => import("chartjs-plugin-zoom"), {
    ssr: false,
})

const fileList = {
    // first index is actual, second is predictive
    cases: [
        "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_data.csv",
        "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_forecasts_current_0.csv",
    ],
    deaths: [
        "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths.csv",
        "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths_current_0.csv",
    ],
}

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
            ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"
            ctx.setLineDash([6, 4])
            ctx.moveTo(xCoor, yCoor)
            ctx.lineTo(xCoor, bottom)
            ctx.stroke()
            ctx.closePath()
            ctx.beginPath()
            ctx.lineWidth = 3
            ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"
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
        name: "cases",
        urls: fileList["cases"],
    })

    const [chartState, setChartState] = useState({
        cum_or_inc: "cum",
        category: "", // category of labels ie. country
        labels: [], // list of labels (ie. countries)
        dates: [], // list of dates
        cases: {
            // cases, actual and predictive, each index is a list of cases
            actual: [],
            pred: [],
        },
        current_dataset: {
            // current dataset to be displayed
            labels: [], // dates (x axis)
            datasets: [
                // list of datasets, more can be added to display different lines on the same chart
                {
                    label: "loading data",
                    data: [], // cases (y axis)
                    fill: false,
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                },
            ],
        },
    })

    // fetch data from the actual data file
    const fetchData = async () => {
        let data = []
        let allDates = []
        await axios.get(fileState.urls[0]).then((response) => {
            readString(response.data, {
                worker: true,
                complete: (results) => {
                    let cases = []

                    // get cases array at each label
                    for (let i = 1; i < results.data.length; ++i) {
                        if (results.data[i].length > 2)
                            cases.push(results.data[i].slice(2)) // slice to remove the id and label from cases array
                    }

                    allDates = results.data[0].slice(2) // slice to remove the id and label from dates array

                    data.push(cases)
                },
            })
        })

        // fetch data from the corresponding predictive data file
        await axios.get(fileState.urls[1]).then((response) => {
            readString(response.data, {
                worker: true,
                complete: (results) => {
                    let labels = []
                    let cases = []

                    // get label and cases array at each label
                    for (let i = 1; i < results.data.length; ++i) {
                        if (results.data[i].length > 2) {
                            labels[i - 1] = results.data[i][1] // get the label
                            cases.push(results.data[i].slice(2)) // slice to remove the id and label from cases array
                        }
                    }

                    allDates = allDates.concat(results.data[0].slice(2)) // slice to remove the id and label from dates array

                    data.push(cases)

                    // set the colors for the actual and predictive data
                    let color1 = new Array(data[0][0].length).fill(
                        "rgb(75, 192, 192)"
                    )
                    let color2 = new Array(data[1][0].length).fill(
                        "rgba(255, 191, 48)"
                    )

                    setChartState({
                        // set the chart state
                        ...chartState,
                        category: results.data[0][1],
                        labels: labels,
                        dates: allDates,
                        cases: {
                            actual: data[0],
                            pred: data[1],
                        },
                        current_dataset: {
                            labels: allDates,
                            datasets: [
                                {
                                    label: labels[0],
                                    data: data[0][0].concat(data[1][0]), // concat the actual and predictive data
                                    fill: false,
                                    tension: 0.1,
                                    borderColor: color1.concat(color2),
                                    backgroundColor: color1.concat(color2),
                                },
                            ],
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

    // file change handler
    const handleFileChange = (e) => {
        const newFile = e.target.value
        setFileState({
            name: newFile,
            urls: fileList[newFile],
        })
        setChartState({
            ...chartState,
            cum_or_inc: "cum",
        })
    }

    // label change handler
    const handleLabelChange = (e) => {
        const newLabel = e.target.value // get the selected label (ie. country)
        let i

        for (
            i = 0;
            i < chartState.labels.length;
            ++i // find the index of the label
        )
            if (chartState.labels[i] === newLabel) break

        // set colors for the actual and predicted data
        let color1 = new Array(chartState.cases["actual"][i].length).fill(
            "rgb(75, 192, 192)"
        )
        let color2 = new Array(chartState.cases["pred"][i].length).fill(
            "rgba(255, 191, 48)"
        )

        setChartState({
            // update the chart state
            ...chartState,
            cum_or_inc: "cum",
            current_dataset: {
                labels: chartState.dates,
                datasets: [
                    {
                        label: newLabel,
                        data: chartState.cases["actual"][i].concat(
                            // get the new data from index
                            chartState.cases["pred"][i]
                        ),
                        fill: false,
                        tension: 0.1,
                        borderColor: color1.concat(color2),
                        backgroundColor: color1.concat(color2),
                    },
                ],
            },
        })
    }

    // umulative or incremental change handler
    const handleCumOrIncChange = (e) => {
        const cumOrInc = e.target.value // get the selected value
        const currentDataset = chartState.current_dataset
        const currentData = currentDataset.datasets[0]
        let i

        for (
            i = 0;
            i < chartState.labels.length;
            ++i // find the index of the label
        )
            if (chartState.labels[i] === currentData.label) break

        let data = []

        if (cumOrInc === "cum") {
            // if cumulative, just fetch the data from the state
            data = chartState.cases["actual"][i].concat(
                chartState.cases["pred"][i]
            )
        } else {
            // if incremental, calculate the difference between consecutive values
            let diff = 0

            for (let i = 1; i < currentData.data.length; ++i) {
                diff = currentData.data[i] - currentData.data[i - 1]
                if (
                    diff >= 0 &&
                    currentData.data[i - 1] > 0 &&
                    currentDataset.labels[i]
                )
                    data.push(diff)
                else data.push(0)
            }
        }

        // set colors for the actual and predicted data
        let color1 = new Array(chartState.cases["actual"][i].length).fill(
            "rgb(75, 192, 192)"
        )
        let color2 = new Array(chartState.cases["pred"][i].length).fill(
            "rgba(255, 191, 48)"
        )

        // create a new dataset with the new data
        const modifiedDataset = {
            label: currentData.label,
            data: data,
            fill: false,
            tension: 0.1,
            borderColor: color1.concat(color2),
            backgroundColor: color1.concat(color2),
        }

        setChartState({
            // update the chart state
            ...chartState,
            cum_or_inc: cumOrInc,
            current_dataset: {
                labels: currentDataset.labels,
                datasets: [modifiedDataset], // replace the old dataset with the new one
            },
        })
    }

    return (
        <div>
            <div className="menu">
                <FormControl sx={{ mr: "20px" }}>
                    <InputLabel id="input-label">File</InputLabel>
                    <Select
                        labelId="file-id"
                        id="select"
                        value={fileState.name}
                        label="category"
                        onChange={handleFileChange}
                    >
                        {Object.keys(fileList).map((fileName) => {
                            return (
                                <MenuItem value={fileName}>{fileName}</MenuItem>
                            )
                        })}
                    </Select>
                </FormControl>
                <FormControl sx={{ mr: "20px" }}>
                    <InputLabel id="input-label">
                        {chartState.category}
                    </InputLabel>
                    <Select
                        labelId="label-id"
                        id="select"
                        value={chartState.current_dataset.datasets[0].label}
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
                />
            </div>
        </div>
    )
}

export default linetest
