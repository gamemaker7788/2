class CommentApp {
    constructor() {
        this.isSubmitting = false;
        
        this.bindEvents();
        this.loadComments();
        this.setupRealtime();
    }
    
    bindEvents() {
        document.getElementById('submit-comment').addEventListener('click', (e) => {
            e.preventDefault();
            this.submitComment();
        });
    }
    
    async loadComments() {
        try {
            const { data: comments, error } = await supabase
                .from('comments')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            const container = document.getElementById('comments-container');
            container.innerHTML = '';
            
            if (comments.length === 0) {
                container.innerHTML = '<div class="no-comments">还没有评论，快来发表第一条吧！</div>';
                return;
            }
            
            comments.forEach(comment => {
                container.appendChild(this.createCommentElement(comment));
            });
            
        } catch (error) {
            console.error('加载评论失败:', error);
            document.getElementById('comments-container').innerHTML = 
                '<div class="message error">加载评论失败，请刷新页面重试</div>';
        }
    }
    
    setupRealtime() {
        // 设置实时订阅
        supabase
            .channel('comments')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'comments'
            }, (payload) => {
                const container = document.getElementById('comments-container');
                const newComment = payload.new;
                container.insertBefore(
                    this.createCommentElement(newComment),
                    container.firstChild
                );
            })
            .subscribe();
    }
    
    async submitComment() {
        if (this.isSubmitting) return;
        
        const content = document.getElementById('comment-input').value.trim();
        const username = document.getElementById('username').value.trim() || '匿名用户';
        const errorMsg = document.getElementById('error-message');
        
        // 验证输入
        if (!content) {
            errorMsg.textContent = '请输入评论内容';
            return;
        }
        
        if (content.length > 500) {
            errorMsg.textContent = '评论内容不能超过500字';
            return;
        }
        
        this.isSubmitting = true;
        errorMsg.textContent = '';
        document.getElementById('submit-comment').textContent = '发布中...';
        
        try {
            const { error } = await supabase
                .from('comments')
                .insert([
                    { 
                        username: username,
                        content: content
                    }
                ]);
            
            if (error) throw error;
            
            document.getElementById('comment-input').value = '';
            document.getElementById('username').value = '';
            
        } catch (error) {
            console.error('添加评论失败:', error);
            errorMsg.textContent = '发布评论失败，请稍后再试';
        } finally {
            this.isSubmitting = false;
            document.getElementById('submit-comment').textContent = '发布评论';
        }
    }
    
    createCommentElement(comment) {
        const element = document.createElement('div');
        element.className = 'comment';
        
        const header = document.createElement('div');
        header.className = 'comment-header';
        
        const username = document.createElement('span');
        username.className = 'username';
        username.textContent = comment.username;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date(comment.created_at).toLocaleString();
        
        const content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = comment.content;
        
        header.appendChild(username);
        header.appendChild(timestamp);
        element.appendChild(header);
        element.appendChild(content);
        
        return element;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new CommentApp();
});
