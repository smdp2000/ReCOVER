This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

Place a single metadata file named 'metadata.txt' into the public folder.

Replace the value assigned to 'metadataRoute' at the top of src/pages/forecast.js to the following: '[your github pages url]/metadata.txt'

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

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Create a Vercel Account: If you haven't already, create a Vercel account. You can sign up using your email or directly with your GitHub, GitLab, or Bitbucket account.

- Set Up Your Project in Vercel: Once you have an account, go to the Vercel dashboard and select the 'New Project' button. From here, you can either import an existing Git repository or start a new project using a template.

- Importing a Git Repository: If your cloned project is already on GitHub (or another version control platform that Vercel supports), you can import it directly. During this process, you can specify which repositories Vercel should have access to.

- Deployment and Configuration: After selecting the repository, you will be guided through some configuration options for your project's build and deployment. Once configured, deploy your project.

- Updating Your Project: When you make changes to your project and push updates to the repository, Vercel will automatically handle the builds. This automation makes it easy to manage deployments directly from your version control system.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
