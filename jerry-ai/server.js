const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = 3000;

const OLLAMA_URL =
    "http://localhost:11434/api/chat";

const MODEL =
    "llama3.2:latest";

const DATA_DIR =
    path.join(__dirname, "data");

const RUNS_FILE =
    path.join(DATA_DIR, "runs.json");


// ============================================================
// JERRY PERSONALITY
// ============================================================
const JERRY_SYSTEM_PROMPT = `
You are Jerry from Tom and Jerry.

You are clever, mischievous, witty, playful, curious, confident, cheeky, and teasing.

Your FIRST priority is to answer the user's actual question.
Your SECOND priority is to let your personality show naturally through your wording.

IMPORTANT RESPONSE RULES:

1. Always answer the actual question first.
2. For factual, educational, technical, or serious questions, give a clear and accurate answer.
3. Do not replace useful information with jokes or roleplay.
4. Keep answers natural and conversational.
5. Do not constantly mention Tom.
6. Do not constantly mention cheese.
7. Do not constantly say that you are Jerry.
8. Do not unnecessarily explain your fictional identity.
9. Do not describe physical actions or movements.
10. Do not use stage directions.
11. Never use asterisks for actions.

NEVER write things like:

*smiles*
*grins*
*chuckles*
*winks*
*laughs*
*giggles*
*twitches whiskers*
*scurries around*
*looks around*
*shrugs*
*pauses*
*cleans my paw*

Do not narrate what you are doing.
Speak only through dialogue.

If the user casually greets you, you may respond playfully.

If the user asks who you are, answer naturally and honestly. For example, you may say that you're an AI character based on Jerry. Do not claim to have real-life experiences or memories.

If the user asks whether you are an AI, be honest.

Do not say you are a real mouse.
Do not claim to have a personal life.
Do not claim to have direct real-world experiences.

When answering technical or educational questions, prioritize accuracy over personality.

Your personality should feel like a clever, mischievous character talking to the user, not like an assistant repeatedly announcing that it is a character.

Answer first.
Jerry's personality second.
No physical actions.
No stage directions.
No asterisks.
`;

// ============================================================
// DATABASE
// ============================================================

let database = {
    conversations: {},
    runs: {}
};


// ============================================================
// INITIALIZE DATA DIRECTORY
// ============================================================

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}


// ============================================================
// LOAD DATABASE
// ============================================================

function loadDatabase() {

    if (!fs.existsSync(RUNS_FILE)) {

        console.log(
            "No existing database found. Starting fresh."
        );

        return;
    }

    try {

        const raw =
            fs.readFileSync(
                RUNS_FILE,
                "utf8"
            );

        database =
            JSON.parse(raw);

        if (!database.conversations) {
            database.conversations = {};
        }

        if (!database.runs) {
            database.runs = {};
        }

        console.log(
            `Loaded ${Object.keys(database.conversations).length} conversation(s).`
        );

    } catch (error) {

        console.error(
            "Failed to load database:",
            error
        );

        database = {
            conversations: {},
            runs: {}
        };
    }
}


// ============================================================
// SAVE DATABASE
// ============================================================

function saveDatabase() {

    try {

        fs.writeFileSync(
            RUNS_FILE,
            JSON.stringify(
                database,
                null,
                2
            ),
            "utf8"
        );

    } catch (error) {

        console.error(
            "Failed to save database:",
            error
        );
    }
}


// ============================================================
// LOAD DATA
// ============================================================

loadDatabase();


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateId() {
    return crypto.randomUUID();
}


function sendJSON(
    response,
    statusCode,
    data
) {

    response.writeHead(
        statusCode,
        {
            "Content-Type":
                "application/json; charset=utf-8",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Headers":
                "Content-Type",

            "Access-Control-Allow-Methods":
                "GET, POST, OPTIONS"
        }
    );

    response.end(
        JSON.stringify(data)
    );
}


function sendFile(
    response,
    filePath,
    contentType
) {

    fs.readFile(
        filePath,
        (error, data) => {

            if (error) {

                response.writeHead(
                    404,
                    {
                        "Content-Type":
                            "text/plain"
                    }
                );

                response.end(
                    "File not found."
                );

                return;
            }

            response.writeHead(
                200,
                {
                    "Content-Type":
                        contentType,

                    "Access-Control-Allow-Origin":
                        "*"
                }
            );

            response.end(data);
        }
    );
}


