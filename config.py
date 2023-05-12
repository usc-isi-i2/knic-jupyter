from notebook.services.config import ConfigManager

config = get_config()

# Set the response headers for the lab server
config.IdentityProvider.token = '' # Do not bother with a jupyter lab token
config.ServerApp.password = '' # Do not require a password to open jupyter lab
config.ServerApp.allow_origin = '*' # Allow requests from any origin (insecure)
config.ServerApp.allow_credentials = True # Set the Access-Control-Allow-Credentials response header
config.ServerApp.tornado_settings = {
    'headers': {
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self' http://localhost:5641",
    }
}
