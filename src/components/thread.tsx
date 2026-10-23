"use client";

import { useActionState, useEffect, useRef } from "react";
import { Icon } from "./icons";
import { dateTime } from "@/lib/format";
import type { FormState } from "@/lib/actions/public";

export type ThreadMessage = { id: string; body: string; side: string; created_at: string; author?: string | null; extra?: React.ReactNode };

/** Fil de messages : les miens à droite (or), les autres à gauche. */
export function Thread({ messages, mine }: { messages: ThreadMessage[]; mine: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [messages.length]);
  return (
    <div className="flex max-h-[560px] flex-col gap-3 overflow-y-auto p-5">
      {messages.map((m) => {
        const me = m.side === mine;
        return (
          <div key={m.id} className={`flex max-w-[82%] flex-col gap-1 ${me ? "self-end items-end" : "self-start items-start"}`}>
            <div className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${me ? "rounded-br-sm bg-ink text-ivory" : "rounded-bl-sm bg-sand text-text"}`}>
              {m.body}
              {m.extra}
            </div>
            <span className="text-[11px] text-muted">
              {m.author ? `${m.author} · ` : ""}
              {dateTime(m.created_at)}
            </span>
          </div>
        );
      })}
      {!messages.length && <div className="py-10 text-center text-sm text-muted">Aucun message pour l&apos;instant.</div>}
      <div ref={end} />
    </div>
  );
}

export function Composer({
  action,
  hidden,
  placeholder = "Votre message…",
  children,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-2 border-t border-line p-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <div className="flex items-end gap-2">
        <textarea name="message" rows={2} required placeholder={placeholder} className="field min-h-12 flex-1 resize-none" />
        <button disabled={pending} aria-label="Envoyer" className="flex h-12 w-12 flex-none items-center justify-center rounded-lg border-0 bg-gold text-ink disabled:opacity-60">
          <Icon name="send" size={18} />
        </button>
      </div>
      {state?.error && <span className="text-[13px] text-err">{state.error}</span>}
    </form>
  );
}