function readRequestBody(request) {

    return new Promise(
        (resolve, reject) => {

            let body = "";

            request.on(
                "data",
                chunk => {
                    body += chunk;
                }
            );

            request.on(
                "end",
                () => {

                    try {

                        resolve(
                            JSON.parse(body)
                        );

                    } catch (error) {

                        reject(error);

                    }
                }
            );

            request.on(
                "error",
                reject
            );
        }
    );
}


// ============================================================
// CLEAN JERRY RESPONSE
// ============================================================

function cleanJerryResponse(text) {

    if (!text) {
        return "";
    }

    let cleaned = text;


    // --------------------------------------------------------
    // REMOVE ASTERISK ACTIONS
    // --------------------------------------------------------

    cleaned = cleaned.replace(
        /\*[^*]*\*/g,
        ""
    );


    // --------------------------------------------------------
    // REMOVE COMMON NARRATION
    // --------------------------------------------------------

    cleaned = cleaned.replace(
        /\bJerry\s+(?:smiles|grins|chuckles|winks|laughs|giggles|shrugs|nods|looks around|scurries around|twitches whiskers)[^.]*\.\s*/gi,
        ""
    );


    // --------------------------------------------------------
    // REMOVE MULTIPLE SPACES
    // --------------------------------------------------------

    cleaned = cleaned.replace(
        /[ \t]{2,}/g,
        " "
    );


    // --------------------------------------------------------
    // CLEAN EXCESSIVE NEWLINES
    // --------------------------------------------------------

    cleaned = cleaned.replace(
        /\n{3,}/g,
        "\n\n"
    );


    return cleaned.trim();
}


// ============================================================
// CREATE CONVERSATION
// ============================================================

function createConversation() {

    const conversationId =
        generateId();

    database.conversations[
        conversationId
    ] = {

        id:
            conversationId,

        messages:
            [],

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()
    };

    saveDatabase();

    return conversationId;
}


// ============================================================
// CREATE RUN
// ============================================================

function createRun(
    conversationId,
    userMessage
) {

    const runId =
        generateId();

    database.runs[
        runId
    ] = {

        id:
            runId,

        conversationId:
            conversationId,

        userMessage:
            userMessage,

        status:
            "running",

        events:
            [],

        answer:
            "",

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()
    };

    saveDatabase();

    return database.runs[
        runId
    ];
}


// ============================================================
// ADD EVENT
// ============================================================

function addEvent(
    run,
    type,
    data
) {

    const position =
        run.events.length + 1;

    const event = {

        position:
            position,

        type:
            type,

        content:
            data,

        timestamp:
            Date.now()
    };

    run.events.push(
        event
    );

    run.updatedAt =
        Date.now();

    saveDatabase();

    return event;
}


// ============================================================
// SSE CLIENTS
// ============================================================

const sseClients =
    new Map();


// ============================================================
// BROADCAST SSE EVENT
// ============================================================

function broadcastEvent(
    runId,
    event
) {

    const clients =
        sseClients.get(
            runId
        );

    if (!clients) {
        return;
    }


    const payload =
        `event: ${event.type}\n` +
        `data: ${JSON.stringify({
            position:
                event.position,

            content:
                event.content
        })}\n\n`;


    for (
        const client
        of clients
    ) {

        try {

            client.write(
                payload
            );

        } catch (error) {

            console.error(
                "SSE write error:",
                error
            );

        }
    }
}


// ============================================================
// ADD EVENT + BROADCAST
// ============================================================

function emitEvent(
    run,
    type,
    data
) {

    const event =
        addEvent(
            run,
            type,
            data
        );


    console.log(
        `[Run ${run.id.slice(0, 8)}] Event: ${type}`
    );


    broadcastEvent(
        run.id,
        event
    );


    return event;
}


// ============================================================
// GENERATE RESPONSE WITH OLLAMA
// ============================================================

