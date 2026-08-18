"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import Link from "next/link";
import {
  ArrowLeft, Flame, Zap, Leaf, Droplets, TrendingUp,
  UtensilsCrossed, Calendar, Award, ChevronRight,
} from "lucide-react";

const API_URL  = process.env.NEXT_PUBLIC_API_URL;
const COLORS   = ["#16a34a", "#f97316", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];
const DAYS_FR  = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/* ── group consecutive meals with same name on same day ── */
function groupMeals(meals) {
  const groups = [];
  for (const m of meals) {
    const name = (m.corrected_class || m.predicted_class).replace(/_/g, " ");
    const day  = new Date(m.created_at).toLocaleDateString("fr-FR");
    const last = groups[groups.length - 1];
    if (last && last.name === name && last.day === day) {
      last.count += 1;
      last.totalCal += m.calories || 0;
    } else {
      groups.push({ id: m.id, name, day, date: new Date(m.created_at), count: 1, totalCal: m.calories || 0 });
    }
  }
  return groups;
}

/* ── meal history component ── */
function MealHistory({ meals }) {
  const [showAll, setShowAll] = useState(false);
  const grouped = groupMeals(meals);
  const visible = showAll ? grouped : grouped.slice(0, 12);

  return (
    <>
      <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
        {visible.map((g, i) => {
          const cal      = g.totalCal ? Math.round(g.totalCal) : null;
          const dayLabel = DAYS_FR[g.date.getDay()];
          const highCal  = cal && cal > 600;

          return (
            <div key={g.id}
                 className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                 style={{ borderColor: "#f1f5f9" }}>
              {/* day badge */}
              <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                   style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)" }}>
                <span className="text-xs font-bold leading-none" style={{ color: "#16a34a" }}>{dayLabel}</span>
                <span className="text-xs leading-none mt-0.5" style={{ color: "#22c55e" }}>{g.date.getDate()}</span>
              </div>

              {/* name + time */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm capitalize" style={{ color: "#0f172a" }}>{g.name}</p>
                  {g.count > 1 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe" }}>
                      ×{g.count}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                  {g.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {g.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  {g.count > 1 && (
                    <span style={{ color: "#94a3b8" }}> · {g.count} analyses</span>
                  )}
                </p>
              </div>

              {/* calories chip */}
              {cal ? (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
                     style={{ background: highCal ? "#fef3e2" : "#dcfce7", color: highCal ? "#c2410c" : "#15803d" }}>
                  <Flame size={11} />
                  {cal} kcal
                </div>
              ) : (
                <span className="text-xs px-3 py-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#f1f5f9", color: "#94a3b8" }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {grouped.length > 12 && (
        <div className="px-6 py-4 text-center" style={{ borderTop: "1px solid #f1f5f9" }}>
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#16a34a" }}
          >
            {showAll
              ? "Voir moins"
              : `Voir les ${grouped.length - 12} entrées supplémentaires`}
          </button>
        </div>
      )}
    </>
  );
}

/* ── custom tooltip for bar/area charts ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-4 py-3 shadow-lg text-sm"
         style={{ border: "1px solid #e2e8f0" }}>
      <p className="font-semibold mb-1" style={{ color: "#0f172a" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? "#16a34a" }}>
          {p.name ?? "Calories"} : <strong>{Math.round(p.value)}</strong> kcal
        </p>
      ))}
    </div>
  );
}

/* ── custom legend for pie ── */
function CustomLegend({ payload }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
      {payload.map((entry, i) => (
        <li key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

/* ── skeleton loader ── */
function Skeleton({ h = "h-4", w = "w-full", className = "" }) {
  return <div className={`animate-shimmer rounded-lg ${h} ${w} ${className}`} />;
}

export default function Dashboard() {
  const [meals,   setMeals]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/meals?user_id=1`)
      .then((res) => setMeals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── derived data ── */
  const { chartData, pieData, areaData, stats } = useMemo(() => {
    if (!meals.length) return { chartData: [], pieData: [], areaData: [], stats: null };

    // calories by day
    const byDay = {};
    meals.forEach((m) => {
      const d = new Date(m.created_at).toLocaleDateString("fr-FR");
      byDay[d] = (byDay[d] || 0) + (m.calories || 0);
    });
    const chartData = Object.entries(byDay)
      .map(([day, calories]) => ({ day, calories: Math.round(calories) }))
      .slice(-7)
      .reverse();

    // area data (same as chartData but for gradient chart)
    const areaData = [...chartData].reverse();

    // pie – top 6 foods
    const counts = {};
    meals.forEach((m) => {
      const cls = (m.corrected_class || m.predicted_class).replace(/_/g, " ");
      counts[cls] = (counts[cls] || 0) + 1;
    });
    const pieData = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    // summary stats
    const totalCal  = meals.reduce((s, m) => s + (m.calories || 0), 0);
    const avgCal    = totalCal / Math.max(Object.keys(byDay).length, 1);
    const maxDay    = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    const topFood   = pieData[0]?.name ?? "—";

    return {
      chartData,
      pieData,
      areaData,
      stats: {
        totalMeals: meals.length,
        totalCal:   Math.round(totalCal),
        avgCal:     Math.round(avgCal),
        topFood,
        maxDay:     maxDay ? `${maxDay[0]} · ${Math.round(maxDay[1])} kcal` : "—",
      },
    };
  }, [meals]);

  /* ─────────────────────────────── RENDER ─── */
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#f0fdf4 0%,#f8fafc 50%,#fef3e2 100%)" }}>

      {/* ── nav ── */}
      <nav style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0" }}
           className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80"
                style={{ color: "#64748b" }}>
            <ArrowLeft size={16} />
            Retour
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
              <Leaf size={14} color="white" />
            </div>
            <span className="font-bold gradient-text">NutriVision</span>
          </div>
          <Link href="/"
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", boxShadow: "0 4px 14px rgba(22,163,74,0.3)" }}>
            Analyser un repas
            <ChevronRight size={14} />
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* ── page header ── */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
               style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
            <TrendingUp size={12} />
            Suivi nutritionnel
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#0f172a" }}>
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Visualisez vos habitudes alimentaires et suivez votre progression.
          </p>
        </div>

        {/* ── loading skeletons ── */}
        {loading && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl p-5 space-y-3"
                     style={{ background: "white", border: "1px solid #e2e8f0" }}>
                  <Skeleton h="h-3" w="w-1/2" />
                  <Skeleton h="h-7" w="w-3/4" />
                  <Skeleton h="h-2" w="w-full" />
                </div>
              ))}
            </div>
            <Skeleton h="h-72" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton h="h-72" />
              <Skeleton h="h-72" />
            </div>
          </div>
        )}

        {/* ── empty state ── */}
        {!loading && meals.length === 0 && (
          <div className="text-center py-24 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)" }}>
              <UtensilsCrossed size={36} style={{ color: "#16a34a" }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>
              Aucun repas enregistré
            </h2>
            <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
              Analysez votre premier repas pour commencer le suivi.
            </p>
            <Link href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary">
              Analyser un repas
              <ChevronRight size={15} />
            </Link>
          </div>
        )}

        {/* ── content ── */}
        {!loading && meals.length > 0 && (
          <div className="space-y-6">

            {/* summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Repas analysés",    value: stats.totalMeals,              unit: "",      icon: UtensilsCrossed, color: "#16a34a", bg: "#dcfce7" },
                { label: "Calories totales",  value: stats.totalCal.toLocaleString("fr-FR"), unit: "kcal", icon: Flame,          color: "#f97316", bg: "#fef3e2" },
                { label: "Moy. quotidienne",  value: stats.avgCal.toLocaleString("fr-FR"),   unit: "kcal", icon: TrendingUp,      color: "#3b82f6", bg: "#eff6ff" },
                { label: "Aliment favori",    value: stats.topFood,                 unit: "",      icon: Award,           color: "#a855f7", bg: "#faf5ff" },
              ].map(({ label, value, unit, icon: Icon, color, bg }, i) => (
                <div key={i} className={`stat-card rounded-2xl p-5 animate-fade-in delay-${(i + 1) * 100}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium" style={{ color: "#94a3b8" }}>{label}</p>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                         style={{ background: bg }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold leading-tight capitalize truncate"
                     style={{ color: "#0f172a" }}>
                    {value}
                    {unit && <span className="text-sm font-normal ml-1" style={{ color: "#94a3b8" }}>{unit}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* area chart – evolution */}
            <div className="rounded-2xl p-6 animate-slide-up"
                 style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-base" style={{ color: "#0f172a" }}>
                    Évolution des calories
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>7 derniers jours</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                     style={{ background: "#dcfce7", color: "#15803d" }}>
                  <TrendingUp size={12} />
                  Suivi journalier
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={areaData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" fontSize={11} tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="calories" name="Calories"
                        stroke="#16a34a" strokeWidth={2.5}
                        fill="url(#calGrad)" dot={{ fill: "#16a34a", r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#16a34a" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 2-col: bar + pie */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* bar chart */}
              <div className="rounded-2xl p-6 animate-slide-up delay-100"
                   style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                <h2 className="font-bold text-base mb-1" style={{ color: "#0f172a" }}>
                  Calories par jour
                </h2>
                <p className="text-xs mb-5" style={{ color: "#94a3b8" }}>Comparaison journalière</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(22,163,74,0.05)" }} />
                    <Bar dataKey="calories" name="Calories" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i}
                              fill={i === chartData.length - 1 ? "#16a34a" : "#bbf7d0"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* pie chart */}
              <div className="rounded-2xl p-6 animate-slide-up delay-200"
                   style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                <h2 className="font-bold text-base mb-1" style={{ color: "#0f172a" }}>
                  Aliments fréquents
                </h2>
                <p className="text-xs mb-4" style={{ color: "#94a3b8" }}>Top 6 des plats analysés</p>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name"
                         cx="50%" cy="45%" outerRadius={75} innerRadius={38}
                         paddingAngle={3} strokeWidth={0}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} fois`, ""]} />
                    <Legend content={<CustomLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* meal history */}
            <div className="rounded-2xl overflow-hidden animate-slide-up delay-300"
                 style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
              <div className="px-6 py-5 flex items-center justify-between"
                   style={{ borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <h2 className="font-bold text-base" style={{ color: "#0f172a" }}>
                    Historique des repas
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                    {meals.length} repas enregistrés au total
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                     style={{ background: "#f1f5f9", color: "#64748b" }}>
                  <Calendar size={12} />
                  Récent en premier
                </div>
              </div>

              <MealHistory meals={meals} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
