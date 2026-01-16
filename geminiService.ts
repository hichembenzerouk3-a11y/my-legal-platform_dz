
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const BASE_LEGAL_INSTRUCTION = `
أنت خبير قانوني جزائري متخصص. التزم دائماً بهرمية التشريع الجزائري (المادة 154 من الدستور):
1. المعاهدات الدولية المصادق عليها بمرسوم رئاسي ومنشورة في الجريدة الرسمية.
2. الدستور.
3. القوانين العضوية والعادية.
4. المراسيم التنظيمية.
المصادر المعتمدة: joradp.dz و asjp.cerist.dz.
هام: لا تستخدم رموز # أو * في التنسيق. استخدم العناوين النصية والترقيم العادي.
`;

const PROHIBIT_PROCEDURAL_INSTRUCTION = `
تحذير: يمنع منعاً باتاً تقديم أي دفوع قضائية أو طلبات ختامية أو استراتيجيات هجومية/دفاعية في هذا القسم. 
اقتصر فقط على المهمة المحددة دون التطرق للمسار الإجرائي القضائي.
`;

const FAST_MODEL = 'gemini-3-flash-preview';

export const getLegalConsultation = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: query,
    config: {
      systemInstruction: `${BASE_LEGAL_INSTRUCTION} أنت في قسم الاستشارة السريعة. قدم تحليلاً وقائعياً مع المسار الإجرائي الكامل (دفوع، طلبات، استراتيجية هجومية/دفاعية).`,
    },
  });
  return response.text;
};

export const analyzeContract = async (text: string, imageData?: string) => {
  const ai = getAI();
  const parts: any[] = [{ text: `حلل هذا المستند القانوني. السياق: ${text}` }];
  if (imageData) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageData.split(',')[1] } });

  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: { parts },
    config: {
      systemInstruction: `${BASE_LEGAL_INSTRUCTION} ${PROHIBIT_PROCEDURAL_INSTRUCTION} ركز فقط على تحليل بنود العقد وتحديد الثغرات.`,
    },
  });
  return response.text;
};

export const generateDraftContract = async (category: string, details: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: `أنشئ مسودة عقد عرفي من فئة (${category}) بناءً على: ${details}`,
    config: {
      systemInstruction: `${BASE_LEGAL_INSTRUCTION} ${PROHIBIT_PROCEDURAL_INSTRUCTION} صغ العقد فنياً فقط والتزم بالمادة 324 مكرر 1 مدني.`,
    },
  });
  return response.text;
};

export const legalRadarSearch = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: `قم بإجراء رصد قانوني شامل حول: ${query}. 
               المطلوب بدقة لكل قانون أو مرسوم يتم العثور عليه:
               1. اسم القانون كاملاً.
               2. رقم القانون (مثلاً: رقم 24-01).
               3. تاريخ الصدور في الجريدة الرسمية.
               4. رقم الجريدة الرسمية التي نشر فيها.
               5. ملخص بسيط لمضمونه.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `${BASE_LEGAL_INSTRUCTION} ${PROHIBIT_PROCEDURAL_INSTRUCTION} 
      أنت رادار تشريعي متخصص. مهمتك استخراج أرقام القوانين والمراسيم بدقة شديدة. 
      يجب أن تعطي الأولوية لروابط الجريدة الرسمية (joradp.dz) لتوفير إمكانية التحميل للمستخدم.`
    },
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'مرجع رسمي',
    url: chunk.web?.uri || '#'
  })) || [];
  return { text: response.text, sources };
};

/**
 * توليد البحوث الأكاديمية على مراحل (5 مراحل للوصول لـ 20 صفحة)
 */
export const generateResearchStage = async (topic: string, stage: number, previousContent: string = "") => {
  const ai = getAI();
  const stagesInfo = [
    "المرحلة 1: بناء الهيكل (العنوان، مقدمة عميقة، الإشكالية القانونية، ومنهجية البحث المتبعة).",
    "المرحلة 2: المبحث الأول (التأصيل النظري والمفاهيمي) - توسع في التعاريف والنصوص التشريعية مع التهميش الإلزامي [رقم].",
    "المرحلة 3: المبحث الثاني (التحليل التطبيقي) - دراسة المنازعات والاجتهادات القضائية الجزائرية مع التهميش الإلزامي [رقم].",
    "المرحلة 4: المبحث الثالث (الدراسة النقدية أو المقارنة) - تحليل الثغرات التشريعية ومقارنتها مع نظم أخرى مع التهميش الإلزامي [رقم].",
    "المرحلة 5: الخاتمة (النتائج والتوصيات) وقائمة المصادر والمراجع المفصلة مرتبة أبجدياً (قوانين، كتب، مقالات ASJP)."
  ];

  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: `الموضوع: ${topic}. 
               هذه هي المرحلة رقم ${stage} من أصل 5 مراحل. 
               المطلوب في هذه المرحلة: ${stagesInfo[stage - 1]}. 
               السياق السابق (ملخص): ${previousContent.substring(previousContent.length - 1500)}.
               
               شروط التوليد:
               1. كتابة محتوى غزير جداً وتفصيلي (أكثر من 2000 كلمة لهذه المرحلة).
               2. التهميش الإلزامي (Footnotes) بوضع أرقام [1]، [2] في النص ثم ذكر المرجع في أسفل الفقرة.
               3. لغة أكاديمية رصينة تليق بمذكرة تخرج أو بحث دكتوراه.
               4. يمنع منعاً باتاً ذكر أي دفوع أو طلبات قضائية هجومية (هذا القسم أكاديمي بحت).`,
    config: {
      thinkingConfig: { thinkingBudget: 6000 },
      tools: [{ googleSearch: {} }],
      systemInstruction: `${BASE_LEGAL_INSTRUCTION} أنت بروفيسور قانون جزائري. هدفك مساعدة الطالب في توليد بحث متكامل يقع في 20 صفحة تقريباً عبر 5 مراحل. التهميش هو روح البحث الأكاديمي، التزم به.`
    },
  });

  return response.text;
};
