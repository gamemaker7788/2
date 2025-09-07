// Supabase 配置 - 修复初始化问题
const SUPABASE_URL = 'https://fezxhcmiefdbvqmhczut.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenhoY21pZWZkYnZxbWhjenV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjE1MDYsImV4cCI6MjA3MjczNzUwNn0.MdXghSsixHXeYhZKbMYuJGehMUvdbtixGNjMmBPMKKU';

// 全局 Supabase 客户端实例
let supabase;

// 初始化函数
function initSupabase() {
    try {
        if (window.supabase && !supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            });
            console.log('Supabase 初始化成功');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Supabase 初始化失败:', error);
        return false;
    }
}

// 获取 Supabase 实例
function getSupabase() {
    if (!supabase) {
        if (!initSupabase()) {
            throw new Error('Supabase 未初始化');
        }
    }
    return supabase;
}

// 导出到全局
window.initSupabase = initSupabase;
window.getSupabase = getSupabase;