import { Heart, Droplet, Zap } from "lucide-react";
import type { ReactNode } from "react";

const resources = {
  hp: { icon: Heart, label: "Points de vie" },
  mana: { icon: Droplet, label: "Points de magie" },
  end: { icon: Zap, label: "Endurance" },
};
export default function OwlbearResource({ kind, children }: { kind: keyof typeof resources; children?: ReactNode }) {
  const { icon: Icon, label } = resources[kind];
  return <span className={`c-owlbear-resource ${kind}`} title={label}><Icon size={14} role="img" aria-label={label}/>{children}</span>;
}
export function OwlbearCost({ end = 0, mana = 0 }: { end?: number; mana?: number }) {
  return <>{end > 0 && <OwlbearResource kind="end">{end}</OwlbearResource>}{mana > 0 && <OwlbearResource kind="mana">{mana}</OwlbearResource>}</>;
}

export function OwlbearBonuses({ bonuses = {} }: { bonuses?: Record<string, number> }) {
  return <>{Object.entries(bonuses).filter(([,value])=>value!==0).map(([key,value])=>{
    const kind = ({HP:"hp",FP:"mana",END:"end"} as const)[key as "HP"|"FP"|"END"];
    const amount = `${value>0?"+":""}${value}`;
    return kind ? <OwlbearResource key={key} kind={kind}>{amount}</OwlbearResource> : <span key={key}>{amount} {key}</span>;
  })}</>;
}
