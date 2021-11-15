import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export class Password {
  static async toHash(password: string) {
    const salt = randomBytes(16).toString("hex");

    const buffer = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${salt}:${buffer.toString("hex")}`;
  }

  static async compare(storedPassword: string, suppliedPassword: string) {
    const [salt, storedPasswordDigest] = storedPassword.split(":");

    const suppliedPasswordDigest = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;

    return timingSafeEqual(
      suppliedPasswordDigest,
      Buffer.from(storedPasswordDigest, "hex")
    );
  }
}
