import { GoogleGenAI } from "@google/genai";
import { Property } from "../types";

// Helper to initialize AI. 
// Note: In a real app, API_KEY should be handled securely. 
// Here we assume process.env.API_KEY is available as per instructions.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeProperties(properties: Property[], preferences: string[] = []): Promise<string> {
  if (properties.length < 2) {
    return "请至少添加两个房源以生成AI对比分析。";
  }

  const ai = getAI();
  
  // Construct preference string
  const preferenceContext = preferences.length > 0 
    ? `用户特别强调以下核心需求（请将其作为最高权重的评判标准）：${preferences.join('、')}。`
    : `用户未指定特定偏好，请基于通用居住标准（如性价比、舒适度、便利性）进行均衡分析。`;

  const prompt = `
    你是一位专业的房地产决策顾问，专注于“第四代住宅”与高品质人居分析。
    请为购房者深度对比以下房源。
    
    【核心指令】
    ${preferenceContext}
    
    【房源数据】
    ${JSON.stringify(properties.map(p => ({
      name: p.name,
      price: p.price,
      area: p.area,
      rating: p.rating,
      notes: p.notes,
      pros: p.pros,
      cons: p.cons
    })))}

    【输出要求】
    请使用Markdown格式输出一份决策报告（约 300-400 字）。请不要使用表格，而是使用清晰的段落和小标题。
    
    结构如下：
    1. **⭐️ 终极推荐**：基于用户的核心需求，直接给出唯一的最佳选择。
    2. **🎯 需求匹配度分析**：针对用户选中的偏好词（如果有），逐一分析各房源的满足情况。如果没选偏好，则分析通用优劣势。
    3. **⚠️ 关键风险提示**：购房者必须接受的硬伤（基于笔记中的缺点或潜在问题）。
    
    请使用温暖、专业、有理有据的语气。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "无法生成分析结果。";
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return "AI分析服务暂时不可用，请检查网络或API密钥。";
  }
}