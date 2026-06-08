import { ethers } from "ethers";
import artifact from "../../artifacts/contracts/PredictionMarket.sol/PredictionMarket.json";

export const CONTRACT_ABI = artifact.abi;
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

export function getReadContract(provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export function getWriteContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}
