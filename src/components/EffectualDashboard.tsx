import { useState, useEffect, useRef, useCallback } from "react";
import SIM_DATA from '../assets/files.json';
import MathMode from './MathMode';  // adjust path as needed

// ─── Types ────────────────────────────────────────────────────────────────────
interface Node {
  id: string;
  label: string;
  type: "core" | "related" | "sub" | "application" | "formula" | "derivation" | "missed";
  formula?: string;
}
interface Edge { from: string; to: string; label?: string; }
interface AIResponse {
  answer: string; topic: string; nodes: Node[]; edges: Edge[];
  keywords: string[]; followUp: string[]; shouldMerge?: boolean;
  formulas?: Array<{ concept: string; latex: string }>;
}
interface Graph {
  id: string; topic: string; subject: string; date: string;
  nodes: Node[]; edges: Edge[]; keywords: string[];
}
interface Position { x: number; y: number; }
interface ChatMessage { role: "user" | "bot"; text: string; timestamp: number; }
interface SavedFormula {
  id: string; concept: string; latex: string;
  topic: string; subject: string; savedAt: number;
}
interface GradeResult {
  score: number;
  conceptualAccuracy: number;
  depthScore: number;
  clarityScore: number;
  nailed: string[];
  corrections: Array<{ mistake: string; fix: string }>;
  missing: string[];
  misconceptions: string[];
  encouragement: string;
  feynmanTip: string;
  overallVerdict: "excellent" | "good" | "needs_work" | "incomplete";
  missedNodes: Array<{ id: string; label: string; type: Node["type"] }>;
  detailedFeedback: string;
}

interface LearningGap {
  id: string;
  concept: string;
  reason: string;
  topic: string;
  subject: string;
  addedAt: number;
  dismissed: boolean;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:        "#05060f",
  surface:   "#0d0f1e",
  card:      "#111327",
  border:    "rgba(255,255,255,0.07)",
  teal:      "#00f5d4",
  tealDim:   "rgba(0,245,212,0.12)",
  purple:    "#7c6cff",
  purpleDim: "rgba(124,108,255,0.14)",
  text:      "#e5e7eb",
  muted:     "rgba(255,255,255,0.38)",
  blue:      "#3b82f6",
  orange:    "#f59e0b",
  pink:      "#ec4899",
  pinkDim:   "rgba(236,72,153,0.12)",
  green:     "#10b981",
  red:       "#ef4444",
  yellow:    "#f59e0b",
  missed:    "#f472b6",
} as const;

// ─── ENHANCED LaTeX Renderer (PROFESSIONAL MATH) ─────────────────────────────
function LaTeX({ formula, size = 12 }: { formula: string; size?: number }) {
  let html = formula;
  
  // Greek letters
  const greek: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', pi: 'π', theta: 'θ',
    mu: 'μ', sigma: 'σ', omega: 'ω', lambda: 'λ', tau: 'τ', phi: 'φ'
  };
  Object.entries(greek).forEach(([k, v]) => {
    html = html.replace(new RegExp(`\\\\${k}\\b`, 'g'), v);
  });
  
  // Symbols
  html = html
    .replace(/\\propto/g, "∝")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\pm/g, "±")
    .replace(/\\infty/g, "∞");
  
  // PROPER FRACTIONS - stacked!
  html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) =>
    `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:${size*0.85}px;line-height:1.1">
      <span style="padding:0 3px">${num}</span>
      <span style="border-top:1.2px solid currentColor;padding:0 3px">${den}</span>
    </span>`
  );
  
  // PROPER SQUARE ROOTS
  html = html.replace(/\\sqrt\{([^}]+)\}/g,
    `<span style="font-size:1.2em">√</span><span style="text-decoration:overline;padding:0 2px">$1</span>`
  );
  
  // Superscripts & subscripts
  html = html
    .replace(/\^{([^}]+)}/g, "<sup style='font-size:0.7em'>$1</sup>")
    .replace(/\^(\w)/g, "<sup style='font-size:0.7em'>$1</sup>")
    .replace(/_{([^}]+)}/g, "<sub style='font-size:0.7em'>$1</sub>")
    .replace(/_(\w)/g, "<sub style='font-size:0.7em'>$1</sub>");
  
  return (
    <span dangerouslySetInnerHTML={{ __html: html }}
      style={{ 
        fontFamily: "'Cambria Math', 'Times New Roman', Georgia, serif",
        fontSize: size,
        lineHeight: 1.5
      }}
    />
  );
}

function cleanAnswer(text: string): string {
  return text.replace(/\{[^{}]{0,800}\}/g, "").replace(/\s{2,}/g, " ").trim();
}

// ─── Grading API ──────────────────────────────────────────────────────────────
async function gradeExplanation(
  userText: string, topic: string, nodes: Node[], subject: string, grade: string,
): Promise<GradeResult> {
  const conceptList = (nodes ?? []).map(n => `- "${n.label}" (${n.type})`).join("\n");
  const systemPrompt = `You are an EXTREMELY strict academic evaluator grading a student's explanation using the Feynman Technique. You grade for ${subject}, grade ${grade} level.

The student was asked to explain: "${topic}"

Known concepts in the knowledge graph for this topic:
${conceptList}

YOUR JOB: CATCH EVERY FLAW. BE BRUTALLY HONEST.

You are NOT a friendly tutor here. You are a strict examiner:
1. DETECT vague hand-waving — "it works because of physics" without HOW = missing depth
2. CATCH misconceptions — confusing "speed" with "velocity", "mass" with "weight"
3. IDENTIFY circular reasoning
4. FLAG memorized phrases without understanding
5. REJECT keyword stuffing — listing terms without connecting them = NOTHING

SCORING (strict — most students score 40-65, only truly excellent get 80+):
- conceptualAccuracy: Are the core ideas CORRECT? Penalise hard for wrong facts.
- depthScore: Do they explain WHY, not just WHAT?
- clarityScore: Could a 10-year-old understand?
- Overall = accuracy×0.5 + depth×0.3 + clarity×0.2

ANTI-GAMING:
- Generic essay without UNDERSTANDING → max 40
- Just listing concept names → max 30
- Genuine understanding with correct mechanisms → can reach 80+
- Only perfect, complete, well-explained responses get 90+

Respond ONLY with valid JSON, no markdown:
{
  "score": <0-100 integer>,
  "conceptualAccuracy": <0-100>,
  "depthScore": <0-100>,
  "clarityScore": <0-100>,
  "nailed": ["concept genuinely explained well", ...],
  "corrections": [{"mistake": "exact quote of what they got wrong", "fix": "exact correction"}, ...],
  "missing": ["concept they completely skipped", ...],
  "misconceptions": ["subtle wrong idea", ...],
  "encouragement": "one honest sentence — firm but not cruel",
  "feynmanTip": "one specific actionable tip for THIS explanation",
  "overallVerdict": "excellent|good|needs_work|incomplete",
  "missedNodes": [{"id": "new_x", "label": "<label>", "type": "related"}, ...],
  "detailedFeedback": "2-3 sentences of specific, honest feedback"
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL Learning Platform",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Student's explanation:\n\n"${userText}"` },
      ],
      temperature: 0.3,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) throw new Error("Grading API failed");
  const data = await response.json();
  const raw  = data.choices?.[0]?.message?.content || "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean) as GradeResult; }
  catch {
    return {
      score: 0, conceptualAccuracy: 0, depthScore: 0, clarityScore: 0,
      nailed: [], corrections: [], missing: [], misconceptions: [],
      encouragement: "Something went wrong. Please try again.",
      feynmanTip: "Try explaining as if to a 10-year-old.",
      overallVerdict: "incomplete", missedNodes: [],
      detailedFeedback: "Grading failed — please retry.",
    };
  }
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 130 }: { score: number; size?: number }) {
  const [display, setDisplay] = useState(0);
  const [prog, setProg]       = useState(0);
  useEffect(() => {
    let f = 0;
    const tick = () => {
      f++; const t = Math.min(f / 60, 1); const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(score * e)); setProg(e);
      if (f < 60) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);
  const color = score >= 75 ? C.green : score >= 50 ? C.yellow : C.red;
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const dash = circ * prog * (score / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 900, color, lineHeight: 1 }}>{display}</span>
        <span style={{ fontSize: size * 0.085, color: C.muted, fontWeight: 600, letterSpacing: "0.1em" }}>/100</span>
      </div>
    </div>
  );
}

// ─── Sub Score Bar ────────────────────────────────────────────────────────────
function SubScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { setTimeout(() => setW(value), 100); }, [value]);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 10, color, fontWeight: 800 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: `${color}18`, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 99, transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)" }}/>
      </div>
    </div>
  );
}

// ─── Concept Tracker ──────────────────────────────────────────────────────────
function ConceptTracker({ nodes, userText }: { nodes: Node[]; userText: string }) {
  const tl = userText.toLowerCase();
  const concepts = (nodes ?? []).map(n => {
    const words = n.label.toLowerCase().split(/\s+/);
    const hit     = words.every(w => tl.includes(w));
    const partial = !hit && words.some(w => w.length > 3 && tl.includes(w));
    return { label: n.label, hit, partial };
  });
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>Concept Radar</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
        {concepts.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 7px", borderRadius: 6,
            background: c.hit ? C.tealDim : c.partial ? "rgba(245,158,11,0.08)" : "transparent",
            border: `1px solid ${c.hit ? C.teal + "44" : c.partial ? C.yellow + "33" : "transparent"}`,
            transition: "all 0.3s" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: c.hit ? C.teal : c.partial ? C.yellow : C.muted,
              boxShadow: c.hit ? `0 0 6px ${C.teal}` : "none", transition: "all 0.3s" }}/>
            <span style={{ fontSize: 11, color: c.hit ? C.teal : c.partial ? C.yellow : C.muted,
              fontWeight: c.hit ? 700 : 400, flex: 1, transition: "all 0.3s" }}>{c.label}</span>
            {c.hit && <span style={{ fontSize: 9, color: C.teal }}>✓</span>}
            {c.partial && <span style={{ fontSize: 9, color: C.yellow }}>~</span>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, color: C.teal }}><b>{concepts.filter(c => c.hit).length}</b> covered</span>
        <span style={{ fontSize: 10, color: C.yellow }}><b>{concepts.filter(c => c.partial).length}</b> partial</span>
        <span style={{ fontSize: 10, color: C.muted }}><b>{concepts.filter(c => !c.hit && !c.partial).length}</b> missing</span>
      </div>
    </div>
  );
}

