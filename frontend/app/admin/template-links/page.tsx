"use client";
import { useEffect, useState } from "react";
import {
  EMPTY_INTAKE_ANSWERS,
  MARITAL_STATUS_OPTIONS,
  isIntakeComplete,
  matchUseCase,
  type IntakeAnswers,
} from "@/lib/templateLinks";

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

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function TemplateLinksPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [links, setLinks] = useState<TemplateLink[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [answers, setAnswers] = useState<IntakeAnswers>(EMPTY_INTAKE_ANSWERS);
  const [assessed, setAssessed] = useState(false);
  const [matchedLinkId, setMatchedLinkId] = useState<string | null>(null);
  const [assessError, setAssessError] = useState("");

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

  function handleAssess() {
    const uc = matchUseCase(answers);
    if (!uc) {
      setAssessError("Could not match a use case — check answers.");
      return;
    }
    setAssessError("");
    setMatchedLinkId(uc.id);
    setAssessed(true);
  }

  function handleStartOver() {
    setAnswers(EMPTY_INTAKE_ANSWERS);
    setMatchedLinkId(null);
    setAssessed(false);
    setAssessError("");
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
            className={inp}
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

  if (!assessed) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Client Intake Assessment</h1>
          <p className="mt-1 text-sm text-gray-600">
            Answer a few basic questions about the client from the welcome meeting. None of this is saved —
            it's only used to figure out which intake link to hand them.
          </p>
        </header>
        <div className="space-y-4 rounded border border-gray-200 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship status</label>
            <select
              value={answers.maritalStatus}
              onChange={(e) => setAnswers((a) => ({ ...a, maritalStatus: e.target.value as IntakeAnswers["maritalStatus"] }))}
              className={inp}
            >
              <option value="">— Select —</option>
              {MARITAL_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
            <input
              type="date"
              value={answers.dateOfBirth}
              onChange={(e) => setAnswers((a) => ({ ...a, dateOfBirth: e.target.value }))}
              className={inp}
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Does the applicant want IRCC/CBSA to share case info with a third party?
            </span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="radio"
                  name="wantsReleaseAuthority"
                  checked={answers.wantsReleaseAuthority === true}
                  onChange={() => setAnswers((a) => ({ ...a, wantsReleaseAuthority: true }))}
                />
                Yes
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="radio"
                  name="wantsReleaseAuthority"
                  checked={answers.wantsReleaseAuthority === false}
                  onChange={() => setAnswers((a) => ({ ...a, wantsReleaseAuthority: false }))}
                />
                No
              </label>
            </div>
          </div>
          {assessError && <p className="text-sm text-red-600">{assessError}</p>}
          <button
            onClick={handleAssess}
            disabled={!isIntakeComplete(answers)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Assess
          </button>
          {!isIntakeComplete(answers) && (
            <p className="text-xs text-gray-500">Answer all 3 questions to assess.</p>
          )}
        </div>
      </main>
    );
  }

  const matchedLink = links.find((l) => l.id === matchedLinkId);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Matched Intake Link</h1>
          <p className="mt-1 text-sm text-gray-600">Copy this link and send it to the client.</p>
        </div>
        <button
          onClick={handleStartOver}
          className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Start Over
        </button>
      </header>
      {!matchedLink ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not find the matched link. <button onClick={handleStartOver} className="underline">Start over</button>.
        </div>
      ) : (
        <div className="rounded border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-medium">{matchedLink.label}</h2>
              <p className="mt-1 text-sm text-gray-600">{matchedLink.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {matchedLink.optional_forms.map((f) => (
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
              onClick={() => handleCopy(matchedLink)}
              className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              {copiedId === matchedLink.id ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
