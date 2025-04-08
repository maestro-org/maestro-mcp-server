#!/usr/bin/env python

import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Constants
MAESTRO_BASE_URL = os.getenv('MAESTRO_BASE_URL', 'https://xbt-mainnet.gomaestro-api.org/v0')
API_KEY = os.getenv('MAESTRO_API_KEY')
