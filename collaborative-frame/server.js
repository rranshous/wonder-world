const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { marked } = require('marked');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Anthropic client (you'll need to set ANTHROPIC_API_KEY env var)
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Conversation persistence configuration
const CONVERSATIONS_FILE = 'conversations.json';
const MAX_HISTORY_LENGTH = 10; // Maximum number of message pairs to keep per session

// Load conversation history from file
let conversationHistory;
try {
    if (fs.existsSync(CONVERSATIONS_FILE)) {
        const savedData = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
        // Ensure savedData is an object with session keys
        if (typeof savedData === 'object' && savedData !== null && !Array.isArray(savedData)) {
            conversationHistory = new Map(Object.entries(savedData));
            console.log(`Loaded ${conversationHistory.size} conversation sessions from file`);
        } else {
            console.log('Invalid conversation file format, starting fresh');
            conversationHistory = new Map();
        }
    } else {
        console.log('No conversations file found, starting fresh');
        conversationHistory = new Map();
    }
} catch (error) {
    console.log('Error reading conversations file:', error.message, '- starting fresh');
    conversationHistory = new Map();
}

// Function to save conversations to file
function saveConversations() {
    try {
        const conversationsObject = Object.fromEntries(conversationHistory);
        fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversationsObject, null, 2));
        console.log(`Saved ${conversationHistory.size} conversation sessions to file`);
    } catch (error) {
        console.error('Error saving conversations:', error.message);
    }
}

// Function to trim conversation history to maintain reasonable size
function trimConversationHistory(history) {
    if (history.length > MAX_HISTORY_LENGTH * 2) {
        // Keep the first message (system prompt) and the last MAX_HISTORY_LENGTH pairs
        const systemMessage = history[0];
        const recentMessages = history.slice(-(MAX_HISTORY_LENGTH * 2));
        return [systemMessage, ...recentMessages];
    }
    return history;
}

// Function to create system prompt that encourages tool usage
function createSystemPrompt() {
    return `You are Claude, collaborating with a human to build a self-modifying web application. You have access to tools that let you read files, edit files, create new files, and list directory contents.

IMPORTANT: Due to the frame interface limitations, the user will only see your FINAL response message. Do not send intermediate messages - save all important information for your final response. Make your final response comprehensive and self-contained, summarizing all actions taken and their results.

Your responses support markdown formatting for better readability. Use markdown to format your responses appropriately (e.g., code blocks, lists, headers, etc.).

You are working in a collaborative frame project. To understand the current state of the project, use your tools:
- Use 'list_files' to see what files exist in the project
- Use 'read_file' to examine specific files when you need to understand their contents
- Use 'edit_file' to make changes to files
- Use 'list_files' with a path to explore subdirectories

The project is a self-modifying web application, so you can edit any part of it, including this very server code that's calling you! Use your tools to understand the current state, then provide a complete response at the end that summarizes all actions taken and findings.`;
}

