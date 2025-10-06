#!/bin/bash
# Simplified Azure Deployment - Builds from GitHub
# Run this in Azure Cloud Shell

set -e

# Configuration
RESOURCE_GROUP="voiceagent-rg"
LOCATION="centralindia"
ACR_NAME="voiceagentacr$(date +%s)"  # Unique name with timestamp
APP_SERVICE_PLAN="voiceagent-plan"
WEB_APP_NAME="voiceagent-app"
GITHUB_REPO="https://github.com/plasmacat420/dotnet_test.git"
CUSTOM_DOMAIN="prepreater.com"

echo "=== Voice Agent Azure Deployment (from GitHub) ==="
echo ""

# Step 1: Delete old deployment
echo "Listing existing resource groups..."
az group list --query "[?contains(name, 'voice')].{Name:name, Location:location}" -o table

echo ""
read -p "Enter OLD resource group name to delete (or press Enter to skip): " OLD_RG

if [ ! -z "$OLD_RG" ]; then
    echo "Deleting old resource group: $OLD_RG"
    az group delete --name "$OLD_RG" --yes --no-wait
    echo "✓ Deletion initiated (running in background)"
fi

# Step 2: Create resource group
echo ""
echo "Creating resource group: $RESOURCE_GROUP"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Step 3: Create ACR
echo ""
echo "Creating Azure Container Registry: $ACR_NAME"
az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query "loginServer" -o tsv)
echo "✓ ACR created: $ACR_LOGIN_SERVER"

# Step 4: Clone repo and build images
echo ""
echo "Cloning repository..."
cd ~
rm -rf dotnet_test
git clone "$GITHUB_REPO"
cd dotnet_test

# Build API image
echo ""
echo "Building API image..."
az acr build \
    --registry "$ACR_NAME" \
    --image voiceagent-api:latest \
    --file SimpleApi/Dockerfile \
    .

# Build Worker image
echo ""
echo "Building Worker image..."
az acr build \
    --registry "$ACR_NAME" \
    --image voiceagent-worker:latest \
    --file voice-agent-py/Dockerfile \
    .

# Step 5: Create App Service Plan
echo ""
echo "Creating App Service Plan: $APP_SERVICE_PLAN"
az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --is-linux \
    --sku B2

# Step 6: Create Web App with API container
echo ""
echo "Creating Web App: $WEB_APP_NAME"
az webapp create \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --name "$WEB_APP_NAME" \
    --deployment-container-image-name "${ACR_LOGIN_SERVER}/voiceagent-api:latest"

# Configure ACR integration
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

az webapp config container set \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --docker-registry-server-url "https://${ACR_LOGIN_SERVER}" \
    --docker-registry-server-user "$ACR_USERNAME" \
    --docker-registry-server-password "$ACR_PASSWORD"

# Step 7: Create Container Instance for Worker (separate from web app)
echo ""
echo "Creating Container Instance for Worker..."
az container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "voiceagent-worker" \
    --image "${ACR_LOGIN_SERVER}/voiceagent-worker:latest" \
    --registry-login-server "$ACR_LOGIN_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --restart-policy Always \
    --cpu 1 \
    --memory 1.5

# Step 8: Configure environment variables
echo ""
echo "Configuring environment variables from .env file..."

# Read .env and create app settings
ENV_SETTINGS=""
while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    value=$(echo "$value" | tr -d '"' | tr -d "'")
    ENV_SETTINGS="$ENV_SETTINGS $key=\"$value\""
done < .env

# Apply to Web App
az webapp config appsettings set \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings ASPNETCORE_ENVIRONMENT=Production ASPNETCORE_HTTP_PORTS=8080

# Apply environment variables from .env
eval "az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings $ENV_SETTINGS --output none"

# Apply same settings to Container Instance
eval "az container create --resource-group $RESOURCE_GROUP --name voiceagent-worker-env --image ${ACR_LOGIN_SERVER}/voiceagent-worker:latest --registry-login-server $ACR_LOGIN_SERVER --registry-username $ACR_USERNAME --registry-password $ACR_PASSWORD --restart-policy Always --cpu 1 --memory 1.5 --environment-variables $ENV_SETTINGS --no-wait"

echo "✓ Environment variables configured"

# Step 9: Configure custom domain
echo ""
echo "=== Custom Domain Setup ==="
echo "Add these DNS records for $CUSTOM_DOMAIN:"
echo ""
echo "1. CNAME Record:"
echo "   Host: @ (or www)"
echo "   Value: $WEB_APP_NAME.azurewebsites.net"
echo ""
VERIFICATION_ID=$(az webapp show --name "$WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" --query customDomainVerificationId -o tsv)
echo "2. TXT Record:"
echo "   Host: asuid.$CUSTOM_DOMAIN"
echo "   Value: $VERIFICATION_ID"
echo ""
read -p "Press Enter after adding DNS records..."

# Add custom domain
az webapp config hostname add \
    --webapp-name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --hostname "$CUSTOM_DOMAIN"

# Enable managed SSL
echo ""
echo "Enabling SSL certificate..."
az webapp config ssl create \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --hostname "$CUSTOM_DOMAIN"

CERT_THUMBPRINT=$(az webapp config ssl list --resource-group "$RESOURCE_GROUP" --query "[?name=='$CUSTOM_DOMAIN'].thumbprint" -o tsv)

az webapp config ssl bind \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --certificate-thumbprint "$CERT_THUMBPRINT" \
    --ssl-type SNI

# Force HTTPS
az webapp update \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --https-only true

# Step 10: Restart and verify
echo ""
echo "Restarting application..."
az webapp restart --name "$WEB_APP_NAME" --resource-group "$RESOURCE_GROUP"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "✓ Application URL: https://${WEB_APP_NAME}.azurewebsites.net"
echo "✓ Custom Domain: https://${CUSTOM_DOMAIN}"
echo "✓ Resource Group: $RESOURCE_GROUP"
echo ""
echo "Test health endpoint:"
echo "  curl https://${CUSTOM_DOMAIN}/health"
echo ""
echo "View logs:"
echo "  az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "Monitor worker:"
echo "  az container logs --resource-group $RESOURCE_GROUP --name voiceagent-worker --follow"
