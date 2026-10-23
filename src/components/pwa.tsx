"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "bo-install-dismissed";

function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < 14 * 86400000;
  } catch {
    return false;
  }
}

/** Enregistre le service worker et propose l'installation de l'application. */
export function PwaInstall() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone || dismissedRecently()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    const onInstalled = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iPhone / iPad : pas d'invite automatique, on affiche la marche à suivre.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos) {
      t = setTimeout(() => {
        setIos(true);
        setOpen(true);
      }, 4000);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* stockage indisponible */
    }
  };

  return (
    <div role="dialog" aria-label="Installer l'application" className="fixed inset-x-3 bottom-[84px] z-[65] mx-auto flex max-w-[460px] items-center gap-3.5 rounded-2xl border border-gold-light/30 bg-ink p-3.5 text-ivory shadow-[0_20px_48px_-16px_rgba(0,0,0,.6)] lg:bottom-6 lg:left-6 lg:right-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 flex-none rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Installer Burkina Or</div>
        <div className="text-xs leading-snug text-stone">
          {ios ? (
            <>
              Touchez <b className="text-ivory">Partager</b> puis <b className="text-ivory">« Sur l&apos;écran d&apos;accueil »</b>.
            </>
          ) : (
            "Cours de l'or, commandes et suivi de livraison en un geste."
          )}
        </div>
      </div>
      {!ios && evt && (
        <button
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
            setOpen(false);
          }}
          className="h-10 flex-none rounded-lg border-0 bg-gold px-4 text-[13px] font-semibold text-ink"
        >
          Installer
        </button>
      )}
      <button onClick={close} aria-label="Plus tard" className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border-0 bg-transparent text-stone">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
