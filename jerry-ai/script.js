// ==================================================
// JERRY AI — FRONTEND
// ==================================================


// ==================================================
// HTML ELEMENTS
// ==================================================

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const chat =
    document.getElementById("chat");

const connectionStatus =
    document.getElementById("connectionStatus");


// ==================================================
// JERRY IMAGE
// ==================================================
//
// IMPORTANT:
// The HTML already contains:
//
// <img
//     src="images/jerry.png"
//     class="character-image"
// >
//
// So we use that image directly.
// We DO NOT create another image in <body>.
//

let jerryImage =
    document.querySelector(".character-image");


if (!jerryImage) {

    const imageContainer =
        document.querySelector(
            ".character-image-container"
        );


    if (imageContainer) {

        jerryImage =
            document.createElement("img");

        jerryImage.className =
            "character-image";

        jerryImage.alt =
            "Jerry";


        imageContainer.prepend(
            jerryImage
        );
    }
}


// ==================================================
// JERRY EXPRESSIONS
// ==================================================

const JERRY_IMAGES = {

    idle:
        "https://i.pinimg.com/736x/2d/16/cf/2d16cf2c987e6d03dd560c9727755cb1.jpg",

    thinking:
        "https://i.pinimg.com/736x/30/24/f7/3024f77b117e7c128b516ee6b3b5cc0d.jpg",

    happy:
        "https://i.pinimg.com/736x/26/47/58/264758b3c744bd5417c6531de6f26030.jpg",

    surprised:
        "https://i.pinimg.com/736x/e4/95/2d/e4952dd8cc1b49403c94078595b7f013.jpg",

    angry:
        "https://i.pinimg.com/736x/bb/9c/4f/bb9c4f8b05dbb2332697a4f59477fb1e.jpg",

    mischievous:
        "https://i.pinimg.com/736x/ca/89/db/ca89dbbfd786a3f80531542300b39acc.jpg"
};


// ==================================================
// CHANGE JERRY EXPRESSION
// ==================================================

function setJerryExpression(expression) {

    if (!jerryImage) {
        return;
    }


    const image =
        JERRY_IMAGES[expression];


    if (!image) {
        return;
    }


    jerryImage.src =
        image;


    jerryImage.dataset.expression =
        expression;
}


// ==================================================
// INITIAL JERRY
// ==================================================

setJerryExpression(
    "idle"
);


// ==================================================
// CURSOR REACTION
// ==================================================

let cursorNearJerry =
    false;

let cursorVeryNearJerry =
    false;


document.addEventListener(
    "mousemove",
    event => {

        if (!jerryImage) {
            return;
        }


        const rect =
            jerryImage.getBoundingClientRect();


        const jerryCenterX =
            rect.left +
            rect.width / 2;


        const jerryCenterY =
            rect.top +
            rect.height / 2;


        const distanceX =
            event.clientX -
            jerryCenterX;


        const distanceY =
            event.clientY -
            jerryCenterY;


        const distance =
            Math.sqrt(
                distanceX * distanceX +
                distanceY * distanceY
            );


        // ------------------------------------------
        // VERY CLOSE
        // ------------------------------------------

        if (distance < 120) {

            if (!cursorVeryNearJerry) {

                cursorVeryNearJerry =
                    true;

                cursorNearJerry =
                    true;


                // Don't interrupt thinking.

                if (!currentRunId) {

                    setJerryExpression(
                        "surprised"
                    );
                }
            }

            return;
        }


        // ------------------------------------------
        // NEAR JERRY
        // ------------------------------------------

        if (distance < 300) {

            if (!cursorNearJerry) {

                cursorNearJerry =
                    true;


                // Don't interrupt thinking.

                if (!currentRunId) {

                    setJerryExpression(
                        "mischievous"
                    );
                }
            }


            cursorVeryNearJerry =
                false;

            return;
        }


        // ------------------------------------------
        // FAR AWAY
        // ------------------------------------------

        if (
            cursorNearJerry ||
            cursorVeryNearJerry
        ) {

            cursorNearJerry =
                false;

            cursorVeryNearJerry =
                false;


            // Don't interrupt thinking.

            if (!currentRunId) {

                setJerryExpression(
                    "idle"
                );
            }
        }

    }
);


// ==================================================
// CHAT STATE
// ==================================================

let conversationId =
    null;

let currentRunId =
    null;

let currentAssistantMessage =
    null;

let currentCursor =
    0;

let eventSource =
    null;

let reconnectTimer =
    null;

let manuallyClosed =
    false;


// ==================================================
// CONNECTION STATUS
// ==================================================

