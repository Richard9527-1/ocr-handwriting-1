// ============================================
// OCR识别模块
// ============================================

const OCR = {
    /**
     * 识别单张图片
     * @param {File} file - 图片文件
     * @returns {Promise<Object>} 识别结果
     */
    async recognize(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/ocr', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.code === 0) {
            return {
                success: true,
                text: data.data.text,
                score: data.data.score,
                comments: data.data.comments,
                charCount: data.data.char_count
            };
        } else {
            return {
                success: false,
                error: data.msg || '识别失败'
            };
        }
    },

    /**
     * 批量识别多张图片
     * @param {File[]} files - 图片文件数组
     * @param {Function} onProgress - 进度回调
     * @returns {Promise<Array>} 识别结果数组
     */
    async batchRecognize(files, onProgress) {
        const results = [];
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const result = await this.recognize(files[i]);
            results.push({
                index: i,
                file: files[i],
                ...result
            });
            
            if (onProgress) {
                onProgress(i + 1, total, result);
            }
        }

        return results;
    },

    /**
     * 智能批改（仅对已有文本）
     * @param {string} text - 作文文本
     * @returns {Promise<Object>} 批改结果
     */
    async autoGrade(text) {
        const response = await fetch('/api/grading/auto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        
        if (data.code === 0) {
            return {
                success: true,
                score: data.data.score,
                comments: data.data.comments,
                dimensions: data.data.dimensions,
                summary: data.data.summary
            };
        } else {
            return {
                success: false,
                error: data.msg || '批改失败'
            };
        }
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OCR;
}