#!/usr/bin/env python

import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Constants
MAESTRO_BASE_URL = os.getenv('MAESTRO_BASE_URL')
API_KEY = os.getenv('MAESTRO_API_KEY', 'https://xbt-mainnet.gomaestro-api.org/v0')
