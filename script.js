class CommentApp {
    constructor() {
        // 安全访问检查
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase 未初始化');
            this.showError('系统初始化中，请稍后重试...');
            // 延迟重试
            setTimeout(() => this.retryInit(), 1000);
            return;
        }
        
        this.supabase = window.supabase;
        this.initApplication();
    }
    
    retryInit() {
        if (typeof window.supabase !== 'undefined') {
            this.supabase = window.supabase;
            this.initApplication();
        }
    }
    
    initApplication() {
        this.initElements();
        this.bindEvents();
        this.loadComments();
        this.setupRealtime();
    }
    
    async loadComments() {
        // 添加安全检查
        if (!this.supabase) {
            console.error('Supabase 客户端未就绪');
            return;
        }
        
        try {
            const { data: comments, error } = await this.supabase
                .from('comments')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            this.renderComments(comments);
        } catch (error) {
            console.error('加载评论失败:', error);
        }
    }
}
