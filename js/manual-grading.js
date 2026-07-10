// ============================================
// 手动批改模块
// ============================================

const ManualGrading = {
    // 评语模板
    commentTemplates: {
        strengths: [
            { id: 's1', label: '立意深刻，主题鲜明' },
            { id: 's2', label: '结构清晰，层次分明' },
            { id: 's3', label: '语言优美，文采斐然' },
            { id: 's4', label: '逻辑严密，论证有力' },
            { id: 's5', label: '创意独特，视角新颖' },
            { id: 's6', label: '情感真挚，感染力强' },
            { id: 's7', label: '内容丰富，详实具体' },
            { id: 's8', label: '开头精彩，结尾有力' }
        ],
        weaknesses: [
            { id: 'w1', label: '立意不够深刻，主题模糊' },
            { id: 'w2', label: '结构散乱，层次不清' },
            { id: 'w3', label: '语言平淡，缺乏文采' },
            { id: 'w4', label: '逻辑不够严密，论证薄弱' },
            { id: 'w5', label: '创意不足，视角普通' },
            { id: 'w6', label: '情感表达不够真挚' },
            { id: 'w7', label: '内容空洞，不够具体' },
            { id: 'w8', label: '开头平淡，结尾仓促' }
        ]
    },

    /**
     * 渲染手动批改界面
     */
    render() {
        const container = document.getElementById('manualGradingArea');
        if (!container) return;

        const { strengths, weaknesses } = this.commentTemplates;

        container.innerHTML = `
            <div style="margin-bottom:16px;">
                <h3 style="font-size:16px;color:#2d3748;margin-bottom:12px;">📊 维度评分</h3>
                <div class="slider-group">
                    ${['内容质量', '结构逻辑', '语言表达', '创意亮点'].map((name, idx) => `
                        <div class="slider-item">
                            <div class="label-row">
                                <span>${name}</span>
                                <span class="value-display" id="val_${idx}">7</span>
                            </div>
                            <input type="range" min="0" max="10" value="7" 
                                   id="slider_${idx}" 
                                   oninput="window.updateSliderValue(${idx})">
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin:16px 0;">
                <h3 style="font-size:16px;color:#2d3748;margin-bottom:12px;">✅ 优点（可多选）</h3>
                <div class="checklist">
                    ${strengths.map(s => `
                        <label>
                            <input type="checkbox" value="${s.id}" class="strength-check">
                            ${s.label}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="margin:16px 0;">
                <h3 style="font-size:16px;color:#2d3748;margin-bottom:12px;">⚠️ 待改进（可多选）</h3>
                <div class="checklist">
                    ${weaknesses.map(w => `
                        <label>
                            <input type="checkbox" value="${w.id}" class="weakness-check">
                            ${w.label}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="margin:16px 0;">
                <h3 style="font-size:16px;color:#2d3748;margin-bottom:8px;">✏️ 自定义评语</h3>
                <textarea id="customComment" rows="3" style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical;font-family:inherit;" placeholder="输入个性化的评语..."></textarea>
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
                <button class="btn btn-primary" onclick="window.generateManualGrade()">📊 生成批改结果</button>
                <button class="btn btn-secondary" onclick="window.clearManualChecks()">🗑️ 清空选择</button>
            </div>
        `;

        // 存储当前作文文本
        this.currentText = window._currentEssayText || '';
    },

    /**
     * 获取滑块值
     */
    getSliderValues() {
        const values = [];
        for (let i = 0; i < 4; i++) {
            const el = document.getElementById(`slider_${i}`);
            values.push(el ? parseInt(el.value) : 7);
        }
        return values;
    },

    /**
     * 获取选中的优点
     */
    getSelectedStrengths() {
        const checks = document.querySelectorAll('.strength-check:checked');
        return Array.from(checks).map(c => c.value);
    },

    /**
     * 获取选中的待改进项
     */
    getSelectedWeaknesses() {
        const checks = document.querySelectorAll('.weakness-check:checked');
        return Array.from(checks).map(c => c.value);
    },

    /**
     * 生成评语
     */
    generateComment(strengths, weaknesses, scores) {
        const parts = [];

        // 总分
        const total = scores.reduce((a, b) => a + b, 0);
        const avg = Math.round(total / 4);
        
        if (avg >= 8) {
            parts.push('🌟 这是一篇优秀的作文！');
        } else if (avg >= 6) {
            parts.push('👍 这是一篇不错的作文，有进一步提升的空间。');
        } else if (avg >= 4) {
            parts.push('✏️ 这篇作文基本完成，但还有不少需要改进的地方。');
        } else {
            parts.push('📚 这篇作文还需要更多的练习和积累。');
        }

        // 优点
        const strengthLabels = this.commentTemplates.strengths;
        const selectedStrengths = strengths.map(id => {
            const found = strengthLabels.find(s => s.id === id);
            return found ? found.label : null;
        }).filter(Boolean);

        if (selectedStrengths.length > 0) {
            parts.push('\n✅ 优点：' + selectedStrengths.join('；'));
        }

        // 待改进
        const weaknessLabels = this.commentTemplates.weaknesses;
        const selectedWeaknesses = weaknesses.map(id => {
            const found = weaknessLabels.find(w => w.id === id);
            return found ? found.label : null;
        }).filter(Boolean);

        if (selectedWeaknesses.length > 0) {
            parts.push('\n📌 待改进：' + selectedWeaknesses.join('；'));
        }

        // 具体建议
        if (scores[0] < 6) {
            parts.push('\n💡 建议加强内容深度，多积累素材。');
        } else if (scores[1] < 6) {
            parts.push('\n💡 建议优化文章结构，使层次更清晰。');
        } else if (scores[2] < 6) {
            parts.push('\n💡 建议提升语言表达，丰富句式。');
        }

        if (total < 24) {
            parts.push('\n📖 建议多阅读优秀范文，加强日常写作练习。');
        }

        return parts.join('\n');
    },

    /**
     * 生成批改结果
     */
    generateGrade(text) {
        const scores = this.getSliderValues();
        const strengths = this.getSelectedStrengths();
        const weaknesses = this.getSelectedWeaknesses();
        const customComment = document.getElementById('customComment')?.value || '';

        const total = scores.reduce((a, b) => a + b, 0);
        const score = Math.round((total / 40) * 100);

        let comment = this.generateComment(strengths, weaknesses, scores);
        if (customComment) {
            comment += '\n\n✏️ 教师评语：' + customComment;
        }

        return {
            score: Math.min(Math.max(score, 30), 100),
            comment: comment,
            dimensions: {
                content: { score: scores[0], comment: this.getDimensionComment(scores[0]) },
                structure: { score: scores[1], comment: this.getDimensionComment(scores[1]) },
                language: { score: scores[2], comment: this.getDimensionComment(scores[2]) },
                creativity: { score: scores[3], comment: this.getDimensionComment(scores[3]) }
            },
            strengths: strengths,
            weaknesses: weaknesses
        };
    },

    /**
     * 维度评语
     */
    getDimensionComment(score) {
        if (score >= 8) return '优秀';
        if (score >= 6) return '良好';
        if (score >= 4) return '一般';
        return '有待提升';
    },

    /**
     * 渲染批改结果
     */
    renderGrade(result, text) {
        const container = document.getElementById('manualResult');
        if (!container) return;

        const { score, comment, dimensions } = result;

        const getScoreColor = (s) => {
            if (s >= 8) return '#48bb78';
            if (s >= 6) return '#ed8936';
            return '#fc8181';
        };

        container.innerHTML = `
            <div class="essay-display">${text}</div>

            <div class="score-card">
                <div class="score-big" style="background:linear-gradient(135deg,#48bb78,#38a169);">
                    <div class="number">${score}</div>
                    <div class="label">综合得分</div>
                </div>
                <div class="score-details">
                    ${Object.entries(dimensions).map(([key, val]) => `
                        <div class="score-item">
                            <div class="name">${this.getDimensionLabel(key)}</div>
                            <div class="value">
                                <span style="color:${getScoreColor(val.score)}">${val.score}</span>
                                <span class="total">/ 10</span>
                                <div style="font-size:12px;color:#718096;margin-top:2px;">${val.comment}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="comments-box" style="border-left-color:#48bb78;">
                <div class="title" style="color:#38a169;">📝 教师评语</div>
                <div class="content">${comment}</div>
            </div>

            <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
                <button class="btn btn-success" onclick="window.copyResult()">📋 复制评语</button>
                <button class="btn btn-secondary" onclick="window.switchToAI()">🤖 切换到智能批改</button>
            </div>
        `;

        document.getElementById('manualResultArea').style.display = 'block';
        document.getElementById('resultArea').style.display = 'block';
        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
    },

    getDimensionLabel(key) {
        const labels = {
            'content': '内容质量',
            'structure': '结构逻辑',
            'language': '语言表达',
            'creativity': '创意亮点'
        };
        return labels[key] || key;
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ManualGrading;
}