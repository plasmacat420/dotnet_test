# Azure Auto-Deployment Setup Guide (Free Tier)

Since **basic authentication is disabled** on Azure free tier, we'll use **Azure Service Principal** authentication instead.

---

## 🚀 Step-by-Step Setup (5-10 minutes)

### **Step 1: Open Azure Cloud Shell** ☁️

1. Go to **https://portal.azure.com**
2. Click the **Cloud Shell icon** (>_) at the top right of the page
3. Select **Bash** when prompted
4. Wait for the shell to load

---

### **Step 2: Get Your Azure Details** 📋

Run these commands in Cloud Shell and **save the outputs**:

```bash
# Get your subscription ID
az account show --query id --output tsv

# List your web apps to get the app name and resource group
az webapp list --query "[].{Name:name, ResourceGroup:resourceGroup}" --output table
```

**Write down:**
- ✏️ Subscription ID: `_______________________`
- ✏️ App Name: `_______________________`
- ✏️ Resource Group: `_______________________`

---

### **Step 3: Create Service Principal** 🔐

Copy and paste this **entire command** into Cloud Shell (replace the placeholders):

```bash
az ad sp create-for-rbac \
  --name "github-actions-deployer" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/YOUR_RESOURCE_GROUP \
  --sdk-auth
```

**Replace:**
- `YOUR_SUBSCRIPTION_ID` with the ID from Step 2
- `YOUR_RESOURCE_GROUP` with the resource group from Step 2

**Example:**
```bash
az ad sp create-for-rbac \
  --name "github-actions-deployer" \
  --role contributor \
  --scopes /subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/myResourceGroup \
  --sdk-auth
```

**You'll get output like this:**
```json
{
  "clientId": "abcd1234-...",
  "clientSecret": "xyz789...",
  "subscriptionId": "12345678-...",
  "tenantId": "efgh5678-...",
  ...
}
```

**IMPORTANT:** Copy this **ENTIRE JSON output** (including the curly braces `{}`). You'll need it in the next step!

---

### **Step 4: Add Azure Credentials to GitHub** 🔑

1. Go to **https://github.com/plasmacat420/dotnet_test**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. **Name:** `AZURE_CREDENTIALS`
5. **Secret:** Paste the **entire JSON output** from Step 3
6. Click **"Add secret"**

---

### **Step 5: Update Workflow File** ✏️

I need to update the workflow with your Azure app name. **Tell me the app name** you got from Step 2, and I'll update it for you.

Or you can do it manually:
1. Edit `.github/workflows/azure-deploy.yml`
2. Change line 13: `AZURE_WEBAPP_NAME: your-app-name` to your actual app name

---

### **Step 6: Configure Azure Environment Variables** 🌐

Run these commands in Azure Cloud Shell (replace `YOUR_APP_NAME`):

```bash
az webapp config appsettings set \
  --name YOUR_APP_NAME \
  --resource-group YOUR_RESOURCE_GROUP \
  --settings \
    LiveKit__Url="REDACTED_LIVEKIT_URL" \
    LiveKit__ApiKey="REDACTED_LIVEKIT_API_KEY" \
    LiveKit__ApiSecret="REDACTED_LIVEKIT_API_SECRET"
```

**Alternative (Via Azure Portal):**
1. Go to Azure Portal → Your App Service
2. Click **Configuration** → **Application settings**
3. Add these three settings:
   - `LiveKit__Url` = `REDACTED_LIVEKIT_URL`
   - `LiveKit__ApiKey` = `REDACTED_LIVEKIT_API_KEY`
   - `LiveKit__ApiSecret` = `REDACTED_LIVEKIT_API_SECRET`
4. Click **Save**

---

### **Step 7: Commit and Push** 🚀

Once Steps 1-6 are complete:

```bash
git add .github/workflows/azure-deploy.yml
git commit -m "Update deployment workflow for Azure credentials"
git push origin master
```

---

### **Step 8: Watch the Magic** ✨

1. Go to **https://github.com/plasmacat420/dotnet_test/actions**
2. You'll see "Deploy to Azure App Service" running
3. Click on it to watch live logs
4. Wait for the green checkmark ✅

---

### **Step 9: Test Your Voice Agent** 🎤

1. Visit your Azure app URL (e.g., `https://yourapp.azurewebsites.net`)
2. Click "Connect to Voice Agent"
3. Allow microphone
4. **Anushka should greet you!** 🎉

---

## 📊 Complete Flow After Setup

```
Git Push
   ↓
GitHub Actions (auto-build)
   ↓
Azure Login (service principal)
   ↓
Deploy to Azure App Service
   ↓
App uses LiveKit credentials from environment
   ↓
Frontend connects to LiveKit Cloud
   ↓
Anushka responds! 🎤
```

---

## 🐛 Troubleshooting

### "Failed to create service principal"
- Make sure you have Owner/Contributor role on the subscription
- Try using just the resource group scope (not subscription)

### "Deployment failed: unauthorized"
- Double-check the JSON in GitHub Secrets is complete
- Verify the service principal has Contributor role

### "Agent doesn't connect"
- Verify Azure environment variables are set (Step 6)
- Check LiveKit credentials match the `.secrets` file
- Test: `curl https://yourapp.azurewebsites.net/api/livekit/token`

---

## ✅ Quick Checklist

- [ ] Run commands in Azure Cloud Shell (Step 2)
- [ ] Create service principal (Step 3)
- [ ] Add `AZURE_CREDENTIALS` to GitHub Secrets (Step 4)
- [ ] Update workflow with app name (Step 5)
- [ ] Configure LiveKit environment variables (Step 6)
- [ ] Push to GitHub (Step 7)
- [ ] Watch deployment (Step 8)
- [ ] Test voice agent (Step 9)

---

**Ready to start? Tell me your:**
1. **App Name** (from Step 2)
2. **Resource Group** (from Step 2)

And I'll help you with the commands!
