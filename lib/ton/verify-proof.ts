import "server-only";

import crypto from "crypto";

export interface TonProofPayload {
  address: string;
  network: "-239" | "-3";
  proof: {
    timestamp: number;
    domain: { value: string };
    signature: string;
    payload: string;
    state_init?: string;
  };
}

function fromBase64(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

function spkiPublicKeyFromEd25519Raw32(publicKeyRaw: Buffer) {
  // Ed25519 SPKI header:
  // 302a300506032b6570032100 || <32-byte raw public key>
  const header = Buffer.from("302a300506032b6570032100", "hex");
  return crypto.createPublicKey({ key: Buffer.concat([header, publicKeyRaw]), format: "der", type: "spki" });
}

export async function verifyTonProof(
  payload: TonProofPayload,
): Promise<{ valid: boolean; address?: string; error?: string }> {
  try {
    if (!payload?.proof?.timestamp) return { valid: false, error: "Missing timestamp" };
    if (Math.abs(Date.now() / 1000 - payload.proof.timestamp) > 900) return { valid: false, error: "Proof expired" };

    const message = Buffer.concat([
      Buffer.from("ton-proof-item-v2/"),
      Buffer.from(payload.address),
      Buffer.from(payload.proof.domain.value),
      Buffer.from(payload.proof.timestamp.toString()),
      Buffer.from(payload.proof.payload),
    ]);

    const msgHash = crypto.createHash("sha256").update(message).digest();
    const fullMsg = Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from("ton-connect"), msgHash]);
    const finalHash = crypto.createHash("sha256").update(fullMsg).digest();

    if (!payload.proof.state_init) return { valid: false, error: "state_init required for first connection" };
    const stateInit = fromBase64(payload.proof.state_init);
    const publicKeyRaw = stateInit.subarray(36, 68); // wallet v4 layout
    if (publicKeyRaw.length !== 32) return { valid: false, error: "Invalid state_init" };

    const publicKey = spkiPublicKeyFromEd25519Raw32(publicKeyRaw);
    const sigBuffer = fromBase64(payload.proof.signature);

    const ok = crypto.verify(null, finalHash, publicKey, sigBuffer);
    if (!ok) return { valid: false, error: "Invalid signature" };
    return { valid: true, address: payload.address };
  } catch (e: unknown) {
    return { valid: false, error: e instanceof Error ? e.message : "Verification error" };
  }
}

