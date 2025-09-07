// 使用立即执行函数确保正确初始化
(function initSupabase() {
    const supabaseUrl = 'https://fezxhcmiefdbvqmhczut.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenhoY21pZWZkYnZxbWhjenV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjE1MDYsImV4cCI6MjA3MjczNzUwNn0.MdXghSsixHXeYhZKbMYuJGehMUvdbtixGNjMmBPMKKU';
    
    // 全局初始化
    window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase 初始化完成');
})();