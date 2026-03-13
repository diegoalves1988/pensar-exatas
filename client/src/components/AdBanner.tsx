import { useEffect } from "react";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function AdBanner({ slot, format = "auto", className = "" }: AdBannerProps) {
  useEffect(() => {
    // Google AdSense script - replace with your actual ad code
    const win = window as typeof window & { adsbygoogle?: Array<Record<string, unknown>> };
    if (win.adsbygoogle) {
      try {
        win.adsbygoogle.push({});
      } catch (e) {
        console.log("AdSense error:", e);
      }
    }
  }, []);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-xxxxxxxxxxxxxxxx"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}

// Placeholder component for development
export function AdBannerPlaceholder({ className = "" }: { className?: string }) {
  void className;
  return null;
}

