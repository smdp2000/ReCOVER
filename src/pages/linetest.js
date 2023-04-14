import { useState, useEffect } from "react"
import "chart.js/auto"
import { Chart } from "react-chartjs-2"
import { readString } from "react-papaparse"
import axios from "axios"
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import dynamic from "next/dynamic"
const zoomPlugin = dynamic(() => import("chartjs-plugin-zoom"), {
    ssr: false,
})

const fileList = {
    cases: "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_data.csv",
    deaths: "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths.csv",
    pred_cases:
        "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_forecasts_current_0.csv",
    pred_deaths:
        "https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths_current_0.csv",
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
        url: fileList["cases"],
    })

    const [chartState, setChartState] = useState({
        category: "",
        labels: [],
        dates: [],
        cases: [],
        all_datasets: [],
        current_dataset: {
            labels: [],
            datasets: [
                {
                    label: "dummy data",
                    data: [],
                    fill: false,
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                },
            ],
        },
    })

    const fetchData = async () => {
        await axios.get(fileState.url).then((response) => {
            readString(response.data, {
                worker: true,
                complete: (results) => {
                    console.log(results.data)

                    let labels = []
                    let cases = []
                    let datasets = []

                    for (let i = 1; i < results.data.length; ++i) {
                        if (results.data[i].length > 2) {
                            labels[i - 1] = results.data[i][1]
                            cases.push(results.data[i].slice(2))
                        }
                    }

                    for (let i = 0; i < labels.length; ++i) {
                        datasets.push({
                            label: labels[i],
                            data: cases[i],
                            fill: false,
                            borderColor: "rgb(75, 192, 192)",
                            tension: 0.1,
                        })
                    }

                    setChartState({
                        ...chartState,
                        category: results.data[0][1],
                        labels: labels,
                        dates: results.data[0].slice(2),
                        cases: cases,
                        all_datasets: datasets,
                        current_dataset: {
                            labels: results.data[0].slice(2),
                            datasets: [
                                {
                                    label: labels[0],
                                    data: cases[0],
                                    fill: false,
                                    borderColor: "rgb(75, 192, 192)",
                                    tension: 0.1,
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
            url: fileList[newFile],
        })
    }

    const handleLabelChange = (e) => {
        const newLabel = e.target.value
        let i

        for (i = 0; i < chartState.labels.length; ++i)
            if (chartState.labels[i] === newLabel) break

        setChartState({
            ...chartState,
            current_dataset: {
                labels: chartState.dates,
                datasets: [
                    {
                        label: chartState.labels[i],
                        data: chartState.cases[i],
                        fill: false,
                        borderColor: "rgb(75, 192, 192)",
                        tension: 0.1,
                    },
                ],
            },
        })
    }

    return (
        <div>
            <FormControl>
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
            <FormControl>
                <InputLabel id="input-label">{chartState.category}</InputLabel>
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