// ─── Teach It Back (fullscreen overlay) ──────────────────────────────────────
interface TIBProps {
  topic: string; nodes: Node[]; subject: string; grade: string;
  onClose: () => void; onAddNodes: (nodes: Node[], reasons: string[]) => void;
}
function TeachItBack({ topic, nodes, subject, grade, onClose, onAddNodes }: TIBProps) {
  const [phase, setPhase]         = useState<"write" | "grading" | "results">("write");
  const [text, setText]           = useState("");
  const [result, setResult]       = useState<GradeResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [scanY, setScanY]         = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const id = setInterval(() => setScanY(y => (y + 1.2) % 100), 30); return () => clearInterval(id); }, []);
  useEffect(() => { setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0); }, [text]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (wordCount < 40) return;
    setPhase("grading"); setError(null);
    try {
      const res = await gradeExplanation(text, topic, nodes, subject, grade);
      setResult(res); setPhase("results");
      if (res.missedNodes?.length > 0) {
        const reasons = res.missedNodes.map((n, i) =>
          res.missing[i]
            ? `You skipped "${res.missing[i]}" — this is a key concept that explains how ${topic} works.`
            : `"${n.label}" is an important concept you didn't cover in your explanation.`
        );
        onAddNodes(res.missedNodes.map((n, i) => ({ ...n, id: `tib_${Date.now()}_${i}` })), reasons);
      }
    } catch {
      setError("Grading failed. Check your connection and try again.");
      setPhase("write");
    }
  }, [text, topic, nodes, subject, grade, wordCount, onAddNodes]);

  const handleRetry = () => { setText(""); setResult(null); setPhase("write"); setTimeout(() => taRef.current?.focus(), 100); };

  const verdictMap = {
    excellent:  { label: "EXCELLENT",  color: C.green,  icon: "🏆" },
    good:       { label: "GOOD",       color: C.teal,   icon: "✨" },
    needs_work: { label: "NEEDS WORK", color: C.yellow, icon: "📚" },
    incomplete: { label: "INCOMPLETE", color: C.red,    icon: "⚠️" },
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: C.bg, overflow: "hidden", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(0,245,212,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,212,0.03) 1px,transparent 1px)`,
        backgroundSize: "40px 40px" }}/>
      <div style={{ position: "absolute", left: 0, right: 0, top: `${scanY}%`, height: 2, pointerEvents: "none",
        background: `linear-gradient(90deg,transparent,${C.teal}18,transparent)` }}/>
      <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, pointerEvents: "none",
        background: `radial-gradient(circle,${C.purple}14,transparent 70%)` }}/>
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, pointerEvents: "none",
        background: `radial-gradient(circle,${C.teal}0a,transparent 70%)` }}/>

      <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center",
          justifyContent: "space-between", background: "rgba(13,15,30,0.85)", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, fontSize: 17,
              background: `linear-gradient(135deg,${C.teal}22,${C.purple}22)`,
              border: `1px solid ${C.teal}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>🧠</div>
            <div>
              <div style={{ color: C.text, fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>Teach It Back</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                <span style={{ fontSize: 9, color: C.teal, background: C.tealDim, padding: "1px 7px", borderRadius: 99 }}>{topic}</span>
                <span style={{ fontSize: 9, color: C.muted }}>{subject} · Grade {grade}</span>
                <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.15em", color: C.red,
                  background: `${C.red}18`, padding: "2px 7px", borderRadius: 99, border: `1px solid ${C.red}33` }}>STRICT MODE</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {phase === "write" && (
              <div style={{ fontSize: 11, color: C.muted }}>
                <span style={{ color: wordCount >= 40 ? C.teal : C.muted, fontWeight: 700 }}>{wordCount}</span> / 40 words min
              </div>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${C.border}`,
              background: "transparent", cursor: "pointer", color: C.muted, fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {phase === "write" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 18, maxWidth: 1060, margin: "0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: `linear-gradient(135deg,${C.tealDim},${C.purpleDim})`,
                  border: `1px solid ${C.teal}33`, borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 5 }}>📖 The Feynman Challenge</div>
                  <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, margin: 0 }}>
                    Explain <strong style={{ color: C.teal }}>{topic}</strong> as if teaching someone who has never heard of it.
                    Use your own words — explain the <em>why</em> and <em>how</em>, not just the <em>what</em>.
                  </p>
                  <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 7,
                    background: `${C.red}10`, border: `1px solid ${C.red}22`,
                    fontSize: 10, color: `${C.red}cc`, lineHeight: 1.5 }}>
                    ⚠️ <strong>Warning:</strong> Strict AI grader. Vague answers, keyword-stuffing and jargon without understanding score poorly.
                  </div>
                </div>
                <div style={{ background: C.card, borderRadius: 12,
                  border: `1px solid ${text.length > 0 ? C.teal + "33" : C.border}`,
                  overflow: "hidden", transition: "border-color 0.3s" }}>
                  <textarea ref={taRef} value={text} onChange={e => setText(e.target.value)} autoFocus
                    placeholder={`Start explaining ${topic} in your own words…\n\nTip: Begin with the core idea, then explain HOW it works, WHY it behaves that way, and give a real-world example.`}
                    style={{ width: "100%", minHeight: 300, padding: "18px 20px", background: "transparent",
                      border: "none", outline: "none", color: C.text, fontSize: 13, lineHeight: 1.8,
                      resize: "vertical", fontFamily: "'DM Sans',sans-serif" }}/>
                  <div style={{ padding: "8px 18px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: C.muted }}>{wordCount} words · {text.length} chars</span>
                    <span style={{ fontSize: 10, color: wordCount >= 40 ? C.green : C.muted }}>
                      {wordCount >= 40 ? "✓ Ready to submit" : `${Math.max(0, 40 - wordCount)} more words needed`}
                    </span>
                  </div>
                </div>
                {error && (
                  <div style={{ padding: "9px 13px", borderRadius: 7, background: `${C.red}10`,
                    border: `1px solid ${C.red}33`, fontSize: 11, color: C.red }}>{error}</div>
                )}
                <button onClick={handleSubmit} disabled={wordCount < 40}
                  style={{ padding: "12px 28px", borderRadius: 9, border: "none",
                    cursor: wordCount >= 40 ? "pointer" : "not-allowed", alignSelf: "flex-start",
                    background: wordCount >= 40 ? `linear-gradient(135deg,${C.teal},${C.purple})` : C.border,
                    color: wordCount >= 40 ? "#05060f" : C.muted, fontSize: 12, fontWeight: 800,
                    boxShadow: wordCount >= 40 ? `0 6px 20px ${C.teal}33` : "none", transition: "all 0.2s" }}>
                  Submit for Grading →
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ConceptTracker nodes={nodes} userText={text}/>
                <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "13px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: C.muted, textTransform: "uppercase", marginBottom: 9 }}>Scoring Criteria</div>
                  {[
                    { label: "Conceptual Accuracy", weight: "50%", color: C.teal,   desc: "Correct facts & mechanisms" },
                    { label: "Depth of Explanation", weight: "30%", color: C.purple, desc: "Why & how, not just what" },
                    { label: "Clarity",              weight: "20%", color: C.blue,   desc: "Simple, jargon-free language" },
                  ].map(s => (
                    <div key={s.label} style={{ marginBottom: 8, padding: "7px 9px", borderRadius: 7, background: C.surface, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>{s.label}</span>
                        <span style={{ fontSize: 9, color: s.color, background: `${s.color}18`, padding: "1px 5px", borderRadius: 99 }}>{s.weight}</span>
                      </div>
                      <span style={{ fontSize: 10, color: C.muted }}>{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === "grading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 22 }}>
              <div style={{ position: "relative", width: 72, height: 72 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ position: "absolute", inset: 0, borderRadius: "50%",
                    border: `2px solid ${C.teal}`, opacity: 0.5 - i * 0.12,
                    animation: `tibPing 1.5s ${i * 0.4}s ease-out infinite`,
                    transform: `scale(${1 + i * 0.3})` }}/>
                ))}
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                  background: `radial-gradient(circle,${C.teal}22,${C.purple}18)`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🧠</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 7 }}>Analysing your explanation…</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, maxWidth: 360 }}>
                  Checking conceptual accuracy, depth of understanding, and identifying any misconceptions.
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.teal,
                    animation: `tibDot 1.2s ${i * 0.15}s ease-in-out infinite` }}/>
                ))}
              </div>
            </div>
          )}

          {phase === "results" && result && (() => {
            const v = verdictMap[result.overallVerdict];
            return (
              <div style={{ maxWidth: 1060, margin: "0 auto" }}>
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
                  padding: "20px 24px", marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                  <ScoreRing score={result.score}/>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 12px",
                      borderRadius: 99, background: `${v.color}18`, border: `1px solid ${v.color}44`, marginBottom: 8 }}>
                      <span style={{ fontSize: 11 }}>{v.icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 900, color: v.color, letterSpacing: "0.14em" }}>{v.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginBottom: 8 }}>{result.detailedFeedback}</p>
                    <p style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>"{result.encouragement}"</p>
                  </div>
                  <div style={{ width: 200 }}>
                    <SubScoreBar label="Conceptual Accuracy" value={result.conceptualAccuracy} color={C.teal}/>
                    <SubScoreBar label="Depth of Explanation" value={result.depthScore}        color={C.purple}/>
                    <SubScoreBar label="Clarity"              value={result.clarityScore}       color={C.blue}/>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Your Explanation</div>
                    <p style={{ fontSize: 12, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 260, overflowY: "auto" }}>{text}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(result.nailed?.length ?? 0) > 0 && (
                      <div style={{ background: `${C.green}0c`, borderRadius: 10, border: `1px solid ${C.green}22`, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.green, marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>✓ What You Nailed</div>
                        {result.nailed.map((n, i) => (
                          <div key={i} style={{ display: "flex", gap: 7, marginBottom: 4 }}>
                            <span style={{ color: C.green, fontSize: 11 }}>✓</span>
                            <span style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(result.corrections?.length ?? 0) > 0 && (
                      <div style={{ background: `${C.orange}0c`, borderRadius: 10, border: `1px solid ${C.orange}22`, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>⚠ Corrections</div>
                        {result.corrections.map((c, i) => (
                          <div key={i} style={{ marginBottom: 8 }}>
                            <div style={{ padding: "4px 8px", borderRadius: 5, marginBottom: 3, background: `${C.red}10`, border: `1px solid ${C.red}20`, color: `${C.red}cc`, fontSize: 10 }}>✗ {c.mistake}</div>
                            <div style={{ padding: "4px 8px", borderRadius: 5, background: `${C.green}10`, border: `1px solid ${C.green}20`, color: `${C.green}cc`, fontSize: 10 }}>✓ {c.fix}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(result.misconceptions?.length ?? 0) > 0 && (
                      <div style={{ background: `${C.red}0c`, borderRadius: 10, border: `1px solid ${C.red}22`, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>🚫 Misconceptions Detected</div>
                        {result.misconceptions.map((m, i) => (
                          <div key={i} style={{ fontSize: 11, color: `${C.red}cc`, marginBottom: 3, lineHeight: 1.5 }}>• {m}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(result.missing?.length ?? 0) > 0 && (
                  <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 18px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 9 }}>📌 Missing Concepts — Added to Your Graph</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {(result.missing ?? []).map((m, i) => (
                        <div key={i} style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11, background: C.purpleDim, color: C.purple, border: `1px solid ${C.purple}33` }}>+ {m}</div>
                      ))}
                    </div>
                    {(result.missedNodes?.length ?? 0) > 0 && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 7 }}>✓ {result.missedNodes.length} new node{result.missedNodes.length !== 1 ? "s" : ""} added to your knowledge graph</div>
                    )}
                  </div>
                )}

                <div style={{ background: `linear-gradient(135deg,${C.tealDim},${C.purpleDim})`,
                  borderRadius: 12, border: `1px solid ${C.teal}2a`, padding: "14px 18px",
                  marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, marginBottom: 4, letterSpacing: "0.08em" }}>FEYNMAN TIP FOR YOU</div>
                    <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, margin: 0 }}>{result.feynmanTip}</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={handleRetry} style={{ padding: "11px 26px", borderRadius: 9,
                    background: `linear-gradient(135deg,${C.teal},${C.purple})`,
                    border: "none", cursor: "pointer", color: "#05060f", fontSize: 12, fontWeight: 800,
                    boxShadow: `0 6px 20px ${C.teal}33`, transition: "all 0.2s" }}>
                    🔄 Try Again
                  </button>
                  <button onClick={onClose} style={{ padding: "11px 24px", borderRadius: 9,
                    background: "transparent", border: `1px solid ${C.border}`,
                    cursor: "pointer", color: C.muted, fontSize: 12, fontWeight: 600 }}>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes tibPing { 0%{opacity:0.5;transform:scale(1)} 100%{opacity:0;transform:scale(1.8)} }
        @keyframes tibDot  { 0%,100%{opacity:0.2;transform:translateY(0)} 50%{opacity:1;transform:translateY(-5px)} }
      `}</style>
    </div>
  );
}

