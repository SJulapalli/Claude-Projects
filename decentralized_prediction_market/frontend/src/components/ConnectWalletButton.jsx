import { useWallet } from "../context/WalletContext";

function shortAddress(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { account, connectWallet, error } = useWallet();

  return (
    <div>
      {account ? (
        <span className="wallet-address">{shortAddress(account)}</span>
      ) : (
        <button onClick={connectWallet} className="btn-primary">
          Connect Wallet
        </button>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
