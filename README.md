<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://neon.com/brand/neon-logo-dark-color.svg?new">
  <source media="(prefers-color-scheme: light)" srcset="https://neon.com/brand/neon-logo-light-color.svg?new">
  <img width="250px" alt="Neon Logo" src="https://neon.com/brand/neon-logo-dark-color.svg?new">
</picture>

# Neon Vercel Marketplace Template with Neon Auth

A minimal template for building full-stack React applications using Next.js, Vercel, and Neon with Neon Auth.

## Getting Started

Click the "Deploy" button to clone this repo, create a new Vercel project, setup the Neon integration, and provision a new Neon database:

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneondatabase%2Fvercel-marketplace-neon-auth%2Ftree%2Fmain&project-name=my-vercel-neon-app&repository-name=my-vercel-neon-app&products=[{%22type%22:%22integration%22,%22integrationSlug%22:%22neon%22,%22productSlug%22:%22neon%22,%22protocol%22:%22storage%22}])

> [!IMPORTANT]
> Make sure to check the "Auth" checkbox when creating the Vercel project to enable Neon Auth.

Once the process is complete, you can clone the newly created GitHub repository and start making changes locally.

## Demo

View live demo: [vercel-marketplace-neon-auth.vercel.app](https://vercel-marketplace-neon-auth.vercel.app/)

![Vercel with Neon Auth](./docs/home.png)

## Local Setup

### Installation

Install the dependencies:

```bash
npm install
```

You can use the package manager of your choice. For example, Vercel also supports `bun install` out of the box.

### Development

#### Create a .env file in the project root

```bash
cp .env.example .env
```

#### Set up the environment variables

##### Neon DB & Auth variables

Run `vercel env pull` to fetch the environment variables from your Vercel project.

Alternatively, you can obtain your database connection string and Neon Auth base URL from the obtain the database connection string from the [Neon Dashboard](https://console.neon.tech/).

1. Database Connection String: Obtain the database connection string from the Connection Details widget on the [Neon Dashboard](https://console.neon.tech/) and update the `.env` file:

```txt
DATABASE_URL=<postgres://user:pass@host/db>
```

2. Neon Auth Base URL: Obtain the Neon Auth Base URL from the Auth tab of your production branch on the [Neon Dashboard](https://console.neon.tech/) and update the `.env` file:

```txt
NEON_AUTH_BASE_URL=<https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth>
```

##### Cookie Secret

Generate a secure secret for session cookies:

```bash
openssl rand -base64 32
```

Add to `.env`:

```txt
NEON_AUTH_COOKIE_SECRET=<generated-secret>
```

##### Push to Vercel

Add the cookie secret (and other environment variables) to the Vercel environment variables:

```bash
vercel env add [name] [environment] < [file]
```

```bash
vercel env add NEON_AUTH_COOKIE_SECRET production < .env
```

#### Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

#### Neon MCP Server & Agent Skill

This project includes the [Neon MCP server](https://github.com/neondatabase/mcp-server-neon) and [neon-postgres agent skill](https://github.com/neondatabase/agent-skills) for AI-assisted development with Neon Postgres. Both are configured for Cursor, Claude Code and VS Code.

## Learn More

To learn more about Neon, check out the Neon documentation:

- [Neon on Vercel Fluid Compute](https://neon.com/docs/guides/vercel-connection-methods) - learn about differnet datatabase connection methods on Fluid.
- [Neon Documentation](https://neon.tech/docs/introduction) - learn about Neon's features and SDKs.
- [Neon Auth Documentation](https://neon.com/docs/auth/overview) - learn about Neon Auth.
- [Neon Discord](https://discord.gg/9kf3G4yUZk) - join the Neon Discord server to ask questions and join the community.
- [ORM Integrations](https://neon.tech/docs/get-started-with-neon/orms) - find Object-Relational Mappers (ORMs) that work with Neon.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

Commit and push your code changes to your GitHub repository to automatically trigger a new deployment.
