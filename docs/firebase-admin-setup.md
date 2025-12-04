# Firebase Admin SDK Setup for Production

The Chat AI Assistant uses Firebase Admin SDK for server-side operations (Firestore vector search). This requires service account credentials.

## Local Development

Environment variables must be set in `.env` file:
```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ecovibe-floors.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note:** The app exclusively uses environment variables. `serviceAccountKey.json` is no longer supported.

## Production Deployment (Firebase App Hosting)

### Option 1: Firebase App Hosting Secrets (Recommended)

Firebase App Hosting supports secret management. Set the environment variables via Firebase CLI:

```bash
# Set the client email
firebase apphosting:secrets:set FIREBASE_CLIENT_EMAIL

# Set the private key (you'll be prompted to enter it)
firebase apphosting:secrets:set FIREBASE_PRIVATE_KEY
```

Or via Firebase Console:
1. Go to Firebase Console → App Hosting → Your backend
2. Click "Environment variables" or "Secrets"
3. Add `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`

### Option 2: Use Application Default Credentials

Firebase App Hosting runs on Google Cloud infrastructure and can automatically use Application Default Credentials. To enable this, modify `app/api/chat/route.ts`:

```typescript
// For Firebase App Hosting - uses application default credentials
if (process.env.FIREBASE_CONFIG) {
    initializeApp({
        // No credential needed - uses default service account
    });
} else {
    // Development/other platforms - use explicit credentials
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}
```

### Important Notes

1. **Private key format**: Keep the `\n` characters in the environment variable - the code handles the replacement
2. **Testing production config**: Test the environment variables locally by setting them in `.env`
3. **No service account JSON files**: The app uses environment variables exclusively for security

## Verification

After deployment, check the Firebase Functions logs:
```bash
firebase apphosting:logs --backend=<your-backend-name>
```

If you see "Firebase Admin initialization failed", the credentials are not properly configured.

## Troubleshooting

### Error: "Service account object must contain a string 'private_key' property"

**Causes:**
- Missing `FIREBASE_PRIVATE_KEY` environment variable
- Private key format is incorrect (missing newlines or quotes)

**Solution:**
1. Verify the environment variable is set in Firebase Console
2. Ensure the private key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
3. Keep the `\n` characters (they represent newlines)

### Error: "Failed to initialize Firebase Admin"

**Causes:**
- Missing required environment variables
- Invalid credentials

**Solution:**
1. Check that `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are set
2. Verify credentials are from the correct Firebase project
3. Ensure the service account has Firestore permissions
4. For Firebase App Hosting, ensure secrets are granted access to the backend
