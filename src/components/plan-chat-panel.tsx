"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function normalizeChatMarkdown(input: string): string {
  // Improve readability for common "Label: explanation" lines emitted by the model
  // without needing the model to output explicit bullet markdown.
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;

  const isLabelLine = (line: string) => /^\*\*[^*]+\*\*:\s+/.test(line.trim());

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    // If we see a run of 2+ "**Label:** ..." lines, turn them into a bullet list.
    if (isLabelLine(line)) {
      const runStart = i;
      let runEnd = i;
      while (runEnd < lines.length && isLabelLine(lines[runEnd] ?? "")) {
        runEnd += 1;
      }

      const runLength = runEnd - runStart;
      if (runLength >= 2) {
        const prev = out[out.length - 1] ?? "";
        if (prev.trim() !== "") {
          out.push("");
        }

        for (let j = runStart; j < runEnd; j += 1) {
          out.push(`- ${(lines[j] ?? "").trim()}`);
        }

        out.push("");
        i = runEnd - 1;
        continue;
      }
    }

    out.push(line);
  }

  return out.join("\n").trimEnd();
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a {...props} href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  )
};

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

type UiChatMessage = ChatMessage & {
  clientSequence: number;
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
  const messageSequenceRef = useRef(0);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingMessageId, setIsApplyingMessageId] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyTweakResult | null>(null);
  const [lastFailedDraft, setLastFailedDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isApplying = isApplyingMessageId !== null;
  const tweakAppliedFromQuery = searchParams.get("tweakApplied") === "1";
  const suggestedPrompts = [
    "Can you adjust this week for lower fatigue?",
    "Please swap Session 2 for a shorter option.",
    "How should I adapt this plan if I only have 3 sessions this week?"
  ];

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
      setIsStreamingResponse(false);
      setIsResetting(false);
      setIsApplyingMessageId(null);
      setLastFailedDraft(null);
      setIsLoading(true);
      setError(null);
      messageSequenceRef.current = 0;

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
      const seededMessages = messagesBody.messages.map((message, index) => ({
        ...message,
        clientSequence: index
      }));
      messageSequenceRef.current = seededMessages.length;
      setMessages(seededMessages);
      setIsLoading(false);
    }

    void bootstrapThread();

    return () => {
      ignore = true;
    };
  }, [planId, planVersionId]);

  const sortedMessages = useMemo(() => {
    // Use a client-side sequence to avoid clock-skew weirdness while streaming.
    return [...messages].sort((a, b) => a.clientSequence - b.clientSequence);
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
    setIsStreamingResponse(true);
    setError(null);
    setLastFailedDraft(null);
    setApplyResult(null);

    const optimisticUserId = `optimistic-user-${Date.now()}`;
    const optimisticAssistantId = `optimistic-assistant-${Date.now()}`;
    const optimisticUserMessage: UiChatMessage = {
      id: optimisticUserId,
      role: "user",
      content: trimmed,
      sourceTweakRequestId: null,
      createdAt: new Date().toISOString()
      ,
      clientSequence: messageSequenceRef.current++
    };

    const optimisticAssistantMessage: UiChatMessage = {
      id: optimisticAssistantId,
      role: "assistant",
      content: "",
      sourceTweakRequestId: null,
      createdAt: new Date(Date.now() + 1).toISOString()
      ,
      clientSequence: messageSequenceRef.current++
    };

    setMessages((current) => [...current, optimisticUserMessage, optimisticAssistantMessage]);
    setDraft("");

    const response = await fetch(`/api/plans/${planId}/chat/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      },
      body: JSON.stringify({
        content: trimmed
      })
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setIsSending(false);
      setIsStreamingResponse(false);
      setMessages((current) => current.filter((message) => message.id !== optimisticUserId && message.id !== optimisticAssistantId));
      setError(body?.error?.message ?? "Failed to send message.");
      setLastFailedDraft(trimmed);
      return;
    }

    if (!contentType.includes("text/event-stream") || !response.body) {
      setIsStreamingResponse(false);
      const body = (await response.json().catch(() => null)) as
        | { userMessage: ChatMessage; assistantMessage: ChatMessage }
        | { error?: { message?: string } }
        | null;

      setIsSending(false);

      if (!body || !("userMessage" in body) || !("assistantMessage" in body)) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimisticUserId && message.id !== optimisticAssistantId)
        );
        setError(body && "error" in body ? body.error?.message ?? "Failed to send message." : "Failed to send message.");
        setLastFailedDraft(trimmed);
        return;
      }

      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticUserId && message.id !== optimisticAssistantId),
        { ...body.userMessage, clientSequence: optimisticUserMessage.clientSequence },
        { ...body.assistantMessage, clientSequence: optimisticAssistantMessage.clientSequence }
      ]);

      return;
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let resolvedAssistantMessage: ChatMessage | null = null;

    function applyUserMessage(message: ChatMessage) {
      // Replace the optimistic user message in-place to avoid duplicates.
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticUserId ? { ...message, clientSequence: item.clientSequence } : item
        )
      );
    }

    function appendAssistantDelta(delta: string) {
      if (!delta) {
        return;
      }
      // Once we have a final assistant message, ignore late deltas.
      if (resolvedAssistantMessage) {
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticAssistantId ? { ...message, content: (message.content ?? "") + delta } : message
        )
      );
    }

    function applyAssistantMessage(message: ChatMessage) {
      resolvedAssistantMessage = message;
      // Replace the optimistic assistant message in-place to avoid duplicating history.
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticAssistantId ? { ...message, clientSequence: item.clientSequence } : item
        )
      );
    }

    function parseEvent(raw: string): { event: string; data: string } | null {
      const lines = raw.split("\n");
      let event = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice("event:".length).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
        }
      }

      const data = dataLines.join("\n").trim();
      if (!data) {
        return null;
      }

      return { event, data };
    }

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const boundaryIndex = () => {
          const lf = buffer.indexOf("\n\n");
          const crlf = buffer.indexOf("\r\n\r\n");
          if (lf === -1 && crlf === -1) return null;
          if (lf !== -1 && (crlf === -1 || lf < crlf)) return { index: lf, length: 2 };
          return { index: crlf, length: 4 };
        };

        let boundary = boundaryIndex();
        while (boundary) {
          const rawEvent = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary.length);

          const parsedEvent = parseEvent(rawEvent);
          if (!parsedEvent) {
            boundary = boundaryIndex();
            continue;
          }

          if (parsedEvent.event === "user_message") {
            const message = JSON.parse(parsedEvent.data) as ChatMessage;
            applyUserMessage(message);
          } else if (parsedEvent.event === "assistant_delta") {
            const payload = JSON.parse(parsedEvent.data) as { delta?: string };
            appendAssistantDelta(payload.delta ?? "");
          } else if (parsedEvent.event === "assistant_message") {
            const message = JSON.parse(parsedEvent.data) as ChatMessage;
            applyAssistantMessage(message);
          } else if (parsedEvent.event === "error") {
            const payload = JSON.parse(parsedEvent.data) as { message?: string };
            throw new Error(payload.message ?? "Failed to send message.");
          }

          boundary = boundaryIndex();
        }
      }

      setIsSending(false);
      setIsStreamingResponse(false);

      if (!resolvedAssistantMessage) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimisticAssistantId && message.id !== optimisticUserId)
        );
        setError("Chat request failed.");
        setLastFailedDraft(trimmed);
      }
    } catch (streamError) {
      setIsSending(false);
      setIsStreamingResponse(false);
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticAssistantId && message.id !== optimisticUserId)
      );
      setError(streamError instanceof Error ? streamError.message : "Failed to send message.");
      setLastFailedDraft(trimmed);
    }
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

  function onUsePrompt(prompt: string) {
    setDraft(prompt);
    composerRef.current?.focus();
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
      <div className="plan-chat-quick-prompts" aria-label="Suggested prompts">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="plan-chat-prompt-chip"
            disabled={isLoading || isSending || isResetting || isApplying || !threadId}
            onClick={() => onUsePrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

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
              <div className="plan-chat-message-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {normalizeChatMarkdown(message.content)}
                </ReactMarkdown>
              </div>
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
        {isSending && !isStreamingResponse ? (
          <article className="plan-chat-message assistant">
            <h3>Coach</h3>
            <p className="plan-chat-typing">
              <span className="plan-chat-typing-spinner" aria-hidden="true" />
              <span>Coach is typing...</span>
            </p>
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
