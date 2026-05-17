// Order Notes Explainer Component for Staff Interface

import type { ParsedInstruction } from "../../types/aiTypes";
import { Check, X, Info, Sparkles, Copy } from "lucide-react";
import { useState } from "react";
import "./OrderNotesExplainer.css";

interface OrderNotesExplainerProps {
    originalNotes: string;
    parsedInstructions: ParsedInstruction[];
}

export default function OrderNotesExplainer({ originalNotes, parsedInstructions }: OrderNotesExplainerProps) {
    const [copied, setCopied] = useState(false);

    // Group instructions by category
    const groupedInstructions = parsedInstructions.reduce((groups, instruction) => {
        const category = instruction.category;
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(instruction);
        return groups;
    }, {} as Record<string, ParsedInstruction[]>);

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'cooking': return '🍳 Phương pháp nấu';
            case 'ingredient': return '🥗 Nguyên liệu';
            case 'special': return '⭐ Yêu cầu đặc biệt';
            case 'health': return '💊 Thông tin sức khỏe';
            default: return category;
        }
    };

    const getInstructionIcon = (type: string) => {
        switch (type) {
            case 'include': return <Check className="instruction-icon include" />;
            case 'exclude': return <X className="instruction-icon exclude" />;
            case 'modify': return <Info className="instruction-icon modify" />;
            case 'info': return <Info className="instruction-icon info" />;
            default: return null;
        }
    };

    const getInstructionSymbol = (type: string) => {
        switch (type) {
            case 'include': return '✓';
            case 'exclude': return '✗';
            case 'modify': return '◉';
            case 'info': return 'ℹ️';
            default: return '•';
        }
    };

    const copyChecklistToClipboard = () => {
        let checklist = "CHI TIẾT ĐƠN HÀNG:\n\n";
        checklist += `Ghi chú gốc: "${originalNotes}"\n\n`;
        checklist += "DANH SÁCH KIỂM TRA:\n\n";

        Object.entries(groupedInstructions).forEach(([category, instructions]) => {
            checklist += `${getCategoryLabel(category)}\n`;
            instructions.forEach(instruction => {
                const symbol = getInstructionSymbol(instruction.type);
                checklist += `  ${symbol} ${instruction.instruction}\n`;
            });
            checklist += "\n";
        });

        navigator.clipboard.writeText(checklist);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="order-notes-explainer">
            {/* Header */}
            <div className="explainer-header">
                <div className="explainer-title">
                    <Sparkles className="ai-icon" />
                    <span>AI Auto-Explain Order Notes</span>
                </div>
                <button
                    className="copy-button"
                    onClick={copyChecklistToClipboard}
                    title="Copy checklist"
                >
                    <Copy className="copy-icon" />
                    {copied ? 'Đã copy!' : 'Copy'}
                </button>
            </div>

            {/* Original Notes */}
            <div className="original-notes">
                <h4>📝 Ghi chú gốc:</h4>
                <p className="notes-text">"{originalNotes}"</p>
            </div>

            {/* Parsed Instructions */}
            <div className="parsed-section">
                <h4>✨ AI chuyển đổi thành checklist:</h4>

                {Object.entries(groupedInstructions).map(([category, instructions]) => (
                    <div key={category} className="category-group">
                        <div className="category-header">
                            {getCategoryLabel(category)}
                        </div>
                        <div className="instructions-list">
                            {instructions.map((instruction, index) => (
                                <div
                                    key={index}
                                    className={`instruction-item ${instruction.type}`}
                                >
                                    <div className="instruction-icon-wrapper">
                                        {getInstructionIcon(instruction.type)}
                                    </div>
                                    <span className="instruction-text">
                                        {instruction.instruction}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="instructions-summary">
                <div className="summary-item summary-exclude">
                    <X className="summary-icon" />
                    <span>
                        {parsedInstructions.filter(i => i.type === 'exclude').length} Loại trừ
                    </span>
                </div>
                <div className="summary-item summary-modify">
                    <Info className="summary-icon" />
                    <span>
                        {parsedInstructions.filter(i => i.type === 'modify').length} Điều chỉnh
                    </span>
                </div>
                <div className="summary-item summary-include">
                    <Check className="summary-icon" />
                    <span>
                        {parsedInstructions.filter(i => i.type === 'include').length} Thêm vào
                    </span>
                </div>
                <div className="summary-item summary-info">
                    <Info className="summary-icon" />
                    <span>
                        {parsedInstructions.filter(i => i.type === 'info').length} Lưu ý
                    </span>
                </div>
            </div>
        </div>
    );
}
