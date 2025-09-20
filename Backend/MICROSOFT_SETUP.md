# Microsoft OAuth Setup Guide

## 1. Register Your Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click "New registration"
3. Fill in the details:
   - **Name**: Mood Tracker App
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: 
     - Platform: Web
     - URI: `http://localhost:5000/auth/callback`

4. After registration, note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**

## 2. Configure Client Secret (Optional for Mobile Apps)

1. In your app registration, go to "Certificates & secrets"
2. Click "New client secret"
3. Add description and expiration
4. Copy the **Value** (not the Secret ID)

## 3. Configure API Permissions

1. Go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `User.Read`
   - `Calendars.Read`
   - `offline_access`

6. Click "Grant admin consent" (if you have admin rights)

## 4. Set Environment Variables

Create a `.env` file in the Backend directory with:

```env
# Microsoft OAuth Configuration
MS_CLIENT_ID=your-client-id-here
MS_CLIENT_SECRET=your-client-secret-here  # Leave empty for mobile apps
MS_TENANT_ID=common  # or your specific tenant ID
MS_REDIRECT_URI=http://localhost:5000/auth/callback
```

## 5. Update microsoft_config.py

Replace the placeholder values in `Backend/microsoft_config.py` with your actual values:

```python
CLIENT_ID = os.getenv('MS_CLIENT_ID', 'your-actual-client-id')
CLIENT_SECRET = os.getenv('MS_CLIENT_SECRET', 'your-actual-client-secret')
TENANT_ID = os.getenv('MS_TENANT_ID', 'common')
REDIRECT_URI = os.getenv('MS_REDIRECT_URI', 'http://localhost:5000/auth/callback')
```

## 6. Install Required Dependencies

```bash
pip install python-dotenv
```

## 7. Load Environment Variables

Add this to the top of your `test_server.py`:

```python
from dotenv import load_dotenv
load_dotenv()
```

## Testing the Integration

1. Start your Flask server: `python test_server.py`
2. Open your mobile app and try the Microsoft login
3. You should be redirected to Microsoft's login page
4. After successful login, you'll get a real access token
5. The `/graph/me` and `/graph/events` endpoints will now return real data

## Troubleshooting

- **Invalid redirect URI**: Make sure the redirect URI in Azure matches exactly
- **Insufficient privileges**: Ensure you've granted the required permissions
- **Token expired**: The system will automatically refresh tokens
- **CORS issues**: Make sure CORS is properly configured for your frontend domain
