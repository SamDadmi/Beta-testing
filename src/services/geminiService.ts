import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are the Effectual STEM AI Assistant. 
You help students and researchers explore complex STEM concepts by building interactive knowledge graphs.
Your goal is to break down complex topics into interconnected nodes (concepts) and edges (relationships).
Each node should have a title and a brief description.
Each edge should describe the relationship between two nodes.`;

export interface GraphNode {
  id: string;
  label: string;
  description: string;
  category?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
  }

  async generateKnowledgeGraph(concept: string, existingNodes: string[] = []): Promise<GraphData> {
    try {
      const prompt = existingNodes.length > 0
        ? `Expand the knowledge graph starting from the concept: "${concept}". 
           The current graph already contains these concepts: ${existingNodes.join(', ')}.
           Add 4-6 new related concepts and their relationships to "${concept}" or other existing nodes.`
        : `Generate a foundational knowledge graph for the concept: "${concept}". 
           Include 5-8 key nodes and their relationships.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Unique identifier for the node (kebab-case)" },
                    label: { type: Type.STRING, description: "Display name of the concept" },
                    description: { type: Type.STRING, description: "Brief explanation of the concept" },
                    category: { type: Type.STRING, description: "Category like 'Theory', 'Equation', 'Experiment', 'Scientist'" }
                  },
                  required: ["id", "label", "description"]
                }
              },
              edges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING, description: "ID of the source node" },
                    target: { type: Type.STRING, description: "ID of the target node" },
                    label: { type: Type.STRING, description: "Description of the relationship" }
                  },
                  required: ["source", "target", "label"]
                }
              }
            },
            required: ["nodes", "edges"]
          }
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      return JSON.parse(text) as GraphData;
    } catch (error) {
      console.error("Gemini Graph Error:", error);
      return { nodes: [], edges: [] };
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });
      return response.text || "I apologize, I am unable to process that request at this time.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Connection failed. Please try again.";
    }
  }
}

export const geminiService = new GeminiService();