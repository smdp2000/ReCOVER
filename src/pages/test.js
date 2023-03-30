import { useState, useEffect } from 'react'
import Papa from 'papaparse' // csv parser
// import "./forecasts.css"
import { ResponsiveLine } from '@nivo/line'
import numeral from 'numeral' // for formatting numbers

import { Form, Select, Radio, Checkbox, Popover, Col } from 'antd'

var globallist = []
const { Option } = Select

const init_areas = 'California'

function Row() {
    const [rowState, setRowState] = useState({
        area_message: 'Please wait for data to load',
        cum_or_inc: 'Cumulative',
        data_loading: true,
        areas: init_areas,
        arealist: [],
        case_data: [],
        death_data: [],
        death_list: [],
        case_preds: [],
        case_pred_list: [],
        death_preds: [],
        death_pred_list: [],
        dataType: 'case',
        case_data_plot: [],
        death_data_plot: [],
        case_preds_plot: [],
        death_preds_plot: [],
        data_date: [],
        pred_date: [],
        to_plot: [],
    })

    function plotData() {
        let dd = [] // data [<date, value>]
        let dd_p = [] // prediction data
        let thisdata, preds

        // radio button selection
        if (rowState.dataType == 'cases') {
            thisdata = rowState.case_data_plot
            preds = rowState.case_preds_plot
        } else {
            thisdata = rowState.death_data_plot
            preds = rowState.death_preds_plot
        }

        if (rowState.cum_or_inc === 'Cumulative') {
            for (let i = 0; i < thisdata.length; i++) {
                if (thisdata[i] > 0 && rowState.data_date[i]) {
                    dd.push({
                        x: rowState.data_date[i],
                        y: thisdata[i],
                    })
                }
            }
            let dd_p = []
            for (let i = 0; i < preds.length; i++) {
                if (rowState.pred_date[i]) {
                    dd_p.push({
                        x: rowState.pred_date[i],
                        y: preds[i],
                    })
                }
            }
        } else {
            // successive differences
            let base_dat = thisdata[0]
            let diff_dat = 0
            for (let i = 1; i < thisdata.length; i++) {
                diff_dat = thisdata[i] - base_dat
                if (diff_dat >= 0 && base_dat > 0 && rowState.data_date[i]) {
                    dd.push({
                        x: rowState.data_date[i],
                        y: diff_dat,
                    })
                }
                base_dat = thisdata[i]
            }
            base_dat = thisdata[thisdata.length - 1]

            for (let i = 1; i < preds.length; i++) {
                diff_dat = preds[i] - base_dat
                if (diff_dat >= 0 && base_dat > 0 && rowState.pred_date[i]) {
                    dd_p.push({
                        x: rowState.pred_date[i],
                        y: diff_dat,
                    })
                }
                base_dat = preds[i]
            }
        }
        let full_dd = [
            { id: 'data', data: dd },
            { id: 'pred', data: dd_p },
        ]
        console.log(full_dd)
        setRowState({ ...rowState, to_plot: full_dd })
    }

    function doneLoading() {
        if (
            rowState.data_loading &&
            rowState.case_preds.length > 0 &&
            rowState.death_preds.length > 0 &&
            rowState.death_data.length > 0 &&
            rowState.case_data.length > 0
        ) {
            setRowState({ ...rowState, data_loading: false })
            setRowState({
                ...rowState,
                area_message:
                    'Start typing a location name to see its data and forecasts',
            })
            setRowState({ ...rowState, areas: init_areas })
        }
    }

    function addNewArea(areas) {
        // select new area fn
        let idx = rowState.arealist.indexOf(areas)
        let case_d = []
        if (idx > -1) {
            case_d = rowState.case_data[idx + 1].slice(2)
        }
        setRowState({ ...rowState, case_data_plot: case_d })

        case_d = []
        idx = rowState.case_pred_list.indexOf(areas)
        if (idx > -1) {
            case_d = rowState.case_preds[idx + 1].slice(2)
        }
        setRowState({ ...rowState, case_preds_plot: case_d })

        let death_d = []
        idx = rowState.death_list.indexOf(areas)
        if (idx > -1) {
            death_d = rowState.death_data[idx + 1].slice(2)
        }
        setRowState({ ...rowState, death_data_plot: death_d })

        death_d = []
        idx = rowState.death_pred_list.indexOf(area)
        if (idx > -1) {
            death_d = rowState.death_preds[idx + 1].slice(2)
        }
        setRowState({ ...rowState, death_preds_plot: death_d })
        plotData()
    }

    function onValuesChange(allValues) {
        addNewArea(allValues.areas)
        plotData()
    }

    const handleFile = (event) => {
        Papa.parse(event.target.files[0], {
            worker: true,
            complete: (results) => {
                console.log(results.data)
                let rowCategories = []
                for (let i = 1; i < results.data.length; i++) {
                    if (results.data[i].length > 2)
                        rowCategories[i - 1] = results.data[i][1]
                }

                setRowState({
                    ...rowState,
                    pred_date: results.data[0]
                        .slice(2)
                        .map((y) => y.concat('T23:00:00Z')),
                })
                setRowState({ ...rowState, case_pred_list: rowCategories })
                setRowState({ ...rowState, case_preds: results.data })

                doneLoading()
                onValuesChange()
            },
        })
    }

    const theme = {
        axis: {
            ticks: {
                text: {
                    fontSize: 16,
                },
            },
            legend: {
                text: {
                    fontSize: 16,
                },
            },
        },
        legends: {
            text: {
                fontSize: 16,
            },
        },
    }

    return (
        <div>
            <h2
                style={{
                    display: 'flex',
                    margin: '30px auto',
                    paddingLeft: '100px',
                }}
            >
                Upload files here
            </h2>
            <input
                type="file"
                name="file"
                accept=".csv"
                onChange={handleFile}
                style={{ display: 'block', margin: '10px auto' }}
            ></input>

            <br />

            <p
                style={{
                    display: 'flex',
                    margin: '30px auto',
                    paddingLeft: '100px',
                }}
            >
                File uploaded:
            </p>

            <div className="graph-row">
                <ResponsiveLine
                    data={rowState.to_plot}
                    margin={{ top: 50, right: 10, bottom: 100, left: 60 }}
                    xScale={{
                        type: 'time',
                        format: '%Y-%m-%dT%H:%M:%SZ',
                    }}
                    xFormat="time:%Y-%m-%d"
                    yScale={{
                        type: 'linear',
                        min: 'auto',
                        max: 'auto',
                        stacked: false,
                        reverse: false,
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisLeft={{
                        format: (y) => numeral(y).format('0.[0]a'),
                        orient: 'left',
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Reported',
                        legendOffset: -55,
                        legendPosition: 'middle',
                    }}
                    axisBottom={{
                        format: '%b %d',
                        // tickValues: num_ticks,
                        legend: 'date',
                        legendOffset: 36,
                        legendPosition: 'middle',
                    }}
                    colors={{ scheme: 'nivo' }}
                    pointSize={10}
                    pointColor={{ theme: 'background' }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: 'serieColor' }}
                    pointLabel="y"
                    pointLabelYOffset={-12}
                    useMesh={true}
                    legends={[
                        {
                            text: {
                                fontSize: 14,
                            },
                            anchor: 'top-left',
                            direction: 'column',
                            justify: false,
                            translateX: 30,
                            translateY: 0,
                            itemsSpacing: 0,
                            itemDirection: 'left-to-right',
                            itemWidth: 80,
                            itemHeight: 20,
                            itemOpacity: 0.75,
                            symbolSize: 12,
                            symbolShape: 'circle',
                            symbolBorderColor: 'rgba(0, 0, 0, .5)',
                            effects: [
                                {
                                    on: 'hover',
                                    style: {
                                        itemBackground: 'rgba(0, 0, 0, .03)',
                                        itemOpacity: 1,
                                    },
                                },
                            ],
                        },
                    ]}
                    theme={theme}
                />
            </div>
        </div>
    )
}

export default Row
