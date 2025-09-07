// 将 CommentApp 类暴露到全局
window.CommentApp = class CommentApp {
    constructor() {
        // 检查 Supabase 是否已初始化
        if (!window.supabaseClient) {
            console.error('Supabase 未初始化');
            this.showError('系统初始化中，请稍后重试...');
            // 延迟重试
            setTimeout(() => {
                if (window.supabaseClient) {
                    this.initApplication();
                }
            }, 1000);
            return;
        }
        
        this.initApplication();
    }
    
    initApplication() {
        this.supabase = window.supabaseClient;
        this.isSubmitting = false;
        this.isLoading = false;
        
        this.initElements();
        this.bindEvents();
        this.loadComments();
        this.setupRealtime();
        
        console.log('评论系统初始化完成');
    }
    
    // 其余方法保持不变...
    async loadComments() {
        if (!this.supabase) {
            console.error('Supabase 客户端未就绪');
            return;
        }
        // 原有逻辑...
    }
    
    // 其他方法...
};

// 移除原有的 DOMContentLoaded 监听
