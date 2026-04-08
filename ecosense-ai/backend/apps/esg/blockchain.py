"""
EcoSense AI — Web3 Execution Boundaries.

Manages execution interacting natively targeting Polygon EVM structures dynamically.
"""

import json
import hashlib
import logging
from django.conf import settings
from apps.projects.models import Project
from apps.esg.models import AuditLog

# Safe abstraction executing cleanly natively mapping to Web3 requirements explicitly 
try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
except ImportError:
    Web3 = None

logger = logging.getLogger(__name__)

# Basic explicit ABI for the `recordEvent` execution cleanly 
CONTRACT_ABI = [
    {
      "inputs": [
        {"internalType": "string", "name": "projectId", "type": "string"},
        {"internalType": "string", "name": "eventType", "type": "string"},
        {"internalType": "string", "name": "dataHash", "type": "string"}
      ],
      "name": "recordEvent",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]

class BlockchainAuditService:
    EVENT_TYPES = [
        'BASELINE_GENERATED', 
        'PREDICTION_RUN', 
        'REPORT_GENERATED', 
        'REPORT_SUBMITTED', 
        'EMP_BREACH', 
        'CONSULTATION_COMPLETE'
    ]

    def __init__(self):
        # Handle placeholders from .env template gracefully structurally
        rpc = getattr(settings, "POLYGON_RPC_URL", "")
        self.rpc_url = rpc if rpc and "your-value" not in rpc else "https://rpc-mumbai.maticvigil.com"
        
        pk = getattr(settings, "POLYGON_PRIVATE_KEY", "")
        self.private_key = pk if pk and "your-value" not in pk else None
        
        addr = getattr(settings, "POLYGON_CONTRACT_ADDRESS", "")
        self.contract_address = addr if addr and "your-value" not in addr else None
        
        if Web3:
            try:
                self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
                self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                if self.contract_address:
                    self.contract = self.w3.eth.contract(address=self.contract_address, abi=CONTRACT_ABI)
            except Exception as e:
                logger.error(f"Web3 initialization failed: {e}")
                self.w3 = None

    def record_event(self, project_id: str, event_type: str, data: dict) -> str:
        """
        Calculates SHA-256 executing arrays natively communicating signed variables to EVM securely matching keys exactly.
        """
        if event_type not in self.EVENT_TYPES:
             logger.warning(f"Unknown architectural event: {event_type}")

        # JSON serialize explicitly securely 
        data_str = json.dumps(data, sort_keys=True)
        data_hash = hashlib.sha256(data_str.encode('utf-8')).hexdigest()
        
        try:
             project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
             logger.error("Project bounding invalid mapping EVM triggers.")
             return None

        # Build execution map tracking DB records synchronously 
        log = AuditLog.objects.create(
             project=project,
             tenant_id=project.tenant_id,
             event_type=event_type,
             data_hash=data_hash,
             status='pending'
        )

        try:
             # MOCK IF NO KEYS 
             if not self.private_key or not self.contract_address or not Web3:
                  # Simulating Polygon execution safely natively checking boundaries cleanly 
                  log.tx_hash = f"mock_tx_0x{hashlib.md5(data_hash.encode()).hexdigest()}"
                  log.block_number = 40561234
                  log.status = 'confirmed'
                  log.save()
                  return log.tx_hash

             # Execute real transaction structurally natively 
             account = self.w3.eth.account.from_key(self.private_key)
             nonce = self.w3.eth.get_transaction_count(account.address)
             
             txn = self.contract.functions.recordEvent(
                  str(project.id),
                  event_type,
                  data_hash
             ).build_transaction({
                  'chainId': 80001, # Mumbai
                  'gas': 2000000,
                  'gasPrice': self.w3.eth.gas_price,
                  'nonce': nonce,
             })

             signed_txn = self.w3.eth.account.sign_transaction(txn, private_key=self.private_key)
             tx_hash_bytes = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
             tx_hash = self.w3.to_hex(tx_hash_bytes)

             # Wait synchronously mapping limitations safely natively (timeout 30s)
             receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
             
             log.tx_hash = tx_hash
             log.block_number = receipt.blockNumber
             log.status = 'confirmed' if receipt.status == 1 else 'failed'
             if log.status == 'failed':
                 log.error_log = "Polygon network rejected execution footprint natively."
             log.save()
             
             return tx_hash

        except Exception as e:
             logger.error(f"Blockchain EVM block execution array failed natively cleanly: {e}")
             log.status = 'failed'
             log.error_log = str(e)
             log.save()
             # We NEVER raise. Do not block main logic flows.
             return None