async function generateWithOllama(
    run
) {

    const conversation =
        database.conversations[
            run.conversationId
        ];


    if (!conversation) {

        throw new Error(
            "Conversation not found."
        );

    }


    // --------------------------------------------------------
    // BUILD MESSAGE HISTORY
    // --------------------------------------------------------

    const messages = [

        {
            role:
                "system",

            content:
                JERRY_SYSTEM_PROMPT
        }

    ];


    for (
        const message
        of conversation.messages
    ) {

        messages.push({

            role:
                message.role,

            content:
                message.content

        });

    }


    console.log(
        `[Run ${run.id.slice(0, 8)}] Connecting to Ollama...`
    );


    // --------------------------------------------------------
    // SEND REQUEST TO OLLAMA
    // --------------------------------------------------------

    const ollamaResponse =
        await fetch(
            OLLAMA_URL,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        model:
                            MODEL,

                        stream:
                            true,

                        messages,

                        options: {

                            temperature:
                                0.3

                        }

                    })

            }
        );


    if (!ollamaResponse.ok) {

        throw new Error(
            `Ollama returned HTTP ${ollamaResponse.status}`
        );

    }


    if (!ollamaResponse.body) {

        throw new Error(
            "Ollama did not provide a response stream."
        );

    }


    console.log(
        `[Run ${run.id.slice(0, 8)}] Ollama stream connected.`
    );


    const reader =
        ollamaResponse.body.getReader();

    const decoder =
        new TextDecoder();


    let buffer = "";

    let finalAnswer = "";


    // ========================================================
    // COLLECT COMPLETE RESPONSE
    // ========================================================

    while (true) {

        const {
            done,
            value
        } =
            await reader.read();


        if (done) {
            break;
        }


        buffer +=
            decoder.decode(
                value,
                {
                    stream:
                        true
                }
            );


        const lines =
            buffer.split("\n");


        buffer =
            lines.pop();


        for (
            const line
            of lines
        ) {

            if (!line.trim()) {
                continue;
            }


            let data;


            try {

                data =
                    JSON.parse(line);

            } catch (error) {

                console.error(
                    "Invalid Ollama JSON:",
                    line
                );

                continue;
            }


            if (
                data.message &&
                typeof data.message.content ===
                    "string"
            ) {

                finalAnswer +=
                    data.message.content;

            }
        }
    }


    // ========================================================
    // PROCESS FINAL BUFFER
    // ========================================================

    buffer +=
        decoder.decode();


    if (buffer.trim()) {

        try {

            const data =
                JSON.parse(
                    buffer
                );


            if (
                data.message &&
                typeof data.message.content ===
                    "string"
            ) {

                finalAnswer +=
                    data.message.content;

            }

        } catch (error) {

            console.error(
                "Invalid final Ollama JSON:",
                buffer
            );

        }
    }


    // ========================================================
    // CHECK RESPONSE
    // ========================================================

    if (!finalAnswer.trim()) {

        throw new Error(
            "Ollama completed without generating a response."
        );

    }


    console.log(
        `[Run ${run.id.slice(0, 8)}] Raw answer:`,
        finalAnswer
    );


    // ========================================================
    // CLEAN RESPONSE BEFORE BROWSER RECEIVES IT
    // ========================================================

    const cleanedAnswer =
        cleanJerryResponse(
            finalAnswer
        );


    if (!cleanedAnswer) {

        throw new Error(
            "Jerry generated an empty response after cleanup."
        );

    }


    console.log(
        `[Run ${run.id.slice(0, 8)}] Cleaned answer:`,
        cleanedAnswer
    );


    // ========================================================
    // SEND CLEANED TEXT EVENT
    //
    // IMPORTANT:
    // script.js expects:
    //
    // {
    //     position: number,
    //     content: string
    // }
    //
    // ========================================================

    emitEvent(
        run,
        "text",
        cleanedAnswer
    );


    console.log(
        `[Run ${run.id.slice(0, 8)}] Ollama generation finished.`
    );


    return cleanedAnswer;
}


// ============================================================
// EXECUTE RUN
// ============================================================

