#!/usr/bin/env python

'''
MCP prompts for querying the Maestro Bitcoin RPC API
'''

def check_state_of_chain() -> str:
    '''Give me a summary of the current state of the Bitcoin blockchain'''
    return f'''Get blockchain info for Bitcoin and fetch the results of the latest Bitcoin block. Provide in a concise summary.'''
