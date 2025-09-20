import os
from msal import ConfidentialClientApplication, PublicClientApplication

# Microsoft OAuth Configuration
# You need to register your app at https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
CLIENT_ID = os.getenv('MS_CLIENT_ID', 'your-client-id-here')
CLIENT_SECRET = os.getenv('MS_CLIENT_SECRET', 'your-client-secret-here')  # For web apps
TENANT_ID = os.getenv('MS_TENANT_ID', 'common')  # 'common' for multi-tenant, or your specific tenant ID

# Redirect URI - must match what you configured in Azure portal
REDIRECT_URI = os.getenv('MS_REDIRECT_URI', 'http://localhost:5000/auth/callback')

# Microsoft Graph API scopes
SCOPES = [
    'https://graph.microsoft.com/User.Read',
    'https://graph.microsoft.com/Calendars.Read',
    'https://graph.microsoft.com/offline_access'  # For refresh tokens
]

# Authority URL
AUTHORITY = f'https://login.microsoftonline.com/{TENANT_ID}'

def get_msal_app():
    """Get MSAL application instance"""
    if CLIENT_SECRET:
        # Confidential client (web app with client secret)
        return ConfidentialClientApplication(
            CLIENT_ID,
            authority=AUTHORITY,
            client_credential=CLIENT_SECRET
        )
    else:
        # Public client (mobile app)
        return PublicClientApplication(
            CLIENT_ID,
            authority=AUTHORITY
        )
