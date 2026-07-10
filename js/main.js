// ============================================
// 主逻辑 - 作文批改系统
// ============================================

// 全局状态
const state = {
    files: [],           // 上传的文件列表
    currentText: '',     // 当前识别的作文文本
    currentResult: null, // 当前批改结果
    mode: 'ai',          // 'ai' | 'manual'
    isProcessing: false
};

// DOM 引用
const dom = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    previewGrid: document.getElementById('previewGrid'),
    recognizeBtn: document.getElementById('recognizeBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    resultArea: document.getElementById('resultArea'),
    resultBox: document.getElementById('resultBox'),
    statusText: document.getElementById('statusText'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    progressFill: document.getElementById('progressFill'),
    modeTabs: document.querySelectorAll('.mode-tab'),
    modeContents: document.querySelectorAll('.mode-content'),
    aiResult: document.getElementById('aiResult'),
    manualGradingArea: document.getElementById('manualGradingArea'),
    manualResult: document.getElementById('manualResult'),
    manualResultArea: document.getElementById('manualResultArea')
};

// ============================================
// 文件上传处理
// ============================================

dom.dropZone.addEventListener('click', () => dom.fileInput.click());

dom.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropZone.classList.add('dragover');
});
dom.dropZone.addEventListener('dragleave', () => {
    dom.dropZone.classList.remove('dragover');
});
dom.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
});

dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFiles(e.target.files);
        dom.fileInput.value = '';
    }
});

function handleFiles(files) {
    const remaining = 10 - state.files.length;
    if (remaining <= 0) {
        alert('最多只能上传 10 张图片！');
        return;
    }

    let added = 0;
    for (const file of files) {
        if (added >= remaining) break;
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = (e) => {
            state.files.push({
                id: Date.now() + Math.random() * 1000,
                file: file,
                dataUrl: e.target.result,
                status: 'pending',
                result: null,
                error: null
            });
            renderPreview();
            updateButtons();
        };
        reader.readAsDataURL(file);
        added++;
    }
}

function removeFile(id) {
    if (state.isProcessing) {
        alert('识别进行中，请等待完成');
        return;
    }
    state.files = state.files.filter(item => item.id !== id);
    renderPreview();
    updateButtons();
    if (state.files.length === 0) {
        dom.resultArea.style.display = 'none';
        dom.copyBtn.style.display = 'none';
    }
}

function renderPreview() {
    dom.previewGrid.innerHTML = '';
    state.files.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'preview-item';

        const img = document.createElement('img');
        img.src = item.dataUrl;
        div.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeFile(item.id);
        };
        div.appendChild(removeBtn);

        const statusBadge = document.createElement('span');
        statusBadge.className = 'status-badge';
        const statusMap = {
            'pending': '⏳ 待识别',
            'processing': '⏳ 识别中',
            'done': '✅ 完成',
            'error': '❌ 失败'
        };
        statusBadge.textContent = statusMap[item.status] || item.status;
        if (item.status === 'done') statusBadge.className += ' done';
        if (item.status === 'error') statusBadge.className += ' error';
        if (item.status === 'processing') statusBadge.className += ' processing';
        div.appendChild(statusBadge);

        dom.previewGrid.appendChild(div);
    });

    dom.dropZone.style.display = state.files.length >= 10 ? 'none' : 'block';
}

function updateButtons() {
    const hasPending = state.files.some(item => item.status === 'pending');
    dom.recognizeBtn.disabled = state.files.length === 0 || state.isProcessing || !hasPending;
    dom.clearBtn.disabled = state.files.length === 0 || state.isProcessing;
}

// ============================================
// 核心识别功能
// ============================================

