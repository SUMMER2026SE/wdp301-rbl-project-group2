// AI Types for Staff Interface

export type RiskLevel = 'normal' | 'attention' | 'high_risk';

export interface AIRiskAnalysis {
    riskLevel: RiskLevel;
    reasons: string[];
    customerAllergies: string[];
    healthWarnings: string[];
    orderConflicts: string[];
}

/** AI output: phân tích, suy luận, đề xuất hành động cho nhân viên */
export interface OrderAIInsights {
    summary: string;
    reasoning: string;
    suggestions: string[];
}

export interface ParsedInstruction {
    type: 'include' | 'exclude' | 'modify' | 'info';
    instruction: string;
    matched: boolean;
    category: 'cooking' | 'ingredient' | 'special' | 'health';
}

export interface CustomerInsight {
    type: 'pattern' | 'preference' | 'warning';
    message: string;
    confidence: number; // 0-100
}
