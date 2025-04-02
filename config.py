#!/usr/bin/env python

import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Constants
MAESTRO_API_BASE = 'https://xbt-testnet.gomaestro-api.org/v0'
API_KEY = os.getenv('MAESTRO_API_KEY', '')

