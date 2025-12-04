# 🚀 Setup Checklist

Follow these steps to get Devil's Advocate running:

## ✅ Pre-Deployment Checklist

### 1. Azure OpenAI Setup
- [ ] Create Azure OpenAI resource in [Azure Portal](https://portal.azure.com)
- [ ] Deploy **GPT-4o-mini** model (for agent debates)
- [ ] Deploy **Whisper** model (for speech-to-text)
- [ ] Deploy **TTS-1** or **TTS-1-HD** model (for text-to-speech)
- [ ] Note down deployment names for each model
- [ ] Copy API key from "Keys and Endpoint" section
- [ ] Copy resource name from overview

### 2. Local Environment Setup
- [ ] Clone the repository
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in Azure credentials in `.env.local`:
  ```env
  AZURE_OPENAI_RESOURCE_NAME=your-resource-name
  AZURE_OPENAI_API_KEY=your-api-key
  AZURE_GPT_DEPLOYMENT_NAME=gpt-4o-mini
  AZURE_TTS_DEPLOYMENT_NAME=tts-1
  AZURE_WHISPER_DEPLOYMENT_NAME=whisper
  ```

### 3. Test Locally
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Test text input with a simple decision
- [ ] Test voice input (click microphone icon)
- [ ] Verify agents stream responses
- [ ] Verify audio playback works (toggle speaker icon)
- [ ] Check confidence score appears at the end

### 4. Production Deployment (Vercel)
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Run `vercel` in project directory
- [ ] Add environment variables in Vercel dashboard:
  - `AZURE_OPENAI_RESOURCE_NAME`
  - `AZURE_OPENAI_API_KEY`
  - `AZURE_GPT_DEPLOYMENT_NAME`
  - `AZURE_TTS_DEPLOYMENT_NAME`
  - `AZURE_WHISPER_DEPLOYMENT_NAME`
- [ ] Deploy: `vercel --prod`
- [ ] Test production URL

## 🔧 Troubleshooting

### Issue: "Azure TTS not configured"
**Solution:** Check that all environment variables are set correctly in `.env.local`

### Issue: Agents not streaming
**Solution:** Verify your Azure GPT deployment is active and has quota

### Issue: Voice input not working
**Solution:**
- Allow microphone permissions in browser
- Use HTTPS in production (required for MediaRecorder API)

### Issue: Audio playback fails
**Solution:** Check Azure TTS deployment name matches your actual deployment

### Issue: Build fails
**Solution:**
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

## 📊 Azure Quota Requirements

**Recommended minimum quotas:**
- **GPT-4o-mini**: 50K tokens/min (for 9 sequential agent calls)
- **Whisper**: 10 requests/min
- **TTS**: 10 requests/min

Lower quotas will work but may cause rate limiting during concurrent users.

## 🎯 Performance Tips

1. **Reduce agent count** for faster debates (edit `src/lib/agents.ts`)
2. **Disable audio** if not needed (improves speed)
3. **Increase temperature** in `src/app/api/debate/route.ts` for more creative responses
4. **Add caching** for repeated decisions (not implemented by default)

## 🔐 Security Notes

- ✅ API keys stored server-side only (never exposed to client)
- ✅ CORS handled by Next.js API routes
- ✅ No database = no data persistence concerns
- ⚠️ Consider rate limiting in production
- ⚠️ Monitor Azure costs (agents make 9+ API calls per debate)

## 📝 Customization Ideas

- **Change agent personas**: Edit `src/lib/agents.ts`
- **Add domain-specific agents**: Finance, healthcare, tech-specific
- **Modify UI theme**: Edit `src/lib/theme.ts`
- **Add analytics**: Track decision types, confidence scores
- **Save debate history**: Add local storage or database
- **Add user accounts**: Integrate auth (Auth.js, Clerk, etc.)
- **Multi-language support**: Add i18n for international users

## ✨ You're Ready!

Once all checkboxes are complete, you're ready to demo! 🎉

**Pro tip for hackathon demos:**
Prepare 2-3 interesting decisions beforehand to show different agent perspectives:
- One with high confidence (70-90)
- One with low confidence (20-40)
- One controversial decision to show agent disagreement
