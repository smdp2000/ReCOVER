import { useState, useEffect } from 'react'
import Papa from 'papaparse' // csv parser
// import "./forecasts.css"
import { ResponsiveLine } from '@nivo/line'
import numeral from 'numeral' // for formatting numbers

import { Form, Select, Radio, Checkbox, Popover, Col } from 'antd'

var u_cases =
    'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_data.csv'
var u_deaths =
    'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths.csv'
var u_case_preds =
    'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_forecasts_current_0.csv'
var u_death_preds =
    'https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths_current_0.csv'
var globallist = []
const init_areas = 'California'
const { Option } = Select

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

    // componentDidMount
    useEffect(() => {
        updateWindowDimensions()
        window.addEventListener('resize', updateWindowDimensions)
    }, [])

    // componentWillMount
    Papa.parse(u_cases, {
        download: true,
        worker: true,
        complete: (results) => {
            for (let i = 1; i < results.data.length; i++) {
                if (results.data[i].length > 2)
                    globallist[i - 1] = results.data[i][1]
            }
            setRowState({
                ...rowState,
                data_date: results.data[0]
                    .slice(2)
                    .map((y) => y.concat('T23:00:00Z')),
            })
            setRowState({ ...rowState, arealist: globallist })
            setRowState({ ...rowState, case_data: results.data })
            doneLoading()
        },
    })

    Papa.parse(u_deaths, {
        download: true,
        worker: true,
        complete: (results) => {
            let thislist = []
            for (let i = 1; i < results.data.length; i++) {
                if (results.data[i].length > 2)
                    thislist[i - 1] = results.data[i][1]
            }
            setRowState({ ...rowState, death_list: thislist })
            setRowState({ ...rowState, death_data: results.data })
            doneLoading()
        },
    })

    Papa.parse(u_case_preds, {
        download: true,
        worker: true,
        complete: (results) => {
            let thislist = []
            for (let i = 1; i < results.data.length; i++) {
                if (results.data[i].length > 2)
                    thislist[i - 1] = results.data[i][1]
            }
            setRowState({
                ...rowState,
                pred_date: results.data[0]
                    .slice(2)
                    .map((y) => y.concat('T23:00:00Z')),
            })
            setRowState({ ...rowState, case_pred_list: thislist })
            setRowState({ ...rowState, case_preds: results.data })
            doneLoading()
        },
    })

    Papa.parse(u_death_preds, {
        download: true,
        worker: true,
        complete: (results) => {
            let thislist = []
            for (let i = 1; i < results.data.length; i++) {
                if (results.data[i].length > 2)
                    thislist[i - 1] = results.data[i][1]
            }
            setRowState({ ...rowState, death_pred_list: thislist })
            setRowState({ ...rowState, death_preds: results.data })
            doneLoading()
        },
    })

    function updateWindowDimensions() {
        setRowState({
            ...rowState,
            width: window.innerWidth,
            height: window.innerHeight,
        })
    }

    function handleDataTypeSelect(e) {
        setRowState({ ...rowState, dataType: e })
    }

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
        setRowState({ ...rowState, to_plot: full_dd })
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

    function onValuesChange(changedValues, allValues) {
        if ('areas' in changedValues) addNewArea(allValues.areas)
        else 'cum_or_inc' in changedValues
        {
            setRowState({ ...rowState, cum_or_inc: allValues.cum_or_inc })
            plotData()
        }
    }

    const doneLoading = () => {
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

    const {
        areas,
        arealist,
        dataType,
        to_plot,
        data_loading,
        cum_or_inc,
        area_message,
    } = rowState

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
        <div style={{ color: '#1f1c1c' }}>
            <div className="grid">
                <div className="introduction">
                    <Row>
                        <h1>Forecasts for "Almost" Everywhere</h1>
                    </Row>
                    <Row>
                        <p>
                            Use this page to see forecasts not addressed on the{' '}
                            <a href="#/"> main page</a>. Forecasts are available
                            for all locations (around 20,000) for which Google
                            makes its data
                            <a
                                href="https://github.com/GoogleCloudPlatform/covid-19-open-data"
                                target="_blank"
                            >
                                {' '}
                                public
                            </a>
                            .
                        </p>
                    </Row>
                </div>
                <Row>
                    <div className="form-column-row">
                        <Form
                            onValuesChange={onValuesChange}
                            initialValues={{
                                areas: areas,
                                dataType: dataType,
                                cum_or_inc: cum_or_inc,
                            }}
                        >
                            <Popover content={area_message} placement="top">
                                <Form.Item
                                    style={{ marginBottom: '0px' }}
                                    label="Location"
                                    name="areas"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Please select areas!',
                                        },
                                    ]}
                                >
                                    <Select
                                        showSearch
                                        loading={rowState.data_loading}
                                        style={{ width: '100%' }}
                                        placeholder="Select Areas"
                                    >
                                        {arealist.length > 0 &&
                                            arealist.map((s) => (
                                                <Option key={s} value={s}>
                                                    {s}
                                                </Option>
                                            ))}
                                    </Select>
                                </Form.Item>
                            </Popover>
                            <Row>
                                <Col>
                                    <Popover
                                        content={
                                            'Choose to plot cumulative or new weekly numbers'
                                        }
                                        placement="bottomLeft"
                                    >
                                        <Form.Item
                                            label="Data Type"
                                            style={{ marginBottom: '5px' }}
                                            name="cum_or_inc"
                                            value={cum_or_inc}
                                        >
                                            <Radio.Group
                                                initialValue="Cumulative"
                                                buttonStyle="solid"
                                            >
                                                <Radio.Button value="Cumulative">
                                                    Cumulative
                                                </Radio.Button>
                                                <Radio.Button value="New">
                                                    Weekly New
                                                </Radio.Button>
                                            </Radio.Group>
                                        </Form.Item>
                                    </Popover>
                                </Col>
                                <Col>
                                    <Popover
                                        content={
                                            'Choose cases or deaths to plot'
                                        }
                                        placement="bottomLeft"
                                    >
                                        <Form.Item
                                            label="Data Types"
                                            style={{ marginBottom: '0px' }}
                                        >
                                            <Checkbox.Group
                                                value={dataType}
                                                onChange={handleDataTypeSelect}
                                            >
                                                <Checkbox
                                                    defaultChecked
                                                    value="cases"
                                                >
                                                    Cases
                                                </Checkbox>
                                                <Checkbox value="death">
                                                    Deaths
                                                </Checkbox>
                                            </Checkbox.Group>
                                        </Form.Item>
                                    </Popover>
                                </Col>
                            </Row>
                        </Form>
                    </div>
                </Row>
                <Row>
                    <div className="graph-row">
                        <ResponsiveLine
                            data={to_plot}
                            margin={{
                                top: 50,
                                right: 10,
                                bottom: 100,
                                left: 60,
                            }}
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
                                                itemBackground:
                                                    'rgba(0, 0, 0, .03)',
                                                itemOpacity: 1,
                                            },
                                        },
                                    ],
                                },
                            ]}
                            theme={theme}
                        />
                    </div>
                </Row>
                <div className="introduction">
                    <Row>
                        <div style={{ background: '#fae3a2' }}>
                            <p>
                                [<b>Note</b>: The data is noisy for some regions
                                with decreasing cumulative values and missing
                                values. In some cases, the forecast for a region
                                may be lower than one of its sub-region which
                                could be a result of less availabiltiy and more
                                noise at the sub-region level. In that case, the
                                sub-region data and forecast are less reliable,
                                yet not impossible, and may point toward
                                possible new outbreaks. See below for our
                                forecasts from alternative sources that are less
                                noisy and should be preferred for country-level
                                and state-level for US, Germnany, and Poland.]
                            </p>
                        </div>
                    </Row>
                    <Row>
                        <p>
                            Use the following links to download CSV files to
                            analyze yourself (Right-click to Save As):{' '}
                        </p>
                        <ul>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/google_data.csv"
                                    download
                                    target="_blank"
                                >
                                    All formatted case data from Google{' '}
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/google_deaths.csv"
                                    download
                                    target="_blank"
                                >
                                    All formatted death data from Google{' '}
                                </a>{' '}
                            </li>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/google_forecasts_current_0.csv"
                                    download
                                    target="_blank"
                                >
                                    Case forecasts on Google data{' '}
                                </a>{' '}
                            </li>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/google_deaths_current_0.csv"
                                    download
                                    target="_blank"
                                >
                                    Death forecasts on Google data{' '}
                                </a>{' '}
                            </li>
                        </ul>
                    </Row>

                    <Row>
                        <h3>Forecasts from Alternative Sources</h3>
                        <p>
                            The following are the latest forecasts for Countries
                            and the US states used on the main forecast page.
                            These files are based on the{' '}
                            <a href="https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data">
                                {' '}
                                JHU data{' '}
                            </a>
                        </p>

                        <ul>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_data.csv"
                                    download
                                    target="_blank"
                                >
                                    All formatted case data for US states{' '}
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/us_deaths.csv"
                                    download
                                    target="_blank"
                                >
                                    All formatted death data for US states{' '}
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/global_forecasts_current_0.csv"
                                    download
                                    target="_blank"
                                >
                                    Case forecasts for all countries{' '}
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://raw.githubusercontent.com/scc-usc/ReCOVER-COVID-19/master/results/forecasts/global_deaths_current_0.csv"
                                    download
                                    target="_blank"
                                >
                                    Death forecasts for all countries{' '}
                                </a>
                            </li>
                        </ul>
                    </Row>

                    <Row>
                        <p>
                            Follow this{' '}
                            <a href="https://github.com/scc-usc/ReCOVER-COVID-19/tree/master/results/historical_forecasts">
                                {' '}
                                link{' '}
                            </a>{' '}
                            for dated forecasts for German states and Polish
                            Voivodeships. These files are based on the data
                            compiled by
                            <a
                                href="https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data"
                                target="_blank"
                            >
                                {' '}
                                Germany and Poland Forecast Hub
                            </a>
                        </p>
                    </Row>
                    <Row>&nbsp;</Row>
                </div>
            </div>
        </div>
    )
}

export default Row