// ─── SMART POST-PROCESSOR: enrichResponseWithFormulas ────────────────────────
// Scans AI answer + formulas[] for any formula the model mentioned but forgot to
// create graph nodes for. Injects them automatically. Also force-sets shouldMerge.
function enrichResponseWithFormulas(data: AIResponse, existingNodes: Node[]): AIResponse {
  const answer = data.answer || "";

  // Normalize a formula string for deduplication — strips LaTeX, spaces, coefficients
  // so "C_{55}H_{72}MgN_4O_5" and "C55H72MgN4O5" are treated as the same formula
  const normalizeFormula = (f: string) =>
    f.replace(/[_{}\\^]/g, "").replace(/\s+/g, "").toLowerCase();

  const allExistingFormulas = [
    ...existingNodes.filter(n => n.formula).map(n => n.formula!),
    ...data.nodes.filter(n => n.formula).map(n => n.formula!),
  ];
  // Use normalized set for dedup so LaTeX variants don't create duplicates
  const existingFormulaNorm = new Set<string>(allExistingFormulas.map(normalizeFormula));
  const existingFormulaStrings = new Set<string>(allExistingFormulas); // exact strings too
  const existingLabelsLower = new Set<string>([
    ...existingNodes.map(n => n.label.toLowerCase()),
    ...data.nodes.map(n => n.label.toLowerCase()),
  ]);

  const injected: Node[] = [];
  const injectedEdges: Edge[] = [];

  const coreNode =
    data.nodes.find(n => n.type === "core") ||
    existingNodes.find(n => n.type === "core");

  const addFormulaNode = (label: string, formulaStr: string, edgeLabel: string) => {
    if (!formulaStr || formulaStr.length < 2) return;
    // Dedup by both exact string AND normalized form
    if (existingFormulaStrings.has(formulaStr)) return;
    if (existingFormulaNorm.has(normalizeFormula(formulaStr))) return;
    const key = label.toLowerCase();
    if (existingLabelsLower.has(key)) return;
    const newId = `enrich_${Date.now()}_${injected.length}_${Math.random().toString(36).slice(2, 6)}`;
    injected.push({ id: newId, label, type: "formula", formula: formulaStr });
    if (coreNode) injectedEdges.push({ from: coreNode.id, to: newId, label: edgeLabel });
    existingFormulaStrings.add(formulaStr);
    existingFormulaNorm.add(normalizeFormula(formulaStr));
    existingLabelsLower.add(key);
  };

  // ── Strategy 1: drain the formulas[] array (AI fills it but old code never reads it) ──
  for (const f of data.formulas ?? []) {
    const alreadyHasNode = data.nodes.some(
      n => n.type === "formula" && (
        n.formula === f.latex ||
        normalizeFormula(n.formula ?? "") === normalizeFormula(f.latex) ||
        n.label.toLowerCase().includes(f.concept.toLowerCase().slice(0, 7))
      )
    );
    if (alreadyHasNode) continue;
    const label = f.concept.length > 20 ? f.concept.slice(0, 18) + "…" : f.concept;
    addFormulaNode(label, f.latex, "has formula");
  }

  // ── Strategy 2: "Chemical formula: X" or "formula: X" colon pattern ──
  // Catches: "Chemical formula: 6CO2 + 6H2O → C6H12O6 + 6O2"
  // This is the most common pattern the AI actually uses!
  const colonPattern =
    /(?:chemical\s+)?(?:formula|equation|reaction)\s*:\s*([0-9A-Z][A-Za-z0-9+\-→⟶=\s·×÷]{3,80}?)(?=[.)\n]|\s+\d+[).]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = colonPattern.exec(answer)) !== null) {
    const rawFormula = m[1].trim().replace(/\s+/g, " ");
    if (rawFormula.length < 3) continue;
    if (/^(the|same|similar|used|a |an |in )/i.test(rawFormula)) continue;
    // Must contain a chemical element or operator to be a real formula
    if (!/[A-Z][a-z]?\d|→|⟶|[+\-]=/.test(rawFormula)) continue;

    // Look back for a concept name (what process/substance does this formula belong to?)
    const before = answer.slice(Math.max(0, m.index - 120), m.index);
    const GENERIC = /^(the|a|an|this|that|its|their|same|chemical|molecular|overall|similar|key|following)$/i;
    const PRONOUN = /^(Its?|The|This|These|Those|Their|An?|He|She|We|They|You|It)$/i;
    let concept = "";
    // Look for "for X:" or "of X:" pattern
    const forMatch = before.match(/(?:for|of)\s+([A-Za-z][a-z]{2,20})\s*:?\s*$/i);
    if (forMatch && !GENERIC.test(forMatch[1])) concept = forMatch[1];
    // Look for numbered list context: "1) Carbon dioxide + Water → ..."
    if (!concept) {
      const numbered = answer.slice(Math.max(0, m.index - 50), m.index).match(/\d\)\s+([A-Za-z][a-z]{2,20})/);
      if (numbered && !GENERIC.test(numbered[1])) concept = numbered[1];
    }
    // Fall back to last proper noun before the colon
    if (!concept) {
      const caps = [...before.matchAll(/\b([A-Z][a-z]{3,20})\b/g)].map(x => x[1]);
      const candidate = [...caps].reverse().find(w => !GENERIC.test(w) && !PRONOUN.test(w));
      if (candidate) concept = candidate;
    }

    const label = concept
      ? (concept.length > 16 ? concept.slice(0, 14) + "…" : concept) + " Eq."
      : rawFormula.slice(0, 18);
    addFormulaNode(label, rawFormula, "chemical equation");
  }

  // ── Strategy 3: "formula/equation for X is Y" pattern ──
  const namedPattern =
    /(?:formula|equation|expression)\s+(?:for\s+)?([^,.:\n]{2,25}?)\s+is\s+([A-Z][A-Za-z0-9+\-→⟶=\\{}^_()\[\]·×÷]{3,60}?)(?=[,.\s\n]|$)/g;
  while ((m = namedPattern.exec(answer)) !== null) {
    const rawConcept = m[1].trim().replace(/^(the|a|an)\s+/i, "");
    const rawFormula = m[2].trim();
    if (!/^[A-Z][A-Za-z]?\d|[→⟶=+\-]/.test(rawFormula)) continue;
    if (rawFormula.length < 3) continue;
    if (/^(the|same|similar|used|based|found)\b/i.test(rawFormula)) continue;
    const label = rawConcept.length > 20 ? rawConcept.slice(0, 18) + "…" : rawConcept;
    const fullLabel = /formula|equation/i.test(label) ? label : `${label} Formula`;
    addFormulaNode(fullLabel, rawFormula, "expressed as");
  }

  // ── Strategy 4: standalone chemical formulas starting with capital letter + digit ──
  const GENERIC = /^(the|a|an|this|that|its|their|same|chemical|molecular|overall|similar|structural|plants|algae|also|in|as|at|of|to|for|is|are|was|were)$/i;
  const PRONOUN = /^(Its?|The|This|These|Those|Their|An?|He|She|We|They|You|It)$/i;
  const chemPattern = /\b([A-Z][a-z]?\d+(?:[A-Z][a-z]?\d*)+)\b/g;
  while ((m = chemPattern.exec(answer)) !== null) {
    const formula = m[1];
    if (formula.length < 4 || !/\d/.test(formula)) continue;
    if (existingFormulaStrings.has(formula)) continue;
    if (existingFormulaNorm.has(normalizeFormula(formula))) continue;

    const before = answer.slice(Math.max(0, m.index - 100), m.index);
    let rawConcept = formula;

    const namedMatch = before.match(/(?:for|of)\s+([A-Za-z][a-z]{2,20})\s+(?:is\s+)?$/i);
    if (namedMatch && !GENERIC.test(namedMatch[1])) rawConcept = namedMatch[1];
    else {
      const possMatch = before.match(/([A-Z][a-z]{3,20})(?:'s)?\s+(?:\w+\s+)?formula\s+is\s+$/i);
      if (possMatch && !GENERIC.test(possMatch[1])) rawConcept = possMatch[1];
    }
    if (rawConcept === formula) {
      const caps = [...before.matchAll(/\b([A-Z][a-z]{3,20})\b/g)].map(x => x[1]);
      const candidate = [...caps].reverse().find(w => !GENERIC.test(w) && !PRONOUN.test(w));
      if (candidate) rawConcept = candidate;
    }

    const label = rawConcept.length > 20 ? rawConcept.slice(0, 18) + "…" : rawConcept;
    addFormulaNode(label, formula, "chemical formula");
  }

  // ── Strategy 5: math equations with uppercase LHS ──
  const mathPattern = /\b([A-Z][A-Za-z0-9_]{0,3})\s*=\s*([A-Za-z0-9][A-Za-z0-9+\-*/^²³√()\s·×÷]{2,35})\b/g;
  while ((m = mathPattern.exec(answer)) !== null) {
    const lhs = m[1].trim();
    const rhs = m[2].trim();
    const fullEq = `${lhs} = ${rhs}`;
    if (existingFormulaStrings.has(fullEq)) continue;
    if (existingFormulaNorm.has(normalizeFormula(fullEq))) continue;
    if (!/[\d²³√+\-*/^]/.test(rhs)) continue;
    if (/^(The|In|As|At|An|By|Do|Go|He|If|Is|It|My|No|Of|On|Or|So|To|Up|We)$/i.test(lhs)) continue;
    const before = answer.slice(Math.max(0, m.index - 80), m.index);
    const conceptMatch = before.match(/([A-Za-z][a-z]{2,20}(?:\s+[A-Za-z][a-z]{2,15})?)\s*(?:is|gives|equals)?\s*$/i);
    const rawConcept = conceptMatch
      ? conceptMatch[1].trim().replace(/^(the|a|an|its)\s+/i, "")
      : lhs;
    if (/^(the|a|an|this|that|its|their|same|in|as|at|of|to)$/i.test(rawConcept)) continue;
    const label = rawConcept.length > 20 ? rawConcept.slice(0, 18) + "…" : rawConcept;
    const fullLabel = /formula|equation|law/i.test(label) ? label : `${label} Eq.`;
    addFormulaNode(fullLabel, fullEq, "equation");
  }

  if (injected.length === 0) return data;

  return {
    ...data,
    nodes: [...data.nodes, ...injected],
    edges: [...data.edges, ...injectedEdges],
    shouldMerge: data.shouldMerge,
  };
}

// ─── Main callAI ──────────────────────────────────────────────────────────────
async function callAI(
  question: string, subject: string, grade: string,
  chatHistory: ChatMessage[], currentTopic: string | null, existingNodes: Node[],
): Promise<AIResponse> {
  const recentHistory = chatHistory.slice(-6).map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`).join("\n");
  const existingNodesSummary = existingNodes.length > 0
    ? existingNodes.map(n => `id="${n.id}" label="${n.label}" type="${n.type}"`).join(", ")
    : "NONE";

  const systemPrompt = `You are a STEM tutor for grade ${grade} students studying ${subject}.

CONVERSATION CONTEXT:
${recentHistory || "Start of conversation."}

CURRENT TOPIC: ${currentTopic || "None yet"}

NODES ALREADY ON THE GRAPH (do NOT re-create these, but DO reference their ids in edges):
${existingNodesSummary}

════════════════════════════════════════
NON-NEGOTIABLE RULES — VIOLATING ANY = BAD RESPONSE
════════════════════════════════════════

RULE 1 — MINIMUM 3 NODES ALWAYS, NO EXCEPTIONS.
  Even a one-sentence formula answer needs 3 nodes: the formula node + 2 context nodes.

RULE 2 — FORMULA / EQUATION / CHEMICAL MENTIONED = MANDATORY NODE.
  If your answer text contains ANY formula, equation, or chemical symbol, you MUST
  create a node of type "formula" for it. ALWAYS. No exceptions, no excuses.
  Label = short concept name (max 3 words). Put the actual formula string in the
  "formula" field. Also add it to the formulas[] array.

RULE 3 — shouldMerge — READ THIS CAREFULLY, YOU OFTEN GET IT WRONG:
  DEFAULT = true. Only false if new topic shares ZERO concepts with current topic.
  • shouldMerge = TRUE for: follow-ups, "what about X", "give me the formula",
    "and…", deeper dives, clarification, anything formula-related when topic is set.
  • shouldMerge = FALSE ONLY for completely unrelated new topics.
  WHEN IN DOUBT → shouldMerge = true. Destroying the graph is catastrophic.

RULE 4 — When shouldMerge=true, you MUST include the existing core node in your
  nodes[] array — copy its exact id and label from NODES ALREADY ON THE GRAPH.

RULE 5 — NO ORPHAN NODES: every non-core node must have at least one edge.

RULE 6 — formulas[] array: include EVERY equation or chemical formula you mention,
  even if already in the nodes list. This is a safety net.

RULE 7 — answer field: plain English only. No JSON, no LaTeX, single line.

════════════════════════════════════════
EXAMPLE — formula follow-up on an active topic
════════════════════════════════════════
Student previously asked about Photosynthesis. Now asks "what is the formula for chlorophyll?"
CORRECT response:
{
  "answer": "Chlorophyll absorbs sunlight to power photosynthesis. Its chemical formula is C55H72MgN4O5.",
  "topic": "Photosynthesis",
  "shouldMerge": true,
  "nodes": [
    {"id":"<existing_core_id>","label":"Photosynthesis","type":"core"},
    {"id":"chl_f1","label":"Chlorophyll Formula","type":"formula","formula":"C_{55}H_{72}MgN_4O_5"},
    {"id":"chl_r1","label":"Light Absorption","type":"related"},
    {"id":"chl_d1","label":"Mg Centre","type":"derivation"}
  ],
  "edges":[
    {"from":"<existing_core_id>","to":"chl_f1","label":"pigment formula"},
    {"from":"chl_f1","to":"chl_r1","label":"enables"},
    {"from":"chl_f1","to":"chl_d1","label":"contains"}
  ],
  "keywords":["chlorophyll","C55H72MgN4O5","light absorption","magnesium"],
  "followUp":["What are chlorophyll a and b?","How does Mg help absorption?"],
  "formulas":[{"concept":"Chlorophyll","latex":"C_{55}H_{72}MgN_4O_5"}]
}

════════════════════════════════════════
ANOTHER EXAMPLE — general formula question
════════════════════════════════════════
{
  "answer": "The gravitational force between two objects equals G times both masses divided by the square of the distance.",
  "topic": "Gravity",
  "shouldMerge": true,
  "nodes": [
    {"id":"1","label":"Gravity","type":"core"},
    {"id":"5","label":"Grav. Force Eq.","type":"formula","formula":"F = G \\\\cdot \\\\frac{m_1 \\\\cdot m_2}{r^2}"},
    {"id":"6","label":"G Constant","type":"related"},
    {"id":"7","label":"Inverse Sq. Law","type":"derivation"}
  ],
  "edges":[
    {"from":"1","to":"5","label":"described by"},
    {"from":"5","to":"6","label":"uses"},
    {"from":"5","to":"7","label":"implies"}
  ],
  "keywords":["gravity","gravitational force","inverse square law"],
  "followUp":["What is the value of G?","How does distance affect gravity?"],
  "formulas":[{"concept":"Gravitational Force","latex":"F = G \\\\cdot \\\\frac{m_1 \\\\cdot m_2}{r^2}"}]
}

Respond ONLY with valid JSON. No markdown fences. No extra text outside the JSON.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL Learning Platform",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
      temperature: 0.5, max_tokens: 1500,
    }),
  });

  if (!response.ok) { const err = await response.json(); throw new Error(`OpenRouter API error: ${err.error?.message || "Unknown"}`); }
  const data  = await response.json();
  const raw   = data.choices?.[0]?.message?.content || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  const san   = clean.replace(/("(?:[^"\\]|\\.)*")/gs, (m: string) => m.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
  const reQ   = san.replace(/("(?:answer|topic)")\s*:\s*([^"{[\d\n][^,}\n]*?)(\s*[,}\n])/g, (_: string, key: string, val: string, end: string) => `${key}: "${val.trim()}"${end}`);

  try { const p = JSON.parse(reQ) as AIResponse; p.answer = cleanAnswer(p.answer ?? ""); return p; } catch { /* fall through */ }
  try {
    const grab = (key: string) => { const m = clean.match(new RegExp(`"${key}"\\s*:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|([^,}\\n]+))`, "s")); return m ? (m[1] ?? m[2] ?? "").trim() : ""; };
    const grabBool = (key: string, fb: boolean) => { const m = clean.match(new RegExp(`"${key}"\\s*:\\s*(true|false)`)); return m ? m[1] === "true" : fb; };
    const grabArr = <T,>(key: string): T[] => { const m = clean.match(new RegExp(`"${key}"\\s*:\\s*(\\[.*?\\])`, "s")); if (!m) return []; try { return JSON.parse(m[1]) as T[]; } catch { return []; } };
    return { answer: cleanAnswer(grab("answer") || "Here is what I found."), topic: grab("topic") || question, shouldMerge: grabBool("shouldMerge", false), nodes: grabArr<Node>("nodes"), edges: grabArr<Edge>("edges"), keywords: grabArr<string>("keywords"), followUp: grabArr<string>("followUp"), formulas: grabArr("formulas") } as AIResponse;
  } catch {
    return { answer: "I had trouble formatting my response. Please try again.", topic: question, shouldMerge: false, nodes: [], edges: [], keywords: [], followUp: [], formulas: [] } as AIResponse;
  }
}

// ─── Formula Library ──────────────────────────────────────────────────────────
function FormulaLibrary({ formulas, onRemove, onClose }: { formulas: SavedFormula[]; onRemove: (id: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = formulas.filter(f => [f.concept, f.topic, f.subject].some(s => s.toLowerCase().includes(search.toLowerCase())));
  const grouped  = filtered.reduce<Record<string, SavedFormula[]>>((acc, f) => { (acc[f.subject] ??= []).push(f); return acc; }, {});
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 580, maxHeight: "82vh", background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: `0 32px 80px rgba(0,0,0,0.7),0 0 0 1px ${C.purple}22` }}>
        <div style={{ padding: "22px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.purpleDim, border: `1px solid ${C.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: C.purple, fontFamily: "Georgia,serif" }}>∑</div>
              <div>
                <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>Formula Library</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{formulas.length} formula{formulas.length !== 1 ? "s" : ""} saved</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: "2px 6px" }}>×</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: "7px 12px" }}>
            <span style={{ color: C.muted, fontSize: 13 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by concept, topic or subject…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 12 }}/>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          {formulas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📐</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>No formulas saved yet</div>
              <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>Click <span style={{ color: C.pink }}>♡</span> on any formula node in the graph to save it here.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: 13 }}>No results for "{search}"</div>
          ) : (
            Object.entries(grouped).map(([subj, items]) => (
              <div key={subj} style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: C.muted, textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>{subj}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map(f => (
                    <div key={f.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{f.concept}</div>
                        <div style={{ background: C.card, borderRadius: 9, border: `1px solid ${C.purple}2a`, padding: "10px 16px", color: C.purple, lineHeight: 1.6 }}><LaTeX formula={f.latex} size={14}/></div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: C.teal, background: C.tealDim, padding: "2px 8px", borderRadius: 99 }}>{f.topic}</span>
                          <span style={{ fontSize: 10, color: C.muted }}>{new Date(f.savedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => navigator.clipboard.writeText(f.latex)}
                          style={{ fontSize: 9, padding: "5px 9px", borderRadius: 6, cursor: "pointer", background: C.purpleDim, color: C.purple, border: `1px solid ${C.purple}33`, fontFamily: "monospace" }}>copy LaTeX</button>
                        <button onClick={() => onRemove(f.id)}
                          style={{ fontSize: 10, padding: "5px 9px", borderRadius: 6, cursor: "pointer", background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}>remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MissedNode — extracted component so hooks are legal ─────────────────────
interface MissedNodeProps {
  n: Node;
  pos: Position;
  isActive: boolean;
  color: string;
  edges: Edge[];
  nodes: Node[];
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onNodeClick: (n: Node) => void;
}
function MissedNode({ n, pos, isActive, color, edges, nodes, onMouseDown, onNodeClick }: MissedNodeProps) {
  const [showTip, setShowTip] = useState(false);

  const pw = Math.max(n.label.length * 6.4 + 20, 66);
  const ph = 22;

  const parentEdge = edges.find(e => e.to === n.id && e.label === "missed");
  const parentNode = parentEdge ? nodes.find(nd => nd.id === parentEdge.from) : null;
  const tooltipText = parentNode ? `missed from "${parentNode.label}"` : "missed concept";
  const tooltipWidth = tooltipText.length * 5.2 + 16;

  return (
    <g
      transform={`translate(${pos.x},${pos.y})`}
      style={{ cursor: "grab" }}
      onMouseDown={e => onMouseDown(e, n.id)}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onClick={() => onNodeClick(n)}
    >
      {isActive && (
        <rect
          x={-pw/2 - 5} y={-ph/2 - 5}
          width={pw + 10} height={ph + 10}
          rx={ph/2 + 5} fill={color} opacity="0.09"
        />
      )}
      <rect
        x={-pw/2} y={-ph/2} width={pw} height={ph} rx={ph/2}
        fill={`${color}15`}
        stroke={color} strokeWidth="1.4"
        strokeDasharray="4 2.5"
        filter={isActive ? "url(#missedGlow)" : undefined}
      />
      <text
        x={0} y={1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="7.5" fontWeight="700" fill={color}
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {n.label}
      </text>
      <circle cx={pw/2 - 5} cy={-ph/2 + 4} r="3" fill={color}>
        <animate attributeName="opacity" values="1;0.15;1" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="r"       values="2.5;4;2.5"  dur="2.4s" repeatCount="indefinite"/>
      </circle>
      {showTip && (
        <g>
          <rect
            x={-tooltipWidth/2} y={-ph/2 - 22}
            width={tooltipWidth} height={16} rx={4}
            fill={C.surface} stroke={color}
            strokeWidth="0.7" strokeOpacity="0.7"
          />
          <text
            x={0} y={-ph/2 - 10}
            textAnchor="middle" fontSize="7"
            fill={color}
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            {tooltipText}
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Knowledge Graph ──────────────────────────────────────────────────────────
interface KGProps { nodes: Node[]; edges: Edge[]; onNodeClick: (n: Node) => void; activeNode: string | null; savedIds: Set<string>; onSave: (n: Node) => void; }
function KnowledgeGraph({ nodes, edges, onNodeClick, activeNode, savedIds, onSave }: KGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [dragging, setDragging]   = useState<string | null>(null);
  const [offset, setOffset]       = useState<Position>({ x: 0, y: 0 });
  const positionsSet = useRef(false);
  const nodeKey = nodes.map(n => n.id).join(",");
  useEffect(() => { positionsSet.current = false; }, [nodeKey]);

  useEffect(() => {
    if (!nodes.length || positionsSet.current) return;
    const W = 700, H = 440, cx = W / 2, cy = H / 2;
    const pos: Record<string, Position> = {};
    const cores    = nodes.filter(n => n.type === "core");
    const missed   = nodes.filter(n => n.type === "missed");
    const nonCores = nodes.filter(n => n.type !== "core" && n.type !== "missed");

    cores.forEach((n, i) => {
      pos[n.id] = cores.length === 1
        ? { x: cx, y: cy }
        : { x: cx + Math.cos((i / cores.length) * Math.PI * 2) * 55, y: cy + Math.sin((i / cores.length) * Math.PI * 2) * 55 };
    });
    nonCores.forEach((n, i) => {
      const angle = (i / nonCores.length) * Math.PI * 2;
      const r = n.type === "related" ? 130 : n.type === "formula" ? 148 : n.type === "sub" ? 185 : 90;
      pos[n.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    });
    missed.forEach((n, i) => {
      const angle = (i / Math.max(missed.length, 1)) * Math.PI * 2 - Math.PI / 4;
      pos[n.id] = { x: cx + Math.cos(angle) * 170, y: cy + Math.sin(angle) * 170 };
    });

    setPositions(prev => {
      const next = { ...prev };
      for (const [id, p] of Object.entries(pos)) { if (!next[id]) next[id] = p; }
      return next;
    });
    positionsSet.current = true;
  }, [nodeKey, nodes]);

  const nodeColor = (t: Node["type"]) =>
    t === "core"       ? C.teal   :
    t === "related"    ? C.purple :
    t === "formula"    ? C.blue   :
    t === "derivation" ? C.orange :
    t === "sub"        ? "#f59e0b" :
    t === "missed"     ? C.missed :
    C.pink;

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    setDragging(id); setOffset({ x: svgP.x - (positions[id]?.x ?? 0), y: svgP.y - (positions[id]?.y ?? 0) });
    e.preventDefault();
  };
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    setPositions(prev => ({ ...prev, [dragging]: { x: svgP.x - offset.x, y: svgP.y - offset.y } }));
  }, [dragging, offset]);
  const handleMouseUp = () => setDragging(null);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [handleMouseMove]);

  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  if (!nodes.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 440, gap: 12 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke={C.border} strokeWidth="2"/>
        <circle cx="24" cy="16" r="4" stroke={C.muted} strokeWidth="1.5"/>
        <circle cx="14" cy="30" r="4" stroke={C.muted} strokeWidth="1.5"/>
        <circle cx="34" cy="30" r="4" stroke={C.muted} strokeWidth="1.5"/>
        <line x1="24" y1="20" x2="14" y2="26" stroke={C.muted} strokeWidth="1"/>
        <line x1="24" y1="20" x2="34" y2="26" stroke={C.muted} strokeWidth="1"/>
      </svg>
      <p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Ask a question to generate<br/>your knowledge graph</p>
    </div>
  );

  return (
    <svg ref={svgRef} width="100%" viewBox="0 0 700 440" style={{ cursor: dragging ? "grabbing" : "default", userSelect: "none" }}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="missedGlow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={C.muted} opacity="0.4"/></marker>
        <marker id="arrowMissed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={C.missed} opacity="0.5"/></marker>
      </defs>

      {edges.map((e, i) => {
        const from = positions[e.from], to = positions[e.to]; if (!from || !to) return null;
        const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
        const dx = to.x - from.x, dy = to.y - from.y, len = Math.sqrt(dx*dx+dy*dy)||1;
        const perpX = (-dy/len)*12, perpY = (dx/len)*12;
        const isHovered  = hoveredEdge === i;
        const isMissedEdge = e.label === "missed";
        return (
          <g key={i} onMouseEnter={() => setHoveredEdge(i)} onMouseLeave={() => setHoveredEdge(null)}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="14"/>
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={isMissedEdge ? C.missed : isHovered ? C.teal : C.muted}
              strokeWidth={isMissedEdge ? 1.2 : isHovered ? 1.5 : 1}
              strokeOpacity={isMissedEdge ? 0.5 : isHovered ? 0.7 : 0.35}
              strokeDasharray={isMissedEdge ? "3 3" : "4 3"}
              markerEnd={isMissedEdge ? "url(#arrowMissed)" : "url(#arrow)"}
              style={{ transition: "all 0.15s" }}/>
            {e.label && isHovered && (
              <g>
                <rect
                  x={mx+perpX-(e.label.length*2.9)} y={my+perpY-8}
                  width={e.label.length*5.8} height={13} rx={4}
                  fill={C.surface}
                  stroke={isMissedEdge ? C.missed : C.teal}
                  strokeWidth="0.5" strokeOpacity="0.6"
                />
                <text
                  x={mx+perpX} y={my+perpY+2}
                  fontSize="7"
                  fill={isMissedEdge ? C.missed : C.teal}
                  textAnchor="middle"
                  style={{ pointerEvents:"none", userSelect:"none" }}
                >
                  {e.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {nodes.map(n => {
        const pos = positions[n.id]; if (!pos) return null;
        const isActive  = activeNode === n.id;
        const color     = nodeColor(n.type);

        if (n.type === "missed") {
          return (
            <MissedNode
              key={n.id}
              n={n}
              pos={pos}
              isActive={isActive}
              color={color}
              edges={edges}
              nodes={nodes}
              onMouseDown={handleMouseDown}
              onNodeClick={onNodeClick}
            />
          );
        }

        const r = n.type === "core" ? 34 : n.type === "formula" ? 38 : 24;
        const isSaved = n.formula ? savedIds.has(n.id) : false;
        return (
          <g key={n.id} transform={`translate(${pos.x},${pos.y})`} style={{ cursor:"grab" }} onMouseDown={e => handleMouseDown(e,n.id)} onClick={() => onNodeClick(n)}>
            {isActive && <circle r={r+10} fill={color} opacity="0.08"/>}
            <circle r={r} fill={`${color}18`} stroke={color} strokeWidth={n.type==="core"?2:1.5} filter={isActive?"url(#glow)":undefined}/>
            <foreignObject x={-r} y={-r} width={r*2} height={r*2}>
              <div style={{ width:r*2,height:r*2,display:"flex",alignItems:"center",justifyContent:"center",padding:3,overflow:"hidden" }}>
                {n.formula
                  ? <span style={{ color,textAlign:"center",lineHeight:1.1 }}><LaTeX formula={n.formula} size={11}/></span>
                  : <span style={{ color,fontSize:n.type==="core"?9:8,fontWeight:700,textAlign:"center",lineHeight:1.2,wordBreak:"break-word" }}>{n.label||n.type}</span>
                }
              </div>
            </foreignObject>
            {n.formula && (
              <g transform={`translate(${r-9},${-r+7})`} onClick={e => { e.stopPropagation(); onSave(n); }} style={{ cursor:"pointer" }}>
                <circle r="9" fill={C.card} stroke={isSaved?C.pink:C.border} strokeWidth="1.2"/>
                <text textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={isSaved?C.pink:C.muted} style={{ userSelect:"none" }}>{isSaved?"♥":"♡"}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Gap Detail (AI-powered) ──────────────────────────────────────────────────
interface GapDetail {
  description: string;
  keyPoints: string[];
  relatedConcepts: string[];
  whyItMatters: string;
}

async function fetchGapDetail(concept: string, topic: string, subject: string): Promise<GapDetail> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL Learning Platform",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `You are a STEM tutor. Return ONLY valid JSON — no markdown fences, no preamble, no extra text. Schema: {"description":"2-3 sentence plain English explanation","keyPoints":["3-4 key bullet points"],"relatedConcepts":["2-3 related concepts in the topic"],"whyItMatters":"1 sentence why essential"}`,
        },
        {
          role: "user",
          content: `Concept: "${concept}"\nParent topic: "${topic}"\nSubject: "${subject}"`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error("fetchGapDetail failed");
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()) as GapDetail; }
  catch { return { description: "Could not load description.", keyPoints: [], relatedConcepts: [], whyItMatters: "" }; }
}

function LearningGapsPanel({
  gaps, onDismiss, onClearAll,
}: {
  gaps: LearningGap[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}) {
  const active = gaps.filter(g => !g.dismissed);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails]   = useState<Record<string, GapDetail | "loading">>({});

  const handleExpand = async (g: LearningGap) => {
    const isOpen = expanded === g.id;
    setExpanded(isOpen ? null : g.id);
    if (!isOpen && !details[g.id]) {
      setDetails(prev => ({ ...prev, [g.id]: "loading" }));
      const d = await fetchGapDetail(g.concept, g.topic, g.subject);
      setDetails(prev => ({ ...prev, [g.id]: d }));
    }
  };

  const textFix: React.CSSProperties = {
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    whiteSpace: "normal",
  };

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.missed}18`, border: `1px solid ${C.missed}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>📌</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Learning Gaps</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
              {active.length > 0 ? `${active.length} concept${active.length !== 1 ? "s" : ""} to revisit` : "All caught up!"}
            </div>
          </div>
        </div>
        {active.length > 0 && (
          <button onClick={onClearAll}
            style={{ fontSize: 9, padding: "3px 9px", borderRadius: 99, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontWeight: 600 }}>
            clear all
          </button>
        )}
      </div>

      <div style={{ maxHeight: 540, overflowY: "auto", padding: active.length === 0 ? "24px 14px" : "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        {active.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>No gaps yet</div>
            <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>
              Use <span style={{ color: C.teal, fontWeight: 700 }}>Teach It Back</span> to discover<br/>concepts you missed.
            </div>
          </div>
        ) : (
          active.map(g => {
            const isOpen = expanded === g.id;
            const detail = details[g.id];
            return (
              <div key={g.id}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${isOpen ? C.missed + "66" : C.border}`,
                  background: isOpen ? `${C.missed}0a` : C.surface,
                  overflow: "hidden",
                  transition: "border-color 0.2s, background 0.2s",
                }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", cursor: "pointer" }}
                  onClick={() => handleExpand(g)}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: C.missed, boxShadow: `0 0 6px ${C.missed}88` }}/>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: C.missed, lineHeight: 1.3, ...textFix }}>{g.concept}</span>
                  <span style={{ fontSize: 8, color: C.teal, background: C.tealDim, padding: "1px 6px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {g.topic.length > 14 ? g.topic.slice(0, 14) + "…" : g.topic}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke={isOpen ? C.missed : C.muted} strokeWidth="2.5" strokeLinecap="round"
                    style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>

                {isOpen && (
                  <div style={{ padding: "0 12px 12px 12px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto" }}>
                    {detail === "loading" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 0" }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.missed, animation: `pulse 1.2s ${i*0.2}s infinite` }}/>
                        ))}
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>Loading concept details…</span>
                      </div>
                    ) : detail ? (
                      <>
                        <div style={{ background: `${C.missed}0d`, border: `1px solid ${C.missed}22`, borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.missed, marginBottom: 5, textTransform: "uppercase" }}>📖 What is it?</div>
                          <p style={{ fontSize: 11, color: C.text, lineHeight: 1.65, margin: 0, ...textFix }}>{detail.description}</p>
                        </div>
                        {detail.whyItMatters && (
                          <div style={{ background: `${C.teal}08`, border: `1px solid ${C.teal}1a`, borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
                            <p style={{ fontSize: 11, color: C.teal, lineHeight: 1.6, margin: 0, fontStyle: "italic", ...textFix }}>{detail.whyItMatters}</p>
                          </div>
                        )}
                        {detail.keyPoints.length > 0 && (
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.muted, marginBottom: 6, textTransform: "uppercase" }}>Key Points</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              {detail.keyPoints.map((pt, i) => (
                                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.purple, flexShrink: 0, marginTop: 5 }}/>
                                  <span style={{ fontSize: 11, color: C.text, lineHeight: 1.55, ...textFix }}>{pt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {detail.relatedConcepts.length > 0 && (
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: C.muted, marginBottom: 6, textTransform: "uppercase" }}>Related in {g.topic}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {detail.relatedConcepts.map((rc, i) => (
                                <span key={i} style={{ fontSize: 10, color: C.purple, background: C.purpleDim, border: `1px solid ${C.purple}33`, padding: "3px 9px", borderRadius: 99, ...textFix }}>{rc}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ background: `${C.orange}08`, border: `1px solid ${C.orange}18`, borderRadius: 7, padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: C.orange, marginBottom: 3, textTransform: "uppercase" }}>Why it was flagged</div>
                          <p style={{ fontSize: 10, color: C.muted, lineHeight: 1.5, margin: 0, ...textFix }}>{g.reason}</p>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 2, borderTop: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 9, color: C.muted }}>{g.subject} · {new Date(g.addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                          <button
                            onClick={e => { e.stopPropagation(); onDismiss(g.id); }}
                            style={{ marginLeft: "auto", fontSize: 9, padding: "3px 9px", borderRadius: 99, background: `${C.green}10`, border: `1px solid ${C.green}33`, color: C.green, cursor: "pointer", fontWeight: 700 }}
                          >
                            got it ✓
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {active.length > 0 && (
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.missed, flexShrink: 0 }}/>
          Click any gap to learn what it is · Pink dashed nodes on your graph
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, onHome, formulaCount, onOpenLibrary, onOpenGaps, gapCount, onOpenSims, keywords, topic, subject }: { activeTab: string; setActiveTab: (t: string) => void; onHome: () => void; formulaCount: number; onOpenLibrary: () => void; onOpenGaps: () => void; gapCount: number; onOpenSims: () => void; keywords: string[]; topic: string; subject: string; }) {
  const items = [
    { id: "dashboard",   label: "Dashboard",      icon: DashIcon },
    { id: "knowledge",   label: "Knowledge Graph", icon: GraphIcon },
  ];
  return (
    <aside style={{ width: 220, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "24px 0" }}>
      <div style={{ padding: "0 20px 28px", borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ color: C.teal, fontWeight: 900, fontSize: 18, letterSpacing: "-0.5px" }}>Effectua<span style={{ color: C.text }}>L</span></span>
          <div style={{ color: C.muted, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 2 }}>Learner Portal</div>
        </button>
      </div>
      <div style={{ padding: "12px 12px 4px" }}><SideItem label="Home" icon={HomeIcon} active={false} onClick={onHome}/></div>
      <div style={{ padding: "4px 12px", flex: 1 }}>
        {items.map(item => (<SideItem key={item.id} label={item.label} icon={item.icon} badge={item.badge} active={activeTab === item.id} onClick={() => setActiveTab(item.id)}/>))}
        <button onClick={onOpenSims} style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:C.muted,fontSize:13,fontWeight:400,transition:"all 0.15s",textAlign:"left",borderLeft:"2px solid transparent",marginTop:2 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=C.muted; }}>
          <SimIcon size={15}/>
          <span style={{ flex: 1 }}>Simulations</span>
          <span style={{ fontSize:8,fontWeight:800,letterSpacing:"0.1em",background:C.tealDim,color:C.teal,padding:"2px 6px",borderRadius:99,border:`1px solid ${C.teal}44` }}>NEW</span>
        </button>
        <button onClick={onOpenLibrary} style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:C.muted,fontSize:13,fontWeight:400,transition:"all 0.15s",textAlign:"left",borderLeft:"2px solid transparent",marginTop:2 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=C.muted; }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 7H6l6 5-6 5h12"/></svg>
          <span style={{ flex: 1 }}>Formula Library</span>
          {formulaCount > 0 && (<span style={{ fontSize:9,fontWeight:800,background:C.purpleDim,color:C.purple,padding:"2px 6px",borderRadius:99,border:`1px solid ${C.purple}44` }}>{formulaCount}</span>)}
        </button>
        <button onClick={onOpenGaps} style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:C.muted,fontSize:13,fontWeight:400,transition:"all 0.15s",textAlign:"left",borderLeft:"2px solid transparent",marginTop:2 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=C.muted; }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={gapCount > 0 ? C.missed : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ flex: 1, color: gapCount > 0 ? C.text : C.muted }}>Learning Gaps</span>
          {gapCount > 0 && (
            <span style={{ fontSize:9,fontWeight:800,background:`${C.missed}18`,color:C.missed,padding:"2px 6px",borderRadius:99,border:`1px solid ${C.missed}44`,animation:"pulse 2s infinite" }}>{gapCount}</span>
          )}
        </button>
      </div>
      {keywords.length > 0 && (() => {
        const allSims: SimEntry[] = [];
        for (const [category, files] of Object.entries(SIM_DATA as Record<string, string[]>)) {
          for (const filename of files) {
            const score = scoreSim(filename, category, keywords, topic, subject);
            if (score > 0) allSims.push({ filename, category, label: toSimLabel(filename), score, color: CAT_COLORS[category] ?? C.text });
          }
        }
        allSims.sort((a, b) => b.score - a.score);
        const top = allSims.slice(0, 4);
        if (top.length === 0) return null;
        return (
          <div style={{ padding: "0 12px 12px", borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: C.muted, textTransform: "uppercase", marginBottom: 8, padding: "0 4px" }}>Related Sims</div>
            {top.map(sim => (
              <a key={sim.filename} href={`https://effectuall.github.io/Simulations/${sim.filename}`} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:7,marginBottom:4,textDecoration:"none",background:"transparent",border:`1px solid ${C.border}`,transition:"all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=`${sim.color}0d`; (e.currentTarget as HTMLElement).style.borderColor=`${sim.color}55`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.borderColor=C.border; }}>
                <div style={{ width:6,height:6,borderRadius:"50%",flexShrink:0,background:sim.color,boxShadow:`0 0 6px ${sim.color}` }}/>
                <span style={{ fontSize:11,color:C.text,flex:1,lineHeight:1.2 }}>{sim.label}</span>
                <ChevronIcon size={9} color={sim.color}/>
              </a>
            ))}
            <button onClick={onOpenSims} style={{ width:"100%",fontSize:9,padding:"5px 0",borderRadius:6,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",marginTop:2 }}>
              view all →
            </button>
          </div>
        );
      })()}
      <div style={{ padding: "0 12px", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <SideItem label="Settings" icon={SettingsIcon} active={false} onClick={() => {}}/>
        <SideItem label="Logout"   icon={LogoutIcon}   active={false} onClick={() => {}}/>
      </div>
    </aside>
  );
}
function SideItem({ label, icon: Icon, active, onClick, badge }: { label: string; icon: React.FC<IconProps>; active: boolean; onClick: () => void; badge?: string; }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"none",cursor:"pointer",background:active?C.tealDim:hov?"rgba(255,255,255,0.04)":"transparent",color:active?C.teal:hov?C.text:C.muted,fontSize:13,fontWeight:active?600:400,transition:"all 0.15s",textAlign:"left",borderLeft:active?`2px solid ${C.teal}`:"2px solid transparent" }}>
      <Icon size={15}/>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (<span style={{ fontSize:8,fontWeight:800,letterSpacing:"0.1em",background:C.tealDim,color:C.teal,padding:"2px 6px",borderRadius:99,border:`1px solid ${C.teal}44` }}>{badge}</span>)}
    </button>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ onResult, grade, setGrade, subject, setSubject, currentTopic, currentNodes }: { onResult: (d: AIResponse) => void; grade: string; setGrade: (g: string) => void; subject: string; setSubject: (s: string) => void; currentTopic: string | null; currentNodes: Node[]; }) {
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, loading]);
  const submit = async () => {
    if (!input.trim() || loading) return;
    const q = input; setInput(""); setLoading(true);
    const userMsg: ChatMessage = { role: "user", text: q, timestamp: Date.now() };
    const updatedHistory = [...history, userMsg]; setHistory(updatedHistory);
    try {
      const data = await callAI(q, subject, grade, updatedHistory, currentTopic, currentNodes);
      setHistory(h => [...h, { role: "bot", text: data.answer, timestamp: Date.now() }]); onResult(data);
    } catch (error) {
      setHistory(h => [...h, { role: "bot", text: `Sorry, something went wrong: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`, timestamp: Date.now() }]);
    }
    setLoading(false);
  };
  const suggestions = ["Why does current flow?", "What is photosynthesis?", "Explain gravity"];
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:C.card,borderRadius:16,border:`1px solid ${C.border}` }}>
      <div style={{ padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:C.teal,boxShadow:`0 0 8px ${C.teal}` }}/>
        <span style={{ color:C.text,fontSize:14,fontWeight:600 }}>AI Tutor</span>
        {currentTopic && (<span style={{ fontSize:9,color:C.teal,background:C.tealDim,padding:"3px 8px",borderRadius:99,marginLeft:4 }}>📚 {currentTopic}</span>)}
        <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
          <SelectInput value={subject} onChange={setSubject} options={["Physics","Chemistry","Mathematics","Biology"]}/>
          <SelectInput value={grade} onChange={setGrade} options={[["8","Gr 8-10"],["10","Gr 11-12"]]} isMap/>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10 }}>
        {history.length === 0 && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8 }}>
            <SparkIcon size={32} color={C.teal} opacity={0.5}/>
            <p style={{ color:C.muted,fontSize:13,textAlign:"center",maxWidth:260,lineHeight:1.6 }}>Ask any STEM question.<br/>I'll explain it and build your knowledge graph.</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:8 }}>
              {suggestions.map(q => (<button key={q} onClick={() => setInput(q)} style={{ fontSize:11,padding:"5px 12px",borderRadius:99,background:C.tealDim,color:C.teal,border:`1px solid ${C.teal}33`,cursor:"pointer" }}>{q}</button>))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"85%",padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.6,background:m.role==="user"?`${C.teal}22`:C.surface,color:m.role==="user"?C.teal:C.text,border:`1px solid ${m.role==="user"?C.teal+"33":C.border}` }}>{cleanAnswer(m.text)}</div>
          </div>
        ))}
        {loading && (<div style={{ display:"flex",gap:5,padding:"10px 14px" }}>{[0,1,2].map(i => (<div key={i} style={{ width:6,height:6,borderRadius:"50%",background:C.teal,animation:`pulse 1.2s ${i*0.2}s infinite` }}/>))}</div>)}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:16,borderTop:`1px solid ${C.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,padding:"8px 12px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&submit()} placeholder="Ask a STEM question…"
            style={{ flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:13 }}/>
          <button onClick={submit} disabled={loading||!input.trim()} style={{ width:30,height:30,borderRadius:8,border:"none",cursor:"pointer",background:input.trim()?C.teal:C.border,color:input.trim()?"#05060f":C.muted,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0 }}><SendIcon size={14}/></button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Add these 3 things right above your SimulationsPanel function.
//         Delete the old SimulationsPanel entirely, paste this whole block.
// ─────────────────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Mechanics:      "#00f5d4",
  Electricity:    "#f59e0b",
  Magnetism:      "#7c6cff",
  Optics:         "#3b82f6",
  Thermodynamics: "#ec4899",
  Quantum:        "#10b981",
};

function toSimLabel(filename: string): string {
  return filename.replace(/^[^_]+_/, "").replace(/_/g, " ");
}

function scoreSim(filename: string, category: string, keywords: string[], topic: string, subject: string): number {
  const haystack = [filename, toSimLabel(filename), category].join(" ").toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (kw.length >= 3 && haystack.includes(kw.toLowerCase())) score += 3;
  }
  for (const word of topic.toLowerCase().split(/[\s_›,]+/)) {
    if (word.length >= 4 && haystack.includes(word)) score += 2;
  }
  return score;
}

interface SimEntry { filename: string; category: string; label: string; score: number; color: string; }

function SimRow({ sim }: { sim: SimEntry }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href={`https://effectuall.github.io/Simulations/${sim.filename}`}
      target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 13px", borderRadius: 10,
        background: hov ? `${sim.color}0d` : C.card,
        border: `1px solid ${hov ? sim.color + "55" : C.border}`,
        textDecoration: "none", transition: "all 0.15s",
        opacity: sim.score === 0 ? 0.4 : 1,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: sim.color, boxShadow: sim.score > 0 ? `0 0 8px ${sim.color}` : "none" }} />
      <span style={{ color: C.text, fontSize: 12, flex: 1 }}>{sim.label}</span>
      <span style={{ fontSize: 8, fontWeight: 700, color: sim.color, background: `${sim.color}18`, border: `1px solid ${sim.color}33`, padding: "2px 7px", borderRadius: 99 }}>{sim.category}</span>
      {sim.score > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: C.teal, background: C.tealDim, padding: "2px 6px", borderRadius: 99 }}>{sim.score}pt</span>}
      <ChevronIcon size={10} color={hov ? sim.color : C.muted} />
    </a>
  );
}

