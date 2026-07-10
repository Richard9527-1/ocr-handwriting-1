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
                <div class="error" style="color:#e53e3e;padding:20px;">
                    ❌ ${result.error}
                </div>
            `;
            return;
        }

        const { score, comments, dimensions, summary } = result;

        // 评分维度颜色
        const getScoreColor = (s) => {
            if (s >= 8) return '#48bb78';
            if (s >= 6) return '#ed8936';
            return '#fc8181';
        };

        container.innerHTML = `
            <div class="essay-display">${text}</div>
            
            <div style="margin:16px 0;font-size:14px;color:#718096;">
                ${summary}
            </div>

            <div class="score-card">
                <div class="score-big">
                    <div class="number">${score}</div>
                    <div class="label">综合得分</div>
                </div>
                <div class="score-details">
                    ${Object.entries(dimensions).map(([key, val]) => `
                        <div class="score-item">
                            <div class="name">${this.getDimensionLabel(key)}</div>
                            <div class="value">
                                <span style="color:${getScoreColor(val.score)}">${val.score}</span>
                                <span class="total">/ ${this.getDimensionMax(key)}</span>
                                <div style="font-size:12px;color:#718096;margin-top:2px;">${val.comment}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="comments-box">
                <div class="title">📝 评语</div>
                <div class="content">${comments}</div>
            </div>

            <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
                <button class="btn btn-success" onclick="window.copyResult()">📋 复制评语</button>
                <button class="btn btn-secondary" onclick="window.switchToManual()">✏️ 切换到手动批改</button>
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
     * 获取维度满分
     */
    getDimensionMax(key) {
        const maxs = {
            'content': 40,
            'structure': 25,
            'language': 25,
            'creativity': 10
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