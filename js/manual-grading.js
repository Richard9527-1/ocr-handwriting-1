// ============================================
// 手动批改模块
// ============================================

const ManualGrading = {
    // 评语模板（60分制）
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
                <h3 style="font-size:16px;color:#2d3748;margin-bottom:12px;">📊 维度评分（每项满分10分）</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;">
                    ${['内容质量', '结构逻辑', '语言表达', '创意亮点'].map((name, idx) => `
                        <div style="display:flex;flex-direction:column;gap:4px;">
                            <div style="display:flex;justify-content:space-between;font-size:14px;color:#2d3748;">
                                <span>${name}</span>
                                <span style="font-weight:600;color:#4299e1;" id="val_${idx}">7</span>
                            </div>
                            <input type="range" min="0" max="10" value="7" 
                                   id="slider_${idx}" 
                                   style="width:100%;accent-color:#4299e1;cursor:pointer;"
                                   oninput="window.updateSliderValue(${idx})">
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin:16px 0;">
                <h3 style="font-size:16px;color:#2d3748;margin-bottom:12px;">✅ 优点（可多选）</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;">
                    ${strengths.map(s => `
                        <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:14px;color:#2d3748;">
                            <input type="checkbox" value="${s.id}" class="strength-check" style="width:18px;height:18px;accent-color:#4299e1;cursor:pointer;">
                            ${s.label}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="margin:16px 0;">
                <h3 style="font-size:16px;color:#2d3748;margin-bottom:12px;">⚠️ 待改进（可多选）</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;">
                    ${weaknesses.map(w => `
                        <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:14px;color:#2d3748;">
                            <input type="checkbox" value="${w.id}" class="weakness-check" style="width:18px;height:18px;accent-color:#e53e3e;cursor:pointer;">
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
     * 生成评语（60分制）
     */
    generateComment(strengths, weaknesses, scores) {
        const parts = [];

        // 计算总分（4项各10分，共40分，转换为60分制）
        const total = scores.reduce((a, b) => a + b, 0);
        const score60 = Math.round((total / 40) * 60);
        
        if (score60 >= 52) {
            parts.push('🌟 这是一篇非常优秀的作文！');
        } else if (score60 >= 44) {
            parts.push('👍 这是一篇优秀的作文，展现了你扎实的写作功底。');
        } else if (score60 >= 36) {
            parts.push('📝 这是一篇不错的作文，有进一步提升的空间。');
        } else if (score60 >= 28) {
            parts.push('✏️ 这篇作文基本完成了写作任务，但还有不少需要改进的地方。');
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
        if (scores[0] < 5) {
            parts.push('\n💡 建议加强内容深度，多积累素材。');
        }
        if (scores[1] < 5) {
            parts.push('\n💡 建议优化文章结构，使层次更清晰。');
        }
        if (scores[2] < 5) {
            parts.push('\n💡 建议提升语言表达，丰富句式。');
        }
        if (scores[3] < 4) {
            parts.push('\n💡 建议多思考，增加文章的创意和深度。');
        }

        if (score60 < 36) {
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

        // 转换为60分制
        const total = scores.reduce((a, b) => a + b, 0);
        const score = Math.round((total / 40) * 60);

        let comment = this.generateComment(strengths, weaknesses, scores);
        if (customComment) {
            comment += '\n\n✏️ 教师评语：' + customComment;
        }

        return {
            score: Math.min(Math.max(score, 20), 60),
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
            if (s >= 5) return '#ed8936';
            return '#fc8181';
        };

        const dimLabels = {
            'content': '内容质量',
            'structure': '结构逻辑',
            'language': '语言表达',
            'creativity': '创意亮点'
        };

        container.innerHTML = `
            <div style="background:#f7fafc;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;max-height:300px;overflow-y:auto;white-space:pre-wrap;font-size:14px;line-height:1.8;">
                ${text}
            </div>

            <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;">
                <div style="background:linear-gradient(135deg,#48bb78,#38a169);color:white;border-radius:16px;padding:20px 32px;text-align:center;min-width:120px;flex:0 0 auto;">
                    <div style="font-size:48px;font-weight:700;line-height:1;">${score}</div>
                    <div style="font-size:14px;opacity:0.8;margin-top:4px;">综合得分</div>
                </div>
                <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:12px;min-width:200px;">
                    ${Object.entries(dimensions).map(([key, val]) => `
                        <div style="background:#edf2f7;border-radius:10px;padding:12px 16px;">
                            <div style="font-size:13px;color:#718096;">${dimLabels[key] || key}</div>
                            <div style="font-size:18px;font-weight:600;color:#2d3748;">
                                <span style="color:${getScoreColor(val.score)}">${val.score}</span>
                                <span style="font-size:13px;font-weight:400;color:#a0aec0;">/ 10</span>
                            </div>
                            <div style="font-size:12px;color:#718096;margin-top:2px;">${val.comment}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="background:#ebf8ff;border-radius:12px;padding:20px 24px;border-left:4px solid #48bb78;">
                <div style="font-weight:600;color:#2b6cb0;margin-bottom:8px;">📝 教师评语</div>
                <div style="color:#2d3748;line-height:1.8;white-space:pre-wrap;font-size:14px;">${comment}</div>
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