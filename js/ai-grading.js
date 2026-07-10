// ============================================
// 智能批改模块
// ============================================

const AIGrading = {
    /**
     * 渲染智能批改结果
     * @param {Object} result - 批改结果
     * @param {string} text - 原始作文文本
     */
    renderResult(result, text) {
        const container = document.getElementById('aiResult');
        if (!container) return;

        if (!result.success) {
            container.innerHTML = `
                <div style="color:#e53e3e;padding:20px;text-align:center;background:#fff5f5;border-radius:12px;">
                    ❌ ${result.error}
                </div>
            `;
            return;
        }

        const { score, comments, dimensions, summary } = result;

        // 评分维度颜色（60分制）
        const getScoreColor = (s) => {
            if (s >= 8) return '#48bb78';
            if (s >= 5) return '#ed8936';
            return '#fc8181';
        };

        // 维度名称映射
        const dimLabels = {
            'content': '内容质量',
            'structure': '结构逻辑',
            'language': '语言表达',
            'creativity': '创意亮点'
        };

        // 维度满分
        const dimMax = {
            'content': 24,
            'structure': 15,
            'language': 15,
            'creativity': 6
        };

        container.innerHTML = `
            <div style="margin-top:20px;">
                <!-- 作文原文 -->
                <div style="background:#f7fafc;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;max-height:300px;overflow-y:auto;white-space:pre-wrap;font-size:14px;line-height:1.8;font-family:'PingFang SC','Microsoft YaHei',serif;">
                    ${text}
                </div>

                <!-- 统计信息 -->
                <div style="font-size:14px;color:#718096;margin-bottom:16px;">
                    📊 ${summary || ''}
                </div>

                <!-- 评分卡片 -->
                <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;">
                    <div style="background:linear-gradient(135deg,#4299e1,#3182ce);color:white;border-radius:16px;padding:20px 32px;text-align:center;min-width:120px;flex:0 0 auto;">
                        <div style="font-size:48px;font-weight:700;line-height:1;">${score}</div>
                        <div style="font-size:14px;opacity:0.8;margin-top:4px;">综合得分</div>
                    </div>
                    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:12px;min-width:200px;">
                        ${Object.entries(dimensions).map(([key, val]) => `
                            <div style="background:#edf2f7;border-radius:10px;padding:12px 16px;">
                                <div style="font-size:13px;color:#718096;">${dimLabels[key] || key}</div>
                                <div style="font-size:18px;font-weight:600;color:#2d3748;">
                                    <span style="color:${getScoreColor(val.score)}">${val.score}</span>
                                    <span style="font-size:13px;font-weight:400;color:#a0aec0;">/ ${dimMax[key] || 10}</span>
                                </div>
                                <div style="font-size:12px;color:#718096;margin-top:2px;">${val.comment || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 评语 -->
                <div style="background:#ebf8ff;border-radius:12px;padding:20px 24px;border-left:4px solid #4299e1;">
                    <div style="font-weight:600;color:#2b6cb0;margin-bottom:8px;">📝 评语</div>
                    <div style="color:#2d3748;line-height:1.8;white-space:pre-wrap;font-size:14px;">${comments}</div>
                </div>

                <!-- 操作按钮 -->
                <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
                    <button class="btn btn-success" onclick="window.copyResult()">📋 复制评语</button>
                    <button class="btn btn-secondary" onclick="window.switchToManual()">✏️ 切换到手动批改</button>
                </div>
            </div>
        `;

        // 显示结果区域
        document.getElementById('resultArea').style.display = 'block';
        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * 获取维度中文标签
     */
    getDimensionLabel(key) {
        const labels = {
            'content': '内容质量',
            'structure': '结构逻辑',
            'language': '语言表达',
            'creativity': '创意亮点'
        };
        return labels[key] || key;
    },

    /**
     * 获取维度满分（60分制）
     */
    getDimensionMax(key) {
        const maxs = {
            'content': 24,
            'structure': 15,
            'language': 15,
            'creativity': 6
        };
        return maxs[key] || 10;
    },

    /**
     * 执行智能批改
     */
    async grade(text, onStart, onComplete) {
        if (!text || text.trim().length === 0) {
            alert('请先识别作文内容');
            return;
        }

        if (onStart) onStart();

        try {
            const result = await OCR.autoGrade(text);
            if (onComplete) onComplete(result);
            return result;
        } catch (error) {
            if (onComplete) onComplete({
                success: false,
                error: error.message || '批改请求失败'
            });
            return null;
        }
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIGrading;
}