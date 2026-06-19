"use client";
import { useEffect, useState } from "react";

interface TemplateLink {
  id: string;
  label: string;
  description: string;
  optional_forms: string[];
  url: string;
}

const SECRET_STORAGE_KEY = "imm_admin_secret";

const FORM_LABELS: Record<string, string> = {
  imm5476: "IMM 5476 — Representative",
  imm5409: "IMM 5409 — Common-Law",
  imm5646: "IMM 5646 — Custodian",
  imm5475: "IMM 5475 — Release Authority",
};

export default function TemplateLinksPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [links, setLinks] = useState<TemplateLink[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SECRET_STORAGE_KEY);
    if (stored) {
      setSecret(stored);
      void fetchLinks(stored);
    }
  }, []);

  async function fetchLinks(value: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/template-links", {
        headers: { "x-admin-secret": value },
      });
      if (!res.ok) {
        sessionStorage.removeItem(SECRET_STORAGE_KEY);
        setUnlocked(false);
        setError("Incorrect admin secret.");
        return;
      }
      const data = await res.json();
      setLinks(data.links);
      setUnlocked(true);
      sessionStorage.setItem(SECRET_STORAGE_KEY, value);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(link: TemplateLink) {
    await navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1500);
  }

  if (!unlocked) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-semibold mb-4">Admin — Template Links</h1>
        <p className="text-sm text-gray-600 mb-4">
          Enter the admin secret to view the pre-generated client intake links.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fetchLinks(secret);
          }}
          className="space-y-3"
        >
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !secret}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Client Intake Links</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pick the link matching the client&apos;s situation from the welcome meeting and copy it to them.
          Each link is reusable — the same link can be handed to every future client of that type.
        </p>
      </header>
      <div className="space-y-3">
        {links.map((link) => (
          <div key={link.id} className="rounded border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-medium">{link.label}</h2>
                <p className="mt-1 text-sm text-gray-600">{link.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {link.optional_forms.map((f) => (
                    <span
                      key={f}
                      className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {FORM_LABELS[f] ?? f}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleCopy(link)}
                className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                {copiedId === link.id ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
