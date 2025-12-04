# Firebase App Hosting Deployment Guide for Next.js

Quick reference for deploying Next.js applications to Firebase App Hosting from scratch.

---

## Prerequisites

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Authenticate
```bash
firebase login
```

### 3. Create Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com/)
- Click "Add project"
- Follow the setup wizard
- Choose your region (e.g., `europe-west1`, `us-central1`)

---

## Initial Project Setup

### 1. Initialize Firebase in Your Next.js Project
```bash
cd your-nextjs-project
firebase init
```

Select:
- **Firestore** (if using database)
- **Hosting** (required for App Hosting)
- Choose existing project or create new one

### 2. Set Active Firebase Project
```bash
firebase use your-project-id
```

---

## Configuration Files

### Required Files Structure
```
your-nextjs-project/
├── firebase.json
├── .firebaserc
├── apphosting.yaml
├── firestore.rules (if using Firestore)
├── firestore.indexes.json (if using Firestore)
├── .env.local (local development only)
└── .gitignore
```

---

## 1. Configure firebase.json

Create or update `firebase.json`:

```json
{
  "firestore": {
    "database": "(default)",
    "location": "eur3",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "europe-west1"
    }
  }
}
```

**Key Points:**
- `hosting.source`: Set to `"."` (current directory)
- `frameworksBackend.region`: Choose your preferred region
- Common regions: `europe-west1`, `us-central1`, `asia-northeast1`

---

## 2. Configure .firebaserc

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Replace `your-project-id` with your actual Firebase project ID.

---

## 3. Create apphosting.yaml

This file defines environment variables and secrets for production:

```yaml
# apphosting.yaml
# Firebase App Hosting Configuration

# Runtime configuration (optional)
# runConfig:
#   cpu: 1
#   memoryMiB: 512
#   concurrency: 80

# Environment variables
env:
  # ====================================
  # Public Firebase Configuration
  # Safe to expose on frontend
  # ====================================
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: your-project-id.firebaseapp.com
    availability:
      - BUILD
      - RUNTIME

  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: your-project-id
    availability:
      - BUILD
      - RUNTIME

  # ====================================
  # Server-Side Configuration
  # ====================================
  - variable: YOUR_API_RESOURCE_NAME
    value: your-resource-name
    availability:
      - BUILD
      - RUNTIME

  # ====================================
  # Secrets (Sensitive Data)
  # Reference secrets from Secret Manager
  # ====================================
  - variable: YOUR_API_KEY
    secret: YOUR_API_KEY
    availability:
      - RUNTIME

  - variable: FIREBASE_PRIVATE_KEY
    secret: FIREBASE_PRIVATE_KEY
    availability:
      - BUILD    # Needed if using Firebase Admin during build
      - RUNTIME
```

**Availability Guidelines:**
- **BUILD + RUNTIME**: Required for Next.js static generation (Firebase Admin SDK, APIs called during build)
- **RUNTIME only**: Runtime-only APIs (chat completions, embeddings, etc.)
- **BUILD only**: Rarely used (build-time configuration only)

---

## 4. Update .gitignore

**CRITICAL**: Never commit sensitive files:

```gitignore
# Environment files
.env
.env.*
!.env.example

# Firebase
/.firebase

# Auth configuration (if you have local auth files)
auth-config.json

# Local development
.env.local
```

**Important:** Use `.env.local` for local development, NOT `.env`
- Firebase deployment fails if `.env` exists with `FIREBASE_` prefixed variables
- `FIREBASE_`, `GOOGLE_`, `EXT_` prefixes are reserved by Firebase

---

## Environment Variables Setup

### Local Development (.env.local)
```bash
# .env.local (for local development only - NOT committed)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com

# Server-side variables
YOUR_API_KEY=your-local-api-key
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Production (Firebase Secret Manager)

Create secrets for production deployment:

```bash
# Create secrets
firebase apphosting:secrets:set YOUR_API_KEY
firebase apphosting:secrets:set FIREBASE_PRIVATE_KEY

# You'll be prompted to paste the secret value
# For FIREBASE_PRIVATE_KEY: paste the entire key INCLUDING the BEGIN/END lines
```

**IMPORTANT - Firebase Private Key Format:**
The private key MUST have actual newlines, not `\n` characters:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
(multiple lines with REAL newlines)
...
-----END PRIVATE KEY-----
```

---

## Google Cloud Console Setup

### Required APIs to Enable

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your Firebase project**
3. **Enable these APIs**:

```bash
# Or enable via CLI
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

**Required APIs:**
- ✅ Cloud Functions API (`cloudfunctions.googleapis.com`)
- ✅ Cloud Build API (`cloudbuild.googleapis.com`)
- ✅ Artifact Registry API (`artifactregistry.googleapis.com`)
- ✅ Cloud Run API (`run.googleapis.com`)
- ✅ Secret Manager API (`secretmanager.googleapis.com`)

**These are usually auto-enabled during first deployment, but you can enable them manually to avoid delays.**

---

## Grant Backend Access to Secrets

After creating secrets, you MUST grant your backend access:

```bash
# List existing backends
firebase apphosting:backends:list

# Grant access to secrets
firebase apphosting:secrets:grantaccess YOUR_API_KEY --backend=your-backend-id
firebase apphosting:secrets:grantaccess FIREBASE_PRIVATE_KEY --backend=your-backend-id

# Grant multiple secrets at once
firebase apphosting:secrets:grantaccess SECRET1,SECRET2,SECRET3 --backend=your-backend-id
```

**Without this step, deployment will fail with "Misconfigured Secret" error.**

---

## Deployment Workflow

### First-Time Deployment

```bash
# 1. Ensure .env is renamed (critical!)
mv .env .env.local

# 2. Test local build
npm run build

