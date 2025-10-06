#!/bin/bash
# Azure Deployment Script for Voice Agent Application
# Run this in Azure Cloud Shell

set -e  # Exit on error

# Configuration
RESOURCE_GROUP="voiceagent-rg"
LOCATION="centralindia"
ACR_NAME="voiceagentacr"
APP_SERVICE_PLAN="voiceagent-plan"
WEB_APP_NAME="voiceagent-app"
CUSTOM_DOMAIN="prepreater.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Voice Agent Azure Deployment ===${NC}"
echo ""

# Step 1: List existing resource groups (for manual deletion if needed)
echo -e "${YELLOW}Listing existing resource groups...${NC}"
az group list --query "[].{Name:name, Location:location}" -o table

echo ""
read -p "Enter the name of the OLD resource group to delete (or press Enter to skip): " OLD_RG

if [ ! -z "$OLD_RG" ]; then
    echo -e "${YELLOW}Deleting old resource group: $OLD_RG${NC}"
    az group delete --name "$OLD_RG" --yes --no-wait
    echo -e "${GREEN}Deletion initiated (running in background)${NC}"
fi

# Step 2: Create new resource group
echo -e "${YELLOW}Creating new resource group: $RESOURCE_GROUP${NC}"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Step 3: Create Azure Container Registry
echo -e "${YELLOW}Creating Azure Container Registry: $ACR_NAME${NC}"
az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query "loginServer" -o tsv)

# Step 4: Upload code and build images in ACR
echo -e "${YELLOW}Uploading code to Azure Cloud Shell${NC}"
echo -e "${RED}IMPORTANT: Before proceeding, upload your project folder to Cloud Shell${NC}"
echo "Run this command in your local terminal:"
echo "  az storage share upload-directory --account-name <storage-account> --share-name <share> --source . --dest dotnet_test"
echo ""
read -p "Press Enter when you've uploaded the code to Cloud Shell..."

# Navigate to project directory
cd ~/dotnet_test || cd ~/clouddrive/dotnet_test || { echo "Project directory not found!"; exit 1; }

# Build and push API image
echo -e "${YELLOW}Building and pushing API image to ACR${NC}"
az acr build \
    --registry "$ACR_NAME" \
    --image voiceagent-api:latest \
    --file SimpleApi/Dockerfile \
    .

# Build and push Worker image
echo -e "${YELLOW}Building and pushing Worker image to ACR${NC}"
az acr build \
    --registry "$ACR_NAME" \
    --image voiceagent-worker:latest \
    --file voice-agent-py/Dockerfile \
    .

# Step 5: Create App Service Plan (Linux with container support)
echo -e "${YELLOW}Creating App Service Plan: $APP_SERVICE_PLAN${NC}"
az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --is-linux \
    --sku B2

# Step 6: Create Web App with multi-container config
echo -e "${YELLOW}Creating Web App: $WEB_APP_NAME${NC}"

# Create docker-compose config for Azure
cat > docker-compose-azure.yml <<EOF
version: '3.8'
services:
  api:
    image: ${ACR_LOGIN_SERVER}/voiceagent-api:latest
    ports:
      - "80:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_HTTP_PORTS=8080
    restart: always

  worker:
    image: ${ACR_LOGIN_SERVER}/voiceagent-worker:latest
    restart: always
EOF

az webapp create \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --name "$WEB_APP_NAME" \
    --multicontainer-config-type compose \
    --multicontainer-config-file docker-compose-azure.yml

# Configure ACR credentials
az webapp config container set \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --docker-registry-server-url "https://${ACR_LOGIN_SERVER}" \
    --docker-registry-server-user "$ACR_USERNAME" \
    --docker-registry-server-password "$ACR_PASSWORD"

# Step 7: Configure environment variables from .env
echo -e "${YELLOW}Configuring environment variables${NC}"

# Read .env file and set app settings
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # Remove quotes from value
    value=$(echo "$value" | sed 's/^"//;s/"$//')

    # Set app setting
    az webapp config appsettings set \
        --name "$WEB_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --settings "$key=$value" \
        --output none
done < .env

echo -e "${GREEN}Environment variables configured${NC}"

# Step 8: Configure custom domain
echo -e "${YELLOW}Adding custom domain: $CUSTOM_DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Before proceeding, you need to add these DNS records:${NC}"
echo "1. Add CNAME record: $CUSTOM_DOMAIN -> $WEB_APP_NAME.azurewebsites.net"
echo "2. Add TXT record for verification: asuid.$CUSTOM_DOMAIN -> $(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query customDomainVerificationId -o tsv)"
echo ""
read -p "Press Enter when DNS records are configured..."

# Add custom domain
az webapp config hostname add \
    --webapp-name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --hostname "$CUSTOM_DOMAIN"

# Enable HTTPS
echo -e "${YELLOW}Enabling managed SSL certificate${NC}"
az webapp config ssl create \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --hostname "$CUSTOM_DOMAIN"

az webapp config ssl bind \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --certificate-thumbprint $(az webapp config ssl list --resource-group "$RESOURCE_GROUP" --query "[?name=='$CUSTOM_DOMAIN'].thumbprint" -o tsv) \
    --ssl-type SNI

# Enable HTTPS redirect
az webapp update \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --https-only true

# Step 9: Restart app
echo -e "${YELLOW}Restarting web app${NC}"
az webapp restart \
    --name "$WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP"

# Step 10: Show deployment info
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Application URL: https://${WEB_APP_NAME}.azurewebsites.net"
echo "Custom Domain: https://${CUSTOM_DOMAIN}"
echo "Resource Group: $RESOURCE_GROUP"
echo "ACR: $ACR_LOGIN_SERVER"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo -e "${YELLOW}Check health:${NC}"
echo "  curl https://${CUSTOM_DOMAIN}/health"
