# Railway Deployment Guide

This guide explains how to deploy the Polis application to Railway.

## Prerequisites

1. A Railway account ([railway.app](https://railway.app))
2. Railway CLI installed (optional, but recommended):
   ```bash
   npm i -g @railway/cli
   ```

## Quick Start

### 1. Create a New Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Click "New Project" → "Deploy from GitHub repo" (or use Railway CLI)
3. Select this repository

### 2. Add PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create a PostgreSQL database and set the `DATABASE_URL` environment variable

### 3. Configure Environment Variables

Railway will automatically detect the `railway.toml` file. You need to set the following environment variables in Railway's dashboard (Settings → Variables):

#### Required Variables

```bash
# Database (automatically set by Railway PostgreSQL addon)
DATABASE_URL=<automatically set by Railway>

# Application Settings
NODE_ENV=production
API_SERVER_PORT=5000
STATIC_FILES_PORT=8080

# Domain Configuration
# Replace with your Railway domain or custom domain
PUBLIC_SERVICE_URL=https://your-app.railway.app/api/v3
INTERNAL_SERVICE_URL=http://localhost:5000/api/v3
API_PROD_HOSTNAME=your-app.railway.app
DOMAIN_OVERRIDE=your-app.railway.app
EMBED_SERVICE_HOSTNAME=your-app.railway.app
SERVICE_URL=https://your-app.railway.app

# OIDC Authentication
AUTH_AUDIENCE=users
AUTH_CLIENT_ID=your-client-id
AUTH_CLIENT_SECRET=your-client-secret
AUTH_ISSUER=https://your-auth-provider.com/
AUTH_NAMESPACE=https://your-app.railway.app/
AUTH_DOMAIN=your-app.railway.app
JWKS_URI=https://your-auth-provider.com/.well-known/jwks.json

# JWT Keys (generate these locally first)
# You can generate JWT keys using: make generate-jwt-keys
# Then base64 encode them:
# JWT_PRIVATE_KEY=$(cat server/keys/jwt-private.pem | base64 -w 0)
# JWT_PUBLIC_KEY=$(cat server/keys/jwt-public.pem | base64 -w 0)
JWT_PRIVATE_KEY=<base64-encoded-private-key>
JWT_PUBLIC_KEY=<base64-encoded-public-key>
JWT_PRIVATE_KEY_PATH=/app/server/keys/jwt-private.pem
JWT_PUBLIC_KEY_PATH=/app/server/keys/jwt-public.pem

# OIDC Cache
OIDC_CACHE_KEY_PREFIX=oidc.user
OIDC_CACHE_KEY_ID_TOKEN_SUFFIX=@@user@@

# Client Configuration
PUBLIC_AUTH_NAMESPACE=https://your-app.railway.app/
ADMIN_UIDS=<comma-separated-admin-user-ids>

# Database SSL (set to true for Railway PostgreSQL)
DATABASE_SSL=true
```

#### Optional Variables

```bash
# Email Configuration
POLIS_FROM_ADDRESS="Polis <noreply@your-domain.com>"
SES_ENDPOINT=<your-ses-endpoint>
MAILGUN_API_KEY=<your-mailgun-key>
MAILGUN_DOMAIN=<your-mailgun-domain>

# Third-party Services
GA_TRACKING_ID=<your-google-analytics-id>
AKISMET_ANTISPAM_API_KEY=<your-akismet-key>
SHOULD_USE_TRANSLATION_API=false

# AWS (if using S3, DynamoDB, etc.)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_S3_BUCKET_NAME=<your-s3-bucket>
AWS_S3_ENDPOINT=<your-s3-endpoint>

# Datadog (optional)
DD_API_KEY=<your-datadog-key>
DD_SITE=datadoghq.com
DD_APPLICATION_ID=<your-dd-app-id>
DD_CLIENT_TOKEN=<your-dd-token>

# Math Service
MATH_ENV=prod
MATH_LOG_LEVEL=warn

# Server Logging
SERVER_LOG_LEVEL=warn
```

### 4. Generate JWT Keys

Before deploying, you need to generate JWT keys for participant authentication:

```bash
# Generate keys locally
make generate-jwt-keys

# Base64 encode them for Railway
JWT_PRIVATE_KEY=$(cat server/keys/jwt-private.pem | base64 -w 0)
JWT_PUBLIC_KEY=$(cat server/keys/jwt-public.pem | base64 -w 0)

# Add these to Railway environment variables
```

### 5. Deploy

Railway will automatically detect the `Dockerfile.railway` and `railway.toml` files and start building. The deployment process will:

1. Build all client applications (admin, participation, report, participation-alpha)
2. Build the file-server with static assets
3. Build the server application
4. Combine everything into a single container with supervisord managing all processes

### 6. Run Database Migrations

After the first deployment, you need to run database migrations:

1. Open Railway dashboard → Your service → "Deployments" → Click on the latest deployment
2. Open the "Shell" tab
3. Run migrations:

```bash
cd /app/server
npm run migrate
```

Or use Railway CLI:

```bash
railway run --service <your-service-name> "cd /app/server && npm run migrate"
```

### 7. Configure Custom Domain (Optional)

1. In Railway dashboard, go to Settings → Networking
2. Click "Generate Domain" or "Add Custom Domain"
3. Update your environment variables with the new domain

## Architecture

The Railway deployment uses a single container that runs multiple services:

- **Server** (port 5000): Main API server
- **File Server** (port 8080): Serves static assets
- **Client Participation Alpha** (port 4321): Astro-based frontend
- **Nginx** (port 80): Reverse proxy that routes traffic to the appropriate service

All services are managed by `supervisord` to ensure they stay running.

## Troubleshooting

### View Logs

```bash
# Using Railway CLI
railway logs

# Or in Railway dashboard
# Go to your service → "Deployments" → Click deployment → "Logs"
```

### Common Issues

1. **Database Connection Errors**: Ensure `DATABASE_URL` is set correctly and `DATABASE_SSL=true`
2. **Port Conflicts**: Railway sets the `PORT` environment variable. The nginx service listens on port 80, which Railway will map to the `PORT` variable
3. **Build Failures**: Check that all required environment variables are set
4. **Migration Errors**: Ensure migrations are run after the first deployment

### Scaling

Railway automatically handles scaling. For high-traffic deployments, consider:

1. Using Railway's horizontal scaling features
2. Separating services into different Railway services (server, math, delphi)
3. Using Railway's resource limits to allocate more CPU/memory

## Additional Services (Optional)

For a full production deployment, you may want to deploy additional services:

### Math Service

The math service (Clojure) can be deployed as a separate Railway service if needed. However, for simpler deployments, you can run it in the same container or use Railway's service separation.

### Delphi Service

The Delphi service (Python) can also be deployed separately. See `delphi/Dockerfile` for details.

## Support

For issues specific to Railway deployment, check:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

For Polis-specific issues, see the main [README.md](./README.md) and project documentation.

