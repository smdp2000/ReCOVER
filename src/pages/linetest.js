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

const hoverLinePlugin = {
    afterDatasetsDraw(chart) {
        const {
            ctx,
            tooltip,
            chartArea: { bottom },
            scales: { x, y },
        } = chart

        if (tooltip && tooltip._active.length > 0) {
            const xCoor = x.getPixelForValue(tooltip.dataPoints[0].dataIndex)
            const yCoor = y.getPixelForValue(tooltip.dataPoints[0].parsed.y)

            ctx.save()
            ctx.beginPath()
            ctx.lineWidth = 3
            ctx.strokeStyle = "rgba(255, 191, 48, 0.5)"
            ctx.setLineDash([6, 4])
            ctx.moveTo(xCoor, yCoor)
            ctx.lineTo(xCoor, bottom)
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
        category: "",
        labels: [],
        dates: [],
        cases: {
            actual: [],
            pred: [],
        },
        current_dataset: {
            labels: [],
            datasets: [
                {
                    label: "loading data",
                    data: [],
                    fill: false,
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                },
            ],
        },
    })

    const fetchData = async () => {
        let data = []
        let allDates = []
        await axios.get(fileState.urls[0]).then((response) => {
            readString(response.data, {
                worker: true,
                complete: (results) => {
                    let cases = []

                    for (let i = 1; i < results.data.length; ++i) {
                        if (results.data[i].length > 2)
                            cases.push(results.data[i].slice(2))
                    }

                    allDates = results.data[0].slice(2)

                    data.push(cases)
                },
            })
        })

        await axios.get(fileState.urls[1]).then((response) => {
            readString(response.data, {
                worker: true,
                complete: (results) => {
                    let labels = []
                    let cases = []

                    for (let i = 1; i < results.data.length; ++i) {
                        if (results.data[i].length > 2) {
                            labels[i - 1] = results.data[i][1]
                            cases.push(results.data[i].slice(2))
                        }
                    }

                    allDates = allDates.concat(results.data[0].slice(2))

                    data.push(cases)

                    let color1 = new Array(data[0][0].length).fill(
                        "rgb(75, 192, 192)"
                    )
                    let color2 = new Array(data[1][0].length).fill(
                        "rgba(255, 191, 48)"
                    )

                    setChartState({
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
                                    data: data[0][0].concat(data[1][0]),
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

    useEffect(() => {
        fetchData()
    }, [fileState])

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

    const handleLabelChange = (e) => {
        const newLabel = e.target.value
        let i

        for (i = 0; i < chartState.labels.length; ++i)
            if (chartState.labels[i] === newLabel) break

        let color1 = new Array(chartState.cases["actual"][i].length).fill(
            "rgb(75, 192, 192)"
        )
        let color2 = new Array(chartState.cases["pred"][i].length).fill(
            "rgba(255, 191, 48)"
        )

        setChartState({
            ...chartState,
            cum_or_inc: "cum",
            current_dataset: {
                labels: chartState.dates,
                datasets: [
                    {
                        label: newLabel,
                        data: chartState.cases["actual"][i].concat(
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

    const handleCumOrIncChange = (e) => {
        const cumOrInc = e.target.value
        const currentDataset = chartState.current_dataset
        const currentData = currentDataset.datasets[0]
        let i

        for (i = 0; i < chartState.labels.length; ++i)
            if (chartState.labels[i] === currentData.label) break

        let data = []

        if (cumOrInc === "cum") {
            data = chartState.cases["actual"][i].concat(
                chartState.cases["pred"][i]
            )
        } else {
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

        let color1 = new Array(chartState.cases["actual"][i].length).fill(
            "rgb(75, 192, 192)"
        )
        let color2 = new Array(chartState.cases["pred"][i].length).fill(
            "rgba(255, 191, 48)"
        )

        const modifiedDataset = {
            label: currentData.label,
            data: data,
            fill: false,
            tension: 0.1,
            borderColor: color1.concat(color2),
            backgroundColor: color1.concat(color2),
        }

        setChartState({
            ...chartState,
            cum_or_inc: cumOrInc,
            current_dataset: {
                labels: currentDataset.labels,
                datasets: [modifiedDataset],
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