async function startRecognition() {
    if (state.isProcessing) return;
    if (state.files.length === 0) {
        alert('请先上传图片');
        return;
    }

    const pendingItems = state.files.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
        alert('所有图片已识别完成');
        return;
    }

    state.isProcessing = true;
    dom.recognizeBtn.disabled = true;
    dom.loadingSpinner.style.display = 'block';
    dom.statusText.textContent = '正在识别...';
    dom.progressFill.style.width = '0%';
    dom.copyBtn.style.display = 'none';

    const total = pendingItems.length;
    let completed = 0;
    let firstSuccess = null;

    for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        item.status = 'processing';
        renderPreview();

        try {
            const result = await OCR.recognize(item.file);
            
            if (result.success) {
                item.status = 'done';
                item.result = result;
                item.error = null;
                if (!firstSuccess) {
                    firstSuccess = result;
                    state.currentText = result.text;
                }
            } else {
                item.status = 'error';
                item.result = null;
                item.error = result.error;
            }
        } catch (error) {
            item.status = 'error';
            item.result = null;
            item.error = error.message || '识别失败';
        }

        completed++;
        dom.progressFill.style.width = `${(completed / total) * 100}%`;
        renderPreview();
        dom.statusText.textContent = `识别中 ${completed}/${total}`;
        renderResults();
    }

    state.isProcessing = false;
    dom.loadingSpinner.style.display = 'none';
    dom.recognizeBtn.disabled = false;
    updateButtons();

    const doneCount = state.files.filter(item => item.status === 'done').length;
    const errorCount = state.files.filter(item => item.status === 'error').length;
    dom.statusText.textContent = `✅ 完成：${doneCount} 张成功${errorCount > 0 ? `，${errorCount} 张失败` : ''}`;

    if (doneCount > 0) {
        dom.copyBtn.style.display = 'inline-flex';
    }

    // 如果有识别成功的，自动进行智能批改
    if (firstSuccess) {
        dom.statusText.textContent = '🤖 正在进行智能批改...';
        await performAIGrading(firstSuccess.text);
    }
}

function renderResults() {
    const doneItems = state.files.filter(item => item.status === 'done');
    const errorItems = state.files.filter(item => item.status === 'error');

    if (doneItems.length === 0 && errorItems.length === 0) {
        dom.resultBox.innerHTML = '<span class="placeholder">等待识别...</span>';
        return;
    }

    let html = '';
    state.files.forEach((item, index) => {
        if (item.status === 'done') {
            const text = item.result?.text || '';
            const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
            html += `
                <div class="result-item" style="border-bottom:1px solid #e2e8f0;padding:8px 0;">
                    <div style="font-weight:600;color:#2d3748;font-size:13px;">📄 图片 ${index + 1} ✅</div>
                    <div style="font-size:14px;color:#4a5568;margin-top:2px;">${preview || '<span style="color:#a0aec0;">(空结果)</span>'}</div>
                </div>
            `;
        } else if (item.status === 'error') {
            html += `
                <div class="result-item" style="border-bottom:1px solid #e2e8f0;padding:8px 0;">
                    <div style="font-weight:600;color:#2d3748;font-size:13px;">📄 图片 ${index + 1} ❌</div>
                    <div style="font-size:14px;color:#e53e3e;margin-top:2px;">${item.error || '识别失败'}</div>
                </div>
            `;
        } else if (item.status === 'processing') {
            html += `
                <div class="result-item" style="border-bottom:1px solid #e2e8f0;padding:8px 0;">
                    <div style="font-weight:600;color:#2d3748;font-size:13px;">📄 图片 ${index + 1} ⏳</div>
                    <div style="font-size:14px;color:#ed8936;margin-top:2px;">识别中...</div>
                </div>
            `;
        }
    });

    dom.resultBox.innerHTML = html;
    dom.resultArea.style.display = 'block';
}

// ============================================
// 智能批改
// ============================================

async function performAIGrading(text) {
    dom.statusText.textContent = '🤖 智能批改中...';
    dom.loadingSpinner.style.display = 'block';

    try {
        const result = await OCR.autoGrade(text);
        
        if (result.success) {
            // 切换到AI模式
            switchMode('ai');
            AIGrading.renderResult(result, text);
            state.currentResult = result;
        } else {
            dom.resultBox.innerHTML = `
                <div style="color:#e53e3e;padding:12px;">
                    ❌ 批改失败：${result.error}
                </div>
            `;
        }
    } catch (error) {
        dom.resultBox.innerHTML = `
            <div style="color:#e53e3e;padding:12px;">
                ❌ 批改请求失败：${error.message}
            </div>
        `;
    }

    dom.loadingSpinner.style.display = 'none';
    dom.statusText.textContent = '✅ 批改完成';
}

