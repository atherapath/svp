// Get the main elements
const editor = document.getElementById('content-editor');
const viewer = document.getElementById('markdown-viewer'); 
const btnCreate = document.getElementById('btn-create');
const btnSelect = document.getElementById('btn-select');
const btnAmend = document.getElementById('btn-amend');
const btnArchive = document.getElementById('btn-archive'); 

// --- NEW LOAD MD ELEMENTS ---
const btnLoad = document.getElementById('btn-load');
const fileInput = document.getElementById('file-input');
// --- END NEW ---

const selectMenu = document.getElementById('select-menu');
const amendMenu = document.getElementById('amend-menu');


// State to track which menu is open
let currentOpenMenu = null;

// --- UTILITY FUNCTIONS ---

// Function to safely focus the editor
const focusEditor = () => {
    if (!editor.classList.contains('hidden')) {
        editor.focus();
    }
};

// Function to toggle a floating menu
const toggleMenu = (menuElement, associatedButton) => {
    if (editor.classList.contains('hidden')) {
        alert("Please 'Create' the editor first to use this menu.");
        return;
    }
    
    // If we click the button for the menu that is already open, close it.
    if (menuElement === currentOpenMenu) {
        menuElement.classList.add('hidden');
        currentOpenMenu = null;
        associatedButton.classList.remove('active'); 
    } else {
        // Close the currently open menu, if any
        if (currentOpenMenu) {
            currentOpenMenu.classList.add('hidden');
            document.querySelectorAll('.dock-button').forEach(btn => btn.classList.remove('active'));
        }
        
        // Open the new menu
        menuElement.classList.remove('hidden');
        currentOpenMenu = menuElement;
        associatedButton.classList.add('active');
    }

    focusEditor();
};

const loadMDFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if the file is an image
    if (file.type.startsWith('image/')) {
        const fileName = file.name;
        // Wrapping with newlines as requested for clean formatting
        const imgMarkdown = `\n![${fileName}](${fileName})\n`;

        // Get current cursor position in the editor
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;

        // Insert image reference at cursor without overwriting the file
        editor.value = text.substring(0, start) + imgMarkdown + text.substring(end);

        // Move cursor to the end of the newly inserted reference
        editor.selectionStart = editor.selectionEnd = start + imgMarkdown.length;
        
        focusEditor();
    } else {
        // Standard logic for loading .md or text files (replaces entire editor content)
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            editor.value = content;
            
            if (editor.classList.contains('hidden')) {
                viewer.classList.add('hidden');
                editor.classList.remove('hidden');
            }
            btnCreate.textContent = 'Close';
        };
        reader.readAsText(file);
    }

    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
};

// --- END NEW LOAD MD FILE FUNCTION ---


