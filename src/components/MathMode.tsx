import { useState, useEffect, useRef, useCallback } from "react";
import SIM_DATA from '../assets/files.json';
import ProveItVision from './ProveItVision';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MathNode {
  id: string;
  label: string;
  type: "core" | "theorem" | "proof" | "lemma" | "axiom" | "corollary" | "formula" | "example" | "missed";
  formula?: string;
}
interface MathEdge { from: string; to: string; label?: string; }
interface MathAIResponse {
  answer: string; topic: string;
  nodes: MathNode[]; edges: MathEdge[];
  keywords: string[]; followUp: string[];
  shouldMerge?: boolean;
  formulas?: Array<{ concept: string; latex: string }>;
}
interface Position { x: number; y: number; }
interface ChatMessage { role: "user" | "bot"; text: string; timestamp: number; }
interface SavedFormula {
  id: string; concept: string; latex: string;
  topic: string; savedAt: number;
}

interface ProveItData {
  exampleQuestion: string;
  exampleSolution: string;
  studentQuestion: string;
  correctAnswer: string;
  steps: string[];
}

// ─── Math Palette ─────────────────────────────────────────────────────────────
const M = {
  bg:        "#07080f",
  surface:   "#0e0f1c",
  card:      "#131425",
  border:    "rgba(255,255,255,0.07)",
  gold:      "#f5c842",
  goldDim:   "rgba(245,200,66,0.12)",
  indigo:    "#818cf8",
  indigoDim: "rgba(129,140,248,0.13)",
  cyan:      "#22d3ee",
  cyanDim:   "rgba(34,211,238,0.11)",
  green:     "#34d399",
  greenDim:  "rgba(52,211,153,0.11)",
  orange:    "#fb923c",
  text:      "#e5e7eb",
  muted:     "rgba(255,255,255,0.38)",
  red:       "#f87171",
  pink:      "#f472b6",
  blue:      "#60a5fa",
} as const;

// ─── Node visual config per type ─────────────────────────────────────────────
type NodeShape = "hexagon" | "diamond" | "circle" | "rect" | "pill" | "pentagon" | "octagon";

interface NodeVisual {
  color: string;
  shape: NodeShape;
  symbol: string;      // math symbol shown in top corner
  abbrev: string;      // short type label shown below symbol
  baseR: number;       // base radius / half-size
}

const NODE_VISUALS: Record<MathNode["type"], NodeVisual> = {
  core:      { color: M.gold,   shape: "circle",   symbol: "◈",  abbrev: "CORE",   baseR: 42 },
  theorem:   { color: M.gold,   shape: "hexagon",  symbol: "⊦",  abbrev: "THM",    baseR: 36 },
  proof:     { color: M.indigo, shape: "diamond",  symbol: "∴",  abbrev: "PROOF",  baseR: 32 },
  lemma:     { color: M.cyan,   shape: "pentagon", symbol: "⊂",  abbrev: "LEM",    baseR: 30 },
  axiom:     { color: M.green,  shape: "octagon",  symbol: "∀",  abbrev: "AXM",    baseR: 30 },
  corollary: { color: M.orange, shape: "rect",     symbol: "⇒",  abbrev: "COR",    baseR: 28 },
  formula:   { color: M.blue,   shape: "pill",     symbol: "∑",  abbrev: "EQ",     baseR: 40 },
  example:   { color: M.pink,   shape: "rect",     symbol: "⟹",  abbrev: "EX",     baseR: 28 },
  missed:    { color: M.pink,   shape: "diamond",  symbol: "?",  abbrev: "MISS",   baseR: 26 },
};

// ─── Shape path generators ────────────────────────────────────────────────────
function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

function pentagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (2 * Math.PI * i) / 5 - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

function octagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

function diamondPoints(cx: number, cy: number, r: number): string {
  const rx = r * 1.15, ry = r * 0.85;
  return `${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`;
}

// ─── Advanced LaTeX Renderer ──────────────────────────────────────────────────
function MathLaTeX({ formula, size = 12, color }: { formula: string; size?: number; color?: string }) {
  let html = formula;

  const greek: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ',
    eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ',
    phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Sigma: 'Σ', Omega: 'Ω', Pi: 'Π',
  };
  Object.entries(greek).forEach(([k, v]) => {
    html = html.replace(new RegExp(`\\\\${k}\\b`, 'g'), v);
  });

  html = html
    .replace(/\\approx/g, "≈").replace(/\\equiv/g, "≡").replace(/\\neq/g, "≠")
    .replace(/\\leq/g, "≤").replace(/\\geq/g, "≥")
    .replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\pm/g, "±")
    .replace(/\\rightarrow/g, "→").replace(/\\leftarrow/g, "←").replace(/\\Rightarrow/g, "⇒")
    .replace(/\\iff/g, "⟺").replace(/\\infty/g, "∞").replace(/\\partial/g, "∂")
    .replace(/\\nabla/g, "∇").replace(/\\forall/g, "∀").replace(/\\exists/g, "∃")
    .replace(/\\in/g, "∈").replace(/\\notin/g, "∉").replace(/\\subset/g, "⊂")
    .replace(/\\cup/g, "∪").replace(/\\cap/g, "∩").replace(/\\emptyset/g, "∅")
    .replace(/\\therefore/g, "∴").replace(/\\because/g, "∵")
    .replace(/\\mathbb\{R\}/g, "ℝ").replace(/\\mathbb\{Z\}/g, "ℤ")
    .replace(/\\mathbb\{N\}/g, "ℕ").replace(/\\mathbb\{Q\}/g, "ℚ")
    .replace(/\\mathbb\{C\}/g, "ℂ");

  html = html.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, (_, lo, hi) =>
    `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 1px">
      <sup style="font-size:0.65em;line-height:0.8">${hi}</sup>
      <span style="font-size:1.4em;line-height:0.6;font-family:serif">∫</span>
      <sub style="font-size:0.65em;line-height:0.8">${lo}</sub>
    </span>`
  );
  html = html.replace(/\\int/g, '<span style="font-size:1.3em;font-family:serif">∫</span>');
  html = html.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, (_, lo, hi) =>
    `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px">
      <sup style="font-size:0.65em;line-height:0.8">${hi}</sup>
      <span style="font-size:1.3em;line-height:0.6">∑</span>
      <sub style="font-size:0.65em;line-height:0.8">${lo}</sub>
    </span>`
  );
  html = html.replace(/\\sum/g, '<span style="font-size:1.3em">∑</span>');
  html = html.replace(/\\lim_\{([^}]+)\}/g, (_, sub) =>
    `<span style="display:inline-flex;flex-direction:column;align-items:center;margin:0 2px">
      <span style="font-size:0.9em;font-style:italic">lim</span>
      <sub style="font-size:0.65em;line-height:0.9">${sub}</sub>
    </span>`
  );
  html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) =>
    `<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:${size * 0.85}px;line-height:1.1;margin:0 3px">
      <span style="padding:0 4px;border-bottom:1.2px solid currentColor">${num}</span>
      <span style="padding:0 4px">${den}</span>
    </span>`
  );
  html = html.replace(/\\sqrt\{([^}]+)\}/g,
    `<span style="font-size:1.2em">√</span><span style="text-decoration:overline;padding:0 2px">$1</span>`
  );
  html = html
    .replace(/\^\{([^}]+)\}/g, "<sup style='font-size:0.7em'>$1</sup>")
    .replace(/\^(\w)/g, "<sup style='font-size:0.7em'>$1</sup>")
    .replace(/_\{([^}]+)\}/g, "<sub style='font-size:0.7em'>$1</sub>")
    .replace(/_(\w)/g, "<sub style='font-size:0.7em'>$1</sub>");
  html = html.replace(/\\text\{([^}]+)\}/g, `<span style="font-family:sans-serif;font-style:normal">$1</span>`);
  html = html.replace(/\\mathrm\{([^}]+)\}/g, `<span style="font-style:normal">$1</span>`);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontFamily: "'Cambria Math','STIX Two Math','Times New Roman',Georgia,serif",
        fontSize: size,
        lineHeight: 1.6,
        color: color,
        fontStyle: "italic",
      }}
    />
  );
}

