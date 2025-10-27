import { getPref } from "../utils/prefs";

export function checkIsCN() {
  const authKey = getPref("authkey");
  return authKey?.startsWith("IMT-CN") || !authKey;
}