// ============================================
// 模式切换
// ============================================

function switchMode(mode) {
    state.mode = mode;
    
    dom.modeTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    dom.modeContents.forEach(content => {
        content.classList.toggle('active', content.id === `${mode}Mode`);
    });

    // 如果切换到手动模式，渲染手动批改界面
    if (mode === 'manual' && state.currentText) {
        ManualGrading.currentText = state.currentText;
        ManualGrading.render();
        // 隐藏智能批改结果，显示手动批改区域
        dom.aiResult.style.display = 'none';
        dom.manualResultArea.style.display = 'none';
        dom.manualGradingArea.style.display = 'block';
    } else if (mode === 'ai') {
        dom.aiResult.style.display = 'block';
        dom.manualGradingArea.style.display = 'none';
        dom.manualResultArea.style.display = 'none';
    }
}

// ============================================
// 手动批改 - 全局函数（供HTML调用）
// ============================================

window.updateSliderValue = function(idx) {
    const el = document.getElementById(`slider_${idx}`);
    const display = document.getElementById(`val_${idx}`);
    if (el && display) {
        display.textContent = el.value;
    }
};

window.generateManualGrade = function() {
    if (!state.currentText) {
        alert('请先识别作文内容');
        return;
    }
    
    const result = ManualGrading.generateGrade(state.currentText);
    ManualGrading.renderGrade(result, state.currentText);
    state.currentResult = result;
};

window.clearManualChecks = function() {
    document.querySelectorAll('.strength-check, .weakness-check').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.value = 7;
        const idx = slider.id.replace('slider_', '');
        const display = document.getElementById(`val_${idx}`);
        if (display) display.textContent = '7';
    });
    document.getElementById('customComment').value = '';
};

window.switchToAI = function() {
    switchMode('ai');
    if (state.currentText) {
        dom.statusText.textContent = '🤖 智能批改中...';
        performAIGrading(state.currentText);
    }
};

window.switchToManual = function() {
    switchMode('manual');
};

window.copyResult = function() {
    let text = '';
    if (state.currentResult) {
        text = `【得分】${state.currentResult.score}分\n\n【评语】\n${state.currentResult.comment}`;
    } else if (state.currentText) {
        text = state.currentText;
    } else {
        alert('没有可复制的内容');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        const btn = dom.copyBtn;
        const orig = btn.textContent;
        btn.textContent = '✅ 已复制';
        setTimeout(() => { btn.textContent = orig; }, 1500);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        alert('已复制到剪贴板');
    });
};

// ============================================
// 清空功能
// ============================================

function clearAll() {
    if (state.isProcessing) {
        alert('识别进行中，请等待完成');
        return;
    }
    if (state.files.length > 0 && !confirm('确定要清空所有内容吗？')) {
        return;
    }
    state.files = [];
    state.currentText = '';
    state.currentResult = null;
    renderPreview();
    updateButtons();
    dom.resultArea.style.display = 'none';
    dom.copyBtn.style.display = 'none';
    dom.progressFill.style.width = '0%';
    dom.statusText.textContent = '就绪';
    dom.aiResult.innerHTML = '';
    dom.manualResult.innerHTML = '';
    dom.manualResultArea.style.display = 'none';
    dom.manualGradingArea.innerHTML = '';
}

// ============================================
// 事件绑定
// ============================================

dom.recognizeBtn.addEventListener('click', startRecognition);
dom.clearBtn.addEventListener('click', clearAll);
dom.copyBtn.addEventListener('click', window.copyResult);

// 模式切换
dom.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        if (mode === 'manual' && !state.currentText) {
            alert('请先识别作文内容再进行批改');
            return;
        }
        switchMode(mode);
    });
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !dom.recognizeBtn.disabled) {
        startRecognition();
    }
});

// ============================================
// 初始化
// ============================================

renderPreview();
updateButtons();
console.log('📝 作文批改系统已加载');
console.log('💡 支持智能批改和手动批改两种模式');