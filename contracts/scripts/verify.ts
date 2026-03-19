/**
 * verify.ts
 * Verifies deployed contracts on Celoscan.
 *
 * Usage:
 *   npx hardhat run scripts/verify.ts --network alfajores
 */

import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const CUSD: Record<string, string> = {
  alfajores: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
  celo: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
};

async function main() {
  const deploymentPath = path.join(
    __dirname,
    `../deployments/${network.name}.json`
  );
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network: ${network.name}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const { vault, oracle } = deployment.contracts;
  const cusd = CUSD[network.name];
  const treasury = deployment.treasury;
  const oracleHotWallet = deployment.oracleHotWallet;

  console.log(`\n=== Verifying on Celoscan (${network.name}) ===`);

  // Verify CeloGrindVault
  console.log(`\nVerifying CeloGrindVault at ${vault}...`);
  try {
    await run("verify:verify", {
      address: vault,
      constructorArguments: [cusd, treasury],
    });
    console.log("CeloGrindVault verified!");
  } catch (e: any) {
    if (e.message?.includes("Already Verified")) {
      console.log("CeloGrindVault already verified.");
    } else {
      console.error("CeloGrindVault verification failed:", e.message);
    }
  }

  // Verify StreakOracle
  console.log(`\nVerifying StreakOracle at ${oracle}...`);
  try {
    await run("verify:verify", {
      address: oracle,
      constructorArguments: [vault, oracleHotWallet],
    });
    console.log("StreakOracle verified!");
  } catch (e: any) {
    if (e.message?.includes("Already Verified")) {
      console.log("StreakOracle already verified.");
    } else {
      console.error("StreakOracle verification failed:", e.message);
    }
  }

  console.log("\nVerification complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
