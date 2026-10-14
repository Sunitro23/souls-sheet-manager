"use client";
export async function connectOwlbear() {
  const { default: OBR } = await import('@owlbear-rodeo/sdk');
  if (!OBR.isAvailable) return null;
  const early = (window as Window & { __soulsObrReady?: { data: unknown; origin: string } }).__soulsObrReady;
  if (!OBR.isReady && early) window.dispatchEvent(new MessageEvent('message', { ...early, source: window.parent }));
  if (!OBR.isReady) await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Connexion Owlbear indisponible. Rechargez l’extension.')), 15000);
    OBR.onReady(() => { clearTimeout(timeout); resolve(); });
  });
  return OBR;
}
