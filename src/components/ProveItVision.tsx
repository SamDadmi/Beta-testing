/**
 * ProveItVision.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement / enhancement for the Prove It feature.
 * Uses the Anthropic Vision API (claude-sonnet-4-20250514) to analyse
 * hand-drawn / typed solutions on a canvas.
 *
 * HOW TO USE IN YOUR EXISTING CODE:
 * ───────────────────────────────────
 * 1. Copy this file next to MathMode.tsx
 * 2. In MathMode.tsx, replace the ProveItTool import/usage:
 *
 *    // Old:
 *    import ProveItTool (inline in the same file)
 *
 *    // New — at the top of MathMode.tsx add:
 *    import ProveItVision from './ProveItVision';
 *
 *    // Then wherever you render <ProveItTool ...> replace with:
 *    <ProveItVision
 *      topic={currentTopic}
 *      subject={subject}
 *      grade={grade}
 *      onClose={() => setShowProveIt(false)}
 *    />
 *
 * 3. The component uses the SAME OpenRouter key you already have:
 *    import.meta.env.VITE_OPENROUTER_API_KEY
 *    (vision is routed through claude-sonnet-4-20250514 via OpenRouter)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Colour palette (mirrors MathMode's M object) ────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProveItData {
  exampleQuestion: string;
  exampleSolution:  string;
  studentQuestion:  string;
  correctAnswer:    string;
  steps:            string[];
  hints:            string[];
}

interface VisionGradeResult {
  score:          number;        // 0-100
  correct:        boolean;
  stepScores:     StepScore[];
  overallFeedback: string;
  encouragement:  string;
  detectedWork:   string;        // AI's transcription of what it read
  errorAnnotations: ErrorAnnotation[];
}

interface StepScore {
  step:      string;
  found:     boolean;
  feedback:  string;
  severity:  "correct" | "minor" | "major" | "missing";
}

interface ErrorAnnotation {
  description: string;
  type: "algebra" | "notation" | "logic" | "incomplete" | "correct";
}

interface DrawTool { type: "pen" | "eraser" | "highlight"; size: number; color: string; }

interface Props {
  topic:   string;
  subject: string;
  grade:   string;
  onClose: () => void;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function generateProveItProblems(topic: string, subject: string, grade: string): Promise<ProveItData> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL ProveItVision",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      temperature: 0.6,
      max_tokens: 1800,
      messages: [{
        role: "system",
        content: `You are a math teacher. Output ONLY valid JSON, no markdown.
Schema: {
  "exampleQuestion": "a specific problem",
  "exampleSolution": "Step 1: ...\\nStep 2: ...\\nFinal Answer: ...",
  "steps": ["step 1 text","step 2 text","..."],
  "hints": ["hint 1","hint 2"],
  "studentQuestion": "similar problem, different numbers",
  "correctAnswer": "the answer string"
}
CRITICAL RULES:
- The steps[] array MUST use the EXACT same numbers as studentQuestion (not the example numbers).
- correctAnswer MUST be the mathematically correct answer to studentQuestion.
- Double-check all arithmetic before outputting.
- steps[] should describe what to DO, using the actual numbers from studentQuestion.`,
      }, {
        role: "user",
        content: `Create a ${subject} (${grade} level) problem pair about: "${topic}"`,
      }],
    }),
  });
  if (!res.ok) throw new Error("API failed");
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()) as ProveItData; }
  catch {
    return {
      exampleQuestion: "Find d/dx of x²",
      exampleSolution: "Step 1: Apply power rule d/dx(xⁿ) = nxⁿ⁻¹\nStep 2: n=2 → d/dx(x²) = 2x\nFinal Answer: 2x",
      steps: ["Apply power rule", "Substitute n=2", "Simplify"],
      hints: ["Use the power rule d/dx(xⁿ) = nxⁿ⁻¹", "What is n in this case?"],
      studentQuestion: "Find d/dx of x³",
      correctAnswer: "3x²",
    };
  }
}

// ─── PHASE 1: Transcribe the canvas image into text ──────────────────────────
async function transcribeCanvas(base64: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL ProveItVision",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      temperature: 0,
      max_tokens: 600,
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64}` },
          },
          {
            type: "text",
            text: `You are a math OCR engine. Read EVERY number, symbol, and equation visible in this image EXACTLY as written — do not correct or interpret, just transcribe.

Rules:
- Copy every digit and symbol literally. If it says "45" write "45" even if you think it should be "25".
- Preserve equals signs, square roots, exponents, fractions exactly as drawn.
- Write each line of working on its own line.
- If the canvas is blank or has no math, write only: BLANK

Output ONLY the raw transcription, nothing else.`,
          },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "BLANK";
}

// ─── PHASE 2: Grade the transcription arithmetically ─────────────────────────
async function gradeTranscription(
  transcription: string,
  problem: ProveItData,
  subject: string,
): Promise<VisionGradeResult> {
  const numSteps = problem.steps.length;
  const pointsPerStep = Math.floor(100 / numSteps);

  const gradePrompt = `You are a ruthless math examiner. Grade this student's work with ZERO tolerance.

PROBLEM: ${problem.studentQuestion}
CORRECT FINAL ANSWER: ${problem.correctAnswer}
REQUIRED STEPS: ${problem.steps.map((s, i) => `Step ${i+1}: ${s}`).join("\n")}
POINTS PER STEP: ${pointsPerStep} (${numSteps} steps × ${pointsPerStep} = 100 total)

STUDENT'S TRANSCRIBED WORK:
"""
${transcription}
"""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY GRADING PROCEDURE — FOLLOW EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP A — ARITHMETIC VERIFICATION (do this first, mechanically):
For EVERY numeric calculation in the student's work, verify it yourself:
- Check every squaring: e.g. if student writes 5²=45, verify: 5×5=25 ≠ 45 → ARITHMETIC ERROR
- Check every addition: e.g. 25+135=169, verify: 25+135=160 ≠ 169 → ARITHMETIC ERROR  
- Check every square root: e.g. √169=15, verify: √169=13 ≠ 15 → ARITHMETIC ERROR
- List every error you find.

STEP B — FINAL ANSWER CHECK:
Extract what appears to be the student's final answer from the transcription.
Compare character by character against "${problem.correctAnswer}".
If they differ in ANY way → correct=false, score ≤ 40.

STEP C — STEP SCORING:
For each required step, check if it appears correctly in the work.
Severity rules (NON-NEGOTIABLE):
- "correct" = step present, all numbers right, method right
- "minor" = step present, method right, tiny notation slip only (e.g. missing parenthesis) that does NOT affect the answer
- "major" = ANY arithmetic error in this step, or wrong method, or wrong numbers used
- "missing" = step entirely absent from the work

Score deductions:
- correct → deduct 0
- minor → deduct ${Math.round(pointsPerStep * 0.15)}
- major → deduct ${pointsPerStep}
- missing → deduct ${pointsPerStep}

STEP D — FINAL SCORE:
Start at 100, subtract deductions. If final answer wrong → cap at 40. If blank → score=0.
Score of 100 ONLY if every single step is "correct" AND final answer matches exactly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT — JSON ONLY, NO OTHER TEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "score": <integer 0-100>,
  "correct": <true ONLY if final answer exactly = "${problem.correctAnswer}">,
  "detectedWork": "${transcription.replace(/"/g, "'")}",
  "overallFeedback": "<2-3 sentences naming SPECIFIC errors with exact numbers. E.g. 'You wrote 5²=45 but 5×5=25. You wrote √135=...' Be blunt and precise.>",
  "encouragement": "<1 honest sentence matching the score>",
  "stepScores": [${problem.steps.map((s, i) => `
    {
      "step": "${s}",
      "found": <true|false>,
      "feedback": "<quote the student's exact line for this step, then state if correct or name the exact error>",
      "severity": "<correct|minor|major|missing>"
    }`).join(",")}
  ],
  "errorAnnotations": [
    <list every arithmetic error found in Step A, plus any other issues, as annotation objects>
    { "description": "<exact error e.g. '5²=45 is wrong, 5²=25'>", "type": "algebra" }
  ]
}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EffectuaL ProveItVision",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      temperature: 0,
      max_tokens: 2000,
      messages: [{ role: "user", content: gradePrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Grading API error: ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";

  // Strip markdown code fences if present
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find the JSON object
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in grading response");
  return JSON.parse(clean.slice(start, end + 1)) as VisionGradeResult;
}

// ─── Main gradeWithVision: runs phase 1 then phase 2 ────────────────────────
async function gradeWithVision(
  canvasDataUrl: string,
  problem: ProveItData,
  subject: string,
): Promise<VisionGradeResult> {
  const base64 = canvasDataUrl.split(",")[1];

  // Phase 1: Get exact transcription from vision model
  const transcription = await transcribeCanvas(base64);

  if (transcription === "BLANK") {
    return {
      score: 0, correct: false,
      detectedWork: "blank canvas",
      overallFeedback: "No work was drawn on the canvas. Please write out your full solution showing every step.",
      encouragement: "Start by writing the formula, then substitute the values step by step.",
      stepScores: problem.steps.map(s => ({ step: s, found: false, feedback: "Not attempted.", severity: "missing" as const })),
      errorAnnotations: [{ description: "Canvas is blank — no work submitted", type: "incomplete" as const }],
    };
  }

  // Phase 2: Grade the transcription with arithmetic verification
  try {
    return await gradeTranscription(transcription, problem, subject);
  } catch (e) {
    // Fallback with the transcription at least visible
    return {
      score: 0, correct: false,
      detectedWork: transcription,
      overallFeedback: "Grading encountered an error. Your work was read successfully — please try submitting again.",
      encouragement: "Your handwriting was readable — just try again!",
      stepScores: [],
      errorAnnotations: [],
    };
  }
}

// ─── Math Symbol Palette ──────────────────────────────────────────────────────
const SYMBOL_ROWS = [
  ["∫","∑","∏","∂","∇","√","∞","→","⇒","⟺"],
  ["α","β","γ","δ","θ","λ","π","σ","ω","φ"],
  ["≤","≥","≠","≈","≡","∈","∉","⊂","∪","∩"],
  ["ℝ","ℤ","ℕ","ℚ","∀","∃","∴","∵","±","×"],
];

// ─── Canvas Drawing Component ─────────────────────────────────────────────────
function DrawingCanvas({
  tool, onCanvasChange,
}: {
  tool: DrawTool;
  onCanvasChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const getPoint = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    isDrawing.current = true;
    const pt = getPoint(e, canvas);
    lastPoint.current = pt;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, tool.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool.type === "eraser" ? "#0e0f1c" : tool.color;
    ctx.fill();
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pt = getPoint(e, canvas);
    const last = lastPoint.current!;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = tool.type === "eraser" ? "#0e0f1c" : tool.color;
    ctx.lineWidth = tool.type === "eraser" ? tool.size * 2.5 : tool.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = tool.type === "highlight" ? 0.35 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    lastPoint.current = pt;
  };

  const stopDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current; if (!canvas) return;
    onCanvasChange(canvas.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0e0f1c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onCanvasChange(canvas.toDataURL("image/png"));
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0e0f1c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={900} height={480}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{
          width: "100%", height: "100%",
          display: "block",
          borderRadius: 12,
          cursor: tool.type === "eraser" ? "cell" : "crosshair",
          touchAction: "none",
        }}
      />
      {!hasContent && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <div style={{ fontSize: 42, color: M.gold, opacity: 0.13, fontFamily: "serif", fontStyle: "italic" }}>✎</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", textAlign: "center", lineHeight: 1.7 }}>
            Draw your solution here<br/>
            <span style={{ fontSize: 10 }}>Use the tools above · Touch supported</span>
          </div>
        </div>
      )}
      {hasContent && (
        <button onClick={clearCanvas} style={{
          position: "absolute", bottom: 12, right: 12,
          padding: "5px 12px", borderRadius: 7, border: `1px solid ${M.border}`,
          background: "rgba(7,8,15,0.8)", color: M.muted, fontSize: 10, cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}>
          Clear ✕
        </button>
      )}
    </div>
  );
}

// ─── Step Score Badge ─────────────────────────────────────────────────────────
function StepBadge({ step }: { step: StepScore }) {
  const cfg = {
    correct:   { color: M.green,  bg: M.greenDim,  icon: "✓" },
    minor:     { color: M.gold,   bg: M.goldDim,   icon: "⚠" },
    major:     { color: M.red,    bg: "rgba(248,113,113,0.12)", icon: "✗" },
    missing:   { color: M.muted,  bg: M.surface,   icon: "○" },
  }[step.severity];
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 14px", borderRadius: 10,
      background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>
      <span style={{ fontSize: 13, color: cfg.color, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>{cfg.icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginBottom: 3 }}>{step.step}</div>
        <div style={{ fontSize: 11, color: M.muted, lineHeight: 1.5 }}>{step.feedback}</div>
      </div>
    </div>
  );
}

// ─── Annotation Chip ──────────────────────────────────────────────────────────
function AnnotationChip({ ann }: { ann: ErrorAnnotation }) {
  const cfgMap: Record<string, { color: string; label: string }> = {
    algebra:    { color: M.red,    label: "Algebra"    },
    notation:   { color: M.gold,   label: "Notation"   },
    logic:      { color: M.indigo, label: "Logic"      },
    incomplete: { color: M.orange, label: "Incomplete" },
    correct:    { color: M.green,  label: "Correct"    },
  };
  const cfg = cfgMap[ann.type] ?? { color: M.muted, label: ann.type ?? "Note" };
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 8,
      background: `${cfg.color}10`, border: `1px solid ${cfg.color}33`,
      display: "flex", gap: 8, alignItems: "flex-start",
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, background: `${cfg.color}20`,
        padding: "2px 6px", borderRadius: 99, flexShrink: 0, marginTop: 1 }}>
        {cfg.label}
      </span>
      <span style={{ fontSize: 11, color: M.text, lineHeight: 1.5 }}>{ann.description}</span>
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 90 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? M.green : score >= 55 ? M.gold : M.red;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={size * 0.055}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={size * 0.055}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}/>
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: color, fontSize: size * 0.22, fontWeight: 900, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
        {score}
      </text>
      <text x={size/2} y={size/2 + size * 0.17} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: M.muted, fontSize: size * 0.1, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
        /100
      </text>
    </svg>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ProveItVision({ topic, subject, grade, onClose }: Props) {
  type Phase = "loading" | "example" | "draw" | "grading" | "results";
  const [phase, setPhase] = useState<Phase>("loading");
  const [problems, setProblems] = useState<ProveItData | null>(null);
  const [gradeResult, setGradeResult] = useState<VisionGradeResult | null>(null);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Drawing tool state
  const [tool, setTool] = useState<DrawTool>({ type: "pen", size: 2.5, color: "#f5f5f5" });
  const [penColor, setPenColor] = useState<string>("#f5f5f5");
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  // Symbol input overlay
  const [showSymbols, setShowSymbols] = useState(false);

  useEffect(() => {
    generateProveItProblems(topic, subject, grade)
      .then(p => { setProblems(p); setPhase("example"); })
      .catch(e => { setError(e.message); setPhase("example"); });
  }, [topic, subject, grade]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleGrade = useCallback(async () => {
    if (!canvasDataUrl || !problems) return;
    setPhase("grading");
    try {
      const result = await gradeWithVision(canvasDataUrl, problems, subject);
      setGradeResult(result);
      setPhase("results");
    } catch (e) {
      setError((e as Error).message);
      setPhase("grading"); // stay, show error
    }
  }, [canvasDataUrl, problems, subject]);

  const handleRetry = () => {
    setGradeResult(null);
    setCanvasDataUrl("");
    setShowHint(false);
    setHintIndex(0);
    setPhase("draw");
  };

  const PEN_COLORS = ["#f5f5f5","#f5c842","#818cf8","#22d3ee","#34d399","#f87171","#fb923c","#f472b6"];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000, background: M.bg,
      fontFamily: "'DM Sans',system-ui,sans-serif", overflow: "hidden",
    }}>
      {/* Ambient grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(245,200,66,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(245,200,66,0.018) 1px,transparent 1px)`,
        backgroundSize: "52px 52px",
      }}/>
      {/* Glow orbs */}
      <div style={{ position: "absolute", top: -120, right: -80, width: 420, height: 420, pointerEvents: "none",
        background: `radial-gradient(circle,${M.gold}0f,transparent 68%)` }}/>
      <div style={{ position: "absolute", bottom: -80, left: -60, width: 320, height: 320, pointerEvents: "none",
        background: `radial-gradient(circle,${M.indigo}0c,transparent 68%)` }}/>

      <div style={{ position: "relative", zIndex: 1, height: "100vh", display: "flex", flexDirection: "column" }}>

        {/* ── Header ── */}
        <div style={{
          padding: "14px 28px", borderBottom: `1px solid ${M.border}`,
          background: "rgba(13,15,30,0.92)", backdropFilter: "blur(14px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, fontSize: 17,
              background: `linear-gradient(135deg,${M.gold}22,${M.indigo}22)`,
              border: `1px solid ${M.gold}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: M.gold, fontFamily: "serif",
            }}>✎</div>
            <div>
              <div style={{ color: M.text, fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>
                Prove It — Vision AI
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: M.gold, background: M.goldDim, padding: "1px 7px", borderRadius: 99 }}>{topic}</span>
                <span style={{ fontSize: 9, color: M.indigo, background: M.indigoDim, padding: "1px 7px", borderRadius: 99 }}>Vision Grading</span>
                <span style={{ fontSize: 9, color: M.muted }}>{subject}</span>
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(["example","draw","results"] as const).map((s, i) => {
              const labels = ["Study", "Draw", "Review"];
              const active = phase === s || (phase === "grading" && s === "results");
              const done = (phase === "draw" && i === 0) || (phase === "results" && i < 2) || (phase === "grading" && i < 2);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", fontSize: 9, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? M.green : active ? `linear-gradient(135deg,${M.gold},${M.indigo})` : M.surface,
                      color: (active || done) ? "#05060f" : M.muted,
                      border: `1px solid ${M.border}`,
                    }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 9, color: active ? M.text : M.muted, fontWeight: 500 }}>{labels[i]}</span>
                  </div>
                  {i < 2 && <div style={{ width: 20, height: 1, background: M.border }}/>}
                </div>
              );
            })}
          </div>

          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 7, border: `1px solid ${M.border}`,
            background: "transparent", cursor: "pointer", color: M.muted, fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>

          {/* LOADING */}
          {phase === "loading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "65vh", gap: 16 }}>
              <div style={{ fontSize: 38, color: M.gold, fontFamily: "serif", fontStyle: "italic" }}>✎</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: M.text }}>Preparing your problem set…</div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: M.gold, animation: `pvDot 1.2s ${i*0.15}s ease-in-out infinite` }}/>
                ))}
              </div>
            </div>
          )}

          {/* EXAMPLE */}
          {phase === "example" && problems && (
            <div style={{ maxWidth: 820, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: M.text, letterSpacing: "-0.5px" }}>Study the Example</div>
                <div style={{ fontSize: 12, color: M.muted, marginTop: 4 }}>Understand the method — then you'll solve a similar problem by drawing</div>
              </div>

              <div style={{ background: M.card, borderRadius: 18, border: `1px solid ${M.gold}44`, overflow: "hidden", marginBottom: 20 }}>
                <div style={{ padding: "14px 22px", background: `${M.gold}0d`, borderBottom: `1px solid ${M.gold}22`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: M.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>Worked Example</span>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ background: M.surface, borderRadius: 10, padding: "14px 18px", marginBottom: 16, border: `1px solid ${M.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: M.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Problem</div>
                    <div style={{ fontSize: 14, color: M.text, lineHeight: 1.8, fontFamily: "'Cambria Math','Times New Roman',serif", fontStyle: "italic" }}>
                      {problems.exampleQuestion}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {problems.exampleSolution.split("\n").map((line, idx) => {
                      const isFinal = line.toLowerCase().startsWith("final");
                      return (
                        <div key={idx} style={{
                          display: "flex", gap: 10, alignItems: "flex-start",
                          padding: "10px 14px", borderRadius: 9,
                          background: isFinal ? `${M.gold}0f` : M.surface,
                          border: `1px solid ${isFinal ? M.gold+"33" : M.border}`,
                        }}>
                          {!isFinal && (
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                              background: `${M.indigo}22`, border: `1px solid ${M.indigo}44`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, fontWeight: 800, color: M.indigo, marginTop: 1,
                            }}>{idx + 1}</div>
                          )}
                          {isFinal && <span style={{ fontSize: 14, color: M.gold, flexShrink: 0, marginTop: 1 }}>✓</span>}
                          <span style={{
                            fontSize: 13, color: isFinal ? M.gold : M.text,
                            lineHeight: 1.6, fontWeight: isFinal ? 700 : 400,
                            fontFamily: "'Cambria Math','Times New Roman',serif",
                          }}>
                            {line.replace(/^(Step \d+:|Final Answer:)\s*/i, "")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Vision AI callout */}
              <div style={{
                background: M.indigoDim, borderRadius: 12, border: `1px solid ${M.indigo}44`,
                padding: "14px 20px", display: "flex", gap: 14, alignItems: "center", marginBottom: 20,
              }}>
                <div style={{ fontSize: 24, color: M.indigo }}>👁</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: M.indigo, marginBottom: 4 }}>Vision AI Grading</div>
                  <div style={{ fontSize: 11, color: M.muted, lineHeight: 1.6 }}>
                    When you submit, <strong style={{ color: M.text }}>Claude's vision model</strong> will analyse your
                    handwritten work — reading every step, spotting errors, and giving line-by-line feedback.
                    Show your full working, not just the answer!
                  </div>
                </div>
              </div>

              <button onClick={() => setPhase("draw")} style={{
                width: "100%", padding: "13px", borderRadius: 11, border: "none",
                cursor: "pointer", background: `linear-gradient(135deg,${M.gold},${M.indigo})`,
                color: "#05060f", fontSize: 13, fontWeight: 900, letterSpacing: "-0.2px",
              }}>
                I understand — give me the problem ✎
              </button>
            </div>
          )}

          {/* DRAW */}
          {phase === "draw" && problems && (
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>

                {/* Canvas area */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Toolbar */}
                  <div style={{
                    background: M.card, borderRadius: 12, border: `1px solid ${M.border}`,
                    padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                  }}>
                    {/* Tool buttons */}
                    <div style={{ display: "flex", gap: 5 }}>
                      {(["pen","highlight","eraser"] as const).map(t => (
                        <button key={t} onClick={() => setTool(prev => ({ ...prev, type: t, color: t === "eraser" ? "#0e0f1c" : penColor }))}
                          style={{
                            padding: "5px 11px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer",
                            border: `1px solid ${tool.type === t ? M.gold+"66" : M.border}`,
                            background: tool.type === t ? M.goldDim : "transparent",
                            color: tool.type === t ? M.gold : M.muted,
                          }}>
                          {t === "pen" ? "✏ Pen" : t === "highlight" ? "⬛ Highlight" : "⊘ Eraser"}
                        </button>
                      ))}
                    </div>

                    {/* Size */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, color: M.muted, fontWeight: 600 }}>SIZE</span>
                      {[1.5, 2.5, 4, 7].map(sz => (
                        <button key={sz} onClick={() => setTool(prev => ({ ...prev, size: sz }))}
                          style={{
                            width: sz * 4 + 14, height: 22, borderRadius: 5, cursor: "pointer",
                            border: `1px solid ${tool.size === sz ? M.gold+"66" : M.border}`,
                            background: tool.size === sz ? M.goldDim : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                          <div style={{ width: sz * 3, height: sz * 3, borderRadius: "50%", background: tool.size === sz ? M.gold : M.muted }}/>
                        </button>
                      ))}
                    </div>

                    {/* Colour swatches */}
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: M.muted, fontWeight: 600 }}>COLOR</span>
                      {PEN_COLORS.map(c => (
                        <button key={c} onClick={() => { setPenColor(c); setTool(prev => ({ ...prev, color: c, type: prev.type === "eraser" ? "pen" : prev.type })); }}
                          style={{
                            width: 16, height: 16, borderRadius: "50%", background: c, border: `2px solid ${penColor === c ? "#fff" : "transparent"}`,
                            cursor: "pointer", flexShrink: 0, padding: 0,
                          }}/>
                      ))}
                    </div>

                    {/* Symbol overlay toggle */}
                    <button onClick={() => setShowSymbols(s => !s)} style={{
                      marginLeft: "auto", padding: "5px 12px", borderRadius: 7, fontSize: 10, fontWeight: 700,
                      border: `1px solid ${showSymbols ? M.indigo+"66" : M.border}`,
                      background: showSymbols ? M.indigoDim : "transparent",
                      color: showSymbols ? M.indigo : M.muted, cursor: "pointer",
                    }}>
                      ∑ Symbols
                    </button>
                  </div>

                  {/* Canvas */}
                  <div style={{
                    background: M.surface, borderRadius: 14, border: `1px solid ${M.border}`,
                    overflow: "hidden", aspectRatio: "900/480", position: "relative",
                  }}>
                    <DrawingCanvas tool={tool} onCanvasChange={setCanvasDataUrl}/>
                  </div>

                  {/* Symbol palette (shown inline below canvas when toggled) */}
                  {showSymbols && (
                    <div style={{
                      background: M.card, borderRadius: 10, border: `1px solid ${M.indigo}44`,
                      padding: "10px 14px",
                    }}>
                      <div style={{ fontSize: 9, color: M.indigo, fontWeight: 700, marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        Symbol Reference (copy & use as visual guide)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {SYMBOL_ROWS.map((row, ri) => (
                          <div key={ri} style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {row.map(sym => (
                              <button key={sym} onClick={() => navigator.clipboard.writeText(sym).catch(() => {})}
                                style={{
                                  padding: "4px 8px", borderRadius: 5, border: `1px solid ${M.border}`,
                                  background: M.surface, color: M.text, cursor: "pointer",
                                  fontSize: 14, fontFamily: "'Cambria Math',serif", minWidth: 32, textAlign: "center",
                                  transition: "border-color 0.1s",
                                }}
                                title="Click to copy">
                                {sym}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 9, color: M.muted, marginTop: 7 }}>Click any symbol to copy it</div>
                    </div>
                  )}

                  {/* Submit row */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleGrade} disabled={!canvasDataUrl}
                      style={{
                        flex: 1, padding: "12px", borderRadius: 10, border: "none",
                        cursor: canvasDataUrl ? "pointer" : "default",
                        background: canvasDataUrl ? `linear-gradient(135deg,${M.gold},${M.indigo})` : M.border,
                        color: canvasDataUrl ? "#05060f" : M.muted,
                        fontSize: 13, fontWeight: 900, transition: "all 0.2s",
                      }}>
                      👁 Submit for Vision Grading →
                    </button>
                    <button onClick={() => setPhase("example")} style={{
                      padding: "12px 18px", borderRadius: 10, background: "transparent",
                      border: `1px solid ${M.border}`, color: M.muted, cursor: "pointer", fontSize: 11, fontWeight: 600,
                    }}>
                      ← Example
                    </button>
                  </div>
                </div>

                {/* Right panel: problem + hints */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Problem card */}
                  <div style={{ background: M.card, borderRadius: 14, border: `1px solid ${M.indigo}44`, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: `${M.indigo}0d`, borderBottom: `1px solid ${M.indigo}22` }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: M.indigo, letterSpacing: "0.12em", textTransform: "uppercase" }}>Your Problem</span>
                    </div>
                    <div style={{ padding: "16px" }}>
                      <div style={{
                        fontSize: 14, color: M.text, lineHeight: 1.8,
                        fontFamily: "'Cambria Math','Times New Roman',serif", fontStyle: "italic",
                      }}>
                        {problems.studentQuestion}
                      </div>
                    </div>
                  </div>

                  {/* Expected steps */}
                  <div style={{ background: M.card, borderRadius: 14, border: `1px solid ${M.border}`, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${M.border}` }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: M.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>Expected Steps</span>
                    </div>
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                      {problems.steps.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                            background: M.indigoDim, border: `1px solid ${M.indigo}44`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 8, fontWeight: 800, color: M.indigo,
                          }}>{i+1}</div>
                          <span style={{ fontSize: 11, color: M.muted, lineHeight: 1.5 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hints */}
                  {problems.hints?.length > 0 && (
                    <div style={{ background: M.card, borderRadius: 14, border: `1px solid ${M.border}`, overflow: "hidden" }}>
                      <button onClick={() => setShowHint(s => !s)} style={{
                        width: "100%", padding: "12px 16px", background: "transparent", border: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: M.orange, letterSpacing: "0.12em", textTransform: "uppercase" }}>Hints</span>
                        <span style={{ fontSize: 12, color: M.muted }}>{showHint ? "▲" : "▼"}</span>
                      </button>
                      {showHint && (
                        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {problems.hints.slice(0, hintIndex + 1).map((h, i) => (
                            <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: `${M.orange}0c`, border: `1px solid ${M.orange}22` }}>
                              <span style={{ fontSize: 11, color: M.text, lineHeight: 1.5 }}>{h}</span>
                            </div>
                          ))}
                          {hintIndex + 1 < problems.hints.length && (
                            <button onClick={() => setHintIndex(i => i + 1)} style={{
                              padding: "6px", borderRadius: 7, background: "transparent",
                              border: `1px solid ${M.orange}44`, color: M.orange,
                              fontSize: 10, fontWeight: 700, cursor: "pointer",
                            }}>
                              Next Hint →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vision AI tip */}
                  <div style={{
                    padding: "12px 14px", borderRadius: 12,
                    background: `${M.indigo}08`, border: `1px solid ${M.indigo}33`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: M.indigo, marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>Vision AI Tips</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {["Write large and clearly", "Show every step of your working", "Label what each line is doing", "Box or underline your final answer"].map((tip, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                          <span style={{ color: M.indigo, fontSize: 9, marginTop: 2 }}>◆</span>
                          <span style={{ fontSize: 10, color: M.muted, lineHeight: 1.4 }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GRADING */}
          {phase === "grading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "65vh", gap: 18 }}>
              <div style={{ fontSize: 34, color: M.indigo }}>👁</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: M.text }}>Analysing your work…</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, background: `${M.indigo}15`, border: `1px solid ${M.indigo}33` }}>
                  <span style={{ fontSize: 11, color: M.indigo }}>Phase 1 →</span>
                  <span style={{ fontSize: 11, color: M.muted }}>Reading your handwriting exactly</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, background: `${M.gold}0d`, border: `1px solid ${M.gold}22` }}>
                  <span style={{ fontSize: 11, color: M.gold }}>Phase 2 →</span>
                  <span style={{ fontSize: 11, color: M.muted }}>Verifying every number & step</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: M.indigo, animation: `pvDot 1.2s ${i*0.12}s ease-in-out infinite` }}/>
                ))}
              </div>
              {error && (
                <div style={{ padding: "10px 18px", borderRadius: 9, background: `${M.red}12`, border: `1px solid ${M.red}44`, fontSize: 11, color: M.red, maxWidth: 400, textAlign: "center" }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* RESULTS */}
          {phase === "results" && gradeResult && problems && (
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>

                {/* Left: detailed breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Overall result banner */}
                  <div style={{
                    background: gradeResult.correct ? `${M.green}0f` : `${M.indigo}0f`,
                    borderRadius: 16, border: `1px solid ${gradeResult.correct ? M.green+"44" : M.indigo+"44"}`,
                    padding: "20px 24px", display: "flex", gap: 20, alignItems: "center",
                  }}>
                    <ScoreRing score={gradeResult.score}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: gradeResult.correct ? M.green : M.indigo, marginBottom: 6, letterSpacing: "-0.4px" }}>
                        {gradeResult.correct ? "Correct! 🎉" : `Score: ${gradeResult.score}/100`}
                      </div>
                      <div style={{ fontSize: 12, color: M.text, lineHeight: 1.7, marginBottom: 8 }}>{gradeResult.overallFeedback}</div>
                      <div style={{ fontSize: 11, color: M.gold, fontStyle: "italic" }}>"{gradeResult.encouragement}"</div>
                    </div>
                  </div>

                  {/* AI-read transcription */}
                  {gradeResult.detectedWork && gradeResult.detectedWork !== "blank canvas" && (
                    <div style={{ background: M.card, borderRadius: 12, border: `1px solid ${M.border}`, overflow: "hidden" }}>
                      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${M.border}`, display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 12, color: M.indigo }}>👁</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: M.indigo, letterSpacing: "0.1em", textTransform: "uppercase" }}>What AI Read</span>
                      </div>
                      <div style={{ padding: "13px 16px" }}>
                        <div style={{ fontSize: 12, color: M.muted, lineHeight: 1.7, fontFamily: "'Cambria Math','Times New Roman',serif", fontStyle: "italic" }}>
                          {gradeResult.detectedWork}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step-by-step scores */}
                  {gradeResult.stepScores?.length > 0 && (
                    <div style={{ background: M.card, borderRadius: 12, border: `1px solid ${M.border}`, overflow: "hidden" }}>
                      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${M.border}` }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: M.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Step-by-Step Analysis</span>
                      </div>
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {gradeResult.stepScores.map((s, i) => <StepBadge key={i} step={s}/>)}
                      </div>
                    </div>
                  )}

                  {/* Error annotations */}
                  {gradeResult.errorAnnotations?.length > 0 && (
                    <div style={{ background: M.card, borderRadius: 12, border: `1px solid ${M.border}`, overflow: "hidden" }}>
                      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${M.border}` }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: M.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Annotations</span>
                      </div>
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                        {gradeResult.errorAnnotations.map((a, i) => <AnnotationChip key={i} ann={a}/>)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: your canvas + correct answer */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Canvas preview */}
                  <div style={{ background: M.card, borderRadius: 14, border: `1px solid ${M.border}`, overflow: "hidden" }}>
                    <div style={{ padding: "11px 16px", borderBottom: `1px solid ${M.border}` }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: M.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Your Work</span>
                    </div>
                    <div style={{ padding: 12 }}>
                      <img src={canvasDataUrl} alt="Your solution" style={{ width: "100%", borderRadius: 8, border: `1px solid ${M.border}` }}/>
                    </div>
                  </div>

                  {/* Correct answer */}
                  <div style={{ background: M.card, borderRadius: 14, border: `1px solid ${M.green}44`, overflow: "hidden" }}>
                    <div style={{ padding: "11px 16px", background: `${M.green}0a`, borderBottom: `1px solid ${M.green}22` }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: M.green, letterSpacing: "0.1em", textTransform: "uppercase" }}>Correct Answer</span>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 16, color: M.green, fontFamily: "'Cambria Math','Times New Roman',serif", fontStyle: "italic", lineHeight: 1.6 }}>
                        {problems.correctAnswer}
                      </div>
                    </div>
                  </div>

                  {/* Score breakdown mini */}
                  <div style={{ background: M.card, borderRadius: 12, border: `1px solid ${M.border}`, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: M.muted, marginBottom: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Summary</div>
                    {([
                      { label: "Steps correct", val: gradeResult.stepScores.filter(s=>s.severity==="correct").length, total: gradeResult.stepScores.length, color: M.green },
                      { label: "Minor issues", val: gradeResult.stepScores.filter(s=>s.severity==="minor").length, total: gradeResult.stepScores.length, color: M.gold },
                      { label: "Major errors", val: gradeResult.stepScores.filter(s=>s.severity==="major").length, total: gradeResult.stepScores.length, color: M.red },
                    ]).map(row => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: M.muted }}>{row.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 70, height: 5, borderRadius: 99, background: M.surface, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 99, background: row.color, width: `${row.total > 0 ? (row.val/row.total)*100 : 0}%`, transition: "width 0.6s ease" }}/>
                          </div>
                          <span style={{ fontSize: 11, color: row.color, fontWeight: 700, minWidth: 28, textAlign: "right" }}>{row.val}/{row.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={handleRetry} style={{
                      padding: "11px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: `linear-gradient(135deg,${M.gold},${M.indigo})`,
                      color: "#05060f", fontSize: 12, fontWeight: 900,
                    }}>
                      ↺ Try Again
                    </button>
                    <button onClick={onClose} style={{
                      padding: "11px", borderRadius: 10, background: "transparent",
                      border: `1px solid ${M.border}`, color: M.muted,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                      ← Back to Math
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes pvDot {
          0%,100% { opacity:0.2; transform:translateY(0); }
          50% { opacity:1; transform:translateY(-5px); }
        }
      `}</style>
    </div>
  );
}