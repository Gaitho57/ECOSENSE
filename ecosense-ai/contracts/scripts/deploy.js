const hre = require("hardhat");

async function main() {
  console.log("Compiling contracts natively matching parameters...");
  const EcoSenseAudit = await hre.ethers.getContractFactory("EcoSenseAudit");
  const audit = await EcoSenseAudit.deploy();

  await audit.waitForDeployment();

  console.log(`EcoSenseAudit securely deployed isolating boundaries to: ${await audit.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
