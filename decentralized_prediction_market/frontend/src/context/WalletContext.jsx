import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// Default to Hardhat local (31337). Set VITE_CHAIN_ID=11155111 for Sepolia.
const TARGET_CHAIN_ID =
  "0x" + parseInt(import.meta.env.VITE_CHAIN_ID || "31337").toString(16);

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [error, setError] = useState(null);

  const setupProvider = useCallback(async (ethProvider) => {
    const p = new ethers.BrowserProvider(ethProvider);
    const s = await p.getSigner();
    const addr = await s.getAddress();
    setProvider(p);
    setSigner(s);
    setAccount(addr);
    setError(null);
  }, []);

  // Auto-detect already-connected account on mount
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts.length > 0) {
        setupProvider(window.ethereum);
      }
    });

    // Listen for account changes
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setProvider(null);
        setSigner(null);
      } else {
        setupProvider(window.ethereum);
      }
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [setupProvider]);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it from metamask.io.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await setupProvider(window.ethereum);
    } catch (err) {
      if (err.code === 4001) {
        // User rejected
        setError(null);
      } else {
        setError(err.message);
      }
    }
  }, [setupProvider]);

  const ensureSepolia = useCallback(async () => {
    if (!window.ethereum) return false;
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== TARGET_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: TARGET_CHAIN_ID }],
        });
      } catch {
        setError(`Please switch to chain ID ${parseInt(TARGET_CHAIN_ID, 16)} in MetaMask.`);
        return false;
      }
    }
    return true;
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, provider, signer, error, connectWallet, ensureSepolia, setError }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