# 3. Commit configuration files
git add firebase.json .firebaserc apphosting.yaml .gitignore
git commit -m "Configure Firebase App Hosting"
git push origin main

# 4. Deploy to Firebase
firebase deploy
```

### Subsequent Deployments

```bash
# Just deploy (if no config changes)
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Troubleshooting

### Error: "FIREBASE_ prefix is reserved"
```
Error: Key FIREBASE_PROJECT_ID starts with a reserved prefix
```

**Solution**: Rename `.env` to `.env.local`
```bash
mv .env .env.local
```

---

### Error: "Misconfigured Secret"
```
Error resolving secret version: projects/PROJECT/secrets/YOUR_SECRET/versions/latest
```

**Solution**: Grant backend access
```bash
firebase apphosting:secrets:grantaccess YOUR_SECRET --backend=your-backend-id
```

---

### Error: "Failed to parse private key"
```
Error: Failed to parse private key: Only 8, 16, 24, or 32 bits supported
```

**Solution**: Update secret with correct format

**Option 1 - Google Cloud Console:**
1. Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager)
2. Click on `FIREBASE_PRIVATE_KEY`
3. Click **NEW VERSION**
4. Paste the key **exactly** as it appears in service account JSON (with real newlines)
5. Click **ADD NEW VERSION**

**Option 2 - CLI:**
```bash
# Download service account key from Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT/settings/serviceaccounts/adminsdk

# Extract private_key field and save to temporary file
cat > /tmp/firebase-key.txt << 'EOF'
-----BEGIN PRIVATE KEY-----
[paste your key here with REAL newlines, not \n]
-----END PRIVATE KEY-----
EOF

# Update the secret
firebase apphosting:secrets:set FIREBASE_PRIVATE_KEY < /tmp/firebase-key.txt

# Grant access
firebase apphosting:secrets:grantaccess FIREBASE_PRIVATE_KEY --backend=your-backend-id

# Clean up
rm /tmp/firebase-key.txt

# Redeploy
firebase deploy
```

---

### Error: "Unsupported Node version"
```
This integration expects Node version 16, 18, or 20. You're running version 22
```

**This is a warning, not a critical error.** Firebase Hosting supports Node 16-20 officially, but v22 usually works. If you encounter issues:

**Solution**: Use Node 20
```bash
# Using nvm
nvm install 20
nvm use 20

# Or update package.json
{
  "engines": {
    "node": "20"
  }
}
```

---

## Deployment Checklist

Before running `firebase deploy`:

- [ ] All secrets created in Secret Manager
- [ ] Secrets granted access to backend
- [ ] `.env` renamed to `.env.local`
- [ ] `apphosting.yaml` configured with all environment variables
- [ ] `firebase.json` includes hosting configuration
- [ ] `.gitignore` excludes sensitive files
- [ ] Local build successful (`npm run build`)
- [ ] TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] Changes committed and pushed to GitHub

---

## Monitoring & Logs

### View Deployment Logs
```bash
# Real-time logs during deployment
firebase apphosting:logs --backend=your-backend-id

# Or use Google Cloud Console
# https://console.cloud.google.com/cloud-build/builds?project=YOUR_PROJECT
```

### View Runtime Logs
```bash
# Cloud Run logs
gcloud run services logs read your-backend-id --project=YOUR_PROJECT

# Or via Google Cloud Console
# https://console.cloud.google.com/run?project=YOUR_PROJECT
```

---

## Managing Secrets

### List Secrets
```bash
firebase apphosting:secrets:describe SECRET_NAME
```

### Update Secret
```bash
firebase apphosting:secrets:set SECRET_NAME
# Paste new value when prompted

# Grant access (if needed)
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=your-backend-id
```

### Delete Secret
Go to [Secret Manager Console](https://console.cloud.google.com/security/secret-manager) and delete manually.

---

## Rollback

If deployment fails or has issues:

### Via Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/project/YOUR_PROJECT/apphosting)
2. View deployment history
3. Select previous successful version
4. Click "Promote"

### Via Git
```bash
git checkout <previous-commit-hash>
firebase deploy
git checkout main
```

---

## Custom Domain Setup (Optional)

### Add Custom Domain
1. Go to Firebase Console → App Hosting
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow DNS configuration steps:
   - Add A record: `151.101.1.195`
   - Add A record: `151.101.65.195`
5. Wait for SSL certificate provisioning (15-60 minutes)

---

## Best Practices

### Security
- ✅ Never commit `.env` or `.env.local` files
- ✅ Use Secret Manager for all sensitive data
- ✅ Add `auth-config.json` and similar files to `.gitignore`
- ✅ Regularly rotate API keys and secrets

### Performance
- ✅ Use appropriate `availability` settings (BUILD vs RUNTIME)
- ✅ Enable caching for static assets
- ✅ Use environment-specific optimizations

### Development Workflow
- ✅ Test locally with `.env.local` before deploying
- ✅ Run `npm run build` before deploying
- ✅ Verify TypeScript types (`npx tsc --noEmit`)
- ✅ Use version control for all configuration files

---

## Additional Resources

- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [Next.js Deployment Guide](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [apphosting.yaml Reference](https://firebase.google.com/docs/app-hosting/configure-app-hosting)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager)

---

## Summary

**Key Takeaways:**
1. Use `.env.local` for local development (never `.env`)
2. Use `apphosting.yaml` for production environment variables
3. Store sensitive data in Secret Manager
4. Grant backend access to all secrets
5. Enable required Google Cloud APIs
6. Test locally before deploying

**Quick Deploy Command:**
```bash
mv .env .env.local && firebase deploy
```

That's it! Your Next.js app is now deployed to Firebase App Hosting with production-ready configuration. 🚀
