// geminiService.ts
// ─────────────────────────────────────────────────────────────────────────────
// ALL API calls go through Gemini (free tier).
// No OpenRouter, no Claude API credits burned.
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Model routing:
//   text tasks   → gemini-2.0-flash  (fast, free, great for JSON)
//   vision tasks → gemini-2.0-flash  (same model supports vision/images)
const TEXT_MODEL   = "gemini-2.0-flash";
const VISION_MODEL = "gemini-2.0-flash";

// ─── Base fetch helper ────────────────────────────────────────────────────────
async function geminiPost(model: string, body: object): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── Strip markdown fences from JSON responses ───────────────────────────────
function stripFences(raw: string): string {
  return raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1.  KNOWLEDGE GRAPH  (used by Hero.tsx — replaces geminiService class)
// ═══════════════════════════════════════════════════════════════════════════

export interface GraphNode {
  id: string;
  label: string;
  description: string;
  category: string;
}
export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const geminiService = {
  async generateKnowledgeGraph(
    query: string,
    existingNodeIds: string[] = [],
  ): Promise<GraphData> {
    const existingNote =
      existingNodeIds.length > 0
        ? `Already on graph: ${existingNodeIds.join(", ")}. Add NEW nodes only.`
        : "";

    const prompt = `You are a STEM knowledge-graph generator.
${existingNote}

Generate a knowledge graph for: "${query}"
Produce 5-8 nodes and 4-10 edges.

Node categories must be one of: Theory | Equation | Application | History | Concept

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "nodes": [
    {"id":"n1","label":"short name","description":"1-2 sentence explanation","category":"Theory"}
  ],
  "edges": [
    {"source":"n1","target":"n2","label":"optional short relation"}
  ]
}`;

    const raw = await geminiPost(TEXT_MODEL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
    });

    try {
      return JSON.parse(stripFences(raw)) as GraphData;
    } catch {
      // fallback minimal graph
      return {
        nodes: [{ id: "n1", label: query, description: "Core concept", category: "Concept" }],
        edges: [],
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 2.  SCIENCE CHAT  (replaces callAI in EffectualDashboard / trainedmodelmathmode15)
// ═══════════════════════════════════════════════════════════════════════════

export interface ScienceNode {
  id: string;
  label: string;
  type: "core" | "related" | "sub" | "application" | "formula" | "derivation" | "missed";
  formula?: string;
}
export interface ScienceEdge { from: string; to: string; label?: string; }
export interface ScienceChatMessage { role: "user" | "bot"; text: string; timestamp: number; }
export interface ScienceAIResponse {
  answer: string;
  topic: string;
  nodes: ScienceNode[];
  edges: ScienceEdge[];
  keywords: string[];
  followUp: string[];
  shouldMerge?: boolean;
  formulas?: Array<{ concept: string; latex: string }>;
}

export async function callAI(
  question: string,
  subject: string,
  grade: string,
  chatHistory: ScienceChatMessage[],
  currentTopic: string | null,
  existingNodes: ScienceNode[],
): Promise<ScienceAIResponse> {
  const recentHistory = chatHistory
    .slice(-6)
    .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`)
    .join("\n");

  const existingNodesSummary =
    existingNodes.length > 0
      ? existingNodes.map(n => `id="${n.id}" label="${n.label}" type="${n.type}"`).join(", ")
      : "NONE";

  const systemPrompt = `You are a STEM tutor for grade ${grade} students studying ${subject}.

CONVERSATION SO FAR:
${recentHistory || "Start of conversation."}

CURRENT TOPIC: ${currentTopic || "None"}
EXISTING NODES (do NOT re-create, but DO reference their ids in edges):
${existingNodesSummary}

STRICT RULES:
1. Always produce ≥ 3 nodes.
2. Node types: core | related | sub | application | formula | derivation | missed
3. Any formula/equation mentioned → MUST be a "formula" node with LaTeX in "formula" field.
4. shouldMerge = true for follow-ups on same topic. false only for completely different topics.
5. When shouldMerge=true, include existing core node in your nodes[].
6. No orphan nodes — every non-core node needs ≥ 1 edge.
7. answer = plain English, one sentence only.
8. formulas[] = safety net — include every formula/equation mentioned.

Respond ONLY with valid JSON, no markdown:
{
  "answer": "plain English sentence",
  "topic": "topic name",
  "shouldMerge": true,
  "nodes": [{"id":"...","label":"...","type":"...","formula":"optional LaTeX"}],
  "edges": [{"from":"...","to":"...","label":"..."}],
  "keywords": ["keyword1","keyword2"],
  "followUp": ["follow-up question 1","follow-up question 2"],
  "formulas": [{"concept":"name","latex":"LaTeX string"}]
}`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [
      { role: "user", parts: [{ text: systemPrompt + "\n\nStudent question: " + question }] },
    ],
    generationConfig: { temperature: 0.5, maxOutputTokens: 1500 },
  });

  try {
    const p = JSON.parse(stripFences(raw)) as ScienceAIResponse;
    p.answer = (p.answer ?? "").replace(/\{[^{}]{0,800}\}/g, "").replace(/\s{2,}/g, " ").trim();
    return p;
  } catch {
    return {
      answer: "I had trouble formatting my response. Please try again.",
      topic: question,
      shouldMerge: false,
      nodes: [],
      edges: [],
      keywords: [],
      followUp: [],
      formulas: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3.  MATH CHAT  (replaces callMathAI in MathMode.tsx)
// ═══════════════════════════════════════════════════════════════════════════

export interface MathNode {
  id: string;
  label: string;
  type: "core" | "theorem" | "proof" | "lemma" | "axiom" | "corollary" | "formula" | "example" | "missed";
  formula?: string;
}
export interface MathEdge { from: string; to: string; label?: string; }
export interface MathChatMessage { role: "user" | "bot"; text: string; timestamp: number; }
export interface MathAIResponse {
  answer: string;
  topic: string;
  nodes: MathNode[];
  edges: MathEdge[];
  keywords: string[];
  followUp: string[];
  shouldMerge?: boolean;
  formulas?: Array<{ concept: string; latex: string }>;
}

export async function callMathAI(
  question: string,
  subject: string,
  grade: string,
  chatHistory: MathChatMessage[],
  currentTopic: string | null,
  existingNodes: MathNode[],
): Promise<MathAIResponse> {
  const recent = chatHistory
    .slice(-6)
    .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`)
    .join("\n");

  const existingStr =
    existingNodes.length > 0
      ? existingNodes.map(n => `id="${n.id}" label="${n.label}" type="${n.type}"`).join(", ")
      : "NONE";

  const systemPrompt = `You are an expert mathematics tutor specialising in ${subject} for level ${grade}.

CONVERSATION SO FAR:
${recent || "Start of conversation."}
CURRENT TOPIC: ${currentTopic || "None"}
EXISTING NODES: ${existingStr}

RULES:
1. Always produce ≥ 3 nodes.
2. Node types: core | theorem | proof | lemma | axiom | corollary | formula | example
3. Every formula/equation mentioned → mandatory "formula" node with LaTeX in "formula" field.
4. shouldMerge = true for follow-ups/same topic. false only for completely unrelated new topic.
5. When shouldMerge=true, include existing core node in your nodes[].
6. No orphan nodes — every non-core node needs ≥ 1 edge.
7. answer = plain English, one sentence.
8. LaTeX: use \\frac{}{}, \\int_{lo}^{hi}, \\sum_{n=1}^{\\infty}, \\lim_{x \\to 0}, \\sqrt{}, \\forall, \\exists, \\in, \\mathbb{R}, \\Rightarrow, \\iff, \\alpha,\\beta,\\gamma etc.

Respond ONLY with valid JSON, no markdown:
{
  "answer": "plain English sentence",
  "topic": "topic name",
  "shouldMerge": true,
  "nodes": [{"id":"...","label":"...","type":"...","formula":"optional LaTeX"}],
  "edges": [{"from":"...","to":"...","label":"..."}],
  "keywords": ["keyword1","keyword2"],
  "followUp": ["follow-up question 1","follow-up question 2"],
  "formulas": [{"concept":"name","latex":"LaTeX string"}]
}`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [
      { role: "user", parts: [{ text: systemPrompt + "\n\nStudent question: " + question }] },
    ],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2500 },
  });

  try {
    return JSON.parse(stripFences(raw)) as MathAIResponse;
  } catch {
    return {
      answer: "Here's what I found.",
      topic: question,
      shouldMerge: false,
      nodes: [],
      edges: [],
      keywords: [],
      followUp: [],
      formulas: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4.  PROVE IT — generate problem pair  (replaces generateProveItProblems)
// ═══════════════════════════════════════════════════════════════════════════

export interface ProveItData {
  exampleQuestion: string;
  exampleSolution: string;
  studentQuestion: string;
  correctAnswer: string;
  steps: string[];
  hints: string[];
}

export async function generateProveItProblems(
  topic: string,
  subject: string,
  grade: string,
): Promise<ProveItData> {
  const prompt = `You are a math teacher. Output ONLY valid JSON, no markdown, no extra text.
Schema:
{
  "exampleQuestion": "a clear, specific problem",
  "exampleSolution": "Step 1: ...\\nStep 2: ...\\nFinal Answer: ...",
  "steps": ["step 1 text", "step 2 text"],
  "hints": ["hint 1", "hint 2"],
  "studentQuestion": "similar problem, different numbers",
  "correctAnswer": "the answer string"
}
CRITICAL:
- steps[] MUST use the EXACT numbers from studentQuestion (not the example).
- correctAnswer MUST be the mathematically correct answer to studentQuestion.
- Double-check all arithmetic before outputting.

Create a ${subject} (${grade} level) problem pair about: "${topic}"`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 1800 },
  });

  try {
    return JSON.parse(stripFences(raw)) as ProveItData;
  } catch {
    return {
      exampleQuestion: "Find d/dx of x²",
      exampleSolution: "Step 1: Apply power rule d/dx(xⁿ) = nxⁿ⁻¹\nStep 2: n=2 → 2x\nFinal Answer: 2x",
      steps: ["Apply power rule", "Substitute n"],
      hints: ["Use d/dx(xⁿ) = nxⁿ⁻¹"],
      studentQuestion: "Find d/dx of x³",
      correctAnswer: "3x²",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5.  PROVE IT (basic) — text grading  (used in MathMode's ProveItTool)
// ═══════════════════════════════════════════════════════════════════════════

export async function gradeProveIt(
  studentAnswer: string,
  correctAnswer: string,
  question: string,
  subject: string,
): Promise<{ correct: boolean; feedback: string; score: number }> {
  const prompt = `You are a strict math grader. Respond ONLY with JSON:
{"correct": boolean, "score": 0-100, "feedback": "2 sentences max — specific, honest"}

Subject: ${subject}
Question: ${question}
Correct Answer: ${correctAnswer}
Student Answer: ${studentAnswer}`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
  });

  try {
    return JSON.parse(stripFences(raw));
  } catch {
    return { correct: false, feedback: "Could not parse grade.", score: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6.  VISION TRANSCRIPTION  (Phase 1 of ProveItVision grading)
// ═══════════════════════════════════════════════════════════════════════════

export async function transcribeCanvas(base64: string): Promise<string> {
  const prompt = `You are a math OCR engine. Read EVERY number, symbol, and equation visible in this image EXACTLY as written — do not correct or interpret, just transcribe.

Rules:
- Copy every digit and symbol literally. If it says "45" write "45" even if you think it should be "25".
- Preserve equals signs, square roots, exponents, fractions exactly as drawn.
- Write each line of working on its own line.
- If the canvas is blank or has no math, write only: BLANK

Output ONLY the raw transcription, nothing else.`;

  const raw = await geminiPost(VISION_MODEL, {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: base64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 600 },
  });

  return raw.trim() || "BLANK";
}

// ═══════════════════════════════════════════════════════════════════════════
// 7.  VISION GRADING  (Phase 2 — arithmetic verification)
// ═══════════════════════════════════════════════════════════════════════════

export interface StepScore {
  step: string;
  found: boolean;
  feedback: string;
  severity: "correct" | "minor" | "major" | "missing";
}
export interface ErrorAnnotation {
  description: string;
  type: "algebra" | "notation" | "logic" | "incomplete" | "correct";
}
export interface VisionGradeResult {
  score: number;
  correct: boolean;
  stepScores: StepScore[];
  overallFeedback: string;
  encouragement: string;
  detectedWork: string;
  errorAnnotations: ErrorAnnotation[];
}

export async function gradeTranscription(
  transcription: string,
  problem: ProveItData,
  subject: string,
): Promise<VisionGradeResult> {
  const numSteps = problem.steps.length;
  const pointsPerStep = Math.floor(100 / numSteps);

  const prompt = `You are a ruthless math examiner. Grade this student's work with ZERO tolerance.

PROBLEM: ${problem.studentQuestion}
CORRECT FINAL ANSWER: ${problem.correctAnswer}
REQUIRED STEPS: ${problem.steps.map((s, i) => `Step ${i + 1}: ${s}`).join("\n")}
POINTS PER STEP: ${pointsPerStep} (${numSteps} steps × ${pointsPerStep} = 100 total)

STUDENT'S WORK:
"""
${transcription}
"""

GRADING PROCEDURE:
Step A — For EVERY numeric calculation in the student's work, verify it yourself.
Step B — Extract the student's final answer. Compare to "${problem.correctAnswer}". If different → correct=false, score ≤ 40.
Step C — For each required step, check if it appears correctly. Severity: correct | minor | major | missing.
Step D — Start at 100, subtract deductions. Cap at 40 if final answer wrong. Score 0 if blank.

Score of 100 ONLY if every step is "correct" AND final answer exactly matches.

OUTPUT — JSON ONLY, NO OTHER TEXT:
{
  "score": <integer 0-100>,
  "correct": <true only if answer exactly = "${problem.correctAnswer}">,
  "detectedWork": "${transcription.replace(/"/g, "'")}",
  "overallFeedback": "<2-3 sentences naming SPECIFIC errors with exact numbers>",
  "encouragement": "<1 honest sentence matching the score>",
  "stepScores": [${problem.steps.map(s => `{"step":"${s}","found":true,"feedback":"...","severity":"correct"}`).join(",")}],
  "errorAnnotations": [{"description":"...","type":"algebra"}]
}`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 2000 },
  });

  const clean = stripFences(raw);
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in grading response");

  return JSON.parse(clean.slice(start, end + 1)) as VisionGradeResult;
}

// ─── Combined vision grader (drop-in for ProveItVision's gradeWithVision) ───
export async function gradeWithVision(
  canvasDataUrl: string,
  problem: ProveItData,
  subject: string,
): Promise<VisionGradeResult> {
  const base64 = canvasDataUrl.split(",")[1];
  const transcription = await transcribeCanvas(base64);

  if (transcription === "BLANK") {
    return {
      score: 0,
      correct: false,
      detectedWork: "blank canvas",
      overallFeedback:
        "No work was drawn on the canvas. Please write out your full solution showing every step.",
      encouragement: "Start by writing the formula, then substitute the values step by step.",
      stepScores: problem.steps.map(s => ({
        step: s,
        found: false,
        feedback: "Not attempted.",
        severity: "missing" as const,
      })),
      errorAnnotations: [
        { description: "Canvas is blank — no work submitted", type: "incomplete" as const },
      ],
    };
  }

  return gradeTranscription(transcription, problem, subject);
}

// ═══════════════════════════════════════════════════════════════════════════
// 8.  TEACH IT BACK — strict Feynman grader  (replaces gradeExplanation)
// ═══════════════════════════════════════════════════════════════════════════

export interface TeachItBackNode {
  id: string;
  label: string;
  type: "core" | "related" | "sub" | "application" | "formula" | "derivation" | "missed";
}
export interface GradeResult {
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
  missedNodes: TeachItBackNode[];
  detailedFeedback: string;
}

export async function gradeExplanation(
  userText: string,
  topic: string,
  nodes: TeachItBackNode[],
  subject: string,
  grade: string,
): Promise<GradeResult> {
  const conceptList = (nodes ?? []).map(n => `- "${n.label}" (${n.type})`).join("\n");

  const prompt = `You are an EXTREMELY strict academic evaluator grading a student's explanation using the Feynman Technique.
Subject: ${subject}, Grade: ${grade}
Topic: "${topic}"

Known concepts:
${conceptList}

SCORING (strict — most students score 40-65, only truly excellent get 80+):
- conceptualAccuracy: Are core ideas CORRECT? Penalise hard for wrong facts.
- depthScore: Do they explain WHY, not just WHAT?
- clarityScore: Could a 10-year-old understand?
- Overall = accuracy×0.5 + depth×0.3 + clarity×0.2

ANTI-GAMING:
- Generic essay without understanding → max 40
- Just listing concept names → max 30
- Genuine understanding with correct mechanisms → can reach 80+

Student's explanation:
"${userText}"

Respond ONLY with valid JSON, no markdown:
{
  "score": <0-100 integer>,
  "conceptualAccuracy": <0-100>,
  "depthScore": <0-100>,
  "clarityScore": <0-100>,
  "nailed": ["concept genuinely explained well"],
  "corrections": [{"mistake":"exact quote","fix":"exact correction"}],
  "missing": ["concept they completely skipped"],
  "misconceptions": ["subtle wrong idea"],
  "encouragement": "one honest sentence",
  "feynmanTip": "one specific actionable tip",
  "overallVerdict": "excellent|good|needs_work|incomplete",
  "missedNodes": [{"id":"new_x","label":"label","type":"related"}],
  "detailedFeedback": "2-3 sentences of specific, honest feedback"
}`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2500 },
  });

  try {
    return JSON.parse(stripFences(raw)) as GradeResult;
  } catch {
    return {
      score: 0,
      conceptualAccuracy: 0,
      depthScore: 0,
      clarityScore: 0,
      nailed: [],
      corrections: [],
      missing: [],
      misconceptions: [],
      encouragement: "Something went wrong. Please try again.",
      feynmanTip: "Try explaining as if to a 10-year-old.",
      overallVerdict: "incomplete",
      missedNodes: [],
      detailedFeedback: "Grading failed — please retry.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9.  LEARNING GAP DETAIL  (replaces fetchGapDetail)
// ═══════════════════════════════════════════════════════════════════════════

export interface GapDetail {
  description: string;
  keyPoints: string[];
  relatedConcepts: string[];
  whyItMatters: string;
}

export async function fetchGapDetail(
  concept: string,
  topic: string,
  subject: string,
): Promise<GapDetail> {
  const prompt = `You are a STEM tutor. Return ONLY valid JSON, no markdown, no preamble.
Schema: {"description":"2-3 sentence plain English explanation","keyPoints":["3-4 key bullet points"],"relatedConcepts":["2-3 related concepts in the topic"],"whyItMatters":"1 sentence why essential"}

Concept: "${concept}"
Parent topic: "${topic}"
Subject: "${subject}"`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
  });

  try {
    return JSON.parse(stripFences(raw)) as GapDetail;
  } catch {
    return {
      description: "Could not load description.",
      keyPoints: [],
      relatedConcepts: [],
      whyItMatters: "",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10.  PROVE IT — Quiz generator  (replaces generateQuiz in MathMode)
// ═══════════════════════════════════════════════════════════════════════════

export interface QuizQuestion {
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
}

export async function generateQuiz(
  topic: string,
  subject: string,
  grade: string,
): Promise<QuizQuestion[]> {
  const prompt = `You are a math quiz generator. Output ONLY valid JSON array, no markdown, no extra text.
Schema: [{"question":"...","choices":["A","B","C","D"],"correct":0,"explanation":"..."}]
Rules:
- Generate exactly 5 multiple-choice questions
- correct is the 0-based index of the right choice
- Mix conceptual and calculation questions
- explanation is 1 short sentence saying why the answer is correct

Generate a 5-question quiz on "${topic}" for ${subject}, ${grade} level.`;

  const raw = await geminiPost(TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 1800 },
  });

  try {
    return JSON.parse(stripFences(raw)) as QuizQuestion[];
  } catch {
    return [];
  }
}