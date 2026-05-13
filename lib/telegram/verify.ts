import crypto from "crypto";

type TelegramUserFromWidget = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

function hmacSha256Hex(key: Buffer | string, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function sha256(data: string) {
  return crypto.createHash("sha256").update(data).digest();
}

export function verifyTelegramLoginWidget(user: TelegramUserFromWidget, botToken: string) {
  // https://core.telegram.org/widgets/login#checking-authorization
  const { hash, ...rest } = user;
  const dataCheckString = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join("\n");

  const secretKey = sha256(botToken);
  const computed = hmacSha256Hex(secretKey, dataCheckString);
  const ok = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  if (!ok) return null;

  return {
    telegramId: BigInt(user.id),
    username: user.username ?? null,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    photoUrl: user.photo_url ?? null,
  };
}

export function verifyTelegramWebAppInitData(initData: string, botToken: string) {
  // https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = hmacSha256Hex(secretKey, dataCheckString);
  const ok = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  if (!ok) return null;

  const userJson = params.get("user");
  if (!userJson) return null;
  const parsed = JSON.parse(userJson) as { id: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };

  return {
    telegramId: BigInt(parsed.id),
    username: parsed.username ?? null,
    firstName: parsed.first_name ?? null,
    lastName: parsed.last_name ?? null,
    photoUrl: parsed.photo_url ?? null,
  };
}

