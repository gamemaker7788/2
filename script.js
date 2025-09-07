/**
 * Supabase 实时评论系统
 * 完整的同步功能实现
 */
class CommentApp {
    constructor() {
        this.supabase = window.supabaseClient;
        
        if (!this.supabase) {
            console.error('Supabase 未初始化');
            this.showError('系统初始化中，请稍后重试...');
            setTimeout(() => this.retryInit(), 1000);
            return;
        }
        
        this.initApplication();
    }
    
    retryInit() {
        if (window.supabaseClient) {
            this.supabase = window.supabaseClient;
            this.initApplication();
        }
    }
    
    initApplication() {
        this.isSubmitting = false;
        this.isLoading = false;
        this.offset = 0;
        this.limit = 10;
        this.commentCount = 0;
        this.realtimeSubscription = null;
        this.heartbeatInterval = null;
        
        this.savedUsername = localStorage.getItem('comment-username') || '';
        
        this.initElements();
        this.bindEvents();
        this.loadComments();
        this.setupRealtime();
        this.startHeartbeat();
        this.updateConnectionStatus('connected');
    }
    
    initElements() {
        this.elements = {
            submitBtn: document.getElementById('submit-comment'),
            commentInput: document.getElementById('comment-input'),
            usernameInput: document.getElementById('username'),
            errorMsg: document.getElementById('error-message'),
            container: document.getElementById('comments-container'),
            loadMoreBtn: document.getElementById('load-more'),
            charCount: document.getElementById('char-count'),
            statusDot: document.getElementById('status-dot'),
            statusText: document.getElementById('status-text'),
            manualSync: document.getElementById('manual-sync')
        };
        
        if (this.savedUsername) {
            this.elements.usernameInput.value = this.savedUsername;
        }
    }
    
    bindEvents() {
        this.elements.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.submitComment();
        });
        
        this.elements.loadMoreBtn.addEventListener('click', () => {
            this.loadComments();
        });
        
        this.elements.manualSync.addEventListener('click', () => {
            this.manualSync();
        });
        
        this.elements.commentInput.addEventListener('input', () => {
            this.updateCharCount();
        });
        
        this.elements.usernameInput.addEventListener('change', () => {
            localStorage.setItem('comment-username', this.elements.usernameInput.value.trim());
        });
        
        // 网络状态监听
        window.addEventListener('online', () => {
            this.updateConnectionStatus('connected');
            this.setupRealtime();
        });
        
        window.addEventListener('offline', () => {
            this.updateConnectionStatus('disconnected');
            this.showError('网络连接已断开');
        });
    }
    
    async loadComments() {
        if (this.isLoading) return;
        
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
        
        // 清除旧连接
        if (this.realtimeSubscription) {
            this.supabase.removeChannel(this.realtimeSubscription);
        }
        
        this.realtimeSubscription = this.supabase
            .channel('comments-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'comments'
            }, (payload) => {
                console.log('收到新评论:', payload.new);
                this.addNewComment(payload.new);
            })
            .on('system', { event: 'disconnect' }, () => {
                console.warn('实时连接断开');
                this.updateConnectionStatus('disconnected');
            })
            .on('system', { event: 'reconnect' }, () => {
                console.log('实时连接恢复');
                this.updateConnectionStatus('connected');
            })
            .subscribe((status) => {
                console.log('实时订阅状态:', status);
                if (status === 'SUBSCRIBED') {
                    this.updateConnectionStatus('connected');
                }
            });
    }
    
    addNewComment(comment) {
        const newCommentElement = this.createCommentElement(comment);
        this.elements.container.insertBefore(newCommentElement, this.elements.container.firstChild);
        this.commentCount++;
        
        // 显示新消息提示
        this.showMessage('收到新评论！', 'success');
    }
    
    async submitComment() {
        if (this.isSubmitting) return;
        
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
    
    manualSync() {
        this.showMessage('手动同步中...', 'success');
        this.offset = 0;
        this.loadComments();
        this.setupRealtime();
    }
    
    startHeartbeat() {
        // 每30秒发送心跳保持连接
        this.heartbeatInterval = setInterval(() => {
            if (this.supabase && navigator.online) {
                this.supabase.channel('heartbeat').subscribe();
            }
        }, 30000);
    }
    
    updateConnectionStatus(status) {
        const statusDot = this.elements.statusDot;
        const statusText = this.elements.statusText;
        
        statusDot.className = 'status-dot';
        statusText.textContent = status === 'connected' ? '实时连接中' : '连接断开';
        
        if (status === 'connected') {
            statusDot.classList.add('connected');
        } else if (status === 'disconnected') {
            statusDot.classList.add('disconnected');
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
    
    showMessage(message, type = 'success') {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        
        // 插入到页面顶部
        const container = document.querySelector('.container');
        container.insertBefore(messageElement, container.firstChild);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }
    
    clearError() {
        this.elements.errorMsg.textContent = '';
        this.elements.errorMsg.style.display = 'none';
    }
    
    sanitizeInput(str) {
        if (!str) return '';
        return str.toString()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    
    cleanup() {
        if (this.realtimeSubscription && this.supabase) {
            this.supabase.removeChannel(this.realtimeSubscription);
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}

// 全局访问
window.CommentApp = CommentApp;

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (window.commentApp) {
        window.commentApp.cleanup();
    }
});