async function executeRun(
    run
) {

    try {

        const conversation =
            database.conversations[
                run.conversationId
            ];


        if (!conversation) {

            throw new Error(
                "Conversation not found."
            );

        }


        const answer =
            await generateWithOllama(
                run
            );


        // ----------------------------------------------------
        // SAVE ASSISTANT MESSAGE
        // ----------------------------------------------------

        conversation.messages.push({

            role:
                "assistant",

            content:
                answer,

            timestamp:
                Date.now()

        });


        conversation.updatedAt =
            Date.now();


        // ----------------------------------------------------
        // SAVE RUN
        // ----------------------------------------------------

        run.answer =
            answer;

        run.status =
            "completed";

        run.updatedAt =
            Date.now();


        saveDatabase();


        // ----------------------------------------------------
        // COMPLETED EVENT
        // ----------------------------------------------------

        emitEvent(
            run,
            "completed",
            {
                runId:
                    run.id
            }
        );


        console.log(
            `[Run ${run.id.slice(0, 8)}] Completed.`
        );


    } catch (error) {

        console.error(
            `[Run ${run.id.slice(0, 8)}] Failed:`,
            error
        );


        run.status =
            "failed";

        run.error =
            error.message;

        run.updatedAt =
            Date.now();


        saveDatabase();


        emitEvent(
            run,
            "failed",
            {
                error:
                    error.message
            }
        );

    }
}


// ============================================================
// HTTP SERVER
// ============================================================

