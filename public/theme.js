// Immediate execution to prevent FOUC (Flash of Unstyled Content)
(function() {
    const savedTheme = localStorage.getItem('gigni-theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const updateIcon = (theme) => {
        btn.innerHTML = theme === 'dark' ? '<span>☀️</span>' : '<span>🌙</span>';
        btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    };

    // Set initial icon
    updateIcon(document.documentElement.getAttribute('data-theme'));

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const target = current === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', target);
        localStorage.setItem('gigni-theme', target);
        updateIcon(target);
    });
});