// ─── AI Call for Math ─────────────────────────────────────────────────────────
async function callMathAI(
  question: string, subject: string, grade: string,
  chatHistory: ChatMessage[], currentTopic: string | null, existingNodes: MathNode[],
): Promise<MathAIResponse> {
  const recent = chatHistory.slice(-6).map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`).join("\n");
  const existingStr = existingNodes.length > 0
    ? existingNodes.map(n => `id="${n.id}" label="${n.label}" type="${n.type}"`).join(", ")
    : "NONE";

  const systemPrompt = `You are an expert mathematics tutor specialising in ${subject} for level ${grade}.

CONVERSATION SO FAR:
${recent || "Start of conversation."}
CURRENT TOPIC: ${currentTopic || "None"}
EXISTING NODES: ${existingStr}

YOU MUST OUTPUT VALID JSON ONLY — NO MARKDOWN, NO FENCES, NO PREAMBLE.

RULES:
1. Always produce ≥ 3 nodes.
2. Node types (pick the most precise):
   - "core"      → the main topic
   - "theorem"   → named theorems (Pythagorean, FTC, etc.)
   - "proof"     → proof strategy or step
   - "lemma"     → supporting result
   - "axiom"     → fundamental assumption
   - "corollary" → direct consequence
   - "formula"   → an equation / formula — put LaTeX in "formula" field
   - "example"   → a worked example
3. Every formula/equation mentioned → mandatory "formula" node with LaTeX in "formula" field.
4. shouldMerge = true for follow-ups/same topic. false only for completely unrelated new topic.
5. When shouldMerge=true, include existing core node in your nodes[].
6. No orphan nodes — every non-core node needs ≥ 1 edge.
7. answer = plain English, one sentence.
8. LaTeX: use \\\\frac{}{}, \\\\int_{lo}^{hi}, \\\\sum_{n=1}^{\\\\infty}, \\\\lim_{x \\\\to 0}, \\\\sqrt{}, \\\\forall, \\\\exists, \\\\in, \\\\mathbb{R}, \\\\Rightarrow, \\\\iff, \\\\alpha,\\\\beta,\\\\gamma etc.

JSON SCHEMA:
{
  "answer": "plain English sentence",
  "topic": "topic name",
  "shouldMerge": true|false,
  "nodes": [{"id":"...","label":"...","type":"...","formula":"optional LaTeX"}],
  "edges": [{"from":"...","to":"...","label":"..."}],
  "keywords": ["keyword1","keyword2"],
  "followUp": ["follow-up question 1","follow-up question 2"],
  "formulas": [{"concept":"name","latex":"LaTeX string"}]
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL Math Mode",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
      temperature: 0.4, max_tokens: 2500,
    }),
  });

  if (!response.ok) throw new Error("Math AI failed");
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as MathAIResponse;
  } catch {
    const grabStr = (key: string) => { const m = clean.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`)); return m?.[1] ?? ""; };
    const grabBool = (key: string, fb: boolean) => { const m = clean.match(new RegExp(`"${key}"\\s*:\\s*(true|false)`)); return m ? m[1] === "true" : fb; };
    const grabArr = <T,>(key: string): T[] => { const m = clean.match(new RegExp(`"${key}"\\s*:\\s*(\\[.*?\\])`, "s")); if (!m) return []; try { return JSON.parse(m[1]) as T[]; } catch { return []; } };
    return {
      answer: grabStr("answer") || "Here's what I found.",
      topic: grabStr("topic") || question,
      shouldMerge: grabBool("shouldMerge", false),
      nodes: grabArr<MathNode>("nodes"),
      edges: grabArr<MathEdge>("edges"),
      keywords: grabArr<string>("keywords"),
      followUp: grabArr<string>("followUp"),
      formulas: grabArr("formulas"),
    };
  }
}

// ─── Prove It: generate problem pair ─────────────────────────────────────────
async function generateProveItProblems(topic: string, subject: string, grade: string): Promise<ProveItData> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL Math Mode",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      temperature: 0.6,
      max_tokens: 1400,
      messages: [{
        role: "system",
        content: `You are a math teacher. Output ONLY valid JSON, no markdown, no extra text.
Schema: {
  "exampleQuestion": "a clear, specific problem",
  "exampleSolution": "Step 1: ...\\nStep 2: ...\\nFinal Answer: ...",
  "steps": ["step 1 text", "step 2 text", "..."],
  "studentQuestion": "similar problem, different numbers/variant",
  "correctAnswer": "the answer string the student should enter"
}`,
      }, {
        role: "user",
        content: `Create a ${subject} (${grade} level) problem pair about: "${topic}"`,
      }],
    }),
  });

  if (!response.ok) throw new Error("ProveIt API failed");
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as ProveItData;
  } catch {
    return {
      exampleQuestion: "Find d/dx of x²",
      exampleSolution: "Step 1: Apply power rule d/dx(xⁿ) = nxⁿ⁻¹\nStep 2: n=2, so d/dx(x²) = 2x¹ = 2x\nFinal Answer: 2x",
      steps: ["Apply power rule", "Substitute n=2", "Simplify"],
      studentQuestion: "Find d/dx of x³",
      correctAnswer: "3x²",
    };
  }
}

// ─── Prove It Grade ───────────────────────────────────────────────────────────
async function gradeProveIt(
  studentAnswer: string, correctAnswer: string, question: string, subject: string
): Promise<{ correct: boolean; feedback: string; score: number }> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL Math Mode",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      temperature: 0.2,
      max_tokens: 400,
      messages: [{
        role: "system",
        content: `You are a strict math grader. Respond ONLY with JSON: {"correct": boolean, "score": 0-100, "feedback": "2 sentences max — specific, honest"}`,
      }, {
        role: "user",
        content: `Subject: ${subject}\nQuestion: ${question}\nCorrect Answer: ${correctAnswer}\nStudent Answer: ${studentAnswer}`,
      }],
    }),
  });

  if (!response.ok) return { correct: false, feedback: "Grading failed, try again.", score: 0 };
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { correct: false, feedback: "Could not parse grade.", score: 0 }; }
}

// ─── Prove It Tool ────────────────────────────────────────────────────────────
function ProveItTool({
  topic, subject, grade, onClose,
}: { topic: string; subject: string; grade: string; onClose: () => void }) {
  const [phase, setPhase] = useState<"loading" | "example" | "solving" | "grading" | "results">("loading");
  const [problems, setProblems] = useState<ProveItData | null>(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [gradeResult, setGradeResult] = useState<{ correct: boolean; feedback: string; score: number } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const SYMBOLS = [
    ["∫","∑","∏","∂","∇","√","∞"],
    ["α","β","γ","δ","θ","λ","π","σ","ω","φ"],
    ["≤","≥","≠","≈","≡","∈","∉","⊂","∪","∩","∅"],
    ["→","⇒","⟺","∀","∃","±","×","÷","·"],
    ["ℝ","ℤ","ℕ","ℚ","ℂ","∴","∵","⟨","⟩"],
    ["⌈","⌉","⌊","⌋","⊕","⊗","∘","^","_","( )","[ ]","{ }"],
  ];

  useEffect(() => {
    generateProveItProblems(topic, subject, grade)
      .then(p => { setProblems(p); setPhase("example"); })
      .catch(() => setPhase("example"));
  }, [topic, subject, grade]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const insertSymbol = (sym: string) => {
    const ta = textareaRef.current;
    if (!ta) { setStudentAnswer(p => p + sym); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    const insert = sym === "( )" ? "()" : sym === "[ ]" ? "[]" : sym === "{ }" ? "{}" : sym;
    const next = studentAnswer.slice(0, s) + insert + studentAnswer.slice(e);
    setStudentAnswer(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + insert.length, s + insert.length); }, 0);
  };

  const handleSubmit = async () => {
    if (!studentAnswer.trim() || !problems) return;
    setPhase("grading");
    const r = await gradeProveIt(studentAnswer, problems.correctAnswer, problems.studentQuestion, subject);
    setGradeResult(r);
    setPhase("results");
  };

  const handleRetry = () => {
    setStudentAnswer(""); setGradeResult(null); setShowSolution(false);
    setPhase("solving");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: M.bg, overflow: "hidden",
      fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(245,200,66,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,200,66,0.025) 1px,transparent 1px)`,
        backgroundSize: "44px 44px" }}/>
      <div style={{ position: "absolute", top: -100, right: -100, width: 360, height: 360, pointerEvents: "none",
        background: `radial-gradient(circle,${M.gold}12,transparent 70%)` }}/>

      <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "14px 28px", borderBottom: `1px solid ${M.border}`,
          background: "rgba(13,15,30,0.9)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, fontSize: 18,
              background: `linear-gradient(135deg,${M.gold}22,${M.indigo}22)`,
              border: `1px solid ${M.gold}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: M.gold, fontFamily: "serif", fontWeight: 700 }}>∴</div>
            <div>
              <div style={{ color: M.text, fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>Prove It</div>
              <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: M.gold, background: M.goldDim, padding: "1px 7px", borderRadius: 99 }}>{topic}</span>
                <span style={{ fontSize: 9, color: M.muted }}>{subject}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(["example","solving","results"] as const).map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: phase === s ? `linear-gradient(135deg,${M.gold},${M.indigo})` : M.surface,
                    color: phase === s ? "#05060f" : M.muted,
                    border: `1px solid ${M.border}` }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 9, color: M.muted, fontWeight: 500 }}>
                    {s === "example" ? "Study" : s === "solving" ? "Solve" : "Review"}
                  </span>
                </div>
                {i < 2 && <div style={{ width: 20, height: 1, background: M.border }}/>}
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 7,
            border: `1px solid ${M.border}`, background: "transparent",
            cursor: "pointer", color: M.muted, fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {phase === "loading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
              <div style={{ fontSize: 36, color: M.gold, fontFamily: "serif" }}>∴</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: M.text }}>Generating your problem set…</div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: M.gold,
                    animation: `mDot 1.2s ${i * 0.15}s ease-in-out infinite` }}/>
                ))}
              </div>
            </div>
          )}

          {(phase === "example" || phase === "solving") && problems && (
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: M.card, borderRadius: 16, border: `1px solid ${M.gold}44`, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", background: `${M.gold}10`, borderBottom: `1px solid ${M.gold}22`, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: M.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Example (Solved)</span>
                  </div>
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ background: M.surface, borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: `1px solid ${M.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: M.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Problem</div>
                      <div style={{ fontSize: 13, color: M.text, lineHeight: 1.8, fontFamily: "'Cambria Math',serif", fontStyle: "italic" }}>{problems.exampleQuestion}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: M.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Solution</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {problems.exampleSolution.split("\n").map((line, idx) => {
                        const isFinal = line.toLowerCase().startsWith("final");
                        return (
                          <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px", borderRadius: 8,
                            background: isFinal ? `${M.gold}12` : M.surface, border: `1px solid ${isFinal ? M.gold + "33" : M.border}` }}>
                            {!isFinal && (
                              <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: `${M.indigo}22`, border: `1px solid ${M.indigo}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: M.indigo, marginTop: 1 }}>{idx + 1}</div>
                            )}
                            {isFinal && <span style={{ fontSize: 12, flexShrink: 0, color: M.gold }}>✓</span>}
                            <span style={{ fontSize: 12, color: isFinal ? M.gold : M.text, lineHeight: 1.6, fontWeight: isFinal ? 700 : 400, fontFamily: "'Cambria Math',serif" }}>
                              {line.replace(/^(Step \d+:|Final Answer:)\s*/i, "")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {phase === "example" && (
                    <div style={{ padding: "14px 20px", borderTop: `1px solid ${M.border}` }}>
                      <button onClick={() => setPhase("solving")} style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${M.gold},${M.indigo})`, color: "#05060f", fontSize: 12, fontWeight: 800 }}>
                        I understand — give me the problem →
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ background: M.card, borderRadius: 16, border: `1px solid ${M.indigo}44`, overflow: "hidden", opacity: phase === "example" ? 0.4 : 1, transition: "opacity 0.3s" }}>
                  <div style={{ padding: "14px 20px", background: `${M.indigo}10`, borderBottom: `1px solid ${M.indigo}22`, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: M.indigo, letterSpacing: "0.1em", textTransform: "uppercase" }}>Your Turn</span>
                  </div>
                  {phase === "solving" ? (
                    <div style={{ padding: "18px 20px" }}>
                      <div style={{ background: M.surface, borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: `1px solid ${M.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: M.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Problem</div>
                        <div style={{ fontSize: 13, color: M.text, lineHeight: 1.8, fontFamily: "'Cambria Math',serif", fontStyle: "italic" }}>{problems.studentQuestion}</div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: M.muted, fontWeight: 600, marginBottom: 5, letterSpacing: "0.08em" }}>SYMBOL PALETTE</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, background: M.surface, borderRadius: 8, padding: "8px", border: `1px solid ${M.border}` }}>
                          {SYMBOLS.map((row, ri) => (
                            <div key={ri} style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                              {row.map(sym => (
                                <button key={sym} onClick={() => insertSymbol(sym)} style={{ padding: "4px 7px", borderRadius: 5, border: `1px solid ${M.border}`, background: M.card, color: M.text, cursor: "pointer", fontSize: 13, fontFamily: "'Cambria Math',serif", minWidth: 28, textAlign: "center" }}>
                                  {sym}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: M.muted, fontWeight: 600, marginBottom: 5, letterSpacing: "0.08em" }}>YOUR ANSWER</div>
                        <textarea ref={textareaRef} value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)}
                          placeholder="Type your answer here…"
                          style={{ width: "100%", minHeight: 90, padding: "12px 14px", background: M.surface, border: `1px solid ${studentAnswer ? M.gold + "44" : M.border}`, borderRadius: 8, color: M.text, fontSize: 13, outline: "none", fontFamily: "'Cambria Math','Times New Roman',serif", resize: "vertical", lineHeight: 1.6 }}/>
                      </div>
                      {studentAnswer && (
                        <div style={{ marginBottom: 10, padding: "10px 14px", background: M.surface, borderRadius: 8, border: `1px solid ${M.gold}22` }}>
                          <div style={{ fontSize: 9, color: M.muted, marginBottom: 4, letterSpacing: "0.08em" }}>PREVIEW</div>
                          <MathLaTeX formula={studentAnswer} size={14} color={M.gold}/>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleSubmit} disabled={!studentAnswer.trim()} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", background: studentAnswer.trim() ? `linear-gradient(135deg,${M.gold},${M.indigo})` : M.border, color: studentAnswer.trim() ? "#05060f" : M.muted, fontSize: 12, fontWeight: 800, transition: "all 0.2s" }}>Submit →</button>
                        <button onClick={() => setShowSolution(s => !s)} style={{ padding: "10px 14px", borderRadius: 9, background: "transparent", border: `1px solid ${M.border}`, color: M.muted, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                          {showSolution ? "Hide" : "Hint"}
                        </button>
                      </div>
                      {showSolution && (
                        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: `${M.orange}0c`, border: `1px solid ${M.orange}22` }}>
                          <div style={{ fontSize: 9, color: M.orange, fontWeight: 800, marginBottom: 4, letterSpacing: "0.1em" }}>HINT</div>
                          <div style={{ fontSize: 11, color: M.text, lineHeight: 1.6 }}>{problems.steps[0] || "Try applying the same method from the example."}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: M.muted, fontSize: 12 }}>Study the example first →</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === "grading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
              <div style={{ fontSize: 32, color: M.indigo, fontFamily: "serif" }}>∑</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: M.text }}>Checking your answer…</div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2,3].map(i => (<div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: M.indigo, animation: `mDot 1.2s ${i * 0.15}s ease-in-out infinite` }}/>))}
              </div>
            </div>
          )}

          {phase === "results" && gradeResult && problems && (
            <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: gradeResult.correct ? `${M.green}12` : `${M.indigo}12`, borderRadius: 16, border: `1px solid ${gradeResult.correct ? M.green + "44" : M.indigo + "44"}`, padding: "24px 28px", display: "flex", gap: 24, alignItems: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: gradeResult.correct ? `${M.green}18` : `${M.indigo}18`, border: `2px solid ${gradeResult.correct ? M.green : M.indigo}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0, color: gradeResult.correct ? M.green : M.indigo, fontFamily: "serif" }}>
                  {gradeResult.correct ? "✓" : "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: gradeResult.correct ? M.green : M.indigo, marginBottom: 6 }}>{gradeResult.correct ? "Correct!" : `Score: ${gradeResult.score}/100`}</div>
                  <div style={{ fontSize: 13, color: M.text, lineHeight: 1.7 }}>{gradeResult.feedback}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: M.card, borderRadius: 12, border: `1px solid ${M.border}`, padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: M.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Answer</div>
                  <div style={{ background: M.surface, borderRadius: 8, padding: "10px 14px" }}>
                    <MathLaTeX formula={studentAnswer} size={14} color={gradeResult.correct ? M.green : M.red}/>
                  </div>
                </div>
                <div style={{ background: M.card, borderRadius: 12, border: `1px solid ${M.green}33`, padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: M.green, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Correct Answer</div>
                  <div style={{ background: `${M.green}08`, borderRadius: 8, padding: "10px 14px" }}>
                    <MathLaTeX formula={problems.correctAnswer} size={14} color={M.green}/>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={handleRetry} style={{ padding: "11px 26px", borderRadius: 9, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${M.gold},${M.indigo})`, color: "#05060f", fontSize: 12, fontWeight: 800 }}>Try Again</button>
                <button onClick={onClose} style={{ padding: "11px 24px", borderRadius: 9, background: "transparent", border: `1px solid ${M.border}`, cursor: "pointer", color: M.muted, fontSize: 12, fontWeight: 600 }}>Back to Math</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes mDot { 0%,100%{opacity:0.2;transform:translateY(0)} 50%{opacity:1;transform:translateY(-5px)} }`}</style>
    </div>
  );
}

// ─── ADVANCED Math Knowledge Graph ───────────────────────────────────────────
function MathKnowledgeGraph({
  nodes, edges, onNodeClick, activeNode, savedIds, onSave,
}: {
  nodes: MathNode[]; edges: MathEdge[];
  onNodeClick: (n: MathNode) => void;
  activeNode: string | null;
  savedIds: Set<string>;
  onSave: (n: MathNode) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });
  const posSet = useRef(false);
  const nodeKey = nodes.map(n => n.id).join(",");
  useEffect(() => { posSet.current = false; }, [nodeKey]);

  // Layered layout: core at center, then rings by type priority
  useEffect(() => {
    if (!nodes.length || posSet.current) return;
    const W = 720, H = 460, cx = W / 2, cy = H / 2;
    const pos: Record<string, Position> = {};

    const cores = nodes.filter(n => n.type === "core");
    const tier1 = nodes.filter(n => ["theorem","axiom"].includes(n.type));
    const tier2 = nodes.filter(n => ["lemma","proof","formula"].includes(n.type));
    const tier3 = nodes.filter(n => ["corollary","example","missed"].includes(n.type));

    // Core(s) clustered at center
    cores.forEach((n, i) => {
      if (cores.length === 1) { pos[n.id] = { x: cx, y: cy }; }
      else {
        const a = (2 * Math.PI * i) / cores.length;
        pos[n.id] = { x: cx + Math.cos(a) * 40, y: cy + Math.sin(a) * 40 };
      }
    });

    // Tier 1 — tight inner ring (radius ~140)
    tier1.forEach((n, i) => {
      const base = tier1.length > 0 ? (2 * Math.PI * i) / tier1.length : 0;
      const jitter = (Math.random() - 0.5) * 0.25;
      pos[n.id] = { x: cx + Math.cos(base + jitter) * 148, y: cy + Math.sin(base + jitter) * 118 };
    });

    // Tier 2 — mid ring (radius ~195)
    tier2.forEach((n, i) => {
      const base = (2 * Math.PI * i) / Math.max(tier2.length, 1) + Math.PI / tier2.length;
      const jitter = (Math.random() - 0.5) * 0.3;
      pos[n.id] = { x: cx + Math.cos(base + jitter) * 195, y: cy + Math.sin(base + jitter) * 160 };
    });

    // Tier 3 — outer ring (radius ~245)
    tier3.forEach((n, i) => {
      const base = (2 * Math.PI * i) / Math.max(tier3.length, 1);
      pos[n.id] = { x: cx + Math.cos(base) * 240, y: cy + Math.sin(base) * 195 };
    });

    setPositions(prev => {
      const next = { ...prev };
      for (const [id, p] of Object.entries(pos)) { if (!next[id]) next[id] = p; }
      return next;
    });
    posSet.current = true;
  }, [nodeKey, nodes]);

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

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  if (!nodes.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 460, gap: 12 }}>
      <div style={{ fontSize: 52, opacity: 0.18, color: M.gold, fontFamily: "'Cambria Math',serif", fontStyle: "italic", fontWeight: 400 }}>∑</div>
      <p style={{ color: M.muted, fontSize: 13, textAlign: "center", lineHeight: 1.7 }}>Ask a maths question to build<br/>your theorem graph</p>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {(["theorem","formula","proof","axiom"] as MathNode["type"][]).map(t => {
          const v = NODE_VISUALS[t];
          return (
            <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <svg width={28} height={28} viewBox="-14 -14 28 28">
                <NodeShape type={t} r={10} color={v.color} active={false} cx={0} cy={0}/>
              </svg>
              <span style={{ fontSize: 8, color: M.muted, letterSpacing: "0.08em" }}>{v.abbrev}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <svg ref={svgRef} width="100%" viewBox="0 0 720 460" style={{ cursor: dragging ? "grabbing" : "default", userSelect: "none" }}>
      <defs>
        {/* Glow filters per color */}
        <filter id="glowGold" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="cb"/>
          <feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glowIndigo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="cb"/>
          <feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glowBlue" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="cb"/>
          <feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Arrow markers per color */}
        <marker id="arrowGold" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill={M.gold} opacity="0.6"/>
        </marker>
        <marker id="arrowIndigo" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill={M.indigo} opacity="0.6"/>
        </marker>
        <marker id="arrowCyan" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill={M.cyan} opacity="0.6"/>
        </marker>
        <marker id="arrowGray" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="rgba(255,255,255,0.3)" opacity="0.6"/>
        </marker>
      </defs>

      {/* Edges — curved bezier paths */}
      {edges.map((e, i) => {
        const from = positions[e.from], to = positions[e.to];
        if (!from || !to) return null;
        const hov = hoveredEdge === i;

        // Find the source/target node types to pick edge color
        const fromNode = nodes.find(n => n.id === e.from);
        const toNode   = nodes.find(n => n.id === e.to);
        const isActive = activeNode === e.from || activeNode === e.to;
        const isHovered = hoveredNode === e.from || hoveredNode === e.to;

        let edgeColor = "rgba(255,255,255,0.15)";
        let markerId = "arrowGray";
        if (fromNode?.type === "core" || toNode?.type === "core") {
          edgeColor = hov || isActive || isHovered ? M.gold + "88" : M.gold + "30";
          markerId = "arrowGold";
        } else if (fromNode?.type === "theorem" || toNode?.type === "theorem") {
          edgeColor = hov || isActive || isHovered ? M.gold + "70" : M.gold + "25";
          markerId = "arrowGold";
        } else if (fromNode?.type === "proof" || toNode?.type === "proof") {
          edgeColor = hov || isActive || isHovered ? M.indigo + "88" : M.indigo + "30";
          markerId = "arrowIndigo";
        } else if (fromNode?.type === "formula") {
          edgeColor = hov || isActive || isHovered ? M.blue + "88" : M.blue + "30";
          markerId = "arrowIndigo";
        }

        // Curved bezier — control point perpendicular to midpoint
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Slight curve: pull control point 18px perpendicular
        const curvature = Math.min(20, len * 0.12);
        const cpx = mx + (-dy / len) * curvature;
        const cpy = my + (dx / len) * curvature;

        const path = `M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`;

        return (
          <g key={i}
            onMouseEnter={() => setHoveredEdge(i)}
            onMouseLeave={() => setHoveredEdge(null)}>
            {/* Invisible fat hit area */}
            <path d={path} fill="none" stroke="transparent" strokeWidth="16"/>
            <path d={path} fill="none"
              stroke={edgeColor}
              strokeWidth={isActive || isHovered ? 1.8 : 1.1}
              strokeDasharray={fromNode?.type === "proof" || toNode?.type === "proof" ? "5 3" : "none"}
              markerEnd={`url(#${markerId})`}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}/>
            {/* Edge label — only on hover */}
            {e.label && hov && (() => {
              const lx = (from.x + to.x) / 2 + (-dy / len) * (curvature + 14);
              const ly = (from.y + to.y) / 2 + (dx / len) * (curvature + 14);
              const tw = e.label.length * 5.5 + 12;
              return (
                <g>
                  <rect x={lx - tw / 2} y={ly - 8} width={tw} height={14} rx={4}
                    fill={M.card} stroke={edgeColor} strokeWidth="0.7"/>
                  <text x={lx} y={ly + 2} textAnchor="middle"
                    style={{ fontSize: 8, fill: edgeColor, fontFamily: "'DM Sans',sans-serif", pointerEvents: "none", userSelect: "none", fontStyle: "normal" }}>
                    {e.label}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return null;
        const v = NODE_VISUALS[n.type];
        const isActive  = activeNode === n.id;
        const isHovered = hoveredNode === n.id;
        const isSaved   = n.formula ? savedIds.has(n.id) : false;

        return (
          <g key={n.id}
            transform={`translate(${pos.x},${pos.y})`}
            style={{ cursor: "grab" }}
            onMouseDown={e => handleMouseDown(e, n.id)}
            onMouseEnter={() => setHoveredNode(n.id)}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={() => onNodeClick(n)}>

            {/* Outer glow ring when active */}
            {(isActive || isHovered) && (
              <circle r={v.baseR + 14} fill={v.color} opacity="0.06"/>
            )}
            {isActive && (
              <circle r={v.baseR + 8} fill="none" stroke={v.color} strokeWidth="1" opacity="0.3" strokeDasharray="3 3"/>
            )}

            {/* The shape */}
            <NodeShape type={n.type} r={v.baseR} color={v.color} active={isActive || isHovered} cx={0} cy={0}/>

            {/* Type badge — tiny text in top-right corner of bounding box */}
            <text
              x={v.baseR * 0.62}
              y={-(v.baseR * 0.62)}
              textAnchor="middle"
              style={{
                fontSize: 7,
                fontFamily: "'DM Sans',system-ui,sans-serif",
                fill: v.color,
                opacity: 0.7,
                fontWeight: 700,
                letterSpacing: "0.12em",
                userSelect: "none",
                pointerEvents: "none",
              }}>
              {v.abbrev}
            </text>

            {/* Node content — formula or label */}
            <foreignObject
              x={-v.baseR * 0.9}
              y={-v.baseR * 0.55}
              width={v.baseR * 1.8}
              height={v.baseR * 1.1}>
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "2px",
                overflow: "hidden",
              }}>
                {n.formula ? (
                  <span style={{ color: v.color, textAlign: "center", lineHeight: 1.15 }}>
                    <MathLaTeX formula={n.formula} size={n.type === "formula" ? 11 : 10} color={v.color}/>
                  </span>
                ) : (
                  <span style={{
                    color: v.color,
                    fontSize: n.type === "core" ? 9.5 : 8,
                    fontWeight: 700,
                    textAlign: "center",
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                    fontFamily: "'DM Sans',system-ui,sans-serif",
                    letterSpacing: n.type === "core" ? "-0.2px" : "0",
                  }}>
                    {n.label}
                  </span>
                )}
              </div>
            </foreignObject>

            {/* Save star for formula nodes */}
            {n.formula && (
              <g
                transform={`translate(${v.baseR - 8},${-(v.baseR - 8)})`}
                onClick={e => { e.stopPropagation(); onSave(n); }}
                style={{ cursor: "pointer" }}>
                <circle r="9" fill={M.card} stroke={isSaved ? M.gold : M.border} strokeWidth="1"/>
                <text textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: isSaved ? M.gold : M.muted, userSelect: "none", fontStyle: "normal" }}>
                  {isSaved ? "★" : "☆"}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── NodeShape — draws the correct polygon/shape for each type ────────────────
function NodeShape({ type, r, color, active, cx, cy }: {
  type: MathNode["type"]; r: number; color: string; active: boolean; cx: number; cy: number;
}) {
  const fillOpacity = active ? 0.22 : 0.13;
  const strokeWidth = type === "core" ? 2.2 : 1.6;
  const filterAttr = active ? (
    color === M.gold ? "url(#glowGold)" :
    color === M.indigo ? "url(#glowIndigo)" : "url(#glowBlue)"
  ) : undefined;

  const sharedProps = {
    fill: color,
    fillOpacity,
    stroke: color,
    strokeWidth,
    filter: filterAttr,
    style: { transition: "fill-opacity 0.2s, stroke-width 0.2s" } as React.CSSProperties,
  };

  switch (type) {
    case "core":
      return (
        <>
          <circle cx={cx} cy={cy} r={r} {...sharedProps}/>
          {/* Inner ring for core */}
          <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={color} strokeWidth="0.8" opacity="0.4"/>
        </>
      );

    case "theorem":
      return <polygon points={hexagonPoints(cx, cy, r)} {...sharedProps}/>;

    case "proof":
      return <polygon points={diamondPoints(cx, cy, r)} {...sharedProps}/>;

    case "lemma":
      return <polygon points={pentagonPoints(cx, cy, r)} {...sharedProps}/>;

    case "axiom":
      return <polygon points={octagonPoints(cx, cy, r)} {...sharedProps}/>;

    case "formula":
      // Wide pill/rect with rounded corners
      return <rect x={cx - r * 1.25} y={cy - r * 0.58} width={r * 2.5} height={r * 1.16} rx={r * 0.3} {...sharedProps}/>;

    case "corollary":
      // Rect with corner notch (using a rect for simplicity)
      return <rect x={cx - r} y={cy - r * 0.7} width={r * 2} height={r * 1.4} rx={5} {...sharedProps}/>;

    case "example":
      return <rect x={cx - r} y={cy - r * 0.75} width={r * 2} height={r * 1.5} rx={8} {...sharedProps}/>;

    case "missed":
      return <polygon points={diamondPoints(cx, cy, r)} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1.2} strokeDasharray="4 2.5"/>;

    default:
      return <circle cx={cx} cy={cy} r={r} {...sharedProps}/>;
  }
}

// ─── Formula Library ──────────────────────────────────────────────────────────
function MathFormulaLibrary({ formulas, onRemove, onClose }: {
  formulas: SavedFormula[]; onRemove: (id: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = formulas.filter(f =>
    [f.concept, f.topic].some(s => s.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:580,maxHeight:"82vh",background:M.card,borderRadius:20,border:`1px solid ${M.border}`,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:`0 32px 80px rgba(0,0,0,0.7),0 0 0 1px ${M.gold}18` }}>
        <div style={{ padding:"22px 24px 16px",borderBottom:`1px solid ${M.border}` }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:M.goldDim,border:`1px solid ${M.gold}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:M.gold,fontFamily:"serif",fontStyle:"italic" }}>★</div>
              <div>
                <div style={{ color:M.text,fontSize:15,fontWeight:700 }}>Formula Library</div>
                <div style={{ color:M.muted,fontSize:11,marginTop:1 }}>{formulas.length} saved</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:M.muted,fontSize:22 }}>×</button>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,background:M.surface,borderRadius:8,border:`1px solid ${M.border}`,padding:"7px 12px" }}>
            <span style={{ color:M.muted,fontSize:13 }}>⊃</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search concept or topic…"
              style={{ flex:1,background:"transparent",border:"none",outline:"none",color:M.text,fontSize:12 }}/>
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>
          {formulas.length === 0 ? (
            <div style={{ textAlign:"center",padding:"48px 0",color:M.muted }}>
              <div style={{ fontSize:36,marginBottom:10,color:M.gold,fontFamily:"serif" }}>★</div>
              <div style={{ fontSize:13,fontWeight:600,color:M.text }}>No formulas saved yet</div>
              <div style={{ fontSize:12,marginTop:6 }}>Click ☆ on any formula node in the graph to save it.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center",padding:"32px 0",color:M.muted,fontSize:13 }}>No results for "{search}"</div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {filtered.map(f => (
                <div key={f.id} style={{ background:M.surface,borderRadius:12,border:`1px solid ${M.border}`,padding:"14px 16px",display:"flex",gap:14,alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ color:M.text,fontSize:13,fontWeight:600,marginBottom:8 }}>{f.concept}</div>
                    <div style={{ background:M.card,borderRadius:9,border:`1px solid ${M.gold}22`,padding:"10px 16px" }}>
                      <MathLaTeX formula={f.latex} size={14} color={M.gold}/>
                    </div>
                    <div style={{ display:"flex",gap:6,marginTop:8,alignItems:"center" }}>
                      <span style={{ fontSize:10,color:M.gold,background:M.goldDim,padding:"2px 8px",borderRadius:99 }}>{f.topic}</span>
                      <span style={{ fontSize:10,color:M.muted }}>{new Date(f.savedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6,flexShrink:0 }}>
                    <button onClick={() => navigator.clipboard.writeText(f.latex)} style={{ fontSize:9,padding:"5px 9px",borderRadius:6,cursor:"pointer",background:M.goldDim,color:M.gold,border:`1px solid ${M.gold}33`,fontFamily:"monospace" }}>copy LaTeX</button>
                    <button onClick={() => onRemove(f.id)} style={{ fontSize:10,padding:"5px 9px",borderRadius:6,cursor:"pointer",background:"transparent",color:M.muted,border:`1px solid ${M.border}` }}>remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Simulations Library (math-filtered) ─────────────────────────────────────
const MATH_CAT_COLORS: Record<string, string> = {
  Mechanics: "#00f5d4", Electricity: "#f59e0b", Magnetism: "#7c6cff",
  Optics: "#3b82f6", Thermodynamics: "#ec4899", Quantum: "#10b981",
};
function toLabel(f: string) { return f.replace(/^[^_]+_/, "").replace(/_/g, " "); }
function mathScoreSim(filename: string, category: string, keywords: string[], topic: string): number {
  const hay = [filename, toLabel(filename), category].join(" ").toLowerCase();
  let s = 0;
  for (const kw of keywords) { if (kw.length >= 3 && hay.includes(kw.toLowerCase())) s += 3; }
  for (const w of topic.toLowerCase().split(/[\s_,]+/)) { if (w.length >= 4 && hay.includes(w)) s += 2; }
  return s;
}

function MathSimsLibrary({ keywords, topic, onClose }: { keywords: string[]; topic: string; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const allSims = [];
  for (const [cat, files] of Object.entries(SIM_DATA as Record<string, string[]>)) {
    for (const f of files) {
      allSims.push({ filename: f, category: cat, label: toLabel(f), score: mathScoreSim(f, cat, keywords, topic), color: MATH_CAT_COLORS[cat] ?? M.text });
    }
  }
  allSims.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const filtered = search ? allSims.filter(s => s.label.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())) : allSims;
  const grouped = filtered.reduce<Record<string, typeof allSims>>((acc, s) => { (acc[s.category] ??= []).push(s); return acc; }, {});

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:620,maxHeight:"85vh",background:M.card,borderRadius:20,border:`1px solid ${M.border}`,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <div style={{ padding:"22px 24px 16px",borderBottom:`1px solid ${M.border}` }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:M.goldDim,border:`1px solid ${M.gold}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:M.gold,fontFamily:"serif" }}>∿</div>
              <div>
                <div style={{ color:M.text,fontSize:15,fontWeight:700 }}>Simulations Library</div>
                <div style={{ color:M.muted,fontSize:11,marginTop:1 }}>{filtered.length} simulations</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:M.muted,fontSize:22 }}>×</button>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,background:M.surface,borderRadius:8,border:`1px solid ${M.border}`,padding:"7px 12px" }}>
            <span style={{ color:M.muted,fontSize:13 }}>∈</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search simulations…" style={{ flex:1,background:"transparent",border:"none",outline:"none",color:M.text,fontSize:12 }}/>
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:16 }}>
          {Object.entries(grouped).map(([cat, sims]) => (
            <div key={cat}>
              <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.14em",color:MATH_CAT_COLORS[cat]??M.muted,textTransform:"uppercase",marginBottom:8,padding:"3px 10px",background:`${MATH_CAT_COLORS[cat]??M.muted}15`,borderRadius:99,display:"inline-block",border:`1px solid ${MATH_CAT_COLORS[cat]??M.muted}33` }}>{cat}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:5,marginTop:8 }}>
                {sims.map(s => {
                  const [hov, setHov] = useState(false);
                  return (
                    <a key={s.filename} href={`https://effectuall.github.io/Simulations/${s.filename}`} target="_blank" rel="noopener noreferrer"
                      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                      style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 13px",borderRadius:10,background:hov?`${s.color}0d`:M.surface,border:`1px solid ${hov?s.color+"55":M.border}`,textDecoration:"none",transition:"all 0.15s",opacity:s.score===0?0.45:1 }}>
                      <div style={{ width:7,height:7,borderRadius:"50%",flexShrink:0,background:s.color,boxShadow:s.score>0?`0 0 8px ${s.color}`:"none" }}/>
                      <span style={{ color:M.text,fontSize:12,flex:1 }}>{s.label}</span>
                      {s.score > 0 && <span style={{ fontSize:8,fontWeight:800,color:M.gold,background:M.goldDim,padding:"2px 6px",borderRadius:99 }}>{s.score}pt</span>}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={hov?s.color:M.muted} strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Math Chat Panel ──────────────────────────────────────────────────────────
function MathChatPanel({
  onResult, subject, setSubject, grade, setGrade, currentTopic, currentNodes,
}: {
  onResult: (d: MathAIResponse) => void;
  subject: string; setSubject: (s: string) => void;
  grade: string; setGrade: (g: string) => void;
  currentTopic: string | null; currentNodes: MathNode[];
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, loading]);

  const submit = async () => {
    if (!input.trim() || loading) return;
    const q = input; setInput(""); setLoading(true);
    const userMsg: ChatMessage = { role: "user", text: q, timestamp: Date.now() };
    const updated = [...history, userMsg]; setHistory(updated);
    try {
      const data = await callMathAI(q, subject, grade, updated, currentTopic, currentNodes);
      setHistory(h => [...h, { role: "bot", text: data.answer, timestamp: Date.now() }]);
      onResult(data);
    } catch {
      setHistory(h => [...h, { role: "bot", text: "Something went wrong. Please try again.", timestamp: Date.now() }]);
    }
    setLoading(false);
  };

  const MATH_SUBJECTS = ["Algebra","Calculus I","Calculus II","Calculus III","Linear Algebra","Differential Equations","Abstract Algebra","Real Analysis","Complex Analysis","Discrete Math","Statistics","Number Theory"];
  const suggestions = ["Prove the Pythagorean theorem","What is the Fundamental Theorem of Calculus?","Explain matrix multiplication"];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:M.card,borderRadius:16,border:`1px solid ${M.border}` }}>
      <div style={{ padding:"14px 18px",borderBottom:`1px solid ${M.border}`,display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:M.gold,boxShadow:`0 0 8px ${M.gold}` }}/>
        <span style={{ color:M.text,fontSize:14,fontWeight:600 }}>Math Tutor</span>
        {currentTopic && (
          <span style={{ fontSize:9,color:M.gold,background:M.goldDim,padding:"2px 8px",borderRadius:99,marginLeft:4 }}>∑ {currentTopic}</span>
        )}
        <div style={{ marginLeft:"auto",display:"flex",gap:7 }}>
          <select value={subject} onChange={e => setSubject(e.target.value)} style={{ background:M.surface,border:`1px solid ${M.border}`,color:M.text,fontSize:10,padding:"3px 7px",borderRadius:6,cursor:"pointer",outline:"none" }}>
            {MATH_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={grade} onChange={e => setGrade(e.target.value)} style={{ background:M.surface,border:`1px solid ${M.border}`,color:M.text,fontSize:10,padding:"3px 7px",borderRadius:6,cursor:"pointer",outline:"none" }}>
            <option value="high_school">HS</option>
            <option value="undergrad">UG</option>
            <option value="advanced">Adv</option>
          </select>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10 }}>
        {history.length === 0 && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8 }}>
            <div style={{ fontSize:42,opacity:0.3,color:M.gold,fontFamily:"'Cambria Math',serif",fontStyle:"italic" }}>∑</div>
            <p style={{ color:M.muted,fontSize:12,textAlign:"center",maxWidth:250,lineHeight:1.7 }}>Ask any maths question.<br/>I'll build a theorem graph.</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",marginTop:6 }}>
              {suggestions.map(q => (
                <button key={q} onClick={() => setInput(q)} style={{ fontSize:10,padding:"4px 11px",borderRadius:99,background:M.goldDim,color:M.gold,border:`1px solid ${M.gold}33`,cursor:"pointer" }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"85%",padding:"9px 14px",borderRadius:10,fontSize:12,lineHeight:1.7,background:m.role==="user"?`${M.gold}20`:M.surface,color:m.role==="user"?M.gold:M.text,border:`1px solid ${m.role==="user"?M.gold+"33":M.border}` }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex",gap:5,padding:"10px 14px" }}>
            {[0,1,2].map(i => (<div key={i} style={{ width:6,height:6,borderRadius:"50%",background:M.gold,animation:`mDot 1.2s ${i*0.2}s infinite` }}/>))}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{ padding:"12px 16px",borderTop:`1px solid ${M.border}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,background:M.surface,borderRadius:10,border:`1px solid ${M.border}`,padding:"7px 12px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()} placeholder="Ask a maths question…" style={{ flex:1,background:"transparent",border:"none",outline:"none",color:M.text,fontSize:12 }}/>
          <button onClick={submit} disabled={loading||!input.trim()} style={{ width:28,height:28,borderRadius:7,border:"none",cursor:"pointer",background:input.trim()?`linear-gradient(135deg,${M.gold},${M.indigo})`:M.border,color:input.trim()?"#05060f":M.muted,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0,fontSize:12,fontWeight:700 }}>→</button>
        </div>
      </div>
    </div>
  );
}

function CoreLibrary({ graphs, onLoad, onDelete, onClose }: {
  graphs: Array<{ id: string; topic: string; nodes: MathNode[]; edges: MathEdge[]; savedAt: number }>;
  onLoad: (g: { nodes: MathNode[]; edges: MathEdge[]; topic: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:560,maxHeight:"80vh",background:M.card,borderRadius:20,border:`1px solid ${M.border}`,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:`0 32px 80px rgba(0,0,0,0.7)` }}>
        <div style={{ padding:"20px 24px 16px",borderBottom:`1px solid ${M.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:M.indigoDim,border:`1px solid ${M.indigo}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:M.indigo }}>◈</div>
            <div>
              <div style={{ color:M.text,fontSize:15,fontWeight:700 }}>Core Library</div>
              <div style={{ color:M.muted,fontSize:11,marginTop:1 }}>{graphs.length} saved graphs</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:M.muted,fontSize:22 }}>×</button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>
          {graphs.length === 0 ? (
            <div style={{ textAlign:"center",padding:"48px 0" }}>
              <div style={{ fontSize:36,marginBottom:10,color:M.indigo }}>◈</div>
              <div style={{ fontSize:13,fontWeight:600,color:M.text }}>No graphs saved yet</div>
              <div style={{ fontSize:12,marginTop:6,color:M.muted,lineHeight:1.6 }}>Graphs auto-save when you switch topics.<br/>Or click "+ Save Graph" button anytime.</div>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {graphs.map(g => (
                <div key={g.id} style={{ background:M.surface,borderRadius:12,border:`1px solid ${M.border}`,padding:"14px 16px",display:"flex",gap:14,alignItems:"center" }}>
                  <div style={{ width:40,height:40,borderRadius:10,background:M.indigoDim,border:`1px solid ${M.indigo}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:M.indigo,flexShrink:0 }}>◈</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ color:M.text,fontSize:13,fontWeight:700,marginBottom:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{g.topic}</div>
                    <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:5 }}>
                      {(["core","theorem","formula","proof","lemma","axiom","corollary"] as MathNode["type"][]).map(t => {
                        const count = g.nodes.filter(n => n.type === t).length;
                        if (!count) return null;
                        const v = NODE_VISUALS[t];
                        return <span key={t} style={{ fontSize:8,padding:"1px 6px",borderRadius:99,background:`${v.color}15`,color:v.color,border:`1px solid ${v.color}33`,fontWeight:700 }}>{v.abbrev} ×{count}</span>;
                      })}
                    </div>
                    <div style={{ fontSize:10,color:M.muted }}>{new Date(g.savedAt).toLocaleDateString()} · {new Date(g.savedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6,flexShrink:0 }}>
                    <button onClick={() => { onLoad(g); onClose(); }} style={{ fontSize:11,padding:"6px 14px",borderRadius:7,cursor:"pointer",background:`linear-gradient(135deg,${M.gold},${M.indigo})`,color:"#05060f",border:"none",fontWeight:800 }}>Load →</button>
                    <button onClick={() => onDelete(g.id)} style={{ fontSize:10,padding:"5px 9px",borderRadius:6,cursor:"pointer",background:"transparent",color:M.muted,border:`1px solid ${M.border}` }}>delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Tool ────────────────────────────────────────────────────────────────
interface QuizQuestion {
  question: string;
  choices: string[];
  correct: number;  // index into choices
  explanation: string;
}

async function generateQuiz(topic: string, subject: string, grade: string): Promise<QuizQuestion[]> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL Math Mode",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      temperature: 0.5,
      max_tokens: 1800,
      messages: [{
        role: "system",
        content: `You are a math quiz generator. Output ONLY valid JSON array, no markdown, no extra text.
Schema: [{"question":"...","choices":["A","B","C","D"],"correct":0,"explanation":"..."}]
Rules:
- Generate exactly 5 multiple-choice questions
- correct is the 0-based index of the right choice
- Mix conceptual and calculation questions
- explanation is 1 short sentence saying why the answer is correct`,
      }, {
        role: "user",
        content: `Generate a 5-question quiz on "${topic}" for ${subject}, ${grade} level.`,
      }],
    }),
  });
  if (!response.ok) throw new Error("Quiz generation failed");
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "[]";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()) as QuizQuestion[]; }
  catch { return []; }
}

function QuizTool({ topic, subject, grade, onClose }: { topic: string; subject: string; grade: string; onClose: () => void }) {
  const [phase, setPhase] = useState<"loading" | "quiz" | "results">("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    generateQuiz(topic, subject, grade)
      .then(qs => { setQuestions(qs); setPhase("quiz"); })
      .catch(() => setPhase("quiz"));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const q = questions[current];
  const score = answers.filter((a, i) => a === questions[i]?.correct).length;

  const handleChoice = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  };

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    if (current + 1 >= questions.length) {
      setPhase("results");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const handleRestart = () => {
    setCurrent(0); setSelected(null); setAnswers([]); setRevealed(false);
    setPhase("loading");
    generateQuiz(topic, subject, grade)
      .then(qs => { setQuestions(qs); setPhase("quiz"); })
      .catch(() => setPhase("quiz"));
  };

  const pct = Math.round((score / questions.length) * 100);
  const verdict = pct >= 80 ? { label: "Excellent!", color: M.green } : pct >= 60 ? { label: "Good effort!", color: M.gold } : { label: "Keep practicing", color: M.indigo };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:3000,background:M.bg,overflow:"hidden",fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      {/* Grid bg */}
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",backgroundImage:`linear-gradient(rgba(129,140,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(129,140,248,0.025) 1px,transparent 1px)`,backgroundSize:"44px 44px" }}/>
      <div style={{ position:"absolute",top:-80,left:"50%",transform:"translateX(-50%)",width:400,height:300,pointerEvents:"none",background:`radial-gradient(circle,${M.indigo}18,transparent 70%)` }}/>

      <div style={{ position:"relative",zIndex:1,height:"100vh",display:"flex",flexDirection:"column" }}>
        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 28px",borderBottom:`1px solid ${M.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:18,color:M.indigo }}>?</span>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:M.text }}>Quick Quiz</div>
              <div style={{ fontSize:11,color:M.muted,marginTop:1 }}>{topic} · {subject}</div>
            </div>
          </div>
          {phase === "quiz" && questions.length > 0 && (
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ width:7,height:7,borderRadius:"50%",background: i < answers.length ? (answers[i] === questions[i].correct ? M.green : M.red) : i === current ? M.indigo : M.border,transition:"background 0.2s" }}/>
              ))}
            </div>
          )}
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:M.muted,fontSize:22,lineHeight:1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex:1,overflowY:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:32 }}>

          {/* Loading */}
          {phase === "loading" && (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:14 }}>
              <div style={{ fontSize:28,color:M.indigo,fontFamily:"serif" }}>?</div>
              <div style={{ fontSize:14,fontWeight:700,color:M.text }}>Generating quiz…</div>
              <div style={{ display:"flex",gap:5 }}>
                {[0,1,2,3].map(i => (<div key={i} style={{ width:7,height:7,borderRadius:"50%",background:M.indigo,animation:`mDot 1.2s ${i*0.15}s ease-in-out infinite` }}/>))}
              </div>
            </div>
          )}

          {/* Quiz */}
          {phase === "quiz" && q && (
            <div style={{ width:"100%",maxWidth:620 }}>
              {/* Progress bar */}
              <div style={{ height:3,background:M.border,borderRadius:99,marginBottom:28,overflow:"hidden" }}>
                <div style={{ height:"100%",background:`linear-gradient(90deg,${M.indigo},${M.gold})`,borderRadius:99,width:`${((current)/questions.length)*100}%`,transition:"width 0.4s" }}/>
              </div>

              <div style={{ fontSize:11,color:M.muted,marginBottom:12,fontWeight:600,letterSpacing:"0.1em" }}>QUESTION {current + 1} OF {questions.length}</div>

              <div style={{ fontSize:17,fontWeight:700,color:M.text,lineHeight:1.6,marginBottom:26,fontFamily:"'Cambria Math','Times New Roman',serif" }}>{q.question}</div>

              <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:20 }}>
                {q.choices.map((choice, idx) => {
                  let bg = "transparent", border = M.border, color = M.text;
                  if (revealed) {
                    if (idx === q.correct) { bg = `${M.green}15`; border = `${M.green}66`; color = M.green; }
                    else if (idx === selected && idx !== q.correct) { bg = `${M.red}15`; border = `${M.red}66`; color = M.red; }
                  } else if (idx === selected) { bg = M.indigoDim; border = M.indigo; }
                  return (
                    <button key={idx} onClick={() => handleChoice(idx)}
                      style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderRadius:10,border:`1px solid ${border}`,background:bg,cursor:revealed?"default":"pointer",color,fontSize:13,textAlign:"left",transition:"all 0.15s",fontFamily:"'Cambria Math','Times New Roman',serif" }}>
                      <span style={{ width:22,height:22,borderRadius:"50%",border:`1.5px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0,background: revealed && idx===q.correct ? M.green : revealed && idx===selected && idx!==q.correct ? M.red : "transparent",color: revealed && (idx===q.correct || (idx===selected && idx!==q.correct)) ? "#05060f" : "inherit" }}>
                        {["A","B","C","D"][idx]}
                      </span>
                      {choice}
                    </button>
                  );
                })}
              </div>

              {revealed && (
                <div style={{ padding:"12px 16px",borderRadius:10,background:`${M.indigo}10`,border:`1px solid ${M.indigo}33`,marginBottom:20 }}>
                  <span style={{ fontSize:10,fontWeight:800,color:M.indigo,letterSpacing:"0.1em",textTransform:"uppercase" }}>Why: </span>
                  <span style={{ fontSize:12,color:M.text,lineHeight:1.6 }}>{q.explanation}</span>
                </div>
              )}

              <button onClick={handleNext} disabled={!revealed}
                style={{ width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:revealed?"pointer":"default",background:revealed?`linear-gradient(135deg,${M.indigo},${M.gold})`:`${M.border}`,color:revealed?"#05060f":M.muted,fontSize:13,fontWeight:800,transition:"all 0.2s" }}>
                {current + 1 >= questions.length ? "See Results →" : "Next Question →"}
              </button>
            </div>
          )}

          {/* Results */}
          {phase === "results" && (
            <div style={{ width:"100%",maxWidth:520,display:"flex",flexDirection:"column",gap:16 }}>
              <div style={{ background:M.card,borderRadius:18,border:`1px solid ${verdict.color}44`,padding:"28px 32px",textAlign:"center" }}>
                <div style={{ fontSize:52,fontWeight:900,color:verdict.color,lineHeight:1 }}>{pct}%</div>
                <div style={{ fontSize:18,fontWeight:700,color:M.text,marginTop:8 }}>{verdict.label}</div>
                <div style={{ fontSize:12,color:M.muted,marginTop:6 }}>{score} of {questions.length} correct</div>
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {questions.map((q, i) => {
                  const correct = answers[i] === q.correct;
                  return (
                    <div key={i} style={{ background:M.card,borderRadius:10,border:`1px solid ${correct?M.green:M.red}33`,padding:"12px 14px" }}>
                      <div style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
                        <span style={{ fontSize:12,color:correct?M.green:M.red,flexShrink:0,marginTop:1 }}>{correct?"✓":"✗"}</span>
                        <div>
                          <div style={{ fontSize:11,color:M.text,lineHeight:1.5,fontFamily:"'Cambria Math',serif" }}>{q.question}</div>
                          {!correct && <div style={{ fontSize:10,color:M.green,marginTop:4 }}>Correct: {q.choices[q.correct]}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display:"flex",gap:10 }}>
                <button onClick={handleRestart} style={{ flex:1,padding:"11px",borderRadius:10,border:`1px solid ${M.indigo}44`,background:"transparent",color:M.indigo,fontSize:12,fontWeight:700,cursor:"pointer" }}>↺ New Quiz</button>
                <button onClick={onClose} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${M.indigo},${M.gold})`,color:"#05060f",fontSize:12,fontWeight:800,cursor:"pointer" }}>Done ✓</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN: MathMode Dashboard ─────────────────────────────────────────────────
export default function MathMode({ onSwitchToScience }: { onSwitchToScience: () => void }) {
  const [currentGraph, setCurrentGraph] = useState<{ nodes: MathNode[]; edges: MathEdge[] }>({ nodes: [], edges: [] });
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [subject, setSubject] = useState("Calculus I");
  const [grade, setGrade] = useState("undergrad");
  const [activeNode, setActiveNode] = useState<MathNode | null>(null);
  const [showProveIt, setShowProveIt] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSims, setShowSims] = useState(false);
  const [showCoreLib, setShowCoreLib] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

const [savedGraphs, setSavedGraphs] = useState<Array<{
  id: string; topic: string; nodes: MathNode[]; edges: MathEdge[]; savedAt: number;
}>>(() => {
  try { return JSON.parse(localStorage.getItem("effectual_math_graphs") || "[]"); }
  catch { return []; }
});

useEffect(() => {
  localStorage.setItem("effectual_math_graphs", JSON.stringify(savedGraphs));
}, [savedGraphs]);

  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>(() => {
    try { return JSON.parse(localStorage.getItem("effectual_math_formulas") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("effectual_math_formulas", JSON.stringify(savedFormulas)); }, [savedFormulas]);
  const savedIds = new Set(savedFormulas.map(f => f.id));

  const handleSaveFormula = useCallback((node: MathNode) => {
    if (!node.formula) return;
    if (savedIds.has(node.id)) {
      setSavedFormulas(prev => prev.filter(f => f.id !== node.id));
    } else {
      setSavedFormulas(prev => [{
        id: node.id, concept: node.label, latex: node.formula!,
        topic: currentTopic || "General", savedAt: Date.now(),
      }, ...prev]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds, currentTopic]);

  const handleResult = useCallback((data: MathAIResponse) => {
    setCurrentGraph(prev => {
      if (data.shouldMerge && prev.nodes.length > 0) {
        const existIds = new Set(prev.nodes.map(n => n.id));
        const newNodes = data.nodes.filter(n => !existIds.has(n.id));
        return { nodes: [...prev.nodes, ...newNodes], edges: [...prev.edges, ...data.edges] };
      }
      return { nodes: data.nodes ?? [], edges: data.edges ?? [] };
    });
    setCurrentTopic(prev => {
      if (data.shouldMerge && prev && data.topic !== prev) return `${prev} › ${data.topic}`;
      return data.topic;
    });
    setKeywords(data.keywords ?? []);
  }, []);

  const quickSims = (() => {
    const all = [];
    for (const [cat, files] of Object.entries(SIM_DATA as Record<string, string[]>)) {
      for (const f of files) {
        const s = mathScoreSim(f, cat, keywords, currentTopic ?? "");
        if (s > 0) all.push({ filename: f, label: toLabel(f), color: MATH_CAT_COLORS[cat] ?? M.text, score: s });
      }
    }
    return all.sort((a, b) => b.score - a.score).slice(0, 4);
  })();

  // Legend data — shape preview + label, no emoji
  const LEGEND = [
    { type: "theorem"  as MathNode["type"], label: "Theorem"   },
    { type: "proof"    as MathNode["type"], label: "Proof"     },
    { type: "lemma"    as MathNode["type"], label: "Lemma"     },
    { type: "axiom"    as MathNode["type"], label: "Axiom"     },
    { type: "corollary"as MathNode["type"], label: "Corollary" },
    { type: "formula"  as MathNode["type"], label: "Formula"   },
  ];

  return (
    <div style={{ display:"flex",height:"100vh",background:M.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:M.text,overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box;margin:0;padding:0; }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
        @keyframes mDot { 0%,100%{opacity:0.2;transform:translateY(0)} 50%{opacity:1;transform:translateY(-5px)} }
        @keyframes provePulse { 0%,100%{box-shadow:0 0 14px rgba(245,200,66,0.35),0 0 28px rgba(129,140,248,0.2)} 50%{box-shadow:0 0 22px rgba(245,200,66,0.6),0 0 44px rgba(129,140,248,0.4)} }
      `}</style>

      {showQuiz && currentTopic && (
        <QuizTool topic={currentTopic} subject={subject} grade={grade} onClose={() => setShowQuiz(false)}/>
      )}
      {showProveIt && currentTopic && (
  <ProveItVision
    topic={currentTopic}
    subject={subject}
    grade={grade}
    onClose={() => setShowProveIt(false)}
  />
)}
      {showLibrary && (
        <MathFormulaLibrary formulas={savedFormulas}
          onRemove={id => setSavedFormulas(prev => prev.filter(f => f.id !== id))}
          onClose={() => setShowLibrary(false)}/>
      )}
      {showSims && (
        <MathSimsLibrary keywords={keywords} topic={currentTopic ?? ""} onClose={() => setShowSims(false)}/>
      )}
      {showCoreLib && (
  <CoreLibrary
    graphs={savedGraphs}
    onLoad={g => { setCurrentGraph({ nodes: g.nodes, edges: g.edges }); setCurrentTopic(g.topic); }}
    onDelete={id => setSavedGraphs(prev => prev.filter(g => g.id !== id))}
    onClose={() => setShowCoreLib(false)}
  />
)}

      {/* Sidebar */}
      <aside style={{ width:210,flexShrink:0,background:M.surface,borderRight:`1px solid ${M.border}`,display:"flex",flexDirection:"column",padding:"20px 0" }}>
        {/* Logo */}
        <div style={{ padding:"0 18px 20px",borderBottom:`1px solid ${M.border}` }}>
          <div style={{ color:M.gold,fontWeight:900,fontSize:18,letterSpacing:"-0.5px" }}>
            Effectua<span style={{ color:M.text }}>L</span>
          </div>
          <div style={{ color:M.muted,fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",marginTop:2 }}>Math Mode</div>
        </div>

        {/* Mode switch */}
        <div style={{ padding:"14px 12px",borderBottom:`1px solid ${M.border}` }}>
          <button onClick={onSwitchToScience} style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:9,border:`1px solid ${M.border}`,background:"transparent",cursor:"pointer",color:M.muted,fontSize:11,fontWeight:500,textAlign:"left" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=M.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=M.muted; }}>
            <span style={{ fontSize:13 }}>⚛</span>
            <span>Switch to Science</span>
          </button>
        </div>

        {/* Nav */}
        <div style={{ padding:"10px 10px",flex:1,display:"flex",flexDirection:"column",gap:3 }}>
          <div style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:8,background:M.goldDim,borderLeft:`2px solid ${M.gold}`,color:M.gold,fontSize:12,fontWeight:600 }}>
            <span style={{ fontFamily:"serif",fontSize:14,fontStyle:"italic" }}>∑</span>
            <span>Math Graph</span>
          </div>

          <button onClick={() => setShowLibrary(true)} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:M.muted,fontSize:12,textAlign:"left",borderLeft:"2px solid transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=M.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=M.muted; }}>
            <span style={{ fontFamily:"serif",fontSize:13 }}>★</span>
            <span style={{ flex:1 }}>Formula Library</span>
            {savedFormulas.length > 0 && (
              <span style={{ fontSize:9,fontWeight:800,background:M.goldDim,color:M.gold,padding:"2px 6px",borderRadius:99,border:`1px solid ${M.gold}44` }}>{savedFormulas.length}</span>
            )}
          </button>

          <button onClick={() => setShowSims(true)} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:M.muted,fontSize:12,textAlign:"left",borderLeft:"2px solid transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=M.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=M.muted; }}>
            <span style={{ fontFamily:"serif",fontSize:13 }}>∿</span>
            <span style={{ flex:1 }}>Simulations</span>
            <span style={{ fontSize:8,fontWeight:800,letterSpacing:"0.1em",background:M.goldDim,color:M.gold,padding:"2px 6px",borderRadius:99,border:`1px solid ${M.gold}44` }}>NEW</span>
          </button>

          <button onClick={() => currentTopic && setShowQuiz(true)} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:8,border:"none",cursor:currentTopic?"pointer":"default",background:"transparent",color:currentTopic?M.muted:"rgba(255,255,255,0.18)",fontSize:12,textAlign:"left",borderLeft:"2px solid transparent" }}
            onMouseEnter={e => { if(currentTopic){ (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=M.text; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=currentTopic?M.muted:"rgba(255,255,255,0.18)"; }}>
            <span style={{ fontFamily:"serif",fontSize:13 }}>?</span>
            <span style={{ flex:1 }}>Quick Quiz</span>
            {!currentTopic && <span style={{ fontSize:8,color:"rgba(255,255,255,0.18)" }}>ask first</span>}
          </button>
        </div>
        

        <button onClick={() => setShowCoreLib(true)}
  style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:M.muted,fontSize:12,textAlign:"left",borderLeft:"2px solid transparent" }}
  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color=M.text; }}
  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color=M.muted; }}>
  <span style={{ fontFamily:"serif",fontSize:13 }}>◈</span>
  <span style={{ flex:1 }}>Core Library</span>
  {savedGraphs.length > 0 && (
    <span style={{ fontSize:9,fontWeight:800,background:M.indigoDim,color:M.indigo,padding:"2px 6px",borderRadius:99,border:`1px solid ${M.indigo}44` }}>
      {savedGraphs.length}
    </span>
  )}
</button>

        {/* Related Sims */}
        {quickSims.length > 0 && (
          <div style={{ padding:"0 10px 12px",borderTop:`1px solid ${M.border}`,paddingTop:12 }}>
            <div style={{ fontSize:9,fontWeight:700,letterSpacing:"0.14em",color:M.muted,textTransform:"uppercase",marginBottom:7,padding:"0 3px" }}>Related Sims</div>
            {quickSims.map(s => (
              <a key={s.filename} href={`https://effectuall.github.io/Simulations/${s.filename}`} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex",alignItems:"center",gap:7,padding:"6px 8px",borderRadius:7,marginBottom:4,textDecoration:"none",background:"transparent",border:`1px solid ${M.border}`,transition:"all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=`${s.color}0d`; (e.currentTarget as HTMLElement).style.borderColor=`${s.color}55`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.borderColor=M.border; }}>
                <div style={{ width:5,height:5,borderRadius:"50%",background:s.color,flexShrink:0 }}/>
                <span style={{ fontSize:10,color:M.text,flex:1,lineHeight:1.2 }}>{s.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Node shape legend — no emoji, shows actual mini shapes */}
        <div style={{ padding:"10px 14px",borderTop:`1px solid ${M.border}` }}>
          <div style={{ fontSize:9,fontWeight:700,color:M.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8 }}>Node Types</div>
          {LEGEND.map(l => {
            const v = NODE_VISUALS[l.type];
            return (
              <div key={l.type} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                {/* Mini shape preview */}
                <svg width={18} height={18} viewBox="-9 -9 18 18" style={{ flexShrink: 0 }}>
                  <NodeShape type={l.type} r={7} color={v.color} active={false} cx={0} cy={0}/>
                </svg>
                <span style={{ fontSize:10,color:M.muted }}>{v.symbol}</span>
                <span style={{ fontSize:10,color:M.muted }}>{l.label}</span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1,overflowY:"auto",padding:22 }}>
        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
          <div>
            <h1 style={{ fontSize:19,fontWeight:800,color:M.text,letterSpacing:"-0.4px",display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ color:M.gold,fontFamily:"'Cambria Math',serif",fontStyle:"italic",fontSize:22 }}>∑</span>
              Math Universe
            </h1>
            <p style={{ fontSize:12,color:M.muted,marginTop:2 }}>
              {currentTopic ? `Exploring: ${currentTopic}` : "Ask a question to start building theorem graphs"}
            </p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            {savedFormulas.length > 0 && (
              <button onClick={() => setShowLibrary(true)} style={{ padding:"5px 13px",borderRadius:99,background:M.goldDim,border:`1px solid ${M.gold}44`,fontSize:10,color:M.gold,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
                ★ {savedFormulas.length}
              </button>
            )}
            <div style={{ padding:"5px 13px",borderRadius:99,background:M.goldDim,border:`1px solid ${M.gold}33`,fontSize:10,color:M.gold,fontWeight:600 }}>{subject}</div>
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 330px",gap:18 }}>
          {/* Left column */}
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            {/* Graph card */}
            <div style={{ background:M.card,borderRadius:16,border:`1px solid ${M.border}`,overflow:"hidden" }}>
              <div style={{ padding:"13px 18px",borderBottom:`1px solid ${M.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ color:M.gold,fontFamily:"serif",fontStyle:"italic",fontSize:15 }}>∑</span>
                  <span style={{ fontSize:13,fontWeight:600,color:M.text }}>Theorem Graph</span>
                  {currentTopic && (
                    <span style={{ fontSize:9,color:M.gold,background:M.goldDim,padding:"2px 8px",borderRadius:99 }}>{currentTopic}</span>
                  )}
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  {currentGraph.nodes.some(n => n.formula) && (
                    <span style={{ fontSize:10,color:M.muted }}>click <span style={{ color:M.gold }}>☆</span> to save formulas</span>
                  )}
                  {currentTopic && currentGraph.nodes.length > 0 && (
  <button onClick={() => setSavedGraphs(gs => {
    if (gs.some(g => g.topic === currentTopic)) return gs;
    return [{ id:`graph_${Date.now()}`, topic:currentTopic, nodes:currentGraph.nodes, edges:currentGraph.edges, savedAt:Date.now() }, ...gs];
  })} style={{ padding:"4px 11px",borderRadius:99,border:`1px solid ${M.indigo}44`,background:"transparent",cursor:"pointer",fontSize:10,color:M.indigo,fontWeight:600 }}>
    + Save Graph
  </button>
)}
                  {currentTopic && (
                    <button onClick={() => setShowProveIt(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 13px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:800,background:`linear-gradient(135deg,${M.gold},${M.indigo})`,color:"#05060f",animation:"provePulse 2.5s ease-in-out infinite" }}>
                      ∴ Prove It
                    </button>
                  )}
                </div>
              </div>
              <div style={{ padding:10 }}>
                <MathKnowledgeGraph
                  nodes={currentGraph.nodes} edges={currentGraph.edges}
                  onNodeClick={n => setActiveNode(prev => prev?.id === n.id ? null : n)}
                  activeNode={activeNode?.id ?? null}
                  savedIds={savedIds} onSave={handleSaveFormula}/>
              </div>
            </div>

            {/* Active node detail */}
            {activeNode && (() => {
              const v = NODE_VISUALS[activeNode.type];
              return (
                <div style={{ background:M.card,borderRadius:12,border:`1px solid ${v.color}44`,padding:"16px 20px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
                    {/* Shape preview */}
                    <svg width={40} height={40} viewBox="-20 -20 40 40" style={{ flexShrink: 0 }}>
                      <NodeShape type={activeNode.type} r={16} color={v.color} active={true} cx={0} cy={0}/>
                    </svg>
                    <div>
                      <div style={{ color:M.text,fontSize:14,fontWeight:700 }}>{activeNode.label}</div>
                      <div style={{ fontSize:10,marginTop:2,display:"flex",alignItems:"center",gap:5 }}>
                        <span style={{ color:v.color,fontFamily:"serif",fontStyle:"italic",fontSize:13 }}>{v.symbol}</span>
                        <span style={{ color:v.color,textTransform:"uppercase",letterSpacing:"0.1em",fontSize:9 }}>{v.abbrev}</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveNode(null)} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:M.muted,fontSize:18 }}>×</button>
                  </div>
                  {activeNode.formula && (
                    <div style={{ background:M.surface,borderRadius:10,padding:"14px 16px",border:`1px solid ${v.color}22` }}>
                      <MathLaTeX formula={activeNode.formula} size={16} color={v.color}/>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right column */}
          <div style={{ height:460 }}>
            <MathChatPanel
              onResult={handleResult}
              subject={subject} setSubject={setSubject}
              grade={grade} setGrade={setGrade}
              currentTopic={currentTopic}
              currentNodes={currentGraph.nodes}/>
          </div>
        </div>
      </main>
    </div>
  );
}