const server =
    http.createServer(
        async (
            request,
            response
        ) => {

            const url =
                new URL(
                    request.url,
                    `http://${request.headers.host}`
                );


            // =================================================
            // OPTIONS / CORS
            // =================================================

            if (
                request.method ===
                "OPTIONS"
            ) {

                response.writeHead(
                    204,
                    {

                        "Access-Control-Allow-Origin":
                            "*",

                        "Access-Control-Allow-Headers":
                            "Content-Type",

                        "Access-Control-Allow-Methods":
                            "GET, POST, OPTIONS"

                    }
                );

                response.end();

                return;
            }


            // =================================================
            // HOME PAGE
            // =================================================

            if (
                request.method === "GET" &&
                url.pathname === "/"
            ) {

                sendFile(
                    response,

                    path.join(
                        __dirname,
                        "index.html"
                    ),

                    "text/html; charset=utf-8"
                );

                return;
            }


            // =================================================
            // CSS
            // =================================================

            if (
                request.method === "GET" &&
                url.pathname === "/style.css"
            ) {

                sendFile(
                    response,

                    path.join(
                        __dirname,
                        "style.css"
                    ),

                    "text/css; charset=utf-8"
                );

                return;
            }


            // =================================================
            // JAVASCRIPT
            // =================================================

            if (
                request.method === "GET" &&
                url.pathname === "/script.js"
            ) {

                sendFile(
                    response,

                    path.join(
                        __dirname,
                        "script.js"
                    ),

                    "application/javascript; charset=utf-8"
                );

                return;
            }


            // =================================================
            // CHAT
            // =================================================

            if (
                request.method === "POST" &&
                url.pathname === "/chat"
            ) {

                try {

                    const body =
                        await readRequestBody(
                            request
                        );


                    const userMessage =
                        typeof body.message ===
                            "string"
                            ? body.message.trim()
                            : "";


                    if (!userMessage) {

                        sendJSON(
                            response,
                            400,
                            {
                                error:
                                    "Message cannot be empty."
                            }
                        );

                        return;
                    }


                    // ------------------------------------------------
                    // USE EXISTING CONVERSATION OR CREATE NEW ONE
                    // ------------------------------------------------

                    let conversationId =
                        body.conversationId;


                    if (
                        !conversationId ||
                        !database.conversations[
                            conversationId
                        ]
                    ) {

                        conversationId =
                            createConversation();

                    }


                    const conversation =
                        database.conversations[
                            conversationId
                        ];


                    // ------------------------------------------------
                    // SAVE USER MESSAGE
                    // ------------------------------------------------

                    conversation.messages.push({

                        role:
                            "user",

                        content:
                            userMessage,

                        timestamp:
                            Date.now()

                    });


                    conversation.updatedAt =
                        Date.now();


                    saveDatabase();


                    // ------------------------------------------------
                    // CREATE RUN
                    // ------------------------------------------------

                    const run =
                        createRun(
                            conversationId,
                            userMessage
                        );


                    // ------------------------------------------------
                    // RETURN RUN INFORMATION
                    // ------------------------------------------------

                    sendJSON(
                        response,
                        200,
                        {

                            conversationId:
                                conversationId,

                            runId:
                                run.id,

                            status:
                                "running",

                            cursor:
                                0

                        }
                    );


                    // ------------------------------------------------
                    // START GENERATION AFTER RESPONSE
                    //
                    // This gives the browser time to create
                    // its EventSource connection.
                    // ------------------------------------------------

                    setImmediate(
                        () => {

                            executeRun(
                                run
                            );

                        }
                    );


                } catch (error) {

                    console.error(
                        "Chat request failed:",
                        error
                    );


                    sendJSON(
                        response,
                        500,
                        {
                            error:
                                error.message
                        }
                    );

                }

                return;
            }


            // =================================================
            // SERVER-SENT EVENTS
            // =================================================

            if (
                request.method === "GET" &&
                url.pathname === "/events"
            ) {

                const runId =
                    url.searchParams.get(
                        "runId"
                    );


                if (!runId) {

                    response.writeHead(
                        400,
                        {
                            "Content-Type":
                                "text/plain"
                        }
                    );

                    response.end(
                        "Missing runId."
                    );

                    return;
                }


                const run =
                    database.runs[
                        runId
                    ];


                if (!run) {

                    response.writeHead(
                        404,
                        {
                            "Content-Type":
                                "text/plain"
                        }
                    );

                    response.end(
                        "Run not found."
                    );

                    return;
                }


                // ------------------------------------------------
                // SSE HEADERS
                // ------------------------------------------------

                response.writeHead(
                    200,
                    {

                        "Content-Type":
                            "text/event-stream; charset=utf-8",

                        "Cache-Control":
                            "no-cache, no-transform",

                        "Connection":
                            "keep-alive",

                        "Access-Control-Allow-Origin":
                            "*"

                    }
                );


                // ------------------------------------------------
                // STORE CLIENT
                // ------------------------------------------------

                if (
                    !sseClients.has(
                        runId
                    )
                ) {

                    sseClients.set(
                        runId,
                        new Set()
                    );

                }


                const clients =
                    sseClients.get(
                        runId
                    );


                clients.add(
                    response
                );


                // ------------------------------------------------
                // CONFIRM SSE CONNECTION
                // ------------------------------------------------

                response.write(
                    ": connected\n\n"
                );


                // ------------------------------------------------
                // REPLAY EXISTING EVENTS
                // ------------------------------------------------

                for (
                    const event
                    of run.events
                ) {

                    const payload =
                        `event: ${event.type}\n` +
                        `data: ${JSON.stringify({
                            position:
                                event.position,

                            content:
                                event.content
                        })}\n\n`;


                    response.write(
                        payload
                    );
                }


                // ------------------------------------------------
                // HEARTBEAT
                // ------------------------------------------------

                const heartbeat =
                    setInterval(
                        () => {

                            try {

                                response.write(
                                    ": heartbeat\n\n"
                                );

                            } catch (error) {

                                clearInterval(
                                    heartbeat
                                );

                            }

                        },
                        15000
                    );


                // ------------------------------------------------
                // CLIENT DISCONNECTED
                // ------------------------------------------------

                request.on(
                    "close",
                    () => {

                        clearInterval(
                            heartbeat
                        );


                        clients.delete(
                            response
                        );


                        if (
                            clients.size === 0
                        ) {

                            sseClients.delete(
                                runId
                            );

                        }

                    }
                );


                return;
            }


            // =================================================
            // GET RUN
            // =================================================

            if (
                request.method === "GET" &&
                url.pathname.startsWith("/run/")
            ) {

                const runId =
                    url.pathname.slice(
                        "/run/".length
                    );


                const run =
                    database.runs[
                        runId
                    ];


                if (!run) {

                    sendJSON(
                        response,
                        404,
                        {
                            error:
                                "Run not found."
                        }
                    );

                    return;
                }


                sendJSON(
                    response,
                    200,
                    run
                );


                return;
            }


            // =================================================
            // 404
            // =================================================

            response.writeHead(
                404,
                {

                    "Content-Type":
                        "text/plain; charset=utf-8",

                    "Access-Control-Allow-Origin":
                        "*"

                }
            );


            response.end(
                "Not found."
            );
        }
    );


// ============================================================
// START SERVER
// ============================================================

server.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "        JERRY AI SERVER"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Server: http://localhost:${PORT}`
        );

        console.log(
            `Model:  ${MODEL}`
        );

        console.log(
            "Ollama: http://localhost:11434"
        );

        console.log(
            "========================================"
        );

        console.log("");

        console.log(
            "Jerry is ready."
        );

        console.log("");

    }
);