// STEP 3: This replaces your old SimulationsPanel completely.
// Also update the call in EffectualDashboard to:
//   <SimulationsPanel keywords={keywords} topic={currentTopic ?? ""} subject={subject} />
function SimulationsPanel({ keywords, topic = "", subject = "Physics" }: { keywords: string[]; topic?: string; subject?: string; }) {
  const [showAll, setShowAll] = useState(false);

  const allSims: SimEntry[] = [];
  for (const [category, files] of Object.entries(SIM_DATA as Record<string, string[]>)) {
    for (const filename of files) {
      allSims.push({ filename, category, label: toSimLabel(filename), score: scoreSim(filename, category, keywords, topic, subject), color: CAT_COLORS[category] ?? C.text });
    }
  }
  allSims.sort((a, b) => b.score !== a.score ? b.score - a.score : a.label.localeCompare(b.label));

  const matchCount = allSims.filter(s => s.score > 0).length;
  const collapseLimit = Math.max(matchCount + 2, 3);
  const visible = showAll ? allSims : allSims.slice(0, collapseLimit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: C.muted, textTransform: "uppercase" }}>Related Simulations</div>
        {matchCount > 0 && <span style={{ fontSize: 9, fontWeight: 800, color: C.teal, background: C.tealDim, border: `1px solid ${C.teal}33`, padding: "2px 9px", borderRadius: 99 }}>{matchCount} match{matchCount !== 1 ? "es" : ""}</span>}
      </div>

      {keywords.length === 0 && (
        <div style={{ padding: "16px 14px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, textAlign: "center", color: C.muted, fontSize: 12, lineHeight: 1.7 }}>
          Ask a STEM question to see<br />relevant interactive simulations
        </div>
      )}

      {keywords.length > 0 && visible.map(sim => <SimRow key={sim.filename} sim={sim} />)}

      {keywords.length > 0 && allSims.length > collapseLimit && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{ fontSize: 10, padding: "7px 0", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontWeight: 600 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${C.teal}55`; (e.currentTarget as HTMLElement).style.color = C.teal; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >
          {showAll ? "Show less ↑" : `Browse all ${allSims.length} simulations ↓`}
        </button>
      )}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ graphs, formulaCount }: { graphs: Graph[]; formulaCount: number }) {
  const totalNodes = graphs.reduce((s,g) => s+(g.nodes?.length??0), 0);
  const stats = [
    { label:"Time Spent",     value:"24.5h",       icon:ClockIcon, color:C.teal   },
    { label:"Graphs Built",   value:graphs.length,  icon:GraphIcon, color:C.purple },
    { label:"Concepts",       value:totalNodes,     icon:NodeIcon,  color:"#f59e0b" },
    { label:"Formulas Saved", value:formulaCount,   icon:SigmaIcon, color:C.pink   },
  ];
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background:C.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}><s.icon size={14} color={s.color}/><span style={{ color:C.muted,fontSize:11 }}>{s.label}</span></div>
          <div style={{ color:s.color,fontSize:22,fontWeight:800 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Graph Card ───────────────────────────────────────────────────────────────
function GraphCard({ graph, onOpen }: { graph: Graph; onOpen: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onOpen}
      style={{ background:C.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${hov?C.teal+"44":C.border}`,cursor:"pointer",transition:"all 0.2s",transform:hov?"translateY(-2px)":"none" }}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8 }}>
        <span style={{ color:C.text,fontSize:13,fontWeight:600,flex:1,lineHeight:1.3 }}>{graph.topic}</span>
        <span style={{ fontSize:10,color:C.muted,marginLeft:8,flexShrink:0 }}>{graph.date}</span>
      </div>
      <div style={{ display:"flex",gap:6 }}>
        <span style={{ fontSize:10,color:C.teal,background:C.tealDim,padding:"2px 8px",borderRadius:99 }}>{graph.subject}</span>
        <span style={{ fontSize:10,color:C.muted }}>{graph.nodes?.length??0} nodes</span>
      </div>
    </div>
  );
}

