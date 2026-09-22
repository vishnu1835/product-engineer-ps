# Product Engineering Challenge Submission

## Candidate

* **Name:** Vishnu Nivasini J
* **Email:** vishnuvicky330@gmail.com
* **GitHub:** https://github.com/vishnu1835
* **Selected problem:** Problem 1 — Resumable Realtime Conversation
* **Demo video:** https://drive.google.com/file/d/19oQ4cpC5MMqUvEjou6BVWBYaTOF5MgdG/view?usp=sharing
##project commands
{
  "name": "jerry-ai",
  "version": "1.0.0",
  "description": "Jerry AI - Resumable realtime conversation prototype using SSE and durable run history.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node --test test.js"
  },
  "keywords": [
    "sse",
    "realtime",
    "conversation",
    "ollama",
    "resumable"
  ],
  "author": "Vishnu Nivasini J",
  "license": "ISC"
}

### Prerequisites

* Node.js
* npm
* Ollama
* Ollama model: `llama3.2:latest`

### Setup

```bash
npm install
```

Make sure Ollama is running locally and the required model is available:

```bash
ollama run llama3.2
```

Then start the application using the project's server command.

The application runs locally on:

```text
http://localhost:3000
```

The AI inference is handled locally through Ollama.

### Successful scenario

1. Start Ollama.
2. Start the Node.js server.
3. Open the application at `http://localhost:3000`.
4. Send a message to Jerry.
5. Jerry processes the message using the local Ollama model and returns a response.
6. Conversation events are persisted so that the conversation state can be retained.

### Failure / recovery scenario

The application uses a server-side event stream for realtime conversation updates.

A network interruption can be used to test the behaviour while a conversation is active. Messages and conversation events are handled through the server rather than relying only on the browser's in-memory state.

The current implementation does not provide a fully demonstrated automatic reconnection flow after a network interruption. This is a known limitation of the submitted prototype and is described below.

## Run the tests

Focused testing was performed manually during development using the running application and local Ollama server.

No separate automated test suite is claimed for this submission.

## Acceptance scenarios and verification

### Completed

* Local realtime conversation with the AI model.
* User messages are sent to the backend.
* AI responses are streamed/returned through the application.
* Conversation events are persisted by the backend.
* The application can continue using previously recorded conversation state.
* The application runs completely locally using Node.js and Ollama.

### Current limitations

The prototype does not currently demonstrate a complete automatic reconnection flow after the client loses network connectivity.

During testing, the application continued to process the overall message flow, but a clean reconnect event was not implemented and therefore is not being presented as completed functionality.

### Verification

The main verification sequence is:

```text
1. Start Ollama with llama3.2.
2. Start the Node.js server.
3. Open http://localhost:3000.
4. Send multiple messages.
5. Verify that Jerry responds.
6. Observe the conversation/event flow in the running application.
7. Test behaviour during a temporary network interruption.
```

The observed behaviour and limitations are documented honestly rather than treating an expected recovery result as an observed result.

## Architecture and data flow

The application is divided into a browser client, a Node.js backend, local persistence, and the Ollama inference service.

```text
Browser
   |
   | HTTP / realtime event stream
   v
Node.js Server
   |
   +----> Conversation/Event Persistence
   |
   +----> Ollama
             |
             v
        llama3.2 model
```

### Data flow

1. The user enters a message in the browser.
2. The browser sends the message to the Node.js backend.
3. The backend creates and tracks the conversation/run.
4. The backend communicates with the local Ollama model.
5. Generated responses/events are returned to the browser.
6. Conversation events are persisted in the server-side data store.
7. The browser displays the resulting conversation.

The server exposes endpoints for chat, events, and run/event retrieval.

## Technology choices

### Node.js

Node.js was chosen for the backend because the problem involves realtime communication, asynchronous operations, and event streaming.

### Ollama

Ollama allows the AI model to run locally without requiring an external AI API or exposing API credentials.

### llama3.2

`llama3.2:latest` was selected because it provides a practical local model for the available development hardware.

### File-based persistence

A local JSON-based event store was used for the prototype. This keeps the implementation simple and makes persisted conversation events easy to inspect during development.

The trade-off is that file-based persistence is not suitable for high-concurrency production workloads.

## Important decisions

### 1. Local AI inference

The AI model runs through Ollama locally rather than using a cloud API. This keeps the prototype self-contained and avoids dependency on external API credentials.

### 2. Event-based conversation handling

Conversation activity is represented as events rather than relying only on the current UI state. This provides a foundation for retaining conversation history and supporting resumable behaviour.

### 3. Simple persistence

The prototype uses a lightweight JSON persistence layer instead of introducing a database. This reduced implementation complexity and allowed the core realtime conversation behaviour to be developed quickly.

## Assumptions and limitations

* The prototype is intended to run locally.
* Ollama and the required model must be installed on the machine.
* The current persistence implementation is file-based and is not designed for production-scale concurrent access.
* Automatic reconnection after network interruption is not fully implemented.
* The prototype has been tested primarily as a local single-user application.
* Authentication and multi-user isolation are outside the scope of the prototype.
* Production-grade observability, distributed persistence, and horizontal scaling are not implemented.

## Production and scale

For a production deployment, the first major changes would be the persistence and realtime infrastructure.

The current implementation uses local file-based persistence and a single Node.js process. At greater scale, this would be replaced with a durable database and a shared event/realtime infrastructure so that multiple application instances could safely handle the same conversation.

Additional improvements would include:

* Database-backed event storage
* Proper cursor/version management
* Robust automatic reconnection
* Idempotent event processing
* Authentication and authorization
* Structured logging and monitoring
* Horizontal scaling
* Queue-based AI inference where appropriate
* Rate limiting and resource controls

These are proposed production improvements and are not claimed as part of the submitted prototype.

## AI usage

AI tools were used during development, primarily ChatGPT.

AI assistance was used for:

* Understanding the problem requirements
* Designing the realtime conversation architecture
* Debugging Node.js and JavaScript issues
* Working through SSE/event-stream behaviour
* Generating and refining implementation code
* Reviewing implementation decisions
* Troubleshooting the local Ollama integration

The generated code and suggestions were reviewed, modified, and tested manually in the local application. The final implementation was run locally and checked against the demonstrated conversation flow.

## Credibility note

My previous project experience includes academic and internship projects involving web applications, Java, JavaScript, SQL, embedded systems, and AI/ML-related functionality.

One relevant project is an Adaptive Learning Optimization System developed as my final-year project.

### Problem

The system was designed to provide personalized learning based on diagnostic assessment results and learner performance.

### Personal contribution

I contributed primarily to the documentation and frontend implementation, including the user-facing learning flow and project integration.

### Technical scope

The project used HTML, CSS, JavaScript, Java, SQL, and AI/ML-related components. It included diagnostic testing, personalized learning paths, chatbot functionality, learning summaries, grade prediction, and a dashboard.

### Evidence

Project documentation and related academic work are available in the project materials provided with my academic work.
