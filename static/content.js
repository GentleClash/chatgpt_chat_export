function cleanText(text) {
    let lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && 
                !line.startsWith("This content") && 
                !line.startsWith("Did we get it wrong"));
    
    let cleaned = lines.join('\n')
        .replace(/\s+/g, ' ') //Keep guessing what it does, not that its some top magic
        .trim();
    
    return cleaned;
}

function parseAndDownload() {
    const title = document.getElementsByTagName('title')[0].textContent

    const elements = Array.from(document.getElementsByClassName('flex'));
    const chatContainer = elements.find(el => 
        el.classList.contains('flex-col') && 
        el.classList.contains('text-sm') && 
        el.classList.contains('md:pb-9')
    );

    if (!chatContainer) {
        console.error('Chat container not found');
        return;
    }

    const articleElements = chatContainer.getElementsByTagName('article');
    const articles = Array.from(articleElements).filter(el => 
        el.classList.contains('w-full') && 
        el.classList.contains('text-token-text-primary')
    );

    console.log("Found articles:", articles.length); //Something you won't bat your eye on
    
    let chatHistory = {};
    let messageCount = 0;
    let currentDialog = {};

    articles.forEach((article) => {
        const userMessage = article.querySelector('div[class="whitespace-pre-wrap"]');
        const assistantParts = Array.from(article.getElementsByTagName('p'));
        
        if (userMessage) {
            // If we have a previous complete dialogue, save it
            if (currentDialog.user && currentDialog.chatgpt) {
                chatHistory[messageCount] = currentDialog;
                messageCount++;
            }
            // Start new dialogue with user message
            currentDialog = {
                user: cleanText(userMessage.textContent),
                chatgpt: ''
            };
        } else if (assistantParts.length > 0) {
            // combining text from p tags
            const assistantText = assistantParts
                .map(part => part.textContent)
                .join('\n');
            
            // Add to current dialogue if we have a user message
            if (currentDialog.user) {
                currentDialog.chatgpt = cleanText(assistantText);
            }
        }
    });

    if (currentDialog.user && currentDialog.chatgpt) {
        chatHistory[messageCount] = currentDialog;
    }

    console.log("Found message pairs:", messageCount + 1);

    // This is magic, don't touch it
    const blob = new Blob([JSON.stringify(chatHistory, null, 2)], 
                         {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'exportChat') {
        parseAndDownload();
        sendResponse({success: true});
    }
    return true; 
});
