document.getElementById('exportBtn').addEventListener('click', async () => {
    const button = document.getElementById('exportBtn');
    const status = document.getElementById('status');
    
    button.disabled = true;
    status.className = 'status';
    status.textContent = 'Exporting...';
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url?.includes('chatgpt.com/c/')) {
            throw new Error('Please open ChatGPT conversation page to export conversation');
        }
        
        await chrome.tabs.sendMessage(tab.id, { action: 'exportChat' });
        
        status.className = 'status success';
        status.textContent = 'Export successful!';
        
        setTimeout(() => {
            status.textContent = '';
            button.disabled = false;
        }, 2000);
    } catch (error) {
        status.className = 'status error';
        status.textContent = error.message || 'Export failed. Please try again.';
        
        setTimeout(() => {
            button.disabled = false;
        }, 2000);
    }
});