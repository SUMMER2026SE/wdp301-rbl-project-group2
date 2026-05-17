// AI Risk Alert Component for Staff Interface

import type { AIRiskAnalysis, OrderAIInsights } from "../../types/aiTypes";
import { getRiskColor, getRiskLabel, getRiskIcon } from "../../services/aiService";
import { AlertCircle, AlertTriangle, CheckCircle, Sparkles, Lightbulb, FileText, ListChecks } from "lucide-react";
import "./AIRiskAlert.css";

interface AIRiskAlertProps {
    analysis: AIRiskAnalysis;
    customerName: string;
    /** Phân tích, suy luận và đề xuất từ AI — hiển thị nổi bật thay vì chỉ lặp lại ghi chú */
    insights?: OrderAIInsights;
}

export default function AIRiskAlert({ analysis, customerName, insights }: AIRiskAlertProps) {
    const riskColor = getRiskColor(analysis.riskLevel);
    const riskLabel = getRiskLabel(analysis.riskLevel);
    const riskIcon = getRiskIcon(analysis.riskLevel);

    const getRiskIconComponent = () => {
        switch (analysis.riskLevel) {
            case 'normal':
                return <CheckCircle className="risk-icon normal" />;
            case 'attention':
                return <AlertCircle className="risk-icon attention" />;
            case 'high_risk':
                return <AlertTriangle className="risk-icon high-risk" />;
        }
    };

    return (
        <div className="ai-risk-alert" style={{ borderColor: riskColor }}>
            {/* Header */}
            <div className="alert-header">
                <div className="alert-title">
                    <Sparkles className="ai-icon" />
                    <span>Phân tích AI — Rủi ro & Đề xuất</span>
                </div>
                <div className="risk-badge" style={{ backgroundColor: riskColor }}>
                    {getRiskIconComponent()}
                    <span>{riskIcon} {riskLabel}</span>
                </div>
            </div>

            {/* AI Insights: Tóm tắt, Suy luận, Đề xuất */}
            {insights && (
                <div className="insights-block">
                    <div className="insight-section insight-summary">
                        <h4 className="insight-heading">
                            <FileText className="insight-icon" />
                            Tóm tắt
                        </h4>
                        <p className="insight-summary-text">{insights.summary}</p>
                    </div>
                    <div className="insight-section insight-reasoning">
                        <h4 className="insight-heading">
                            <Lightbulb className="insight-icon" />
                            Suy luận
                        </h4>
                        <p className="insight-reasoning-text">{insights.reasoning}</p>
                    </div>
                    <div className="insight-section insight-suggestions">
                        <h4 className="insight-heading">
                            <ListChecks className="insight-icon" />
                            Đề xuất hành động
                        </h4>
                        <ul className="suggestions-list">
                            {insights.suggestions.map((s, i) => (
                                <li key={i} className="suggestion-item">{s}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Analysis Reasons (chi tiết) */}
            <div className="alert-section">
                <h4 className="section-title">📋 Chi tiết phân tích:</h4>
                <ul className="reasons-list">
                    {analysis.reasons.map((reason, index) => (
                        <li key={index} className="reason-item">
                            {reason}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Customer Allergies */}
            {analysis.customerAllergies.length > 0 && (
                <div className="alert-section allergies-section">
                    <h4 className="section-title">⚠️ Dị ứng của {customerName}:</h4>
                    <div className="tags-container">
                        {analysis.customerAllergies.map((allergy, index) => (
                            <span key={index} className="allergy-tag">
                                {allergy}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Health Warnings */}
            {analysis.healthWarnings.length > 0 && (
                <div className="alert-section health-section">
                    <h4 className="section-title">💊 Tình trạng sức khỏe:</h4>
                    <div className="tags-container">
                        {analysis.healthWarnings.map((warning, index) => (
                            <span key={index} className="health-tag">
                                {warning}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Order Conflicts */}
            {analysis.orderConflicts.length > 0 && (
                <div className="alert-section conflicts-section">
                    <h4 className="section-title">🚨 Xung đột đơn hàng:</h4>
                    <ul className="conflicts-list">
                        {analysis.orderConflicts.map((conflict, index) => (
                            <li key={index} className="conflict-item">
                                {conflict}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Staff Action Checklist */}
            {analysis.riskLevel !== 'normal' && (
                <div className="alert-section action-section">
                    <h4 className="section-title">✓ Hành động cần thực hiện:</h4>
                    <ul className="action-list">
                        <li>✓ Xem lại hồ sơ khách hàng</li>
                        <li>✓ Xác nhận lại yêu cầu với khách hàng</li>
                        <li>✓ Kiểm tra kỹ nguyên liệu</li>
                        {analysis.riskLevel === 'high_risk' && (
                            <>
                                <li>✓ Thông báo cho bếp trưởng</li>
                                <li>✓ Chuẩn bị riêng để tránh nhiễm chéo</li>
                            </>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
