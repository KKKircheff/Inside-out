# Firebase App Hosting Deployment Guide

Quick reference for deploying EcoVibeFloors to Firebase App Hosting.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Authenticated: `firebase login`
- Project selected: `firebase use ecovibe-floors`

## Deployment Workflow

### 1. Deploy Command

```bash
# Deploy entire app (recommended)
firebase deploy

# Deploy only App Hosting backend
firebase deploy --only apphosting
```

### 2. Monitor Deployment

View build progress:
```bash
# Check build logs
firebase apphosting:logs --backend=ecovibe-floors-backend

# Or visit Firebase Console:
# https://console.firebase.google.com/project/ecovibe-floors/apphosting
```

### 3. Verify Deployment

After successful deployment:
- Visit your production URL: https://ecovibefloors.com
- Test critical features (chat AI, product pages, contact forms)
- Check Firebase Console for any runtime errors

---

## Configuration: apphosting.yaml

The `apphosting.yaml` file configures environment variables and secrets for App Hosting.

### Environment Variable Types

**Public Variables** - Exposed to client-side code:
```yaml
- variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
  value: ecovibe-floors
  availability:
    - BUILD    # Available during Next.js build
    - RUNTIME  # Available when app runs
```

**Server-Side Values** - Only available server-side:
```yaml
- variable: AZURE_RESOURCE_NAME
  value: kirch-md03vahe-swedencentral
  availability:
    - RUNTIME  # Only available when app runs
```

**Secrets** - Sensitive credentials stored in Secret Manager:
```yaml
- variable: AZURE_API_KEY
  secret: AZURE_API_KEY  # References Secret Manager
  availability:
    - BUILD    # Needed for static generation
    - RUNTIME  # Needed at runtime
```

### Availability Guidelines

- **BUILD + RUNTIME**: Required for Next.js static generation (Firebase Admin SDK, any API called during build)
- **RUNTIME only**: Runtime-only APIs (chat completions, embeddings)
- **BUILD only**: Rarely used (build-time configuration)

---

## Secrets Management

### Create a Secret

```bash
firebase apphosting:secrets:set SECRET_NAME

# You'll be prompted to enter the secret value
```

### Grant Backend Access

**Critical:** After creating a secret, grant your backend access:

```bash
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=ecovibe-floors-backend
```

Without this step, deployment will fail with "Misconfigured Secret" error.

### List Secrets

```bash
firebase apphosting:secrets:list
```

### Update a Secret

```bash
# Set new value
firebase apphosting:secrets:set SECRET_NAME

# Grant access again if needed
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=ecovibe-floors-backend
```

### Current Secrets Configuration

EcoVibeFloors uses these secrets:
- `AZURE_API_KEY` - Azure OpenAI API key
- `FIREBASE_PRIVATE_KEY` - Firebase Admin SDK private key

---

## Troubleshooting

### Error: "Misconfigured Secret"

**Symptom:**
```
Error resolving secret version with name: projects/ecovibe-floors/secrets/AZURE_API_KEY/versions/latest
```

**Cause:** Secret exists but backend doesn't have permission to access it.

**Solution:**
```bash
firebase apphosting:secrets:grantaccess AZURE_API_KEY --backend=ecovibe-floors-backend
firebase apphosting:secrets:grantaccess FIREBASE_PRIVATE_KEY --backend=ecovibe-floors-backend
```

### Error: "Firebase Admin credentials not found" (Build Time)

**Symptom:**
```
Error: Firebase Admin credentials not found. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables.
> Build error occurred
Failed to collect page data for /api/chat
```

**Cause:** Firebase Admin secrets only available at RUNTIME, but Next.js needs them during BUILD for static generation.

**Solution:** Update `apphosting.yaml` to include BUILD availability:
```yaml
- variable: FIREBASE_PRIVATE_KEY
  secret: FIREBASE_PRIVATE_KEY
  availability:
    - BUILD    # Add this
    - RUNTIME
```

### Error: "Failed to parse private key: Only 8, 16, 24, or 32 bits supported"

**Symptom:**
```
Error: Failed to parse private key: Error: Only 8, 16, 24, or 32 bits supported: 528
> Build error occurred
Failed to collect page data for /api/chat
```

**Cause:** The `FIREBASE_PRIVATE_KEY` secret has incorrect formatting (wrong newlines, extra escaping, or truncation).

**Solution - Option 1 (Google Cloud Console):**

1. Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=ecovibe-floors)
2. Click on `FIREBASE_PRIVATE_KEY`
3. Click **NEW VERSION**
4. Paste the private key **exactly as it appears** in your service account JSON file:
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
   (many lines - real newlines, NOT \n characters)
   ...
   -----END PRIVATE KEY-----
   ```
5. Click **ADD NEW VERSION**
6. Redeploy: `firebase deploy`

**Solution - Option 2 (CLI with temporary file):**

```bash
# 1. Download service account key from Firebase Console
# https://console.firebase.google.com/project/ecovibe-floors/settings/serviceaccounts/adminsdk

# 2. Extract private_key field and save to temporary file
cat > /tmp/firebase-key.txt << 'EOF'
-----BEGIN PRIVATE KEY-----
[paste your key here]
-----END PRIVATE KEY-----
EOF

# 3. Update the secret
firebase apphosting:secrets:set FIREBASE_PRIVATE_KEY < /tmp/firebase-key.txt

# 4. Grant access
firebase apphosting:secrets:grantaccess FIREBASE_PRIVATE_KEY --backend=ecovibe-floors-backend

# 5. Clean up
rm /tmp/firebase-key.txt

# 6. Redeploy
firebase deploy
```

**Important:** The private key MUST have actual newlines, not the literal characters `\n`.

### Error: Build Fails with TypeScript Errors

**Solution:**
```bash
# Run locally first to catch errors
npx tsc --noEmit

# Fix all TypeScript errors before deploying
```

### View Deployment Logs

```bash
# Real-time logs during deployment
firebase apphosting:logs --backend=ecovibe-floors-backend

# Or use Google Cloud Console:
# https://console.cloud.google.com/cloud-build/builds?project=ecovibe-floors
```

---

## Pre-Deployment Checklist

Before running `firebase deploy`:

- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] Local build successful (`npm run build`)
- [ ] Environment variables configured in `apphosting.yaml`
- [ ] Secrets created and granted access to backend
- [ ] Firestore security rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Firestore indexes deployed (`firebase deploy --only firestore:indexes`)

---

## Rollback

If deployment fails or has issues:

```bash
# View deployment history in Firebase Console
# Select previous successful version and promote it
```

Or redeploy from a previous Git commit:
```bash
git checkout <previous-commit-hash>
firebase deploy
git checkout main
```

---

## Environment Management

### Local Development
- Uses `.env` file
- Contains all secrets and environment variables
- **Never commit `.env` to Git** (already in `.gitignore`)

### Production (Firebase App Hosting)
- Uses `apphosting.yaml` for configuration
- Secrets stored in Google Cloud Secret Manager
- Secrets referenced in `apphosting.yaml` with `secret:` prefix

---

## Additional Resources

- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [apphosting.yaml Reference](https://firebase.google.com/docs/app-hosting/configure-app-hosting)
- [Firebase Security Rules](./firestore-security-rules.md)
- [Firebase Admin SDK Setup](./firebase-admin-setup.md)
