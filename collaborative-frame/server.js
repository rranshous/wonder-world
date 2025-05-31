const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

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

// Function to read all project files for context
function getProjectContext() {
    const files = ['index.html', 'style.css', 'server.js', 'package.json'];
    const context = {};
    
    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            context[file] = fs.readFileSync(filePath, 'utf8');
        }
    });
    
    return context;
}

// Function to apply file changes
function applyFileChanges(changes) {
    const results = [];
    
    for (const [filename, content] of Object.entries(changes)) {
        try {
            const filePath = path.join(__dirname, filename);
            fs.writeFileSync(filePath, content, 'utf8');
            results.push(`Modified ${filename}`);
        } catch (error) {
            results.push(`Error modifying ${filename}: ${error.message}`);
        }
    }
    
    return results;
}

// Main collaboration endpoint
app.post('/collaborate', async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.json({ success: false, error: 'No command provided' });
        }
        
        console.log('Received command:', command);
        
        // Get current project state
        const projectContext = getProjectContext();
        
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
            }
        ];
        
        // Create the prompt for Claude
        const prompt = `You are Claude, collaborating with a human to build a self-modifying web application. The human has given you this command: "${command}"

Current project files:
${Object.entries(projectContext).map(([filename, content]) => `
=== ${filename} ===
${content}
`).join('\n')}

Please use the available tools to make the necessary changes to fulfill the user's request. You can read files, edit files, or create new files as needed.`;

        // Call Anthropic API with tools - handle multi-turn tool conversation
        let response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }],
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
                    }
                    
                    toolResults.push(toolResult);
                } else if (content.type === 'text') {
                    responseMessage = content.text;
                    console.log('Response message:', responseMessage.substring(0, 100) + '...');
                }
            }
            
            // Continue conversation with tool results
            if (toolResults.length > 0) {
                const messages = [
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: response.content },
                    { role: 'user', content: toolResults }
                ];
                
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
                    console.log('Final response message:', responseMessage.substring(0, 100) + '...');
                }
            }
        }
        
        console.log('Applied changes:', changes);
        
        res.json({ 
            success: true, 
            message: responseMessage,
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
