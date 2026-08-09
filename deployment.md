# TeamFlow Deployment Guide

This document outlines the standard operating procedure for deploying TeamFlow into a production environment.

## Deployment Architecture

The recommended production architecture utilizes fully managed cloud services:

- **Frontend**: Vercel (Edge Network, Static Hosting)
- **Backend**: Render or Railway (Node.js PaaS)
- **Database**: MongoDB Atlas (Managed Cloud Database)
- **Storage**: LocalStorageAdapter (Default). *Migration path to AWS S3 / Cloudinary recommended for scalable attachment storage.*

---

## 1. Database (MongoDB Atlas)

1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with `Read and write to any database` privileges. Store the password securely.
3. Under **Network Access**, add `0.0.0.0/0` to allow connections from Render/Railway (or specify static IPs if utilizing a dedicated VPC).
4. Copy the connection string (URI).

---

## 2. Backend Deployment (Render)

1. Create a new **Web Service** on Render and connect your GitHub repository.
2. **Build Command**: `cd server && npm ci`
3. **Start Command**: `cd server && npm start`
4. **Environment Variables**:
   Configure the following variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: (Your Atlas Connection String)
   - `JWT_SECRET`: (A secure 64+ character random string)
   - `CORS_ORIGIN`: `https://your-vercel-app-url.vercel.app`
   - `LOG_LEVEL`: `info`
5. **Health Checks**: 
   - Path: `/health`
   - This ensures Render will not route traffic to the container until the MongoDB connection is established and healthy.

---

## 3. Frontend Deployment (Vercel)

1. Import the repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `client`.
3. Vercel will auto-detect Vite and set the build command (`npm run build`) and output directory (`dist`).
4. **Environment Variables**:
   Configure the following in the Vercel dashboard before building:
   - `VITE_API_URL`: `https://your-render-app-url.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://your-render-app-url.onrender.com`
5. Deploy.

---

## 4. Production Security & Configuration

The backend `server.js` has been configured with the following production safeguards:

- **Helmet**: Secures HTTP headers, mitigates XSS, and disables `X-Powered-By`.
- **Compression**: GZIP compresses all JSON and text responses.
- **Trusted Proxy**: Configured (`app.set('trust proxy', 1)`) so rate limiters function correctly behind Render/Railway reverse proxies.
- **CORS**: Strictly bound to the designated `CORS_ORIGIN`.
- **Rate Limiting**: Protects authentication endpoints against brute force attacks.

## 5. Storage Migration Path

Currently, attachments are stored via the local filesystem. For horizontal scaling:
1. Implement an `S3StorageAdapter` or `CloudinaryStorageAdapter` implementing the same interface as the current filesystem uploader.
2. Inject the AWS/Cloudinary credentials via Environment Variables.
3. Update the attachment route to pipe streams directly to the cloud provider.

## 6. Rollback Procedure

- **Frontend**: Vercel supports instant rollbacks. Navigate to the "Deployments" tab in the Vercel dashboard and select "Promote to Production" on the previous stable build.
- **Backend**: In Render, navigate to "Events" or "Deploys", select the previous successful build, and click "Rollback to this deploy".
