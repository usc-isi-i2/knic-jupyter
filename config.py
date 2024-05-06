import os
import urllib.parse

config = get_config()

knic_companion_url = os.getenv('KNIC_COMPANION', 'http://localhost:5641')
url_scheme, url_netloc, *_ = urllib.parse.urlparse(knic_companion_url, scheme='http')
knic_companion_origin = f'{url_scheme}://{url_netloc}'

# Set the response headers for the lab server
config.IdentityProvider.token = '' # Do not bother with a jupyter lab token
config.ServerApp.password = '' # Do not require a password to open jupyter lab
config.ServerApp.allow_origin = '*' # Allow requests from any origin (insecure)
config.ServerApp.disable_check_xsrf = True # Disable XSRF checking in jupyter lab
config.ServerApp.tornado_settings = {
    'headers': {
        'Content-Security-Policy': f"frame-ancestors 'self' {knic_companion_origin}",
    }
}
