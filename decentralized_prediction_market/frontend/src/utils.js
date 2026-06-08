import { ethers } from "ethers";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function getMarketState(market) {
  const now = Math.floor(Date.now() / 1000);
  if (market.cancelled) return "Cancelled";
  if (market.resolved) return "Resolved";
  if (now > market.betting_deadline && now <= market.resolution_deadline) return "Closed";
  if (now > market.resolution_deadline) return "Expired";
  return "Active";
}

export function formatEth(wei) {
  if (!wei) return "0 ETH";
  return `${parseFloat(ethers.formatEther(wei.toString())).toFixed(4)} ETH`;
}

export function formatDate(ts) {
  return new Date(ts * 1000).toLocaleString();
}
