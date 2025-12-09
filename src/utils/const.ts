export const HOST_NAME = "immersivetranslate.com";
export const HOST_NAME_CN = "immersivetranslate.cn";
export const APP_SITE_URL = "https://app.immersivetranslate.com";
export const TEST_APP_SITE_URL = "https://test-app.immersivetranslate.com";

const OLD_GA_MEASUREMENT_ID = __OLD_GA_MEASUREMENT_ID__ || "";
const OLD_GA_API_SECRET = __OLD_GA_API_SECRET__ || "";
const NEW_GA_MEASUREMENT_ID = __NEW_GA_MEASUREMENT_ID__ || "";
const NEW_GA_API_SECRET = __NEW_GA_API_SECRET__ || "";

export const BASE_URL_TEST = `https://test-api2.${HOST_NAME}/zotero`;
export const BASE_URL = `https://api2.${HOST_NAME}/zotero`;

export const BASE_URL_TEST_CN = `https://test-api2.${HOST_NAME_CN}/zotero`;
export const BASE_URL_CN = `https://api2.${HOST_NAME_CN}/zotero`;

export const SELF_SERVICE_COLLECT_URL = `https://analytics.${HOST_NAME}/collect`;
export const SELF_SERVICE_COLLECT_URL_CN = `https://analytics.${HOST_NAME_CN}/collect`;

export const HEALTHCHECK_URL_TEST = `https://test-api2.${HOST_NAME}/connectivity_check`;
export const HEALTHCHECK_URL = `https://api2.${HOST_NAME}/connectivity_check`;

export const BEBELDOC_URL = `https://app.${HOST_NAME_CN}/babel-doc/`;

export function getGMurls() {
  if (!NEW_GA_MEASUREMENT_ID || NEW_GA_MEASUREMENT_ID === "undefined") {
    ztoolkit.log("Warning: env not inject success!");
    return [];
  }
  if (addon.data.env === "development") {
    return [
      `https://www.google-analytics.com/debug/mp/collect?measurement_id=${OLD_GA_MEASUREMENT_ID}&api_secret=${OLD_GA_API_SECRET}`,
      `https://www.google-analytics.com/debug/mp/collect?measurement_id=${NEW_GA_MEASUREMENT_ID}&api_secret=${NEW_GA_API_SECRET}`,
    ];
  }
  return [
    `https://www.google-analytics.com/mp/collect?measurement_id=${OLD_GA_MEASUREMENT_ID}&api_secret=${OLD_GA_API_SECRET}`,
    `https://www.google-analytics.com/mp/collect?measurement_id=${NEW_GA_MEASUREMENT_ID}&api_secret=${NEW_GA_API_SECRET}`,
  ];
}
