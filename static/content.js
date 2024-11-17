function cleanText(text) {
    let lines = text.split('\n')
        .map(line => line.endsWith(' ') ? line.trimEnd() : line)
        .filter(line => line && 
                !line.startsWith("This content") && 
                !line.startsWith("Did we get it wrong"));
    
    let cleaned = lines.join('\n')
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

function parseAndDownloadChatGPT(format) {
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
        const assistantMessage = article.querySelector('div.markdown');
        
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
        } else if (assistantMessage) {
            const elementsToRemove = [
                '.absolute.bottom-0.right-2.flex.h-9.items-center',
                '.flex.items-center.text-token-text-secondary'
            ];

            elementsToRemove.forEach(selector => {
                const elements = assistantMessage.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
            //Good luck understanding
            let assistantText = '';
            if (format==='json'){
                assistantText = assistantMessage.innerHTML
                                .replace(/<\/(?:p|h[1-6]|li)>/g, '\n')  
                                .replace(/<[^>]*>/g, '')  
                                .replace(/\n{3,}/g, '\n\n')  
                                .trim();
            } else if (format==='md'){
                //Don't try to understand this forbidden magic
                assistantText = assistantMessage.innerHTML
                                .replace(/<code(?:\s+class=".*?language-(\w+)")?>([^]*?)<\/code>/gs, (_, lang, code) => {
                                        code = code.replace(/<span class="hljs-[^"]*">/g, '')
                                        .replace(/<\/span>/g, '');
                                        return lang ? 
                                        `\`\`\`${lang}\n${code}\n\`\`\`\n` : 
                                        `\`${code}\``;
                                    })
                                .replace(/<pre><code>(.*?)<\/code><\/pre>/gs, '```\n$1\n```')  
                                .replace(/<code>(.*?)<\/code>/g, '`$1`')  
                                .replace(/<strong>(.*?)<\/strong>/g, '**$1**')  
                                .replace(/<em>(.*?)<\/em>/g, '*$1*')  
                                .replace(/<\/(?:p|h[1-6]|li)>/g, '\n')
                                .replace(/<[^>]*>/g, '')
                                .trim(); 
            }

            
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
    if (format === 'json') {

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
    }else if(format === 'md'){
        let markdownContent = `# ChatGPT Conversation: ${title} \nExported on: ${chatHistory.metadata.exportDate}\n\n`;
        chatHistory.conversations.forEach(conv => {
            markdownContent += `> **User**:\n\n\`\`\`\n${conv.user.message}\n\`\`\`\n\n___\n`;
            markdownContent += `> **Assistant**:\n\n${conv.assistant.message}\n\n___\n___\n`;
            });
        const blob = new Blob([markdownContent], 
                         {type: 'text/markdown'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

function addExportButton() {
    const inputContainer = Array.from(document.querySelectorAll('div.m-auto.text-base.px-3.md\\:px-4.w-full.md\\:px-5.lg\\:px-4.xl\\:px-5')).pop();
    if (!inputContainer || document.getElementById('export-chat-container')) {
        return;
    }

    const exportContainer = document.createElement('div');
    exportContainer.id = 'export-chat-container';
    exportContainer.style.cssText = `
        position: absolute;
        bottom: 39px;
        display: flex;
        gap: 8px;
        align-items: center;
    `;

    //size should change depending on the size of the option selected
    const exportSelect = document.createElement('select');
    exportSelect.id = 'export-format-select';
    exportSelect.style.cssText = `
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #ccc;
        background-color: black;
        font-size: 14px;
        cursor: pointer;
    `;

    const options = [
        { value: 'json', label: 'JSON' },
        { value: 'md', label: 'Markdown' }
    ];

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        exportSelect.appendChild(optionElement);
    });


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
        transition: background-color 0.2s;
    `;

    exportButton.addEventListener('mouseover', () => {
        exportButton.style.backgroundColor = '#45a049';
    });
    exportButton.addEventListener('mouseout', () => {
        exportButton.style.backgroundColor = '#4CAF50';
    });

    exportButton.addEventListener('click', () => {
        const format = exportSelect.value;
        parseAndDownloadChatGPT(format);
    });


    exportContainer.appendChild(exportSelect);
    exportContainer.appendChild(exportButton);
    inputContainer.insertBefore(exportContainer, inputContainer.firstChild);
}

addExportButton();

const observer = new MutationObserver(() => {
    if (!document.getElementById('export-chat-container')) {
        addExportButton();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'exportChat') {
        const format = document.getElementById('export-format-select')?.value || 'json';
        parseAndDownloadChatGPT(format);
        sendResponse({success: true});
    }
    return true; 
});
