"use client";
import {
  createContext,
  useContext,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  themeVariables,
  type CampaignSettings,
} from "../lib/campaign-settings";
const CampaignContext = createContext<CampaignSettings | null>(null);
export const useCampaignSettings = () => useContext(CampaignContext);
export default function CampaignTheme({
  settings,
  children,
}: {
  settings?: CampaignSettings;
  children: ReactNode;
}) {
  return (
    <CampaignContext.Provider value={settings ?? null}>
      <div
        className="c-campaign-theme"
        style={
          settings
            ? (themeVariables(settings.appearance) as CSSProperties)
            : undefined
        }
        data-magic-style={settings?.appearance.magicStyle}
        data-weapon-style={settings?.appearance.weaponStyle}
      >
        {children}
      </div>
    </CampaignContext.Provider>
  );
}