function setStatus(status) {

    if (!connectionStatus) {
        return;
    }


    connectionStatus.textContent =
        status;
}


// ==================================================
// ADD MESSAGE TO CHAT
// ==================================================

function addMessage(
    text,
    className
) {

    const message =
        document.createElement(
            "div"
        );


    message.className =
        `message ${className}`;


    message.textContent =
        text;


    chat.appendChild(
        message
    );


    chat.scrollTop =
        chat.scrollHeight;


    return message;
}


// ==================================================
// SEND MESSAGE
// ==================================================

async function sendMessage() {

    const message =
        messageInput.value.trim();


    if (!message) {
        return;
    }


    // Don't start another run
    // while one is active.

    if (currentRunId) {
        return;
    }


    // ------------------------------------------
    // ADD USER MESSAGE
    // ------------------------------------------

    addMessage(
        message,
        "user-message"
    );


    messageInput.value =
        "";


    messageInput.disabled =
        true;


    sendButton.disabled =
        true;


    // ------------------------------------------
    // JERRY THINKING
    // ------------------------------------------

    setStatus(
        "Thinking..."
    );


    setJerryExpression(
        "thinking"
    );


    // ------------------------------------------
    // EMPTY JERRY MESSAGE
    // ------------------------------------------

    currentAssistantMessage =
        addMessage(
            "",
            "jerry-message"
        );


    try {

        // --------------------------------------
        // SEND TO SERVER
        // --------------------------------------

        const response =
            await fetch(
                "/chat",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            message:
                                message,

                            conversationId:
                                conversationId

                        })

                }
            );


        // --------------------------------------
        // CHECK RESPONSE
        // --------------------------------------

        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }


        // --------------------------------------
        // READ SERVER RESPONSE
        // --------------------------------------

        const data =
            await response.json();


        conversationId =
            data.conversationId;


        currentRunId =
            data.runId;


        currentCursor =
            data.cursor || 0;


        setStatus(
            "Connected"
        );


        // --------------------------------------
        // CONNECT TO SSE
        // --------------------------------------

        connectToEvents();

    }

    catch (error) {

        console.error(
            "Could not start chat:",
            error
        );


        // --------------------------------------
        // ERROR MESSAGE
        // --------------------------------------

        if (
            currentAssistantMessage
        ) {

            currentAssistantMessage.textContent =
                "Something went wrong. Please try again.";
        }


        currentAssistantMessage =
            null;


        currentRunId =
            null;


        // --------------------------------------
        // ENABLE INPUT
        // --------------------------------------

        messageInput.disabled =
            false;


        sendButton.disabled =
            false;


        messageInput.focus();


        setStatus(
            "Disconnected"
        );


        // --------------------------------------
        // JERRY ANGRY
        // --------------------------------------

        setJerryExpression(
            "angry"
        );


        // Return to idle.

        setTimeout(
            () => {

                if (!currentRunId) {

                    setJerryExpression(
                        "idle"
                    );
                }

            },
            1500
        );
    }
}


// ==================================================
// CONNECT TO EVENT STREAM
// ==================================================

