# Deployment Guide

## Automatic Deployment Setup

This project uses GitHub Actions for automatic deployment to Azure App Service. Every push to the `master` branch will trigger an automatic build and deployment.

---

## =€ Initial Setup

### 1. Get Azure Publish Profile

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service
3. Click **"Get publish profile"** (download button in the Overview section)
4. Save the downloaded `.PublishSettings` file

### 2. Add Publish Profile to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/plasmacat420/dotnet_test`
2. Click **Settings** ’ **Secrets and variables** ’ **Actions**
3. Click **"New repository secret"**
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: Open the `.PublishSettings` file and paste the **entire contents**
6. Click **"Add secret"**

### 3. Update Workflow Configuration

Edit `.github/workflows/azure-deploy.yml` and replace:

```yaml
AZURE_WEBAPP_NAME: your-app-name    # Replace with your actual Azure App Service name
```

With your actual Azure App Service name (e.g., `voice-agent-api` or whatever your service is called).

---

## = Configure Azure Environment Variables

Your Azure App Service needs LiveKit credentials configured. These override `appsettings.json`.

### Option 1: Via Azure Portal (Recommended)

1. Go to Azure Portal ’ Your App Service
2. Click **Configuration** ’ **Application settings**
3. Add the following settings:

| Name | Value |
|------|-------|
| `LiveKit__Url` | `REDACTED_LIVEKIT_URL` |
| `LiveKit__ApiKey` | `REDACTED_LIVEKIT_API_KEY` |
| `LiveKit__ApiSecret` | `REDACTED_LIVEKIT_API_SECRET` |
| `Email__SmtpHost` | `smtp.gmail.com` |
| `Email__SmtpPort` | `587` |
| `Email__SenderEmail` | `faiz.corsair@gmail.com` |
| `Email__SenderPassword` | `vucq aihy baav mhuj` |
| `Email__SenderName` | `Prepreater & Co. Voice Agent` |

4. Click **"Save"** ’ **"Continue"**
5. Your app will restart automatically

### Option 2: Via Azure CLI

```bash
az webapp config appsettings set --name YOUR_APP_NAME --resource-group YOUR_RESOURCE_GROUP --settings \
  "LiveKit__Url=REDACTED_LIVEKIT_URL" \
  "LiveKit__ApiKey=REDACTED_LIVEKIT_API_KEY" \
  "LiveKit__ApiSecret=REDACTED_LIVEKIT_API_SECRET" \
  "Email__SmtpHost=smtp.gmail.com" \
  "Email__SmtpPort=587" \
  "Email__SenderEmail=faiz.corsair@gmail.com" \
  "Email__SenderPassword=vucq aihy baav mhuj" \
  "Email__SenderName=Prepreater & Co. Voice Agent"
```

---

## =æ How Auto-Deployment Works

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Update voice agent"
   git push origin master
   ```

2. **GitHub Actions automatically:**
   - Detects changes in `SimpleApi/` folder
   - Builds the .NET application
   - Publishes the compiled app
   - Deploys to Azure App Service
   - Restarts the service

3. **Check deployment status:**
   - Go to GitHub ’ **Actions** tab
   - See real-time build/deploy logs
   - Green checkmark = successful deployment
   - Red X = failed (click for error details)

---

## >ê Test the Deployment

After deployment completes:

1. **Test API health:**
   ```bash
   curl https://YOUR_APP_NAME.azurewebsites.net/health
   ```

2. **Test frontend:**
   - Visit your Azure URL
   - Click "Connect to Voice Agent"
   - Anushka should greet you

3. **Check logs:**
   ```bash
   az webapp log tail --name YOUR_APP_NAME --resource-group YOUR_RESOURCE_GROUP
   ```

---

## = Full Deployment Flow

```
Git Commit ’ GitHub Push
    “
GitHub Actions Workflow Triggered
    “
Build .NET App (.NET 9.0)
    “
Publish Artifacts
    “
Deploy to Azure App Service
    “
Azure Restarts App
    “
App Uses Environment Variables (LiveKit credentials)
    “
Frontend Connects to LiveKit Cloud
    “
LiveKit Routes to Voice Agent (deployed separately via `lk agent deploy`)
    “
Anushka responds via Sarvam TTS <¤
```

---

## =à Manual Deployment (Alternative)

If you want to deploy manually without GitHub Actions:

```bash
# From SimpleApi directory
dotnet publish -c Release -o ./publish

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_APP_NAME \
  --src ./publish.zip
```

---

## = Troubleshooting

### Deployment fails in GitHub Actions
- Check **Actions** tab for error logs
- Verify `AZURE_WEBAPP_PUBLISH_PROFILE` secret is correct
- Ensure `AZURE_WEBAPP_NAME` matches your app name

### Agent doesn't connect after deployment
- Verify Azure environment variables are set correctly
- Check LiveKit credentials match `.secrets` file
- Test with: `curl https://YOUR_APP.azurewebsites.net/api/livekit/token`

### Voice not working
- Ensure LiveKit agent is deployed: `lk agent list`
- Check agent logs: `lk agent logs`
- Verify Sarvam TTS is configured in agent `.secrets`

---

## =Ý Notes

- **Free Tier Limitations:** Azure App Service free tier sleeps after 20 min of inactivity
- **Agent Deployment:** Voice agent deploys separately to LiveKit Cloud (not Azure)
- **Costs:** LiveKit Cloud free tier includes 50 GB/month bandwidth
- **Security:** Never commit `.env` or `.secrets` files to Git

---

##  Deployment Checklist

- [ ] Azure publish profile added to GitHub Secrets
- [ ] `AZURE_WEBAPP_NAME` updated in workflow file
- [ ] Azure environment variables configured (LiveKit credentials)
- [ ] Pushed code to master branch
- [ ] GitHub Actions workflow completed successfully
- [ ] Tested frontend voice connection
- [ ] Agent responds correctly

---

**Need help?** Check GitHub Actions logs or Azure App Service logs for detailed error messages.
