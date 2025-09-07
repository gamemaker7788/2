class CommentApp {
    constructor() {
        // 使用全局客户端实例
        this.supabase = window.supabaseClient;
        
        if (!this.supabase) {
            console.error('Supabase 未初始化');
            this.showError('系统初始化中，请稍后重试...');
            return;
        }
        
        this.initApplication();
    }
    
    // 修改所有 supabase 访问为 this.supabase
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
        }
    }
    
    // 其他方法中的 supabase 都要改为 this.supabase
}
