declare global {
  interface Window {
    show_10401872?: (opts?: any) => Promise<void>;
  }
}

export async function showAd(): Promise<void> {
  let waited = 0;
  while (typeof window.show_10401872 !== "function" && waited < 8000) {
    await new Promise(r => setTimeout(r, 200));
    waited += 200;
  }
  if (typeof window.show_10401872 === "function") {
    await window.show_10401872({ type: "interstitial" });
  }
}
