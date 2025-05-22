// initQz.ts
import * as qz from 'qz-tray';
import { sha256 } from 'js-sha256';   // npm i js-sha256   <-- keep if you’re on 2.0.x

let initialised = false;

export const initQz = () => {
  if (initialised) return;
  initialised = true;

  /* 1️⃣  Promises — always required */
  qz.api.setPromiseType(resolver => new Promise(resolver));

  /* 2️⃣  Hashing
         – NOT needed on QZ Tray ≥ 2.1  (it’s bundled)
         – REQUIRED on 2.0.x            (uncomment the line below) */
// qz.api.setSha256Type(data => sha256(data));

  /* 3️⃣  (Node/Electron only) supply a WebSocket impl.
         browser → native WebSocket is fine */
  // qz.api.setWebSocketType(require('ws'));
};