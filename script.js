/**
 * Supabase 实时评论系统
 * 功能：
 * - 发表评论
 * - 实时显示新评论
 * - 加载更多评论
 * - 输入验证和字数统计
 */
class CommentApp {
    constructor() {
        this.isSubmitting = false;
        this.isLoading = false;
        this.offset = 0;
        this.limit = 10;
        this.commentCount = 0;
        this.realtimeSubscription = null;
        
        // 从本地存储获取用户名
        this.savedUsername = localStorage.getItem('comment-username') || '';
        
        this.initElements();
        this.bindEvents();
        this.loadComments();
        this.setupRealtime();
    }
    
    initElements() {
        this.elements = {
            submitBtn: document.getElementById('submit-comment'),
            commentInput: document.getElementById('comment-input'),
            usernameInput: document.getElementById('username'),
            errorMsg: document.getElementById('error-message'),
            container: document.getElementById('comments-container'),
            loadMoreBtn: document.getElementById('load-more'),
            charCount: document.getElementById('char-count')
        };
        
        // 设置保存的用户名
        if (this.savedUsername) {
            this.elements.usernameInput.value = this.savedUsername;
        }
    }
    
    bindEvents() {
        // 提交评论
        this.elements.submitBtn.addEventListener('click', this.debounce(() => {
            this.submitComment();
        }, 500));
        
        // 加载更多
        this.elements.loadMoreBtn.addEventListener('click', () => {
            this.loadComments();
        });
        
        // 字数统计
        this.elements.commentInput.addEventListener('input', () => {
            this.updateCharCount();
        });
        
        // 保存用户名
        this.elements.usernameInput.addEventListener('change', () => {
            localStorage.setItem('comment-username', this.elements.usernameInput.value.trim());
        });
    }
    
    async loadComments() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.elements.loadMoreBtn.style.display = 'none';
        
        try {
            const { data: comments, error, count } = await supabase
                .from('comments')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(this.offset, this.offset + this.limit - 1);
            
            if (error) throw error;
            
            this.commentCount = count;
            
            // 首次加载清空容器
            if (this.offset === 0) {
                this.elements.container.innerHTML = '';
                
                if (comments.length === 0) {
                    this.elements.container.innerHTML = '<div class="no-comments">还没有评论，快来发表第一条吧！</div>';
                    this.isLoading = false;
                    return;
                }
            }
            
            comments.forEach(comment => {
                this.elements.container.appendChild(this.createCommentElement(comment));
            });
            
            // 检查是否还有更多评论
            if (this.offset + this.limit < this.commentCount) {
                this.elements.loadMoreBtn.style.display = 'block';
            }
            
            this.offset += this.limit;
            
        } catch (error) {
            console.error('加载评论失败:', error);
            this.elements.container.innerHTML = 
                '<div class="message error">加载评论失败，请刷新页面重试</div>';
        } finally {
            this.isLoading = false;
        }
    }
    
    setupRealtime() {
        // 取消之前的订阅（如果存在）
        if (this.realtimeSubscription) {
            supabase.removeChannel(this.realtimeSubscription);
        }
        
        // 设置实时订阅
        this.realtimeSubscription = supabase
            .channel('comments')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'comments'
            }, (payload) => {
                const newComment = payload.new;
                this.elements.container.insertBefore(
                    this.createCommentElement(newComment),
                    this.elements.container.firstChild
                );
                
                // 更新评论计数
                this.commentCount++;
            })
            .subscribe();
    }
    
    async submitComment() {
        if (this.isSubmitting) return;
        
        const content = this.elements.commentInput.value.trim();
        const username = this.elements.usernameInput.value.trim() || '匿名用户';
        
        // 验证输入
        if (!content) {
            this.showError('请输入评论内容');
            return;
        }
        
        if (content.length > 500) {
            this.showError('评论内容不能超过500字');
            return;
        }
        
        this.isSubmitting = true;
        this.clearError();
        this.elements.submitBtn.textContent = '发布中...';
        this.elements.submitBtn.disabled = true;
        
        try {
            const { error } = await supabase
                .from('comments')
                .insert([{ 
                    username: this.sanitizeInput(username),
                    content: this.sanitizeInput(content)
                }]);
            
            if (error) throw error;
            
            // 清空输入
            this.elements.commentInput.value = '';
            this.updateCharCount();
            
        } catch (error) {
            console.error('添加评论失败:', error);
            this.showError('发布评论失败，请稍后再试');
        } finally {
            this.isSubmitting = false;
            this.elements.submitBtn.textContent = '发布评论';
            this.elements.submitBtn.disabled = false;
        }
    }
    
    createCommentElement(comment) {
        const element = document.createElement('div');
        element.className = 'comment';
        element.setAttribute('data-id', comment.id);
        
        const header = document.createElement('div');
        header.className = 'comment-header';
        
        const username = document.createElement('span');
        username.className = 'username';
        username.textContent = this.sanitizeInput(comment.username);
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date(comment.created_at).toLocaleString();
        
        const content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = this.sanitizeInput(comment.content);
        
        header.appendChild(username);
        header.appendChild(timestamp);
        element.appendChild(header);
        element.appendChild(content);
        
        return element;
    }
    
    updateCharCount() {
        const length = this.elements.commentInput.value.length;
        this.elements.charCount.textContent = `${length}/500`;
    }
    
    showError(message) {
        this.elements.errorMsg.textContent = message;
        this.elements.errorMsg.style.display = 'block';
    }
    
    clearError() {
        this.elements.errorMsg.textContent = '';
        this.elements.errorMsg.style.display = 'none';
    }
    
    sanitizeInput(str) {
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    cleanup() {
        if (this.realtimeSubscription) {
            supabase.removeChannel(this.realtimeSubscription);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new CommentApp();
    
    // 清理资源当页面卸载时
    window.addEventListener('beforeunload', () => {
        app.cleanup();

    });
});