const renderMarkdown = (markdown) => {
    // 1. Process the "Fragile" stuff first while the lines are clean
    let html = markdown;

    // Horizontal Rule (HR) - Keep your original regex
    html = html.replace(/^(\s*[-_]{3,}\s*)$/gim, '<hr>');

    // Basic Block processing - Keep your ∆ and # rules
    html = html
        .replace(/^∆ (.*$)/gim, '<blockquote>$1</blockquote>') 
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>') 
        .replace(/^### (.*$)/gim, '<h3>$1</h3>') 
        .replace(/^## (.*$)/gim, '<h2>$1</h2>') 
        .replace(/^# (.*$)/gim, '<h1>$1</h1>') 
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // 2. The List Processing (Keeping your exact logic)
    let inList = false;
    const lines = html.split('\n'); 
    let processedHtml = '';
    
    lines.forEach(line => {
        if (line.trim().startsWith('- ')) { 
            if (!inList) {
                processedHtml += '<ul>';
            }
            processedHtml += '<li>' + line.substring(line.indexOf('- ') + 2) + '</li>';
            inList = true;
        } else {
            if (inList) {
                processedHtml += '</ul>';
                inList = false;
            }
            processedHtml += line + '\n';
        }
    });
    if (inList) processedHtml += '</ul>';
    
    // 3. THE FIX: Now that headers/rules are done, handle the Returns
    // This turns every Enter into a break UNLESS it's already a tag
    html = processedHtml.split('\n').map(line => {
        const t = line.trim();
        // If the line is already a Header, List, or HR, don't add a break
        if (t.startsWith('<h') || t.startsWith('<li') || t.startsWith('<ul') || t.startsWith('<hr')|| t.startsWith('<summary')) {
            return line;
        }
        // If it's an empty line, give it a break
        if (t === '') return '<br>';
        // Otherwise, add the break
        return line + '<br>';
    }).join('\n');

    // 4. Inline processing (Keep your Bold/Italic/Links)
    html = html
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" data-svp-link="$2" target="_blank">$1</a>');

    return html.trim(); 
};

// --- CORE LOGIC: CREATE / SMART-CLOSE / PREVIEW TOGGLE ---
btnCreate.addEventListener('click', () => {
    
    if (editor.classList.contains('hidden')) {
        // --- ACTION: CREATE (Open Editor) ---
        viewer.classList.add('hidden');
        viewer.innerHTML = '';
        editor.classList.remove('hidden');
        btnCreate.textContent = 'Close';
        
    } else {
        // --- ACTION: CLOSE (Smart Check) ---
        
        const logContent = editor.value.trim();
        
        if (currentOpenMenu) {
            currentOpenMenu.classList.add('hidden');
            currentOpenMenu = null;
            document.querySelectorAll('.dock-button').forEach(btn => btn.classList.remove('active'));
        }
        
        if (logContent.length > 0) {
            // --- Content Exists: Switch to Preview Mode ---
            const htmlContent = renderMarkdown(logContent);
            viewer.innerHTML = htmlContent;
            editor.classList.add('hidden');
            viewer.classList.remove('hidden');
            btnCreate.textContent = 'Create'; 

        } else {
            // --- No Content: Close Editor Only ---
            editor.classList.add('hidden');
            viewer.classList.add('hidden');
            btnCreate.textContent = 'Create';
        }
    }

    focusEditor();
});


// --- ARCHIVE LOGIC ---
const handleArchiveSave = () => {
    const logContent = editor.value.trim();

    if (editor.classList.contains('hidden') || !logContent) {
        alert("Please 'Create' the editor and enter content before archiving.");
        return;
    }
    
    // 1. Extract the first line and clean it
    const firstLine = editor.value.split('\n')[0].trim();
    let cleanedFirstLine = firstLine.replace(/^[#\s]+/, '').trim();
    
    // 2. Create filename
    let filename = cleanedFirstLine.replace(/\s+/g, '_');
    filename = filename + '.md'; 

    // FALLBACK: If the filename is empty
    if (filename.length < 5) {
         const dateSuffix = '_' + new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
         filename = 'Sovereign_Log_Entry' + dateSuffix + '.md';
    }

    // 3. Trigger the download
    const blob = new Blob([logContent], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; 
    document.body.appendChild(a);
    a.click(); 
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`Markdown Log prepared for download. Look for '${filename}' in your Downloads folder.`);
};

// Bind the Archive function to the new dock button
btnArchive.addEventListener('click', handleArchiveSave);


// ===============================================
// === MENU CONTENT GENERATION (The Missing Part) ===
// ===============================================

// 1. SELECT Menu 
const createSelectMenu = () => {
    const buttons = [
        ['Line', 'menu-button', 'selectLine'], 
        ['Left', 'menu-button nav', 'moveLeft'],
        ['Right', 'menu-button nav', 'moveRight'],
        ['Block', 'menu-button', 'selectBlock'],
        ['Word', 'menu-button', 'selectWord'],
        ['All', 'menu-button', 'selectAll'], 
    ];

    selectMenu.innerHTML = ''; 
    buttons.forEach(data => {
        const button = document.createElement('button');
        button.textContent = data[0];
        button.className = data[1];
        button.dataset.action = data[2];
        selectMenu.appendChild(button);
    });
};
createSelectMenu(); // <--- CRITICAL: Run once to populate the menu


// 2. AMEND Menu 
const createAmendMenu = () => {
    const buttons = [
        ['Copy', 'menu-button amend', 'copy'],
        ['Cut', 'menu-button amend', 'cut'], 
        ['Delete', 'menu-button amend', 'delete'],
        ['Enter', 'menu-button amend', 'enter'], 
    ];

    amendMenu.innerHTML = '';
    buttons.forEach(data => {
        const button = document.createElement('button');
        button.textContent = data[0];
        button.className = data[1];
        button.dataset.command = data[2];
        amendMenu.appendChild(button);
    });
};
createAmendMenu(); // <--- CRITICAL: Run once to populate the menu

// --- COMPLEX SELECTION LOGIC (Required by menu listeners) ---

const getLine = (text, position) => {
    const lines = text.split('\n');
    let cumulativeLength = 0;
    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length;
        if (position >= cumulativeLength && position <= cumulativeLength + lineLength + 1) {
            return { start: cumulativeLength, end: cumulativeLength + lineLength, lineNumber: i, lineText: lines[i] };
        }
        cumulativeLength += lineLength + 1;
    }
    return null;
};
const handleMovement = (direction) => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const isSelected = start !== end;
    const text = editor.value;
    let newStart = start;
    let newEnd = end;
    if (direction === 'Left' || direction === 'Right') {
        if (isSelected) {
            if (direction === 'Left') {
                newEnd = Math.max(start, end - 1);
            } else {
                newEnd = Math.min(text.length, end + 1);
            }
        } else {
            newStart = direction === 'Left' ? Math.max(0, start - 1) : Math.min(text.length, start + 1);
            newEnd = newStart;
        }
    }
    editor.selectionStart = newStart;
    editor.selectionEnd = newEnd;
    focusEditor();
};
const handleSelectLine = () => {
    const text = editor.value;
    const pos = editor.selectionStart;
    const lineInfo = getLine(text, pos);
    if (lineInfo) {
        editor.selectionStart = lineInfo.start;
        editor.selectionEnd = lineInfo.end;
    }
    focusEditor();
};
const handleSelectBlock = () => {
    const text = editor.value;
    const pos = editor.selectionStart;
    let blockStart = pos;
    while (blockStart > 0) {
        if (text[blockStart - 1] === '\n' && (blockStart - 2 < 0 || text[blockStart - 2] === '\n')) {
            blockStart = blockStart;
            break;
        }
        blockStart--;
    }
    let blockEnd = pos;
    while (blockEnd < text.length) {
        if (text[blockEnd] === '\n' && (blockEnd + 1 >= text.length || text[blockEnd + 1] === '\n')) {
            break;
        }
        blockEnd++;
    }
    editor.selectionStart = blockStart;
    editor.selectionEnd = blockEnd;
    focusEditor();
};
const handleSelectWord = () => {
    const text = editor.value;
    const pos = editor.selectionStart;
    let wordStart = pos;
    let wordEnd = pos;
    while (wordStart > 0 && /\S/.test(text[wordStart - 1])) {
        wordStart--;
    }
    while (wordEnd < text.length && /\S/.test(text[wordEnd])) {
        wordEnd++;
    }
    editor.selectionStart = wordStart;
    editor.selectionEnd = wordEnd;
    focusEditor();
};

// --- MENU EVENT LISTENERS (Required by menu listeners) ---

// 1. SELECT Menu Handler
btnSelect.addEventListener('click', () => {
    if (!editor.classList.contains('hidden')) { 
        toggleMenu(selectMenu, btnSelect);
    }
});

selectMenu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    switch (action) {
        case 'moveLeft':
        case 'moveRight':
            handleMovement(action.replace('move', ''));
            break;
        case 'selectLine':
            handleSelectLine();
            break;
        case 'selectBlock':
            handleSelectBlock();
            break;
        case 'selectWord':
            handleSelectWord();
            break;
        case 'selectAll':
            editor.select();
            focusEditor();
            break;
    }
});


// 2. AMEND Menu Handler
btnAmend.addEventListener('click', () => {
    if (!editor.classList.contains('hidden')) { 
        toggleMenu(amendMenu, btnAmend);
    }
});

amendMenu.addEventListener('click', (e) => {
    const command = e.target.dataset.command;
    if (!command) return;

    if (command === 'enter') {
        // --- RELIABLE NEWLINE INSERTION LOGIC ---
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const newline = '\n'; 
        
        editor.value = editor.value.substring(0, start) + newline + editor.value.substring(end);
        
        editor.selectionStart = start + newline.length;
        editor.selectionEnd = editor.selectionStart;

    } else {
        // Standard copy/cut/delete
        document.execCommand(command);
    }
    
    if (command === 'copy' || command === 'cut') {
        alert(`Selection ${command} to clipboard!`);
    }
    
    focusEditor();
});


// --- NEW LINE MACRO (The "Tiny Snippet") ---
editor.addEventListener('input', () => {
    const searchPhrase = /New line/gi; 
    const replacement = '\n'; 

    const originalValue = editor.value;
    const newValue = originalValue.replace(searchPhrase, replacement);

    if (originalValue !== newValue) {
        
        const lengthDifference = originalValue.length - newValue.length;
        const currentCursorPos = editor.selectionStart;
        
        editor.value = newValue;
        
        editor.selectionStart = currentCursorPos - lengthDifference;
        editor.selectionEnd = editor.selectionStart;
    }
});


// --- NEW LOAD MD FILE LOGIC Listener ---

// 1. Button click triggers the hidden file input
btnLoad.addEventListener('click', () => {
    // If the editor is closed, open it first
    if (editor.classList.contains('hidden')) {
        viewer.classList.add('hidden');
        editor.classList.remove('hidden');
        btnCreate.textContent = 'Close';
    }
    // Then trigger the file selection dialog
    fileInput.click(); 
});

// 2. File selection triggers the content loading function
fileInput.addEventListener('change', loadMDFile);

// --- INTERNAL FILE LOADER ---
const loadInternalFile = async (filename) => {
    try {
        // Fetch the file from your local server
        const response = await fetch(filename);
        if (!response.ok) throw new Error('File not found');
        
        const text = await response.text();
        
        // 1. Load content into the editor
        editor.value = text;
        
        // 2. Ensure viewer is updated and visible
        const htmlContent = renderMarkdown(text);
        viewer.innerHTML = htmlContent;
        editor.classList.add('hidden');
        viewer.classList.remove('hidden');
        btnCreate.textContent = 'Create'; 

    } catch (error) {
        console.error("SVP Load Error:", error);
        alert("Could not load: " + filename);
    }
};

document.addEventListener('click', (e) => {
    // Find nearest clickable link-like element
    const linkEl = e.target.closest('[data-svp-link], a');
    if (!linkEl) return;

    // Prefer data-svp-link, fall back to href
    const targetFile =
        linkEl.getAttribute('data-svp-link') ||
        linkEl.getAttribute('href');

    if (!targetFile) return;

    // Only intercept markdown files
    if (targetFile.toLowerCase().endsWith('.md')) {
        e.preventDefault();

        loadInternalFile(targetFile);
        btnCreate.textContent = 'Create';
    }
});


    // --- COPY BUTTON INJECTION ---
    document.querySelectorAll("pre code").forEach((block) => {
      const button = document.createElement("button");
      button.textContent = "Copy";
      button.className = "copy-btn";
      button.addEventListener("click", () => {
        navigator.clipboard.writeText(block.innerText).then(() => {
          button.textContent = "Copied!";
          setTimeout(() => button.textContent = "Copy", 2000);
        });
      });
      // The original script injected the button before the code block's parent, 
      // which is usually correct for code blocks.
      block.parentNode.insertBefore(button, block);
    });
