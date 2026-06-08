import { Link } from "react-router-dom";
import ConnectWalletButton from "./ConnectWalletButton";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        PredictionMarket
      </Link>
      <div className="nav-links">
        <Link to="/">Markets</Link>
        <Link to="/create">Create Market</Link>
        <Link to="/my-bets">My Bets</Link>
      </div>
      <ConnectWalletButton />
    </nav>
  );
}
