function cleanText(text) {
    let lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && 
                !line.startsWith("This content") && 
                !line.startsWith("Did we get it wrong"));
    
    let cleaned = lines.join('\n')
        .replace(/\s+/g, ' ')
        .trim();
    
    return cleaned;
}


/*
    {
  "metadata": {
    "exportDate": "timestamp",
    "totalMessages": "count"
  },
  "conversations": [
    {
      "id": "number",
      "user": {
        "message": "text",
      },
      "assistant": {
        "message": "text",
      }
    }
  ]
}
  */

function parseAndDownloadChatGPT() {
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
    let temp = new Date();

    chatHistory.metadata = {
        exportDate: temp.toISOString().slice(0, 10) + " " + temp.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }),
        totalMessages: articles.length
    };
    chatHistory.conversations = [];

    articles.forEach((article) => {
        const userMessage = article.querySelector('div[class="whitespace-pre-wrap"]');
        const assistantParts = Array.from(article.getElementsByTagName('p'));
        
        if (userMessage) {
            // If we have a previous complete dialogue, save it
            if (currentDialog.user && currentDialog.chatgpt) {
                
                let conversation = {
                    id: messageCount,
                    user: {
                        message: currentDialog.user
                    },
                    assistant: {
                        message: currentDialog.chatgpt
                    }
                };
                chatHistory.conversations.push(conversation);
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

        let conversation = {
            id: messageCount,
            user: {
                message: currentDialog.user
            },
            assistant: {
                message: currentDialog.chatgpt
            }
        };
        chatHistory.conversations.push(conversation);
        messageCount++;

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

function addExportButton() {
    const inputContainer = Array.from(document.querySelectorAll('div.m-auto.text-base.px-3.md\\:px-4.w-full.md\\:px-5.lg\\:px-4.xl\\:px-5')).pop();
    if (!inputContainer || document.getElementById('export-chat-btn')) {
        return;
    }
    const exportButton = document.createElement('button');
    exportButton.id = 'export-chat-btn';
    exportButton.innerHTML = 'Export Chat';
    exportButton.style.cssText = `
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-right: 10px;
        transition: background-color 0.2s;
        position: absolute;
        bottom: 39px; /* Magic number */
    `;

    exportButton.addEventListener('mouseover', () => {
        exportButton.style.backgroundColor = '#45a049';
    });
    exportButton.addEventListener('mouseout', () => {
        exportButton.style.backgroundColor = '#4CAF50';
    });

    exportButton.addEventListener('click', parseAndDownloadChatGPT);

    inputContainer.insertBefore(exportButton, inputContainer.firstChild);
}

addExportButton();

const observer = new MutationObserver(() => {
    if (!document.getElementById('export-chat-btn')) {
        addExportButton();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'exportChat') {
        parseAndDownloadChatGPT();
        sendResponse({success: true});
    }
    return true; 
});
