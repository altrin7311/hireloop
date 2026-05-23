"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DailyBucket {
  label: string;
  count: number;
}

export interface MatchBucket {
  band: string;
  count: number;
}

export interface RecentApplicationItem {
  id: string;
  title: string;
  company: string;
  platform: string;
  status: string;
  matchScore: number | null;
  submittedAt: string | null;
}

export interface StatsViewProps {
  totalSubmitted: number;
  totalGenerated: number;
  creditsRemaining: number;
  appsThisWeek: number;
  daily: DailyBucket[];
  matchBuckets: MatchBucket[];
  recent: RecentApplicationItem[];
}

const STATUS_PILL: Record<string, { bg: string; fg: string; border: string }> = {
  draft: { bg: "#FFF5E0", fg: "#A05E00", border: "#FFDEA0" },
  generated: { bg: "#E0F9FA", fg: "#0097B2", border: "#B2EDEC" },
  submitted: { bg: "#DEF7E3", fg: "#0E7A2F", border: "#B5E6C0" },
  failed: { bg: "#FFE9E9", fg: "#A11212", border: "#F4C2C2" },
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

export function StatsView({
  totalSubmitted,
  totalGenerated,
  creditsRemaining,
  appsThisWeek,
  daily,
  matchBuckets,
  recent,
}: StatsViewProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submitted" value={totalSubmitted} sub={`${totalGenerated} generated`} />
        <StatCard label="Credits remaining" value={creditsRemaining} sub="1 credit = 1 submission" accent />
        <StatCard label="Submitted this week" value={appsThisWeek} sub="Trailing 7 days" />
        <StatCard
          label="Avg per day"
          value={daily.length > 0 ? (daily.reduce((s, b) => s + b.count, 0) / daily.length).toFixed(1) : "0"}
          sub="Over last 30 days"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div
          className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-3"
          style={{ borderColor: "#D4F5F5" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "#5A9EA8", letterSpacing: "0.08em" }}
              >
                30-day submissions
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: "#0C1A1C" }}>
                Daily activity
              </div>
            </div>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={daily} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4F5F5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#8ABCC4" }}
                  axisLine={{ stroke: "#D4F5F5" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8ABCC4" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "#E0F9FA" }}
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #B2EDEC",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#5A9EA8", fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="#00B8D9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2"
          style={{ borderColor: "#D4F5F5" }}
        >
          <div className="mb-2">
            <div
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "#5A9EA8", letterSpacing: "0.08em" }}
            >
              Match-score distribution
            </div>
            <div className="mt-1 text-xl font-semibold" style={{ color: "#0C1A1C" }}>
              Where your apps land
            </div>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart
                data={matchBuckets}
                margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D4F5F5" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#8ABCC4" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="band"
                  tick={{ fontSize: 11, fill: "#5A9EA8" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "#E0F9FA" }}
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #B2EDEC",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {matchBuckets.map((bucket, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        bucket.band.startsWith("85")
                          ? "#0097B2"
                          : bucket.band.startsWith("70")
                            ? "#00B8D9"
                            : "#B2EDEC"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border bg-white shadow-sm"
        style={{ borderColor: "#D4F5F5" }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "#D4F5F5" }}
        >
          <h3 className="text-base font-semibold" style={{ color: "#0C1A1C" }}>
            Recent applications
          </h3>
          <a
            href="/dashboard/applications"
            className="text-xs font-semibold"
            style={{ color: "#0097B2" }}
          >
            View all →
          </a>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-sm" style={{ color: "#5A9EA8" }}>
            No applications yet — head over to the Feed and pick a job.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5FFFE" }}>
                  {["Role", "Company", "Platform", "Match", "When", "Status"].map((c) => (
                    <th
                      key={c}
                      className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: "#5A9EA8", letterSpacing: "0.08em" }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid #D4F5F5" }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#0C1A1C" }}>
                      {row.title}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#0C1A1C" }}>
                      {row.company}
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: "#5A9EA8" }}>
                      {row.platform}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold"
                      style={{
                        color: row.matchScore !== null && row.matchScore >= 85 ? "#0097B2" : "#0C1A1C",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.matchScore !== null ? `${row.matchScore}%` : "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#5A9EA8" }}>
                      {formatWhen(row.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div
      className="rounded-xl border bg-white p-5 shadow-sm"
      style={{ borderColor: "#D4F5F5" }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color: "#5A9EA8", letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div
        className="mt-1.5"
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: accent ? "#00B8D9" : "#0C1A1C",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-[13px]" style={{ color: "#5A9EA8" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const colours = STATUS_PILL[status] ?? STATUS_PILL.draft!;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
      style={{
        background: colours.bg,
        color: colours.fg,
        border: `1px solid ${colours.border}`,
      }}
    >
      {status}
    </span>
  );
}
