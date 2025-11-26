import { GoogleGenAI } from "@google/genai";
import { Transaction, MonthlyStats } from "../types";
import { formatCurrency, getMonthName } from "../utils";

export const getFinancialAdvice = async (
  stats: MonthlyStats,
  recentTransactions: Transaction[],
  month: number
): Promise<string> => {
  // Check for API Key safely to avoid crashing if process.env is missing in browser
  const apiKey = process.env?.API_KEY;

  if (!apiKey) {
    return "API Key no configurada. Configura la variable de entorno API_KEY en Vercel.";
  }

  // Initialize inside the function to be safe
  const ai = new GoogleGenAI({ apiKey });

  const transactionSummary = recentTransactions
    .slice(0, 15) // Limit to last 15 to save tokens
    .map(t => `- ${t.description}: ${formatCurrency(t.amount)} (${t.category})`)
    .join('\n');

  const prompt = `
    Actúa como un asesor financiero experto y conciso.
    Analiza los siguientes datos del mes de ${getMonthName(month)}:
    
    - Ingresos Totales: ${formatCurrency(stats.totalIncome)}
    - Gastos Totales: ${formatCurrency(stats.totalExpense)}
    - Balance: ${formatCurrency(stats.balance)}
    - % Uso de Presupuesto: ${stats.usagePercentage.toFixed(1)}%
    
    Transacciones recientes:
    ${transactionSummary}
    
    Provee 3 consejos tácticos y breves (bullet points) para mejorar la salud financiera este mes. 
    Usa un tono motivador pero realista. Si el gasto es > 95%, sé urgente. Si es < 70%, sugiere ahorro/inversión.
    Devuelve solo el texto de los consejos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "No se pudo generar un consejo en este momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Error al conectar con el asistente financiero. Intenta más tarde.";
  }
};