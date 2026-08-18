"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import {
  Upload,
  Loader2,
  Sparkles,
  BarChart3,
  Leaf,
  Zap,
  Flame,
  Droplets,
  X,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  PenLine,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/* ─── colour map for macro bars ─── */
const MACRO_CONFIG = [
  { key: "calories",   label: "Calories",  unit: "kcal", color: "#f97316", icon: Flame,    max: 900  },
  { key: "protein_g",  label: "Protéines", unit: "g",    color: "#16a34a", icon: Zap,      max: 50   },
  { key: "carbs_g",    label: "Glucides",  unit: "g",    color: "#3b82f6", icon: Leaf,     max: 100  },
  { key: "fat_g",      label: "Lipides",   unit: "g",    color: "#a855f7", icon: Droplets, max: 60   },
];

/* ─── confidence badge colour ─── */
function confidenceColor(v) {
  if (v >= 0.8) return { bg: "#dcfce7", text: "#15803d", label: "Haute confiance" };
  if (v >= 0.5) return { bg: "#fef9c3", text: "#a16207", label: "Confiance moyenne" };
  return           { bg: "#fee2e2", text: "#b91c1c", label: "Faible confiance" };
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [dragging,     setDragging]     = useState(false);

  // --- Correction manuelle ---
  const [allClasses, setAllClasses] = useState([]);
  const [lastMealId, setLastMealId] = useState(null);
  const [correcting, setCorrecting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/classes`).then((res) => setAllClasses(res.data.classes));
  }, []);

  /* ── file handling ── */
  const applyFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLastMealId(null);
  };

  const handleFileChange = (e) => applyFile(e.target.files[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files[0]);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setLastMealId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post(`${API_URL}/predict-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);

      // Récupère l'id du repas qui vient d'être créé, pour permettre la correction
      const mealsRes = await axios.get(`${API_URL}/meals?user_id=1`);
      if (mealsRes.data.length > 0) setLastMealId(mealsRes.data[0].id);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'analyse de l'image.");
    } finally {
      setLoading(false);
    }
  };

  /* ── correction manuelle ── */
  const handleCorrect = async (correctClass) => {
    if (!lastMealId || !correctClass) return;
    setCorrecting(true);
    try {
      await axios.post(`${API_URL}/meals/${lastMealId}/correct`, {
        correct_class: correctClass,
      });
      setResult((prev) => ({ ...prev, predicted_class: correctClass }));
    } finally {
      setCorrecting(false);
    }
  };

  /* ─────────────────────────────────────── RENDER ─── */
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #f8fafc 50%, #fef3e2 100%)" }}>

      {/* ── top nav ── */}
      <nav style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0" }}
           className="sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
              <Leaf size={16} color="white" />
            </div>
            <span className="font-bold text-lg gradient-text">NutriVision</span>
          </div>
          <Link href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "white", boxShadow: "0 4px 14px rgba(22,163,74,0.3)" }}>
            <BarChart3 size={15} />
            Tableau de bord
            <ChevronRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── hero ── */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
             style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
          <Sparkles size={14} />
          Propulsé par l'IA · ResNet-50 · 101 classes
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4" style={{ lineHeight: 1.15 }}>
          Analysez votre repas{" "}
          <span className="gradient-text">en un instant</span>
        </h1>
        <p className="text-lg max-w-lg mx-auto" style={{ color: "#64748b" }}>
          Prenez en photo ou uploadez votre plat pour obtenir ses valeurs nutritionnelles
          et recevoir un conseil personnalisé.
        </p>
      </section>

      {/* ── main card ── */}
      <section className="max-w-2xl mx-auto px-6 pb-20">

        <div className="rounded-2xl p-8 animate-slide-up"
             style={{ background: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>

          {/* upload zone */}
          <div
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`upload-zone relative overflow-hidden ${dragging ? "dragging" : ""}`}
            style={{ minHeight: previewUrl ? "auto" : "220px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {previewUrl ? (
              <div className="relative w-full animate-fade-in">
                <img src={previewUrl} alt="Aperçu"
                     className="w-full rounded-xl object-cover"
                     style={{ maxHeight: "320px", objectFit: "contain" }} />
                <button
                  onClick={(e) => { e.stopPropagation(); resetAll(); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-bounce-light"
                     style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)" }}>
                  <ImagePlus size={28} style={{ color: "#16a34a" }} />
                </div>
                <div>
                  <p className="font-semibold text-base" style={{ color: "#1e293b" }}>
                    Glissez une photo ici
                  </p>
                  <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
                    ou <span style={{ color: "#16a34a", fontWeight: 600 }}>cliquez pour parcourir</span> · JPG, PNG, WEBP
                  </p>
                </div>
                <div className="flex gap-3 text-xs" style={{ color: "#94a3b8" }}>
                  {["Détection IA", "101 plats", "Nutrition complète"].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full"
                          style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*"
                   onChange={handleFileChange} className="hidden" />
          </div>

          {/* analyse button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || loading}
            className="w-full mt-5 py-3.5 text-base flex items-center justify-center gap-2 btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyse en cours…
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Analyser ce repas
              </>
            )}
          </button>

          {/* error */}
          {error && (
            <div className="mt-4 flex items-start gap-3 p-4 rounded-xl animate-fade-in"
                 style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <X size={16} style={{ color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
              <p className="text-sm" style={{ color: "#b91c1c" }}>{error}</p>
            </div>
          )}
        </div>

        {/* ── result ── */}
        {result && (
          <ResultCard
            result={result}
            allClasses={allClasses}
            correcting={correcting}
            onCorrect={handleCorrect}
          />
        )}

      </section>
    </div>
  );
}

/* ─────────────────────────── Result card ─── */
function ResultCard({ result, allClasses, correcting, onCorrect }) {
  const conf = confidenceColor(result.confidence);
  const n    = result.nutrition_per_100g;

  return (
    <div className="result-card mt-6 animate-slide-up">

      {/* header strip */}
      <div className="px-6 py-5 flex items-center justify-between"
           style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f0fdf4,#f8fafc)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
            <CheckCircle2 size={20} color="white" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#94a3b8" }}>
              Aliment détecté
            </p>
            <h2 className="text-xl font-bold capitalize" style={{ color: "#0f172a" }}>
              {result.predicted_class.replace(/_/g, " ")}
            </h2>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: conf.bg, color: conf.text }}>
          {conf.label} · {(result.confidence * 100).toFixed(1)}%
        </span>
      </div>

      <div className="px-6 py-6">

        {/* macros */}
        {n ? (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#94a3b8" }}>
              Valeurs nutritionnelles · pour 100 g
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MACRO_CONFIG.map(({ key, label, unit, color, icon: Icon, max }, i) => {
                const raw   = key === "calories" ? n.calories : n[key];
                const value = raw != null ? parseFloat(raw) : null;
                const pct   = value != null ? Math.min((value / max) * 100, 100) : 0;
                return (
                  <div key={key} className={`nutrient-pill p-4 animate-fade-in delay-${(i + 1) * 100}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Icon size={14} style={{ color }} />
                        <span className="text-xs font-medium" style={{ color: "#64748b" }}>{label}</span>
                      </div>
                      <span className="text-base font-bold" style={{ color: "#0f172a" }}>
                        {value != null ? (key === "calories" ? Math.round(value) : value.toFixed(1)) : "—"}
                        <span className="text-xs font-normal ml-0.5" style={{ color: "#94a3b8" }}>{unit}</span>
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: "#94a3b8" }}>
            Données nutritionnelles indisponibles pour cet aliment.
          </p>
        )}

        {/* advice */}
        {result.advice && (
          <div className="rounded-xl p-4 flex gap-3 animate-fade-in delay-400 mb-4"
               style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0" }}>
            <div className="mt-0.5 flex-shrink-0">
              <Leaf size={16} style={{ color: "#16a34a" }} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#166534" }}>
              {result.advice}
            </p>
          </div>
        )}

        {/* correction manuelle */}
        <div className="pt-4 flex items-center gap-2" style={{ borderTop: "1px solid #f1f5f9" }}>
          <PenLine size={14} style={{ color: "#94a3b8" }} />
          <span className="text-xs" style={{ color: "#94a3b8" }}>Ce n'est pas le bon aliment ?</span>
          <select
            disabled={correcting}
            onChange={(e) => e.target.value && onCorrect(e.target.value)}
            defaultValue=""
            className="text-xs rounded-lg px-2 py-1 ml-1"
            style={{ border: "1px solid #e2e8f0", color: "#475569", background: "#f8fafc" }}
          >
            <option value="" disabled>Corriger manuellement…</option>
            {allClasses.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}