class CommentApp {
    constructor() {
        // 安全访问 supabase
        this.supabase = window.supabase;
        if (!this.supabase) {
            console.error('Supabase 未初始化');
            this.showError('系统初始化中，请稍后重试...');
            return;
        }
        
        this.initElements();
        this.bindEvents();
        this.loadComments();
        this.setupRealtime();
    }

    async loadComments() {
        try {
            const { data: comments, error } = await this.supabase
                .from('comments')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            this.renderComments(comments);
        } catch (error) {
            console.error('加载失败:', error);
            this.showError('加载评论失败，请刷新页面重试');
        }
    }

    // 其他方法保持不变...
}

// 延迟初始化确保 DOM 就绪
setTimeout(() => {
    new CommentApp();
}, 100);