function GapsLibrary({ gaps, onDismiss, onClearAll, onClose }: {
  gaps: LearningGap[]; onDismiss: (id: string) => void;
  onClearAll: () => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, GapDetail | "loading">>({});
  const active = gaps.filter(g => !g.dismissed);
  const filtered = active.filter(g =>
    [g.concept, g.topic, g.subject].some(s => s.toLowerCase().includes(search.toLowerCase()))
  );
  const grouped = filtered.reduce<Record<string, LearningGap[]>>((acc, g) => {
    (acc[g.topic] ??= []).push(g); return acc;
  }, {});

  const handleExpand = async (g: LearningGap) => {
    const isOpen = expanded === g.id;
    setExpanded(isOpen ? null : g.id);
    if (!isOpen && !details[g.id]) {
      setDetails(prev => ({ ...prev, [g.id]: "loading" }));
      const d = await fetchGapDetail(g.concept, g.topic, g.subject);
      setDetails(prev => ({ ...prev, [g.id]: d }));
    }
  };

  const textFix: React.CSSProperties = { wordBreak: "break-word", overflowWrap: "anywhere", whiteSpace: "normal" };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:620,maxHeight:"85vh",background:C.card,borderRadius:20,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:`0 32px 80px rgba(0,0,0,0.7),0 0 0 1px ${C.missed}18` }}>
        {/* Header */}
        <div style={{ padding:"22px 24px 16px",borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:`${C.missed}18`,border:`1px solid ${C.missed}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>📌</div>
              <div>
                <div style={{ color:C.text,fontSize:15,fontWeight:700 }}>Learning Gaps Library</div>
                <div style={{ color:C.muted,fontSize:11,marginTop:1 }}>{active.length} concept{active.length !== 1 ? "s" : ""} to revisit</div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              {active.length > 0 && (
                <button onClick={onClearAll} style={{ fontSize:9,padding:"4px 10px",borderRadius:99,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",fontWeight:600 }}>clear all</button>
              )}
              <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:22,lineHeight:1,padding:"2px 6px" }}>×</button>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,padding:"7px 12px" }}>
            <span style={{ color:C.muted,fontSize:13 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search concepts, topics or subjects…"
              style={{ flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:12 }}/>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>
          {active.length === 0 ? (
            <div style={{ textAlign:"center",padding:"48px 0",color:C.muted }}>
              <div style={{ fontSize:36,marginBottom:10 }}>🎉</div>
              <div style={{ fontSize:13,fontWeight:600,color:C.text }}>No gaps to revisit!</div>
              <div style={{ fontSize:12,marginTop:6,lineHeight:1.6 }}>Use <span style={{ color:C.teal,fontWeight:700 }}>Teach It Back</span> to discover concepts you missed.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center",padding:"32px 0",color:C.muted,fontSize:13 }}>No results for "{search}"</div>
          ) : (
            Object.entries(grouped).map(([topic, items]) => (
              <div key={topic} style={{ marginBottom:24 }}>
                {/* Topic header */}
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                  <div style={{ height:1,flex:1,background:C.border }}/>
                  <span style={{ fontSize:10,fontWeight:700,letterSpacing:"0.14em",color:C.teal,textTransform:"uppercase",background:C.tealDim,padding:"3px 10px",borderRadius:99,border:`1px solid ${C.teal}33` }}>{topic}</span>
                  <div style={{ height:1,flex:1,background:C.border }}/>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {items.map(g => {
                    const isOpen = expanded === g.id;
                    const detail = details[g.id];
                    return (
                      <div key={g.id} style={{ borderRadius:10,border:`1px solid ${isOpen ? C.missed+"66" : C.border}`,background:isOpen ? `${C.missed}0a` : C.surface,overflow:"hidden",transition:"all 0.2s" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer" }} onClick={() => handleExpand(g)}>
                          <div style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,background:C.missed,boxShadow:`0 0 6px ${C.missed}88` }}/>
                          <span style={{ flex:1,fontSize:12,fontWeight:700,color:C.missed,lineHeight:1.3,...textFix }}>{g.concept}</span>
                          <span style={{ fontSize:9,color:C.muted }}>{g.subject}</span>
                          <span style={{ fontSize:9,color:C.muted }}>{new Date(g.addedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isOpen ? C.missed : C.muted} strokeWidth="2.5" strokeLinecap="round" style={{ transform:isOpen?"rotate(90deg)":"none",transition:"transform 0.2s",flexShrink:0 }}><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                        {isOpen && (
                          <div style={{ padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:10,maxHeight:500,overflowY:"auto" }}>
                            {detail === "loading" ? (
                              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 0" }}>
                                {[0,1,2].map(i => <div key={i} style={{ width:6,height:6,borderRadius:"50%",background:C.missed,animation:`pulse 1.2s ${i*0.2}s infinite` }}/>)}
                                <span style={{ fontSize:10,color:C.muted,marginLeft:4 }}>Loading concept details…</span>
                              </div>
                            ) : detail ? (
                              <>
                                <div style={{ background:`${C.missed}0d`,border:`1px solid ${C.missed}22`,borderRadius:8,padding:"10px 12px" }}>
                                  <div style={{ fontSize:9,fontWeight:800,letterSpacing:"0.1em",color:C.missed,marginBottom:5,textTransform:"uppercase" }}>📖 What is it?</div>
                                  <p style={{ fontSize:11,color:C.text,lineHeight:1.65,margin:0,...textFix }}>{detail.description}</p>
                                </div>
                                {detail.whyItMatters && (
                                  <div style={{ background:`${C.teal}08`,border:`1px solid ${C.teal}1a`,borderRadius:8,padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start" }}>
                                    <span style={{ fontSize:13,flexShrink:0 }}>💡</span>
                                    <p style={{ fontSize:11,color:C.teal,lineHeight:1.6,margin:0,fontStyle:"italic",...textFix }}>{detail.whyItMatters}</p>
                                  </div>
                                )}
                                {detail.keyPoints.length > 0 && (
                                  <div>
                                    <div style={{ fontSize:9,fontWeight:800,letterSpacing:"0.1em",color:C.muted,marginBottom:6,textTransform:"uppercase" }}>Key Points</div>
                                    {detail.keyPoints.map((pt, i) => (
                                      <div key={i} style={{ display:"flex",gap:7,alignItems:"flex-start",marginBottom:4 }}>
                                        <div style={{ width:4,height:4,borderRadius:"50%",background:C.purple,flexShrink:0,marginTop:5 }}/>
                                        <span style={{ fontSize:11,color:C.text,lineHeight:1.55,...textFix }}>{pt}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display:"flex",justifyContent:"flex-end",paddingTop:4,borderTop:`1px solid ${C.border}` }}>
                                  <button onClick={e => { e.stopPropagation(); onDismiss(g.id); }}
                                    style={{ fontSize:9,padding:"3px 10px",borderRadius:99,background:`${C.green}10`,border:`1px solid ${C.green}33`,color:C.green,cursor:"pointer",fontWeight:700 }}>
                                    got it ✓
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Simulations Library Modal ────────────────────────────────────────────────
function SimulationsLibrary({ keywords, topic, subject, onClose }: { keywords: string[]; topic: string; subject: string; onClose: () => void; }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const allSims: SimEntry[] = [];
  for (const [category, files] of Object.entries(SIM_DATA as Record<string, string[]>)) {
    for (const filename of files) {
      allSims.push({ filename, category, label: toSimLabel(filename), score: scoreSim(filename, category, keywords, topic, subject), color: CAT_COLORS[category] ?? C.text });
    }
  }
  allSims.sort((a, b) => b.score !== a.score ? b.score - a.score : a.label.localeCompare(b.label));

  const filtered = search.trim()
    ? allSims.filter(s => s.label.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()))
    : allSims;

  const matchCount = allSims.filter(s => s.score > 0).length;
  const grouped = filtered.reduce<Record<string, SimEntry[]>>((acc, s) => { (acc[s.category] ??= []).push(s); return acc; }, {});

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:640,maxHeight:"85vh",background:C.card,borderRadius:20,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:`0 32px 80px rgba(0,0,0,0.7),0 0 0 1px ${C.teal}18` }}>
        {/* Header */}
        <div style={{ padding:"22px 24px 16px",borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:C.tealDim,border:`1px solid ${C.teal}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⚡</div>
              <div>
                <div style={{ color:C.text,fontSize:15,fontWeight:700 }}>Simulations Library</div>
                <div style={{ color:C.muted,fontSize:11,marginTop:1 }}>
                  {matchCount > 0 ? <><span style={{ color:C.teal,fontWeight:700 }}>{matchCount}</span> match{matchCount !== 1 ? "es" : ""} for your topic · </> : ""}{filtered.length} total
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:22,lineHeight:1,padding:"2px 6px" }}>×</button>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,padding:"7px 12px" }}>
            <span style={{ color:C.muted,fontSize:13 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search simulations by name or category…"
              style={{ flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:12 }}/>
          </div>
          {/* Category chips */}
          <div style={{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap" }}>
            {Object.keys(CAT_COLORS).map(cat => (
              <span key={cat} style={{ fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:99,background:`${CAT_COLORS[cat]}15`,color:CAT_COLORS[cat],border:`1px solid ${CAT_COLORS[cat]}33`,cursor:"pointer" }}
                onClick={() => setSearch(cat)}>
                {cat}
              </span>
            ))}
            {search && <span style={{ fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:99,background:`${C.muted}15`,color:C.muted,border:`1px solid ${C.border}`,cursor:"pointer" }} onClick={() => setSearch("")}>clear ×</span>}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:18 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:"center",padding:"48px 0",color:C.muted }}>
              <div style={{ fontSize:36,marginBottom:10 }}>🔭</div>
              <div style={{ fontSize:13,fontWeight:600,color:C.text }}>No simulations found</div>
              <div style={{ fontSize:12,marginTop:6 }}>Try a different search term</div>
            </div>
          ) : (
            Object.entries(grouped).map(([category, sims]) => (
              <div key={category}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                  <div style={{ height:1,flex:1,background:C.border }}/>
                  <span style={{ fontSize:10,fontWeight:700,letterSpacing:"0.14em",color:CAT_COLORS[category]??C.muted,textTransform:"uppercase",background:`${CAT_COLORS[category]??C.muted}15`,padding:"3px 10px",borderRadius:99,border:`1px solid ${CAT_COLORS[category]??C.muted}33` }}>{category}</span>
                  <div style={{ height:1,flex:1,background:C.border }}/>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {sims.map(sim => <SimRow key={sim.filename} sim={sim}/>)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function EffectualDashboard({ onHome }: { onHome?: () => void }) {
  const [activeTab,       setActiveTab]       = useState("dashboard");
  const [appMode,         setAppMode]         = useState<"science" | "math">("science");  // ← ADD THIS LINE
  const [currentGraph,    setCurrentGraph]    = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });

  const [activeNode,      setActiveNode]      = useState<Node | null>(null);
  const [currentTopic,    setCurrentTopic]    = useState<string | null>(null);
  const [currentSubj,     setCurrentSubj]     = useState("Physics");
  const [keywords,        setKeywords]        = useState<string[]>([]);
  const [grade,           setGrade]           = useState("8");
  const [subject,         setSubject]         = useState("Physics");
  const [showLibrary,     setShowLibrary]     = useState(false);
  const [showTeachItBack, setShowTeachItBack] = useState(false);
  const [showGapsLibrary, setShowGapsLibrary] = useState(false);
  const [showSimsLibrary, setShowSimsLibrary] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [learningGaps, setLearningGaps] = useState<LearningGap[]>(() => {
    try { return JSON.parse(localStorage.getItem("effectual_gaps") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("effectual_gaps", JSON.stringify(learningGaps)); }, [learningGaps]);

  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>(() => {
    try { return JSON.parse(localStorage.getItem("effectual_formulas") || "[]"); } catch { return []; }
  });
  const [savedGraphs, setSavedGraphs] = useState<Graph[]>([
    { id:"g1", topic:"Electric Current & Circuits", subject:"Physics", date:"Yesterday",  nodes:Array(5).fill({} as Node), edges:[], keywords:["current","voltage","resistance"] },
    { id:"g2", topic:"Newton's Laws of Motion",     subject:"Physics", date:"2 days ago", nodes:Array(4).fill({} as Node), edges:[], keywords:["force","mass","acceleration"] },
  ]);

  useEffect(() => { localStorage.removeItem("effectual_chat_history"); }, []);
  useEffect(() => { localStorage.setItem("effectual_formulas", JSON.stringify(savedFormulas)); }, [savedFormulas]);

  const savedIds = new Set(savedFormulas.map(f => f.id));

  const handleSaveFormula = useCallback((node: Node) => {
    if (!node.formula) return;
    if (savedIds.has(node.id)) { setSavedFormulas(prev => prev.filter(f => f.id !== node.id)); }
    else { setSavedFormulas(prev => [{ id:node.id, concept:node.label, latex:node.formula!, topic:currentTopic||"General", subject:currentSubj, savedAt:Date.now() }, ...prev]); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds, currentTopic, currentSubj]);

  // ── SMART handleResult: shouldMerge override + formula enrichment + smart dedup ──
  const handleResult = useCallback((rawData: AIResponse) => {
    // Step 1: Smart shouldMerge override — AI often mis-classifies follow-ups as new topics
    let data = { ...rawData };

    // HARD GUARD: completely different topic names = never merge, no exceptions
    if (currentTopic && data.topic) {
      const existingRoot = currentTopic.toLowerCase().split(" › ")[0].trim();
      const newTopic = data.topic.toLowerCase().trim();
      const topicsMatch =
        newTopic.includes(existingRoot.slice(0, 6)) ||
        existingRoot.includes(newTopic.slice(0, 6));
      if (!topicsMatch) {
        data = { ...data, shouldMerge: false };
      }
    }

    // Secondary: if AI said false but topic names DO match, re-enable merge
    if (!data.shouldMerge && currentTopic && currentGraph.nodes.length > 0) {
      const existingRoot = currentTopic.toLowerCase().split(" › ")[0].trim();
      const newTopic = data.topic.toLowerCase().trim();
      const topicsMatch =
        newTopic.includes(existingRoot.slice(0, 8)) ||
        existingRoot.includes(newTopic.slice(0, 8));
      if (topicsMatch) data = { ...data, shouldMerge: true };
    }

    // Step 2: Post-process — inject any formula nodes the AI forgot to create
    data = enrichResponseWithFormulas(data, currentGraph.nodes);

    // Step 3: Merge with smart deduplication (by ID and by formula string)
    let mergedNodes: Node[] = [];
    let mergedEdges: Edge[] = [];

    setCurrentGraph(prev => {
      if (data.shouldMerge && prev.nodes.length > 0) {
        const existingIds = new Set(prev.nodes.map(n => n.id));
        const existingFormulas = new Set(prev.nodes.filter(n => n.formula).map(n => n.formula!));
        const newNodes = data.nodes.filter(n => {
          if (existingIds.has(n.id)) return false;
          if (n.type === "formula" && n.formula && existingFormulas.has(n.formula)) return false;
          return true;
        });
        mergedNodes = [...prev.nodes, ...newNodes];
        mergedEdges = [...prev.edges, ...data.edges];
      } else {
        mergedNodes = data.nodes ?? [];
        mergedEdges = data.edges ?? [];
      }
      return { nodes: mergedNodes, edges: mergedEdges };
    });

    setCurrentTopic(prev => {
      if (data.shouldMerge && prev && data.topic && data.topic !== prev)
        return `${prev} › ${data.topic}`;
      return data.topic;
    });
    setKeywords(data.keywords ?? []);
    setActiveTab("dashboard");

    setSavedGraphs(prev => {
      if (data.shouldMerge && activeSessionId) {
        return prev.map(g => g.id !== activeSessionId ? g : {
          ...g,
          topic: g.topic.includes(data.topic ?? "") ? g.topic : `${g.topic} › ${data.topic}`,
          nodes: mergedNodes,
          edges: mergedEdges,
          keywords: [...new Set([...g.keywords, ...(data.keywords ?? [])])],
          date: "Just now",
        });
      }
      const newId = `g_${Date.now()}`;
      setTimeout(() => setActiveSessionId(newId), 0);
      return [
        { id: newId, topic: data.topic, subject, date: "Just now", nodes: mergedNodes, edges: mergedEdges, keywords: data.keywords ?? [] },
        ...prev,
      ].slice(0, 20);
    });
  }, [subject, activeSessionId, currentTopic, currentGraph.nodes]);

  const handleAddNodes = useCallback((newNodes: Node[], reasons: string[] = []) => {
    setCurrentGraph(prev => {
      const coreNode = prev.nodes.find(n => n.type === "core");
      const taggedNodes: Node[] = newNodes.map(n => ({ ...n, type: "missed" as const }));
      const newEdges: Edge[] = coreNode
        ? taggedNodes.map(n => ({ from: coreNode.id, to: n.id, label: "missed" }))
        : [];
      const merged = { nodes: [...prev.nodes, ...taggedNodes], edges: [...prev.edges, ...newEdges] };
      setSavedGraphs(gs => gs.map(g => g.id !== activeSessionId ? g : { ...g, nodes: merged.nodes, edges: merged.edges }));
      return merged;
    });

    const newGaps: LearningGap[] = newNodes.map((n, i) => ({
      id: `gap_${Date.now() + i}_${Math.random().toString(36).slice(2, 6)}`,
      concept: n.label,
      reason: reasons[i] || `You didn't cover "${n.label}" in your explanation — it's a key concept for this topic.`,
      topic: currentTopic || "General",
      subject,
      addedAt: Date.now(),
      dismissed: false,
    }));
    if (newGaps.length > 0) {
      setLearningGaps(prev => {
        const existingIds = new Set(prev.map(g => g.id));
        const fresh = newGaps.filter(g => !existingIds.has(g.id));
        return [...fresh, ...prev].slice(0, 100);
      });
    }
  }, [activeSessionId, currentTopic, subject]);

  if (appMode === "math") {
    return <MathMode onSwitchToScience={() => setAppMode("science")} />;
  }

  return (
    <div style={{ display:"flex",height:"100vh",background:C.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:C.text,overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px; }
        @keyframes pulse    { 0%,100%{opacity:0.3;transform:scale(0.8);}50%{opacity:1;transform:scale(1.2);} }
        @keyframes tibPulse { 0%,100%{box-shadow:0 0 14px rgba(0,245,212,0.35),0 0 28px rgba(124,108,255,0.2);} 50%{box-shadow:0 0 22px rgba(0,245,212,0.6),0 0 44px rgba(124,108,255,0.4);} }
      `}</style>

      {showLibrary && (
        <FormulaLibrary formulas={savedFormulas} onRemove={id => setSavedFormulas(prev => prev.filter(f => f.id !== id))} onClose={() => setShowLibrary(false)}/>
      )}
      {showGapsLibrary && (
  <GapsLibrary
    gaps={learningGaps}
    onDismiss={id => setLearningGaps(prev => prev.map(g => g.id === id ? { ...g, dismissed: true } : g))}
    onClearAll={() => setLearningGaps(prev => prev.map(g => ({ ...g, dismissed: true })))}
    onClose={() => setShowGapsLibrary(false)}
  />
)}

      {showSimsLibrary && (
        <SimulationsLibrary keywords={keywords} topic={currentTopic ?? ""} subject={subject} onClose={() => setShowSimsLibrary(false)}/>
      )}
      {showTeachItBack && currentTopic && (
        <TeachItBack
          topic={currentTopic}
          nodes={currentGraph.nodes}
          subject={subject}
          grade={grade}
          onClose={() => setShowTeachItBack(false)}
          onAddNodes={handleAddNodes}
        />
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onHome={onHome??(() => {})} formulaCount={savedFormulas.length} onOpenLibrary={() => setShowLibrary(true)} onOpenGaps={() => setShowGapsLibrary(true)} gapCount={learningGaps.filter(g => !g.dismissed).length} onOpenSims={() => setShowSimsLibrary(true)} keywords={keywords} topic={currentTopic ?? ""} subject={subject}/>

      <main style={{ flex:1,overflowY:"auto",padding:24 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:20,fontWeight:800,color:C.text }}>Welcome back, Alex!</h1>
            <p style={{ fontSize:13,color:C.muted,marginTop:2 }}>{currentTopic?`Exploring: ${currentTopic}`:"Ready to continue learning?"}</p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>

            {/* MODE TOGGLE */}
            <div style={{ display:"flex",alignItems:"center",gap:2,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:99,padding:3 }}>
              <button onClick={() => setAppMode("science")} style={{ padding:"5px 14px",borderRadius:99,border:"none",cursor:"pointer",background:appMode==="science"?"linear-gradient(135deg,#00f5d4,#7c6cff)":"transparent",color:appMode==="science"?"#05060f":"rgba(255,255,255,0.38)",fontSize:10,fontWeight:700,transition:"all 0.2s" }}>
                ⚛️ Science
              </button>
              <button onClick={() => setAppMode("math")} style={{ padding:"5px 14px",borderRadius:99,border:"none",cursor:"pointer",background:appMode==="math"?"linear-gradient(135deg,#f5c842,#818cf8)":"transparent",color:appMode==="math"?"#05060f":"rgba(255,255,255,0.38)",fontSize:10,fontWeight:700,transition:"all 0.2s" }}>
                🧮 Math
              </button>
            </div>

            {savedFormulas.length > 0 && (
              <button onClick={() => setShowLibrary(true)} style={{ padding:"6px 14px",borderRadius:99,background:C.purpleDim,border:`1px solid ${C.purple}44`,fontSize:11,color:C.purple,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
                ∑ {savedFormulas.length} formula{savedFormulas.length !== 1 ? "s" : ""}
              </button>
            )}
            <div style={{ padding:"6px 14px",borderRadius:99,background:C.tealDim,border:`1px solid ${C.teal}33`,fontSize:11,color:C.teal,fontWeight:600 }}>Weekly Progress: 72%</div>
            <div style={{ width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#05060f" }}>A</div>
          </div>
        </div>

        <StatsBar graphs={savedGraphs} formulaCount={savedFormulas.length}/>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 340px",gap:20 }}>
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            <div style={{ background:C.card,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden" }}>
              <div style={{ padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <GraphIcon size={15} color={C.teal}/>
                  <span style={{ fontSize:14,fontWeight:600 }}>Knowledge Graph</span>
                  {currentTopic && (<span style={{ fontSize:10,color:C.teal,background:C.tealDim,padding:"2px 8px",borderRadius:99,marginLeft:4 }}>{currentTopic}</span>)}
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  {currentTopic && (
                    <button
                      onClick={() => setShowTeachItBack(true)}
                      style={{
                        display:"flex", alignItems:"center", gap:6,
                        padding:"5px 13px", borderRadius:99, border:"none", cursor:"pointer",
                        fontSize:11, fontWeight:800, letterSpacing:"0.03em",
                        background:`linear-gradient(135deg,${C.teal},${C.purple})`,
                        color:"#05060f",
                        animation:"tibPulse 2.5s ease-in-out infinite",
                        transition:"transform 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform="translateY(-1px)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform="none"}
                    >
                      🧠 Teach It Back
                    </button>
                  )}
                  {currentGraph.nodes.some(n => n.formula) && (
                    <span style={{ fontSize:10,color:C.muted }}>click <span style={{ color:C.pink }}>♡</span> on formula nodes to save</span>
                  )}
                  {activeNode && (
                    <div style={{ fontSize:11,color:C.muted }}>Selected: <span style={{ color:C.teal }}>{activeNode.label}</span></div>
                  )}
                </div>
              </div>

              <div style={{ padding:12 }}>
                <KnowledgeGraph nodes={currentGraph.nodes} edges={currentGraph.edges}
                  onNodeClick={n => setActiveNode(prev => prev?.id===n.id?null:n)}
                  activeNode={activeNode?.id??null} savedIds={savedIds} onSave={handleSaveFormula}/>
              </div>

              {currentGraph.nodes.length > 0 && (
                <div style={{ padding:"10px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center" }}>
                  {[
                    { label:"Core",        color:C.teal,    pill:false },
                    { label:"Formula",     color:C.blue,    pill:false },
                    { label:"Related",     color:C.purple,  pill:false },
                    { label:"Derivation",  color:C.orange,  pill:false },
                    { label:"Application", color:C.pink,    pill:false },
                    { label:"Missed ✦",   color:C.missed,  pill:true  },
                  ].map(l => (
                    <div key={l.label} style={{ display:"flex",alignItems:"center",gap:5 }}>
                      {l.pill
                        ? <div style={{ width:18,height:8,borderRadius:99,background:`${l.color}15`,border:`1px dashed ${l.color}`,flexShrink:0 }}/>
                        : <div style={{ width:6,height:6,borderRadius:"50%",background:l.color }}/>
                      }
                      <span style={{ fontSize:10,color:C.muted }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:"0.15em",color:C.muted,textTransform:"uppercase",marginBottom:10 }}>Previous Graphs</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                {savedGraphs.slice(0,4).map(g => (
                  <GraphCard key={g.id} graph={g} onOpen={() => { setCurrentGraph({nodes:g.nodes,edges:g.edges}); setCurrentTopic(g.topic); setKeywords(g.keywords??[]); setActiveSessionId(g.id); }}/>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            <div style={{ height:420 }}>
              <ChatPanel onResult={handleResult} grade={grade} setGrade={setGrade}
                subject={subject} setSubject={s => { setSubject(s); setCurrentSubj(s); }}
                currentTopic={currentTopic} currentNodes={currentGraph.nodes}/>
            </div>
            <LearningGapsPanel
              gaps={learningGaps}
              onDismiss={id => setLearningGaps(prev => prev.map(g => g.id === id ? { ...g, dismissed: true } : g))}
              onClearAll={() => setLearningGaps(prev => prev.map(g => ({ ...g, dismissed: true })))}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function SelectInput({ value, onChange, options, isMap }: { value: string; onChange: (v: string) => void; options: string[] | [string,string][]; isMap?: boolean; }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontSize:11,padding:"4px 8px",borderRadius:6,cursor:"pointer",outline:"none" }}>
      {(options as (string|[string,string])[]).map(o => { const val=isMap?(o as [string,string])[0]:(o as string); const label=isMap?(o as [string,string])[1]:(o as string); return <option key={val} value={val}>{label}</option>; })}
    </select>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
interface IconProps { size?: number; color?: string; }
const Icon = ({ d, size=16, color="currentColor" }: { d: string } & IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const HomeIcon     = (p: IconProps) => <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" {...p}/>;
const SimIcon      = (p: IconProps) => <Icon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" {...p}/>;
const DashIcon     = (p: IconProps) => <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" {...p}/>;
const SettingsIcon = (p: IconProps) => <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" {...p}/>;
const LogoutIcon   = (p: IconProps) => <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" {...p}/>;
const SendIcon     = (p: IconProps) => <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...p}/>;
const ClockIcon    = (p: IconProps) => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" {...p}/>;
const ChevronIcon  = (p: IconProps) => <Icon d="M9 18l6-6-6-6" {...p}/>;
const GraphIcon = ({ size=16, color="currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
    <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
  </svg>
);
const NodeIcon = ({ size=16, color="currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/>
    <circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
    <line x1="6" y1="7" x2="10" y2="11"/><line x1="18" y1="7" x2="14" y2="11"/>
    <line x1="6" y1="17" x2="10" y2="13"/><line x1="18" y1="17" x2="14" y2="13"/>
  </svg>
);
const SigmaIcon = ({ size=16, color="currentColor" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 7H6l6 5-6 5h12"/>
  </svg>
);
const SparkIcon = ({ size=24, color=C.teal, opacity=1 }: IconProps & { opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z" stroke={color} strokeWidth="1.5" fill={color+"22"}/>
  </svg>
);