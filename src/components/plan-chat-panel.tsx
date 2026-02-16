"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatThread = {
  id: string;
  planVersionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourceTweakRequestId: string | null;
  createdAt: string;
};

type Props = {
  planId: string;
  planVersionId: string;
};

type ApplyTweakResult = {
  tweakRequestId: string;
  resultPlanVersionId: string;
  changeSummary: string;
};

export function PlanChatPanel({ planId, planVersionId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const previousPlanIdRef = useRef(planId);
  const pendingAskRef = useRef<string | null>(null);
  const sendMessageRef = useRef<(content: string) => void>(() => {});

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingMessageId, setIsApplyingMessageId] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyTweakResult | null>(null);
  const [lastFailedDraft, setLastFailedDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isApplying = isApplyingMessageId !== null;
  const tweakAppliedFromQuery = searchParams.get("tweakApplied") === "1";

  useEffect(() => {
    let ignore = false;

    async function bootstrapThread() {
      if (previousPlanIdRef.current !== planId) {
        setApplyResult(null);
        previousPlanIdRef.current = planId;
      }

      setThreadId(null);
      setMessages([]);
      setDraft("");
      setIsSending(false);
      setIsResetting(false);
      setIsApplyingMessageId(null);
      setLastFailedDraft(null);
      setIsLoading(true);
      setError(null);

      const threadResponse = await fetch(`/api/plans/${planId}/chat/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planVersionId,
          title: "Plan chat"
        })
      });

      const threadBody = (await threadResponse.json().catch(() => null)) as
        | { thread: ChatThread }
        | { error?: { message?: string } }
        | null;

      if (!threadResponse.ok || !threadBody || !("thread" in threadBody)) {
        if (!ignore) {
          setError(
            threadBody && "error" in threadBody ? threadBody.error?.message ?? "Failed to initialize chat." : "Failed to initialize chat."
          );
          setIsLoading(false);
        }
        return;
      }

      const resolvedThreadId = threadBody.thread.id;

      const messagesResponse = await fetch(`/api/plans/${planId}/chat/threads/${resolvedThreadId}/messages`, {
        cache: "no-store"
      });

      const messagesBody = (await messagesResponse.json().catch(() => null)) as
        | { messages: ChatMessage[] }
        | { error?: { message?: string } }
        | null;

      if (ignore) {
        return;
      }

      if (!messagesResponse.ok || !messagesBody || !("messages" in messagesBody)) {
        setError(
          messagesBody && "error" in messagesBody
            ? messagesBody.error?.message ?? "Failed to load chat history."
            : "Failed to load chat history."
        );
        setIsLoading(false);
        return;
      }

      setThreadId(resolvedThreadId);
      setMessages(messagesBody.messages);
      setIsLoading(false);
    }

    void bootstrapThread();

    return () => {
      ignore = true;
    };
  }, [planId, planVersionId]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [sortedMessages, isSending, isApplyingMessageId, isLoading]);

  async function sendMessage(content: string) {
    if (!threadId || isSending || isApplying) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    setIsSending(true);
    setError(null);
    setLastFailedDraft(null);
    setApplyResult(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content: trimmed,
      sourceTweakRequestId: null,
      createdAt: new Date().toISOString()
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");

    const response = await fetch(`/api/plans/${planId}/chat/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: trimmed
      })
    });

    const body = (await response.json().catch(() => null)) as
      | { userMessage: ChatMessage; assistantMessage: ChatMessage }
      | { error?: { message?: string } }
      | null;

    setIsSending(false);

    if (!response.ok || !body || !("userMessage" in body) || !("assistantMessage" in body)) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setError(body && "error" in body ? body.error?.message ?? "Failed to send message." : "Failed to send message.");
      setLastFailedDraft(trimmed);
      return;
    }

    setMessages((current) => [
      ...current.filter((message) => message.id !== optimisticId),
      body.userMessage,
      body.assistantMessage
    ]);
  }

  useEffect(() => {
    sendMessageRef.current = (content: string) => {
      void sendMessage(content);
    };
  });

  useEffect(() => {
    function onAsk(event: Event) {
      const custom = event as CustomEvent<{ content?: string }>;
      const content = custom.detail?.content?.trim() ?? "";
      if (!content) {
        return;
      }

      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

      // If the thread isn't ready yet, queue the ask and show it in the composer.
      if (!threadId || isLoading) {
        pendingAskRef.current = content;
        setDraft(content);
        return;
      }

      sendMessageRef.current(content);
    }

    window.addEventListener("plan-chat:ask", onAsk);
    return () => window.removeEventListener("plan-chat:ask", onAsk);
  }, [threadId, isLoading]);

  useEffect(() => {
    if (!threadId || isLoading) {
      return;
    }

    const pending = pendingAskRef.current;
    if (!pending) {
      return;
    }

    pendingAskRef.current = null;
    sendMessageRef.current(pending);
  }, [threadId, isLoading]);

  async function onSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  async function onRetry() {
    if (!lastFailedDraft) {
      return;
    }

    void sendMessage(lastFailedDraft);
  }

  async function onApplyAsTweak(message: ChatMessage) {
    if (isSending || isResetting || isApplying || !threadId) {
      return;
    }

    setIsApplyingMessageId(message.id);
    setError(null);

    const response = await fetch(`/api/plans/${planId}/tweaks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        planVersionId,
        scope: "whole_plan",
        requestText: message.content
      })
    });

    const body = (await response.json().catch(() => null)) as
      | {
          tweakRequestId: string;
          resultPlanVersionId: string;
          changeSummary: string;
        }
      | { error?: { message?: string } }
      | null;

    setIsApplyingMessageId(null);

    if (!response.ok || !body || !("resultPlanVersionId" in body)) {
      setError(body && "error" in body ? body.error?.message ?? "Failed to apply tweak." : "Failed to apply tweak.");
      return;
    }

    setApplyResult({
      tweakRequestId: body.tweakRequestId,
      resultPlanVersionId: body.resultPlanVersionId,
      changeSummary: body.changeSummary
    });
    router.replace(`/plans/${planId}?tweakApplied=1`);
    router.refresh();
  }

  function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isLoading || isSending || isResetting || isApplying || !threadId || draft.trim().length === 0) {
      return;
    }

    const form = event.currentTarget.form;
    form?.requestSubmit();
  }

  async function onReset() {
    if (!threadId || isSending || isResetting || isApplying) {
      return;
    }

    const confirmed = window.confirm("Reset this chat? This clears message history for this plan version.");

    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setError(null);

    const response = await fetch(`/api/plans/${planId}/chat/threads/${threadId}/reset`, {
      method: "POST"
    });

    const body = (await response.json().catch(() => null)) as { reset?: boolean } | { error?: { message?: string } } | null;

    setIsResetting(false);

    if (!response.ok || !body || !("reset" in body)) {
      setError(body && "error" in body ? body.error?.message ?? "Failed to reset chat." : "Failed to reset chat.");
      return;
    }

    setMessages([]);
  }

  return (
    <section className="card plan-chat-card" id="plan-chat">
      <div className="plan-chat-header">
        <h2>Plan Chat</h2>
        <button
          className="button-secondary"
          type="button"
          onClick={onReset}
          disabled={isLoading || isSending || isResetting || isApplying || !threadId}
        >
          {isResetting ? "Resetting..." : "Reset chat"}
        </button>
      </div>

      <p className="plan-chat-subtitle">
        Chat with your coach using your onboarding, plan, notes, and completion progress.
      </p>

      {error ? <p className="error">{error}</p> : null}
      {lastFailedDraft ? (
        <p className="plan-chat-inline-actions">
          <span>Message failed to send.</span>
          <button
            className="button-secondary"
            type="button"
            onClick={onRetry}
            disabled={isLoading || isSending || isResetting || isApplying}
          >
            Retry
          </button>
        </p>
      ) : null}
      {applyResult ? <p className="success plan-chat-apply-result">Tweak applied. Reloading updated plan...</p> : null}
      {tweakAppliedFromQuery ? (
        <p className="success plan-chat-apply-result">Tweak applied. You are now viewing the updated plan version.</p>
      ) : null}

      <div className="plan-chat-messages" role="log" aria-live="polite">
        {isLoading ? (
          <p>Loading chat...</p>
        ) : sortedMessages.length === 0 ? (
          <p className="plan-chat-empty">No messages yet. Ask about your next session or adjustments.</p>
        ) : (
          sortedMessages.map((message) => (
            <article key={message.id} className={`plan-chat-message ${message.role === "assistant" ? "assistant" : "user"}`}>
              <h3>{message.role === "assistant" ? "Coach" : "You"}</h3>
              <p>{message.content}</p>
              {message.role === "assistant" ? (
                <div className="plan-chat-message-actions">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => onApplyAsTweak(message)}
                    disabled={isSending || isResetting || isApplying}
                  >
                    {isApplyingMessageId === message.id ? "Applying..." : "Apply adjustment"}
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
        {isSending ? (
          <article className="plan-chat-message assistant">
            <h3>Coach</h3>
            <p>Coach is typing...</p>
          </article>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={onSend} className="plan-chat-form">
        <label htmlFor="chat-input">Ask your coach</label>
        <textarea
          id="chat-input"
          ref={composerRef}
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={onComposerKeyDown}
          placeholder="Example: How should I adjust this week if I felt fatigued in session 2?"
        />
        <button
          type="submit"
          disabled={isLoading || isSending || isResetting || isApplying || draft.trim().length === 0 || !threadId}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
      {isApplying ? (
        <div className="generation-tracker" role="status" aria-live="polite">
          <div className="generation-tracker-spinner" aria-hidden="true" />
          <div>
            <strong>Applying tweak...</strong>
            <p>Updating your plan version now.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