// Main collaboration endpoint
app.post('/collaborate', async (req, res) => {
    try {
        const { command, sessionId } = req.body;
        
        if (!command) {
            return res.json({ success: false, error: 'No command provided' });
        }
        
        if (!sessionId) {
            return res.json({ success: false, error: 'No session ID provided' });
        }

        console.log('Received command:', command);
        console.log('Session ID:', sessionId);
        
        // Define tools that Claude can use
        const tools = [
            {
                name: "edit_file",
                description: "Edit or create a file in the project",
                input_schema: {
                    type: "object",
                    properties: {
                        filename: {
                            type: "string",
                            description: "The filename to edit (e.g., 'style.css', 'index.html')"
                        },
                        content: {
                            type: "string", 
                            description: "The complete new content for the file"
                        }
                    },
                    required: ["filename", "content"]
                }
            },
            {
                name: "read_file",
                description: "Read the current content of a file",
                input_schema: {
                    type: "object",
                    properties: {
                        filename: {
                            type: "string",
                            description: "The filename to read"
                        }
                    },
                    required: ["filename"]
                }
            },
            {
                name: "list_files",
                description: "List files and directories in a given path",
                input_schema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "The directory path to list (defaults to current directory if not provided)"
                        }
                    }
                }
            }
        ];

        // Get or initialize conversation history for this session
        if (!conversationHistory.has(sessionId)) {
            conversationHistory.set(sessionId, []);
            console.log(`Created new conversation session: ${sessionId}`);
        }
        const sessionHistory = conversationHistory.get(sessionId);
        
        console.log('Conversation history length:', sessionHistory.length);
        
        // Prepare messages array for the API call
        const messages = [];
        
        // Add conversation history if it exists
        if (sessionHistory.length > 0) {
            // Add system context first, then conversation history
            messages.push({ role: 'user', content: createSystemPrompt() });
            messages.push(...sessionHistory);
            messages.push({ role: 'user', content: command });
        } else {
            // First interaction in session
            messages.push({ role: 'user', content: `${createSystemPrompt()}\n\nThe human has given you this command: "${command}"` });
        }

        // Add user's command to history
        sessionHistory.push({ role: 'user', content: command });

        // Call Anthropic API with tools - handle multi-turn tool conversation
        let response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: messages,
            tools: tools
        });
        
        const changes = [];
        let responseMessage = 'Changes applied successfully';
        
        // Handle tool conversation loop
        while (response.stop_reason === 'tool_use') {
            console.log('Claude response summary:', {
                id: response.id,
                stop_reason: response.stop_reason,
                content_types: response.content.map(c => c.type),
                tool_calls: response.content.filter(c => c.type === 'tool_use').map(c => ({ name: c.name, input: c.input }))
            });
            
            // Process tool calls and collect results
            const toolResults = [];
            
            for (const content of response.content) {
                if (content.type === 'tool_use') {
                    const toolName = content.name;
                    const toolInput = content.input;
                    
                    console.log(`Processing tool call: ${toolName}`, toolInput);
                    
                    let toolResult = { tool_use_id: content.id, type: 'tool_result' };
                    
                    if (toolName === 'edit_file') {
                        try {
                            const filePath = path.join(__dirname, toolInput.filename);
                            fs.writeFileSync(filePath, toolInput.content, 'utf8');
                            changes.push(`Modified ${toolInput.filename}`);
                            console.log(`✓ Successfully modified ${toolInput.filename}`);
                            toolResult.content = `Successfully modified ${toolInput.filename}`;
                        } catch (error) {
                            const errorMsg = `Error modifying ${toolInput.filename}: ${error.message}`;
                            changes.push(errorMsg);
                            console.error(`✗ ${errorMsg}`);
                            toolResult.content = errorMsg;
                            toolResult.is_error = true;
                        }
                    } else if (toolName === 'read_file') {
                        try {
                            const filePath = path.join(__dirname, toolInput.filename);
                            const fileContent = fs.readFileSync(filePath, 'utf8');
                            console.log(`✓ Successfully read ${toolInput.filename} (${fileContent.length} chars)`);
                            toolResult.content = fileContent;
                        } catch (error) {
                            const errorMsg = `Error reading ${toolInput.filename}: ${error.message}`;
                            console.error(`✗ ${errorMsg}`);
                            toolResult.content = errorMsg;
                            toolResult.is_error = true;
                        }
                    } else if (toolName === 'list_files') {
                        try {
                            const targetPath = toolInput.path ? path.join(__dirname, toolInput.path) : __dirname;
                            const items = fs.readdirSync(targetPath);
                            const listing = items.map(item => {
                                const itemPath = path.join(targetPath, item);
                                const stats = fs.statSync(itemPath);
                                return {
                                    name: item,
                                    type: stats.isDirectory() ? 'directory' : 'file',
                                    size: stats.isFile() ? stats.size : null
                                };
                            });
                            console.log(`✓ Successfully listed ${targetPath} (${listing.length} items)`);
                            toolResult.content = JSON.stringify(listing, null, 2);
                        } catch (error) {
                            const errorMsg = `Error listing directory ${toolInput.path || '.'}: ${error.message}`;
                            console.error(`✗ ${errorMsg}`);
                            toolResult.content = errorMsg;
                            toolResult.is_error = true;
                        }
                    }
                    
                    toolResults.push(toolResult);
                } else if (content.type === 'text') {
                    responseMessage = content.text;
                    console.log('Claude response (full text):', responseMessage);
                }
            }
            
            // Continue conversation with tool results
            if (toolResults.length > 0) {
                messages.push({ role: 'assistant', content: response.content });
                messages.push({ role: 'user', content: toolResults });
                
                // Update messages[0] with fresh system prompt containing current file contents
                messages[0] = { role: 'user', content: createSystemPrompt() };
                
                response = await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 4000,
                    messages: messages,
                    tools: tools
                });
            } else {
                break;
            }
        }
        
        // Handle final response
        if (response.content) {
            for (const content of response.content) {
                if (content.type === 'text') {
                    responseMessage = content.text;
                    console.log('Final Claude response (full text):', responseMessage);
                }
            }
        }

        // Add Claude's complete response to history (including any tool use descriptions)
        if (responseMessage && responseMessage !== 'Changes applied successfully') {
            sessionHistory.push({ role: 'assistant', content: responseMessage });
        }
        
        // Trim history if needed and save to file
        conversationHistory.set(sessionId, trimConversationHistory(sessionHistory));
        saveConversations();
        
        console.log('Applied changes:', changes);
        console.log('Final conversation history length:', sessionHistory.length);
        console.log('Session stored:', conversationHistory.has(sessionId));
        
        // Convert markdown to HTML before sending response
        const htmlResponse = marked(responseMessage);
        
        res.json({ 
            success: true, 
            message: htmlResponse,
            changes: changes
        });
        
    } catch (error) {
        console.error('Error in collaboration:', error);
        res.json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Collaborative Frame running at http://localhost:${PORT}`);
    console.log('Ready for self-modification!');
});

module.exports = app;