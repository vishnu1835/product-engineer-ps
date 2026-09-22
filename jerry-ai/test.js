const assert = require("node:assert/strict");
const test = require("node:test");

// ------------------------------------------------------------
// Small deterministic event-store simulation
// ------------------------------------------------------------

function createRun() {
    return {
        id: "test-run-001",
        status: "running",
        events: []
    };
}

function addEvent(run, type, content) {
    const position = run.events.length + 1;

    const event = {
        position,
        type,
        content
    };

    run.events.push(event);

    return event;
}

function replayAfterCursor(run, cursor) {
    return run.events.filter(
        event => event.position > cursor
    );
}

// ------------------------------------------------------------
// Test 1: ordered event delivery
// ------------------------------------------------------------

test("events are assigned increasing ordered positions", () => {
    const run = createRun();

    addEvent(run, "text", "Hello");
    addEvent(run, "text", "from");
    addEvent(run, "text", "Jerry");
    addEvent(run, "completed", { runId: run.id });

    const positions = run.events.map(
        event => event.position
    );

    assert.deepEqual(
        positions,
        [1, 2, 3, 4]
    );
});

// ------------------------------------------------------------
// Test 2: replay after cursor
// ------------------------------------------------------------

test("replay returns only events after the client cursor", () => {
    const run = createRun();

    addEvent(run, "text", "One");
    addEvent(run, "text", "Two");
    addEvent(run, "text", "Three");
    addEvent(run, "text", "Four");
    addEvent(run, "completed", { runId: run.id });

    const missedEvents =
        replayAfterCursor(run, 2);

    assert.deepEqual(
        missedEvents.map(event => event.position),
        [3, 4, 5]
    );
});

// ------------------------------------------------------------
// Test 3: client-side deduplication
// ------------------------------------------------------------

test("events already received by the client are ignored", () => {
    const currentCursor = 3;

    const incomingEvents = [
        { position: 1, content: "One" },
        { position: 2, content: "Two" },
        { position: 3, content: "Three" },
        { position: 4, content: "Four" }
    ];

    const displayedEvents = incomingEvents.filter(
        event => event.position > currentCursor
    );

    assert.deepEqual(
        displayedEvents.map(event => event.position),
        [4]
    );
});

// ------------------------------------------------------------
// Test 4: gap detection
// ------------------------------------------------------------

test("a missing event is detected as a cursor gap", () => {
    const currentCursor = 2;

    const incomingEvent = {
        position: 4,
        content: "Four"
    };

    const expectedPosition =
        currentCursor + 1;

    assert.notEqual(
        incomingEvent.position,
        expectedPosition
    );
});

// ------------------------------------------------------------
// Test 5: failure after partial output
// ------------------------------------------------------------

test("a run that fails after partial output remains failed", () => {
    const run = createRun();

    addEvent(
        run,
        "text",
        "Jerry started answering."
    );

    run.status = "failed";

    addEvent(
        run,
        "failed",
        {
            error: "Simulated generator failure"
        }
    );

    assert.equal(
        run.status,
        "failed"
    );

    assert.equal(
        run.events.length,
        2
    );

    assert.equal(
        run.events[1].type,
        "failed"
    );

    // A failed run must not later become completed.
    assert.notEqual(
        run.status,
        "completed"
    );
});

// ------------------------------------------------------------
// Test 6: replay + live events can be reconstructed in order
// ------------------------------------------------------------

test("replay and new live events produce one ordered sequence", () => {
    const run = createRun();

    addEvent(run, "text", "A");
    addEvent(run, "text", "B");
    addEvent(run, "text", "C");

    const cursor = 2;

    const replayed =
        replayAfterCursor(run, cursor);

    addEvent(run, "text", "D");
    addEvent(run, "text", "E");

    const liveEvents =
        run.events.filter(
            event => event.position > 3
        );

    const reconstructed = [
        ...replayed,
        ...liveEvents
    ];

    const uniquePositions = [
        ...new Set(
            reconstructed.map(
                event => event.position
            )
        )
    ];

    assert.deepEqual(
        uniquePositions,
        [3, 4, 5]
    );
});