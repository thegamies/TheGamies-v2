import { adsensePublisherId } from "./adsense";

export type GoogleFcApi = {
  callbackQueue?: Array<Record<string, () => void> | (() => void)>;
  showRevocationMessage?: () => void;
};

declare global {
  interface Window {
    googlefc?: GoogleFcApi;
  }
}

/** Google Funding Choices (certified CMP) tag for this publisher. */
export function fundingChoicesScriptSrc(clientId: string): string {
  return `https://fundingchoicesmessages.google.com/i/${adsensePublisherId(clientId)}.js?ers=1`;
}

/**
 * Signals that a Funding Choices CMP is on the page (Google’s official snippet).
 * https://developers.google.com/funding-choices/fc-api-docs
 */
export function googleFcPresentScript(): string {
  return [
    "(function(){",
    "function signalGooglefcPresent(){",
    "if(!window.frames['googlefcPresent']){",
    "if(document.body){",
    "var iframe=document.createElement('iframe');",
    "iframe.style='width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';",
    "iframe.style.display='none';",
    "iframe.name='googlefcPresent';",
    "document.body.appendChild(iframe);",
    "}else{setTimeout(signalGooglefcPresent,0);}",
    "}",
    "}",
    "signalGooglefcPresent();",
    "})();",
  ].join("");
}