function connectToEvents() {

    if (
        !conversationId ||
        !currentRunId
    ) {
        return;
    }


    // ------------------------------------------
    // CLOSE OLD CONNECTION
    // ------------------------------------------

    if (eventSource) {

        eventSource.close();
    }


    clearTimeout(
        reconnectTimer
    );


    setStatus(
        "Connected"
    );


    // ------------------------------------------
    // EVENT URL
    // ------------------------------------------

    const url =
        `/events?conversationId=${encodeURIComponent(conversationId)}` +
        `&runId=${encodeURIComponent(currentRunId)}` +
        `&cursor=${currentCursor}`;


    // ------------------------------------------
    // CREATE SSE CONNECTION
    // ------------------------------------------

    eventSource =
        new EventSource(url);


    // ------------------------------------------
    // CONNECTION OPEN
    // ------------------------------------------

    eventSource.onopen =
        () => {

            setStatus(
                "Connected"
            );
        };


    // ==================================================
    // TEXT EVENT
    // ==================================================

    eventSource.addEventListener(
        "text",
        event => {

            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                // Ignore old events.

                if (
                    data.position <=
                    currentCursor
                ) {

                    return;
                }


                // Check event order.

                if (
                    data.position !==
                    currentCursor + 1
                ) {

                    console.warn(
                        "Event gap detected.",
                        "Expected:",
                        currentCursor + 1,
                        "Received:",
                        data.position
                    );


                    reconnectFromCursor();

                    return;
                }


                currentCursor =
                    data.position;


                // ----------------------------------
                // ADD JERRY RESPONSE
                // ----------------------------------

                if (
                    currentAssistantMessage
                ) {

                    currentAssistantMessage.textContent +=
                        data.content;


                    chat.scrollTop =
                        chat.scrollHeight;
                }

            }

            catch (error) {

                console.error(
                    "Could not process text event:",
                    error
                );
            }

        }
    );


    // ==================================================
    // COMPLETED EVENT
    // ==================================================

    eventSource.addEventListener(
        "completed",
        event => {

            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                if (
                    data.position <=
                    currentCursor
                ) {

                    return;
                }


                if (
                    data.position !==
                    currentCursor + 1
                ) {

                    reconnectFromCursor();

                    return;
                }


                currentCursor =
                    data.position;

            }

            catch (error) {

                console.error(
                    "Could not process completed event:",
                    error
                );
            }


            // ----------------------------------
            // JERRY FINISHED ANSWERING
            // ----------------------------------

            setJerryExpression(
                chooseJerryResponseExpression()
            );


            finishRun();
        }
    );


    // ==================================================
    // FAILED EVENT
    // ==================================================

    eventSource.addEventListener(
        "failed",
        event => {

            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                if (
                    data.position >
                    currentCursor
                ) {

                    currentCursor =
                        data.position;
                }


                console.error(
                    "Jerry run failed:",
                    data.content
                );

            }

            catch (error) {

                console.error(
                    "Could not process failed event:",
                    error
                );
            }


            // ----------------------------------
            // SHOW INTERRUPTION
            // ----------------------------------

            if (
                currentAssistantMessage
            ) {

                currentAssistantMessage.textContent +=
                    "\n\n[The conversation was interrupted.]";
            }


            setStatus(
                "Failed"
            );


            setJerryExpression(
                "angry"
            );


            finishRun();
        }
    );


    // ==================================================
    // CONNECTION ERROR
    // ==================================================

    eventSource.onerror =
        () => {

            if (manuallyClosed) {
                return;
            }


            setStatus(
                "Reconnecting..."
            );


            eventSource.close();


            scheduleReconnect();
        };
}


// ==================================================
// CHOOSE JERRY RESPONSE EXPRESSION
// ==================================================

function chooseJerryResponseExpression() {

    if (
        !currentAssistantMessage
    ) {

        return "happy";
    }


    const text =
        currentAssistantMessage
            .textContent
            .toLowerCase();


    // ------------------------------------------
    // SURPRISED
    // ------------------------------------------

    if (
        text.includes("really?") ||
        text.includes("what?!") ||
        text.includes("whoa") ||
        text.includes("wow")
    ) {

        return "surprised";
    }


    // ------------------------------------------
    // MISCHIEVOUS
    // ------------------------------------------

    if (
        text.includes("hehe") ||
        text.includes("perhaps") ||
        text.includes("maybe") ||
        text.includes("clever") ||
        text.includes("mischief")
    ) {

        return "mischievous";
    }


    // ------------------------------------------
    // DEFAULT
    // ------------------------------------------

    return "happy";
}


// ==================================================
// RECONNECT
// ==================================================

function scheduleReconnect() {

    clearTimeout(
        reconnectTimer
    );


    reconnectTimer =
        setTimeout(
            () => {

                reconnectFromCursor();

            },
            1000
        );
}


function reconnectFromCursor() {

    if (
        !currentRunId ||
        !conversationId
    ) {

        return;
    }


    setStatus(
        "Reconnecting..."
    );


    connectToEvents();
}


// ==================================================
// FINISH RUN
// ==================================================

function finishRun() {

    manuallyClosed =
        true;


    // ------------------------------------------
    // CLOSE EVENT STREAM
    // ------------------------------------------

    if (eventSource) {

        eventSource.close();

        eventSource =
            null;
    }


    clearTimeout(
        reconnectTimer
    );


    // ------------------------------------------
    // RESET RUN STATE
    // ------------------------------------------

    currentRunId =
        null;


    currentCursor =
        0;


    currentAssistantMessage =
        null;


    // ------------------------------------------
    // ENABLE INPUT
    // ------------------------------------------

    messageInput.disabled =
        false;


    sendButton.disabled =
        false;


    setStatus(
        "Connected"
    );


    messageInput.focus();


    manuallyClosed =
        false;
}


// ==================================================
// SEND BUTTON
// ==================================================

sendButton.addEventListener(
    "click",
    sendMessage
);


// ==================================================
// ENTER KEY
// ==================================================

messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            sendMessage();
        }

    }
);


// ==================================================
// INITIAL STATE
// ==================================================

setStatus(
    "Connected"
);


setJerryExpression(
    "idle"
);


messageInput.focus();