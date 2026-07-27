// SPDX-License-Identifier: MIT
// Pin the exact compiler that was audited (no floating ^).
pragma solidity 0.8.19;

/**
 * @title EcoSenseAudit
 * @notice Append-only, immutable audit trail for EcoSense EIA events.
 * @dev Access control: only the owner or an authorized recorder may append
 *      events. Previously `recordEvent` was open to any address, so anyone
 *      could forge or flood the "immutable" trail. Records remain append-only
 *      (no update/delete) and each stores `msg.sender` for attribution.
 */
contract EcoSenseAudit {
  struct AuditEvent {
    string projectId;
    string eventType;
    string dataHash;   // SHA-256 of the event data
    uint256 timestamp;
    address recorder;
  }

  AuditEvent[] public events;

  address public owner;
  mapping(address => bool) public authorizedRecorders;

  // Indexed fields let off-chain auditors filter the log efficiently.
  event EventRecorded(
    string indexed projectId,
    string eventType,
    string dataHash,
    uint256 timestamp,
    address indexed recorder
  );
  event RecorderUpdated(address indexed recorder, bool authorized);
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
  }

  modifier onlyRecorder() {
    require(msg.sender == owner || authorizedRecorders[msg.sender], "Not authorized");
    _;
  }

  constructor() {
    owner = msg.sender;
    authorizedRecorders[msg.sender] = true;
    emit OwnershipTransferred(address(0), msg.sender);
  }

  /// @notice Authorize or revoke an address allowed to record events.
  function setRecorder(address recorder, bool authorized) external onlyOwner {
    authorizedRecorders[recorder] = authorized;
    emit RecorderUpdated(recorder, authorized);
  }

  /// @notice Transfer contract ownership.
  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), "Zero address");
    emit OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

  /// @notice Append an audit event. Restricted to owner/authorized recorders.
  function recordEvent(
    string calldata projectId,
    string calldata eventType,
    string calldata dataHash
  ) external onlyRecorder {
    events.push(AuditEvent(projectId, eventType, dataHash, block.timestamp, msg.sender));
    emit EventRecorded(projectId, eventType, dataHash, block.timestamp, msg.sender);
  }

  function getEventCount() external view returns (uint256) {
    return events.length;
  }
}
