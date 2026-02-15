"use client";

import { useEffect, useMemo, useState } from "react";

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

export function PlanChatPanel({ planId, planVersionId }: Props) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function bootstrapThread() {
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

  async function onSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!threadId || isSending) {
      return;
    }

    const content = draft.trim();
    if (!content) {
      return;
    }

    setIsSending(true);
    setError(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content,
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
        content
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
      return;
    }

    setMessages((current) => [
      ...current.filter((message) => message.id !== optimisticId),
      body.userMessage,
      body.assistantMessage
    ]);
  }

  function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isLoading || isSending || isResetting || !threadId || draft.trim().length === 0) {
      return;
    }

    const form = event.currentTarget.form;
    form?.requestSubmit();
  }

  async function onReset() {
    if (!threadId || isSending || isResetting) {
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
    <section className="card plan-chat-card">
      <div className="plan-chat-header">
        <h2>Plan Chat</h2>
        <button type="button" onClick={onReset} disabled={isLoading || isSending || isResetting || !threadId}>
          {isResetting ? "Resetting..." : "Reset chat"}
        </button>
      </div>

      <p className="plan-chat-subtitle">
        Chat with your coach using your onboarding, plan, notes, and completion progress.
      </p>

      {error ? <p className="error">{error}</p> : null}

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
            </article>
          ))
        )}
      </div>

      <form onSubmit={onSend} className="plan-chat-form">
        <label htmlFor="chat-input">Ask your coach</label>
        <textarea
          id="chat-input"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={onComposerKeyDown}
          placeholder="Example: How should I adjust this week if I felt fatigued in session 2?"
        />
        <button type="submit" disabled={isLoading || isSending || isResetting || draft.trim().length === 0 || !threadId}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
