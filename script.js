/**
 * Supabase 实时评论系统
 * 修复了初始化时机问题
 */
class CommentApp {
    constructor() {
        this.isSubmitting = false;
        this.isLoading = false;
        this.offset = 0;
        this.limit = 10;
        this.commentCount = 0;
        this.realtimeSubscription = null;
        
        this.savedUsername = localStorage.getItem('comment-username') || '';
        
        // 确保 Supabase 初始化
        if (!window.getSupabase) {
            console.error('Supabase 配置未加载');
            this.showGlobalError('系统配置错误，请刷新页面');
            return;
        }

        this.initElements();
        this.bindEvents();
        
        // 延迟初始化以确保所有依赖就绪
        setTimeout(() => {
            this.initSupabase();
        }, 100);
    }
    
    async initSupabase() {
        try {
            // 获取 Supabase 实例
            this.supabase = window.getSupabase();
            
            // 测试连接
            const { error } = await this.supabase.from('comments').select('count').limit(1);
            if (error) {
                throw new Error('数据库连接失败: ' + error.message);
            }
            
            console.log('Supabase 连接测试成功');
            this.loadComments();
            this.setupRealtime();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('系统初始化失败: ' + error.message);
        }
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
        
        if (this.savedUsername) {
            this.elements.usernameInput.value = this.savedUsername;
        }
    }
    
    bindEvents() {
        this.elements.submitBtn.addEventListener('click', this.debounce(() => {
            this.submitComment();
        }, 500));
        
        this.elements.loadMoreBtn.addEventListener('click', () => {
            this.loadComments();
        });
        
        this.elements.commentInput.addEventListener('input', () => {
            this.updateCharCount();
        });
        
        this.elements.usernameInput.addEventListener('change', () => {
            localStorage.setItem('comment-username', this.elements.usernameInput.value.trim());
        });
    }
    
    async loadComments() {
        if (this.isLoading || !this.supabase) return;
        
        this.isLoading = true;
        this.elements.loadMoreBtn.style.display = 'none';
        this.elements.container.innerHTML = '<div class="loading">加载评论中...</div>';

        try {
            const { data: comments, error, count } = await this.supabase
                .from('comments')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(this.offset, this.offset + this.limit - 1);
            
            if (error) {
                console.error('Supabase查询错误:', error);
                throw new Error('加载评论失败: ' + error.message);
            }
            
            this.commentCount = count;
            this.elements.container.innerHTML = '';
            
            if (!comments || comments.length === 0) {
                this.elements.container.innerHTML = '<div class="no-comments">还没有评论，快来发表第一条吧！</div>';
                return;
            }
            
            comments.forEach(comment => {
                this.elements.container.appendChild(this.createCommentElement(comment));
            });
            
            if (this.offset + this.limit < this.commentCount) {
                this.elements.loadMoreBtn.style.display = 'block';
            }
            
            this.offset += this.limit;
            
        } catch (error) {
            console.error('加载评论失败:', error);
            this.elements.container.innerHTML = 
                `<div class="message error">${error.message}</div>`;
        } finally {
            this.isLoading = false;
        }
    }
    
    setupRealtime() {
        if (!this.supabase) return;
        
        if (this.realtimeSubscription) {
            this.supabase.removeChannel(this.realtimeSubscription);
        }
        
        this.realtimeSubscription = this.supabase
            .channel('comments-channel')
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
                this.commentCount++;
            })
            .subscribe((status) => {
                console.log('实时订阅状态:', status);
            });
    }
    
    async submitComment() {
        if (this.isSubmitting || !this.supabase) return;
        
        const content = this.elements.commentInput.value.trim();
        const username = this.elements.usernameInput.value.trim() || '匿名用户';
        
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
            const { error } = await this.supabase
                .from('comments')
                .insert([{ 
                    username: this.sanitizeInput(username),
                    content: this.sanitizeInput(content)
                }]);
            
            if (error) {
                console.error('Supabase插入错误:', error);
                throw new Error('发布失败: ' + error.message);
            }
            
            this.elements.commentInput.value = '';
            this.updateCharCount();
            
        } catch (error) {
            console.error('添加评论失败:', error);
            this.showError(error.message);
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
    
    showGlobalError(message) {
        const container = document.getElementById('comments-container');
        container.innerHTML = `<div class="message error">${message}</div>`;
    }
    
    clearError() {
        this.elements.errorMsg.textContent = '';
        this.elements.errorMsg.style.display = 'none';
    }
    
    sanitizeInput(str) {
        if (!str) return '';
        return str.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        if (this.realtimeSubscription && this.supabase) {
            this.supabase.removeChannel(this.realtimeSubscription);
        }
    }
}

// 安全的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 先初始化 Supabase 配置
    if (window.initSupabase) {
        window.initSupabase();
    }
    
    // 然后创建应用实例
    setTimeout(() => {
        const app = new CommentApp();
        
        window.addEventListener('beforeunload', () => {
            app.cleanup();
        });
        
        // 全局访问用于调试
        window.commentApp = app;
    }, 200);
});