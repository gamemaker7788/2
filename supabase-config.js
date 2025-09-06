// 替换为你的Supabase配置
const supabaseUrl = 'https://fezxhcmiefdbvqmhczut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenhoY21pZWZkYnZxbWhjenV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjE1MDYsImV4cCI6MjA3MjczNzUwNn0.MdXghSsixHXeYhZKbMYuJGehMUvdbtixGNjMmBPMKKU';

// 创建Supabase客户端
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

