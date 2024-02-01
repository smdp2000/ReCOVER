# [COVID-19 & Flu Hospitalization Dashboard](https://re-cover.vercel.app/)

## Overview

This interactive dashboard provides a comprehensive overview of hospitalization rates due to COVID-19 and the flu across various regions. Utilizing the latest data, it offers insights into trends, predictions, and comparisons between different states and timeframes. Our goal is to present a clear and accessible platform for public health officials, researchers, and the general public to understand the impact of these illnesses and to aid in decision-making processes.

## Features

- **Interactive Charts**: Explore hospitalization data through dynamic, interactive visualizations. Users can select specific states or regions to view trends over time.

- **Predictive Analytics**: The dashboard incorporates predictive models to forecast future hospitalization rates, helping users anticipate potential outbreaks or declines.

- **Region Selection**: Users can select from a dropdown menu to filter data by specific states or regions, allowing for localized insights.

- **Quantile Analysis**: For predictive data, the dashboard presents quantiles, including upper and lower bounds, to understand the potential range of outcomes.

- **Responsive Design**: Optimized for both desktop and mobile devices, ensuring accessibility and ease of use regardless of how you access the dashboard.

- **Multiplot** : Compare various regions hospitilization rates, by enabling multiplot

## Data Sources

The dashboard utilizes real-time data from reputable sources, including the CDC, and various public health departments. 

## Getting Started
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
Place a single metadata file named [metadata.txt](https://github.com/smdp2000/ReCOVER/blob/main/public/metadata.txt) into the public folder.


To run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

Once on the main page, click 'Forecast' to navigate to the forecast page.

## Editing the Metadata File

To correctly display data on the dashboard, the metadata file needs to be accurately filled out. Each data block corresponds to a specific dataset and has several fields that need to be defined. Here are the fields you'll need to edit:

### Data Type = Truth Block
- **`url`**: The direct link to the CSV file containing the data.
- **`data_freq`**: Defines the frequency of the source data. Use `"inc"` for incident data source and `"cum"` for cumulative source data.
- **`incident`**: Set to `1` if you want the dashboard to display incident data. Otherwise, set to `0`.
- **`cumulative`**: Set to `1` if you want the dashboard to display cumulative data. Otherwise, set to `0`.
- **`title`**: The title of the graph that will be displayed on the dashboard.
- **`xtitle`**: The title for the x-axis, usually `"Date"`.
- **`ytitle`**: The title for the y-axis, such as `"Hospitalizations"`.
- **`target`**: Specifies the type of hospitalizations data provided. For example, use `"cov_hospitalizations"` for COVID hospitalizations and `"flu_hospitalizations"` for flu hospitalizations.

### Quantile Blocks
For datasets that include quantile forecasts, ensure the following:
- **`target`**: Matches the `target` in the Data Type = Truth Block to ensure it's displayed on the same graph.
- **`quantile`**: Specifies the quantile value of the forecast data. Common quantiles are `1`, `0`, `0.025`, and `0.975`. If you want a particular value to be a upper bound or lower bound, provide quantile value as `1` or `0` respectively.
- **`url`**,  **`url_upper`**, **`url_lower`**, **`url_quantile`**: Direct links to the CSV files containing the respective quantile data. Use `url_upper` for the upper quantile (e.g., `0.975`, ), `url_lower` for the lower quantile (e.g., `0.025`), and `url_quantile` for the median or any central quantile.

### Important Notes
- If you're providing **incident source data**, you cannot expect the dashboard to display cumulative data accurately. Set `incident=1` and `cumulative=0`. As we dont calculate cumulative at the dashboard end.
- Conversely, if your source data is **cumulative** and you want the dashboard to show incident data, provide the source as cumulative (`cumulative=1`) and also set `incident=1`. This ensures the dashboard processes and displays the data correctly.

By following these guidelines and ensuring that the metadata for each dataset is correctly filled out, you will enable accurate and meaningful visualizations on the dashboard for both COVID and flu hospitalization data.


## Input Data Processing
It could be a possibility your data isnt formatted as per the input standard our dashboard accept. Checkout the url links in metadata.txt to confirm the data input. Here is an helper [Python Notebook](https://github.com/smdp2000/ReCOVER/blob/main/ProcessData.ipynb) to help you with data processing.


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Create a Vercel Account: If you haven't already, create a Vercel account. You can sign up using your email or directly with your GitHub, GitLab, or Bitbucket account.

- Set Up Your Project in Vercel: Once you have an account, go to the Vercel dashboard and select the 'New Project' button. From here, you can either import an existing Git repository or start a new project using a template.

- Importing a Git Repository: If your cloned project is already on GitHub (or another version control platform that Vercel supports), you can import it directly. During this process, you can specify which repositories Vercel should have access to.

- Deployment and Configuration: After selecting the repository, you will be guided through some configuration options for your project's build and deployment. Once configured, deploy your project.

- Your URL will be displayed beside the repository on your vercel account dashboard. Generally it follows the convention - https://REPOSITORY_NAME.vercel.app/

- Updating Your Project: When you make changes to your project and push updates to the repository, Vercel will automatically handle the builds. This automation makes it easy to manage deployments directly from your version control system.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
