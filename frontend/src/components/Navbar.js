import React from "react";
import { authUrl } from "../services/api";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="brand">📧 Receet</div>
      <div className="actions">
        <a className="btn" href={authUrl()}>Connect Gmail</a>
      </div>
    </nav>
  );
}
