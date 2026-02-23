"use client";

import { useState, useEffect, useCallback } from "react";

type MetricEntry = {
  id: string;
  value: number;
  recordedAt: string;
};

type Metric = {
  id: string;
  name: string;
  unit: string;
  description: string;
  isDefault: boolean;
  latestEntry: MetricEntry | null;
};

type EntryDetail = {
  id: string;
  value: number;
  recordedAt: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(iso));
}

function computeBodyWeightPercent(
  weightAdded: number,
  bodyWeightEntry: MetricEntry | null
): string | null {
  if (!bodyWeightEntry || bodyWeightEntry.value <= 0) return null;
  const bw = bodyWeightEntry.value;
  const pct = (100 * (weightAdded + bw)) / bw;
  return pct.toFixed(1);
}

export function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryDetail[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [addingValue, setAddingValue] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState("");
  const [newMetricUnit, setNewMetricUnit] = useState("");
  const [newMetricDescription, setNewMetricDescription] = useState("");
  const [addMetricError, setAddMetricError] = useState("");
  const [creatingMetric, setCreatingMetric] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const fetchEntries = async (metricId: string) => {
    setEntriesLoading(true);
    try {
      const res = await fetch(`/api/metrics/${metricId}/entries`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    } finally {
      setEntriesLoading(false);
    }
  };

  const toggleExpanded = (metricId: string) => {
    if (expandedMetric === metricId) {
      setExpandedMetric(null);
      setEntries([]);
    } else {
      setExpandedMetric(metricId);
      fetchEntries(metricId);
    }
  };

  const handleAddEntry = async (metricId: string) => {
    const valueStr = addingValue[metricId];
    const value = parseFloat(valueStr);
    if (isNaN(value)) return;

    setSaving((prev) => ({ ...prev, [metricId]: true }));
    try {
      const res = await fetch(`/api/metrics/${metricId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      });
      if (res.ok) {
        setAddingValue((prev) => ({ ...prev, [metricId]: "" }));
        await fetchMetrics();
        if (expandedMetric === metricId) {
          await fetchEntries(metricId);
        }
      }
    } finally {
      setSaving((prev) => ({ ...prev, [metricId]: false }));
    }
  };

  const handleDeleteEntry = async (metricId: string, entryId: string) => {
    const res = await fetch(`/api/metrics/${metricId}/entries/${entryId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await fetchMetrics();
      if (expandedMetric === metricId) {
        await fetchEntries(metricId);
      }
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    const res = await fetch(`/api/metrics/${metricId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      if (expandedMetric === metricId) {
        setExpandedMetric(null);
        setEntries([]);
      }
      await fetchMetrics();
    }
  };

  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMetricError("");
    if (!newMetricName.trim() || !newMetricUnit.trim()) {
      setAddMetricError("Name and unit are required.");
      return;
    }
    setCreatingMetric(true);
    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMetricName.trim(),
          unit: newMetricUnit.trim(),
          description: newMetricDescription.trim()
        })
      });
      if (res.ok) {
        setNewMetricName("");
        setNewMetricUnit("");
        setNewMetricDescription("");
        setShowAddMetric(false);
        await fetchMetrics();
      } else {
        const data = await res.json().catch(() => null);
        setAddMetricError(data?.error?.message || "Failed to create metric.");
      }
    } finally {
      setCreatingMetric(false);
    }
  };

  const bodyWeightMetric = metrics.find((m) => m.name === "Body Weight");
  const bodyWeightEntry = bodyWeightMetric?.latestEntry ?? null;

  if (loading) {
    return (
      <section className="card dashboard-list-card">
        <h2>Progress Metrics</h2>
        <p>Loading metrics...</p>
      </section>
    );
  }

  return (
    <section className="card dashboard-list-card">
      <div className="metrics-header">
        <h2>Progress Metrics</h2>
        <button
          className="button-secondary metrics-add-btn"
          onClick={() => setShowAddMetric(!showAddMetric)}
          type="button"
        >
          {showAddMetric ? "Cancel" : "+ Add Metric"}
        </button>
      </div>

      {showAddMetric && (
        <form className="metrics-add-form" onSubmit={handleCreateMetric}>
          <div className="metrics-add-row">
            <label>
              <span>Name</span>
              <input
                type="text"
                placeholder="e.g. Campus Board Max"
                value={newMetricName}
                onChange={(e) => setNewMetricName(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Unit</span>
              <input
                type="text"
                placeholder="e.g. kg"
                value={newMetricUnit}
                onChange={(e) => setNewMetricUnit(e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            <span>Description (optional)</span>
            <input
              type="text"
              placeholder="What this metric measures"
              value={newMetricDescription}
              onChange={(e) => setNewMetricDescription(e.target.value)}
            />
          </label>
          {addMetricError && <p className="error-text">{addMetricError}</p>}
          <button type="submit" disabled={creatingMetric}>
            {creatingMetric ? "Creating..." : "Create Metric"}
          </button>
        </form>
      )}

      {metrics.length === 0 ? (
        <p>No metrics available yet.</p>
      ) : (
        <ul className="metrics-list">
          {metrics.map((metric) => {
            const isBodyWeight = metric.name === "Body Weight";
            const showBwPct = !isBodyWeight && metric.latestEntry && bodyWeightEntry;
            const bwPct = showBwPct
              ? computeBodyWeightPercent(metric.latestEntry!.value, bodyWeightEntry)
              : null;

            return (
              <li key={metric.id} className="metric-item">
                <div
                  className="metric-summary"
                  onClick={() => toggleExpanded(metric.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleExpanded(metric.id);
                  }}
                >
                  <div className="metric-info">
                    <span className="metric-name">{metric.name}</span>
                    <span className="metric-description">{metric.description}</span>
                  </div>
                  <div className="metric-value-area">
                    {metric.latestEntry ? (
                      <div className="metric-values">
                        <span className="metric-value">
                          {metric.latestEntry.value} {metric.unit}
                        </span>
                        {bwPct && (
                          <span className="metric-bw-pct">{bwPct}% BW</span>
                        )}
                        <span className="metric-date">
                          {formatDate(metric.latestEntry.recordedAt)}
                        </span>
                      </div>
                    ) : (
                      <span className="metric-no-data">No data</span>
                    )}
                    <span className="metric-expand">
                      {expandedMetric === metric.id ? "\u25B2" : "\u25BC"}
                    </span>
                  </div>
                </div>

                <div className="metric-add-entry-row">
                  <input
                    type="number"
                    step="any"
                    placeholder={`Value (${metric.unit})`}
                    value={addingValue[metric.id] || ""}
                    onChange={(e) =>
                      setAddingValue((prev) => ({ ...prev, [metric.id]: e.target.value }))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    disabled={saving[metric.id] || !addingValue[metric.id]}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddEntry(metric.id);
                    }}
                    type="button"
                  >
                    {saving[metric.id] ? "..." : "Log"}
                  </button>
                  {!metric.isDefault && (
                    <button
                      className="button-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMetric(metric.id);
                      }}
                      type="button"
                      title="Delete metric"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {expandedMetric === metric.id && (
                  <div className="metric-entries">
                    {entriesLoading ? (
                      <p>Loading history...</p>
                    ) : entries.length === 0 ? (
                      <p>No entries recorded yet.</p>
                    ) : (
                      <table className="metric-entries-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Value</th>
                            {!isBodyWeight && <th>% BW</th>}
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry) => {
                            const entryBwPct = !isBodyWeight
                              ? computeBodyWeightPercent(entry.value, bodyWeightEntry)
                              : null;
                            return (
                              <tr key={entry.id}>
                                <td>{formatDate(entry.recordedAt)}</td>
                                <td>
                                  {entry.value} {metric.unit}
                                </td>
                                {!isBodyWeight && (
                                  <td>{entryBwPct ? `${entryBwPct}%` : "\u2014"}</td>
                                )}
                                <td>
                                  <button
                                    className="button-text"
                                    onClick={() => handleDeleteEntry(metric.id, entry.id)}
                                    type="button"
                                    title="Delete entry"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
