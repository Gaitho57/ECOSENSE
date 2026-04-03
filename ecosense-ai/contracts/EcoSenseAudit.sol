// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EcoSenseAudit {
  struct AuditEvent {
    string projectId;
    string eventType;
    string dataHash;   // SHA-256 of the event data
    uint256 timestamp;
    address recorder;
  }

  AuditEvent[] public events;

  event EventRecorded(string projectId, string eventType, string dataHash, uint256 timestamp);

  function recordEvent(string calldata projectId, string calldata eventType, string calldata dataHash) external {
    events.push(AuditEvent(projectId, eventType, dataHash, block.timestamp, msg.sender));
    emit EventRecorded(projectId, eventType, dataHash, block.timestamp);
  }

  function getEventCount() external view returns (uint256) {
    return events.length;
  }
}
