import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import MarketList from "./pages/MarketList";
import MarketDetail from "./pages/MarketDetail";
import CreateMarket from "./pages/CreateMarket";
import UserBets from "./pages/UserBets";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WalletProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<MarketList />} />
            <Route path="/markets/:id" element={<MarketDetail />} />
            <Route path="/create" element={<CreateMarket />} />
            <Route path="/my-bets" element={<UserBets />} />
          </Routes>
        </main>
      </BrowserRouter>
    </WalletProvider>
  </StrictMode>
);
