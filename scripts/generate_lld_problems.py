import json
import os

# Helper to build node
def make_node(node_id, name, kind, fields, methods, x, y, enum_values=None):
    return {
        "id": node_id,
        "position": {"x": x, "y": y},
        "data": {
            "name": name,
            "kind": kind,
            "fields": [
                {"id": f"f_{i+1}", "visibility": f[0], "name": f[1], "type": f[2]}
                for i, f in enumerate(fields)
            ],
            "methods": [
                {"id": f"m_{i+1}", "visibility": m[0], "name": m[1], "type": m[2], "params": m[3] if len(m) > 3 else ""}
                for i, m in enumerate(methods)
            ],
            "enumValues": enum_values or []
        }
    }

def make_edge(edge_id, source, target, kind, label="", src_mul="", tgt_mul=""):
    return {
        "id": edge_id,
        "source": source,
        "target": target,
        "data": {
            "kind": kind,
            "label": label,
            "sourceMultiplicity": src_mul,
            "targetMultiplicity": tgt_mul
        }
    }

def validate_diagram(diagram):
    warnings = []
    nodes = diagram["nodes"]
    edges = diagram["edges"]
    name_map = {}
    for nid, node in nodes.items():
        name = node["data"]["name"].strip()
        if not name:
            warnings.append(f"Empty name on node {nid}")
        lower = name.lower()
        if lower in name_map:
            warnings.append(f"Duplicate name '{name}' on nodes {nid} and {name_map[lower]}")
        name_map[lower] = nid
        if node["data"]["kind"] == "interface" and len(node["data"]["fields"]) > 0:
            warnings.append(f"Interface {name} has fields")

    for eid, edge in edges.items():
        s = nodes.get(edge["source"])
        t = nodes.get(edge["target"])
        if not s or not t:
            warnings.append(f"Edge {eid} references missing node")
            continue
        sk = s["data"]["kind"]
        tk = t["data"]["kind"]
        sn = s["data"]["name"]
        tn = t["data"]["name"]
        ek = edge["data"]["kind"]
        if ek == "implementation" and tk != "interface":
            warnings.append(f"Edge {eid}: {sn} implements {tn} which is {tk}")
        if ek == "inheritance" and tk == "interface":
            warnings.append(f"Edge {eid}: {sn} inherits from {tn} which is interface")
    return warnings

# 12 New Problems Definitions
new_problems = [
    # 1. Rate Limiter
    {
        "id": "rate-limiter",
        "title": "Rate Limiter (Token Bucket)",
        "difficulty": "medium",
        "tags": ["oop", "strategy", "concurrency", "design-patterns"],
        "summary": "Design a high-throughput, thread-safe in-memory rate limiter supporting interchangeable algorithms such as Token Bucket and Sliding Window Log.",
        "requirements": [
            "Support per-client or per-IP rate limiting with configurable capacity and refill rate.",
            "Allow pluggable rate limiting algorithms (Token Bucket, Leaky Bucket, Sliding Window Log) without modifying client invocation logic.",
            "Ensure thread safety under high concurrent requests without coarse-grained locking on the entire registry.",
            "Return whether an incoming request is allowed or dropped (HTTP 429 semantics)."
        ],
        "constraints": [
            "Evaluation latency must be sub-millisecond per request.",
            "Client state must be stored in-memory efficiently with cleanup of stale client buckets."
        ],
        "hints": [
            "Apply the Strategy Pattern to decouple the rate limiting evaluation algorithm from client tracking.",
            "Use ConcurrentHashMap with computeIfAbsent or atomics to isolate locks per clientId rather than locking globally.",
            "For Token Bucket, avoid running a background thread per client; compute elapsed time on demand upon each arrival."
        ],
        "keyEntities": [
            "RateLimiter",
            "RateLimiterStrategy",
            "TokenBucketStrategy",
            "SlidingWindowLogStrategy",
            "ClientBucketRegistry"
        ],
        "selfReviewChecklist": [
            "Is the algorithm encapsulated behind an interface allowing new strategies to be added cleanly?",
            "Are token refills calculated lazily based on timestamp deltas rather than periodic active timers?",
            "Is client tracking thread-safe under concurrent multi-threaded requests?"
        ],
        "referenceNotes": """### Architectural Solution & Concurrency Model

A high-performance rate limiter computes token replenishment lazily upon request arrival rather than maintaining background threads per client:

$$\\text{newTokens} = \\min(\\text{capacity}, \\text{currentTokens} + \\Delta t \\times \\text{refillRate})$$

#### Thread Safety Strategy
Instead of synchronizing the entire `RateLimiter` class, each client has an isolated `TokenBucket` object protected by atomic CAS or an internal lock, preventing lock contention across different clients.

```java
public interface RateLimiterStrategy {
    boolean allowRequest(String clientId);
}

public class TokenBucketStrategy implements RateLimiterStrategy {
    private final long capacity;
    private final double refillTokensPerMs;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public TokenBucketStrategy(long capacity, double refillTokensPerSecond) {
        this.capacity = capacity;
        this.refillTokensPerMs = refillTokensPerSecond / 1000.0;
    }

    private static class Bucket {
        long tokens;
        long lastRefillTime;
        Bucket(long capacity, long now) {
            this.tokens = capacity;
            this.lastRefillTime = now;
        }
    }

    @Override
    public boolean allowRequest(String clientId) {
        long now = System.currentTimeMillis();
        Bucket bucket = buckets.computeIfAbsent(clientId, k -> new Bucket(capacity, now));
        synchronized (bucket) {
            long elapsed = now - bucket.lastRefillTime;
            if (elapsed > 0) {
                double added = elapsed * refillTokensPerMs;
                bucket.tokens = Math.min(capacity, bucket.tokens + (long) added);
                bucket.lastRefillTime = now;
            }
            if (bucket.tokens >= 1) {
                bucket.tokens--;
                return true;
            }
            return false;
        }
    }
}
```""",
        "relatedPatternIds": ["strategy", "decorator"],
        "commonMistakes": [
            "Spawning a background thread for every client bucket, leading to severe thread exhaustion.",
            "Synchronizing the entire rate limiter registry on `allowRequest`, creating a global bottleneck."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_limiter": make_node("n_limiter", "RateLimiter", "class",
                    [("-", "strategy", "RateLimiterStrategy")],
                    [("+", "isAllowed", "boolean", "clientId: String"), ("+", "setStrategy", "void", "s: RateLimiterStrategy")],
                    50, 80),
                "n_strat": make_node("n_strat", "RateLimiterStrategy", "interface",
                    [],
                    [("+", "allowRequest", "boolean", "clientId: String")],
                    420, 80),
                "n_tb": make_node("n_tb", "TokenBucketStrategy", "class",
                    [("-", "capacity", "long"), ("-", "refillRate", "double"), ("-", "buckets", "Map<String, Bucket>")],
                    [("+", "allowRequest", "boolean", "clientId: String")],
                    300, 280),
                "n_sw": make_node("n_sw", "SlidingWindowLogStrategy", "class",
                    [("-", "windowSizeMs", "long"), ("-", "maxRequests", "int"), ("-", "logs", "Map<String, Deque<Long>>")],
                    [("+", "allowRequest", "boolean", "clientId: String")],
                    580, 280)
            },
            "edges": {
                "e1": make_edge("e1", "n_limiter", "n_strat", "association", "delegates to"),
                "e2": make_edge("e2", "n_tb", "n_strat", "implementation"),
                "e3": make_edge("e3", "n_sw", "n_strat", "implementation")
            }
        }
    },

    # 2. Logging Framework
    {
        "id": "logging-framework",
        "title": "Logging Framework",
        "difficulty": "medium",
        "tags": ["oop", "observer", "singleton", "design-patterns"],
        "summary": "Design an extensible logging library supporting multiple log levels, formatting layouts, and pluggable asynchronous destinations (Console, File, Network).",
        "requirements": [
            "Support standard hierarchical log levels: DEBUG < INFO < WARN < ERROR < FATAL.",
            "Format log messages with timestamp, thread name, log level, and custom message layout.",
            "Support multiple concurrent log appenders/sinks (ConsoleAppender, FileAppender, DatabaseAppender).",
            "Provide a global Singleton or Factory accessor `LoggerFactory.getLogger(Class)`.",
            "Support asynchronous logging without blocking application worker threads."
        ],
        "constraints": [
            "Log writes must not fail the host application if an appender throws an I/O error.",
            "Thread names and caller metadata must be captured accurately."
        ],
        "hints": [
            "Use the Observer Pattern: the Logger acts as subject notifying registered Appender observers.",
            "Use the Chain of Responsibility or simple level comparison to filter messages before formatting.",
            "Use a bounded RingBuffer or BlockingQueue for AsyncAppender worker processing."
        ],
        "keyEntities": [
            "Logger",
            "LogLevel",
            "LogMessage",
            "LogAppender",
            "ConsoleAppender",
            "FileAppender",
            "LogFormatter"
        ],
        "selfReviewChecklist": [
            "Is formatting logic decoupled from the writing destination?",
            "Can new appenders be plugged in without modifying existing logger classes?",
            "Are log levels evaluated before expensive message string formatting?"
        ],
        "referenceNotes": """### Core Design & Concurrency Strategy

```java
public enum LogLevel {
    DEBUG(1), INFO(2), WARN(3), ERROR(4), FATAL(5);
    private final int priority;
    LogLevel(int priority) { this.priority = priority; }
    public boolean isGreaterOrEqual(LogLevel other) { return this.priority >= other.priority; }
}

public interface LogAppender {
    void append(LogMessage message);
}

public class ConsoleAppender implements LogAppender {
    private final LogFormatter formatter;
    public ConsoleAppender(LogFormatter formatter) { this.formatter = formatter; }
    @Override
    public synchronized void append(LogMessage message) {
        System.out.println(formatter.format(message));
    }
}

public class Logger {
    private final String name;
    private LogLevel minimumLevel = LogLevel.INFO;
    private final List<LogAppender> appenders = new CopyOnWriteArrayList<>();

    public Logger(String name) { this.name = name; }
    public void addAppender(LogAppender appender) { appenders.add(appender); }
    public void setLevel(LogLevel level) { this.minimumLevel = level; }

    public void log(LogLevel level, String msg) {
        if (!level.isGreaterOrEqual(minimumLevel)) return;
        LogMessage logMsg = new LogMessage(name, level, msg, System.currentTimeMillis(), Thread.currentThread().getName());
        for (LogAppender appender : appenders) {
            try {
                appender.append(logMsg);
            } catch (Exception e) {
                System.err.println("Logging failure: " + e.getMessage());
            }
        }
    }
    public void info(String msg) { log(LogLevel.INFO, msg); }
    public void error(String msg) { log(LogLevel.ERROR, msg); }
}
```""",
        "relatedPatternIds": ["observer", "singleton", "factory-method"],
        "commonMistakes": [
            "String formatting executed prior to log-level validation, wasting CPU cycles on discarded debug logs.",
            "Synchronizing the entire logger method, serializing all application threads on logging."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_logger": make_node("n_logger", "Logger", "class",
                    [("-", "name", "String"), ("-", "level", "LogLevel"), ("-", "appenders", "List<LogAppender>")],
                    [("+", "log", "void", "level: LogLevel, msg: String"), ("+", "addAppender", "void", "a: LogAppender")],
                    50, 80),
                "n_appender": make_node("n_appender", "LogAppender", "interface",
                    [],
                    [("+", "append", "void", "msg: LogMessage")],
                    420, 80),
                "n_console": make_node("n_console", "ConsoleAppender", "class",
                    [("-", "formatter", "LogFormatter")],
                    [("+", "append", "void", "msg: LogMessage")],
                    300, 280),
                "n_file": make_node("n_file", "FileAppender", "class",
                    [("-", "filePath", "String"), ("-", "formatter", "LogFormatter")],
                    [("+", "append", "void", "msg: LogMessage")],
                    580, 280),
                "n_formatter": make_node("n_formatter", "LogFormatter", "interface",
                    [],
                    [("+", "format", "String", "msg: LogMessage")],
                    720, 80)
            },
            "edges": {
                "e1": make_edge("e1", "n_logger", "n_appender", "association", "notifies (0..*)"),
                "e2": make_edge("e2", "n_console", "n_appender", "implementation"),
                "e3": make_edge("e3", "n_file", "n_appender", "implementation"),
                "e4": make_edge("e4", "n_console", "n_formatter", "association", "uses")
            }
        }
    },

    # 3. Library Management System
    {
        "id": "library-management",
        "title": "Library Management System",
        "difficulty": "easy",
        "tags": ["oop", "strategy", "factory-method"],
        "summary": "Design a comprehensive library catalog system managing physical book items, multi-factor searches, member checkouts, reservations, and overdue fine calculations.",
        "requirements": [
            "Distinguish between a conceptual Book (metadata, ISBN, authors) and physical BookItem (barcode, rack number, status).",
            "Support searching the catalog by Title, Author, Subject, or Publication Date.",
            "Support checkout limits (e.g. max 5 books for standard member) and 14-day borrowing duration.",
            "Calculate overdue fines with interchangeable fine calculation policies.",
            "Allow members to reserve books currently checked out by others."
        ],
        "constraints": [
            "A book item cannot be issued to multiple members simultaneously.",
            "Lost or damaged book items must update inventory state and assess replacement fees."
        ],
        "hints": [
            "Separate Book (definition) from BookItem (instance). A library has 1 Book record for 'Clean Architecture', but 5 physical BookItems with distinct barcodes.",
            "Use the Strategy Pattern for SearchStrategy and FineCalculationStrategy.",
            "Use an Enum for BookStatus (AVAILABLE, RESERVED, LOANED, LOST)."
        ],
        "keyEntities": [
            "Library",
            "Book",
            "BookItem",
            "Member",
            "Librarian",
            "BookLending",
            "FineStrategy"
        ],
        "selfReviewChecklist": [
            "Did you decouple Book conceptual entity from physical BookItem barcode copies?",
            "Is the lending period and overdue fine calculation customizable without altering member logic?",
            "Are search filters extensible via query strategies?"
        ],
        "referenceNotes": """### Core Class Structure & Entity Relationships

```java
public enum BookStatus { AVAILABLE, RESERVED, LOANED, LOST }

public class Book {
    private final String isbn;
    private final String title;
    private final String author;
    public Book(String isbn, String title, String author) {
        this.isbn = isbn; this.title = title; this.author = author;
    }
    // getters
}

public class BookItem {
    private final String barcode;
    private final Book book;
    private BookStatus status = BookStatus.AVAILABLE;
    private String rackLocation;

    public BookItem(String barcode, Book book, String rackLocation) {
        this.barcode = barcode; this.book = book; this.rackLocation = rackLocation;
    }
    public synchronized boolean checkout() {
        if (status == BookStatus.AVAILABLE) {
            status = BookStatus.LOANED;
            return true;
        }
        return false;
    }
    public synchronized void returnItem() {
        status = BookStatus.AVAILABLE;
    }
}

public interface FineStrategy {
    double calculateFine(long overdueDays);
}

public class StandardFineStrategy implements FineStrategy {
    private static final double DAILY_RATE = 1.50;
    @Override
    public double calculateFine(long overdueDays) {
        return Math.max(0, overdueDays * DAILY_RATE);
    }
}
```""",
        "relatedPatternIds": ["strategy", "factory-method"],
        "commonMistakes": [
            "Merging Book and BookItem into one class, making it impossible to track multiple physical copies of the same book.",
            "Hardcoding fixed lending duration and fine rates inside checkout methods."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_lib": make_node("n_lib", "Library", "class",
                    [("-", "catalog", "Map<String, Book>"), ("-", "members", "Map<String, Member>")],
                    [("+", "search", "List<Book>", "query: String"), ("+", "checkoutBook", "BookLending", "item: BookItem, m: Member")],
                    50, 80),
                "n_book": make_node("n_book", "Book", "class",
                    [("-", "isbn", "String"), ("-", "title", "String"), ("-", "author", "String")],
                    [("+", "getTitle", "String", "")],
                    380, 80),
                "n_item": make_node("n_item", "BookItem", "class",
                    [("-", "barcode", "String"), ("-", "status", "BookStatus"), ("-", "rackLocation", "String")],
                    [("+", "checkout", "boolean", ""), ("+", "returnItem", "void", "")],
                    700, 80),
                "n_fine": make_node("n_fine", "FineStrategy", "interface",
                    [],
                    [("+", "calculateFine", "double", "overdueDays: long")],
                    380, 280),
                "n_stdfine": make_node("n_stdfine", "StandardFineStrategy", "class",
                    [("-", "dailyRate", "double")],
                    [("+", "calculateFine", "double", "overdueDays: long")],
                    700, 280)
            },
            "edges": {
                "e1": make_edge("e1", "n_lib", "n_book", "aggregation", "catalogs (0..*)"),
                "e2": make_edge("e2", "n_item", "n_book", "association", "instance of"),
                "e3": make_edge("e3", "n_stdfine", "n_fine", "implementation")
            }
        }
    },

    # 4. ATM System
    {
        "id": "atm-system",
        "title": "ATM System",
        "difficulty": "hard",
        "tags": ["oop", "state", "singleton", "concurrency"],
        "summary": "Design an Automated Teller Machine (ATM) software architecture modeling card authentication, state transitions, cash dispensing, and bank service communication.",
        "requirements": [
            "Model ATM user flow via state transitions: IdleState -> CardInsertedState -> PinAuthenticatedState -> TransactionExecutionState.",
            "Support core operations: Balance Inquiry, Cash Withdrawal, Deposit, and Card Eject.",
            "Dispense requested withdrawal amounts using optimal currency denominations ($100, $50, $20) using Chain of Responsibility.",
            "Handle error conditions: incorrect PIN (3 attempts ejects card), insufficient ATM cash, and bank communication failure."
        ],
        "constraints": [
            "Transactions must be atomic: if hardware cash dispensing jams, bank debit must roll back.",
            "Only one active user session can proceed at a time."
        ],
        "hints": [
            "Use the State Pattern for ATM lifecycle state transitions.",
            "Use Chain of Responsibility for the CashDispenser denominations ($100 dispenser -> $50 dispenser -> $20 dispenser).",
            "Keep the BankService behind an interface to allow mocking banking network transactions."
        ],
        "keyEntities": [
            "ATM",
            "ATMState",
            "IdleState",
            "HasCardState",
            "PinValidatedState",
            "CashDispenser",
            "BankService"
        ],
        "selfReviewChecklist": [
            "Does the ATM delegate state-dependent actions to an explicit ATMState object?",
            "Is cash dispensing isolated from bank account debiting with rollback safety?",
            "Are card ejection and timeout mechanics modeled across all states?"
        ],
        "referenceNotes": """### State Machine & Dispenser Chain

```java
public interface ATMState {
    void insertCard(ATM atm, Card card);
    void enterPin(ATM atm, int pin);
    void withdrawCash(ATM atm, double amount);
    void ejectCard(ATM atm);
}

public class IdleState implements ATMState {
    @Override
    public void insertCard(ATM atm, Card card) {
        atm.setCurrentCard(card);
        atm.changeState(new HasCardState());
    }
    @Override public void enterPin(ATM atm, int pin) { throw new IllegalStateException("Insert card first"); }
    @Override public void withdrawCash(ATM atm, double amount) { throw new IllegalStateException("Insert card first"); }
    @Override public void ejectCard(ATM atm) { System.out.println("No card inserted"); }
}

public abstract class DispenseChain {
    protected DispenseChain next;
    public void setNext(DispenseChain next) { this.next = next; }
    public abstract void dispense(Currency currency);
}
```""",
        "relatedPatternIds": ["state", "singleton", "command"],
        "commonMistakes": [
            "Using nested switch-case statements inside ATM class instead of the State Pattern.",
            "Debiting the customer account before physically validating and verifying cash dispenser inventory."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_atm": make_node("n_atm", "ATM", "class",
                    [("-", "currentState", "ATMState"), ("-", "cashBalance", "double"), ("-", "bankService", "BankService")],
                    [("+", "insertCard", "void", "card: Card"), ("+", "enterPin", "void", "pin: int"), ("+", "withdraw", "void", "amount: double")],
                    50, 80),
                "n_state": make_node("n_state", "ATMState", "interface",
                    [],
                    [("+", "insertCard", "void", "atm: ATM, c: Card"), ("+", "enterPin", "void", "atm: ATM, pin: int"), ("+", "ejectCard", "void", "atm: ATM")],
                    420, 80),
                "n_idle": make_node("n_idle", "IdleState", "class",
                    [],
                    [("+", "insertCard", "void", "atm: ATM, c: Card"), ("+", "ejectCard", "void", "atm: ATM")],
                    250, 280),
                "n_hascard": make_node("n_hascard", "HasCardState", "class",
                    [],
                    [("+", "enterPin", "void", "atm: ATM, pin: int"), ("+", "ejectCard", "void", "atm: ATM")],
                    500, 280),
                "n_dispenser": make_node("n_dispenser", "CashDispenser", "class",
                    [("-", "currency100", "int"), ("-", "currency50", "int"), ("-", "currency20", "int")],
                    [("+", "dispense", "boolean", "amount: double")],
                    760, 80)
            },
            "edges": {
                "e1": make_edge("e1", "n_atm", "n_state", "association", "current state"),
                "e2": make_edge("e2", "n_idle", "n_state", "implementation"),
                "e3": make_edge("e3", "n_hascard", "n_state", "implementation"),
                "e4": make_edge("e4", "n_atm", "n_dispenser", "composition", "contains")
            }
        }
    },

    # 5. Food Delivery Order Flow (State Machine)
    {
        "id": "food-delivery-state",
        "title": "Food Delivery Order Flow (State Machine)",
        "difficulty": "medium",
        "tags": ["oop", "state", "observer", "state-machine"],
        "summary": "Design the life-cycle of a food delivery order through successive states with automatic customer, restaurant, and driver event notifications.",
        "requirements": [
            "Model order life cycle: CREATED -> PAID -> ACCEPTED_BY_RESTAURANT -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED (or CANCELLED).",
            "Enforce strict legal state transitions (e.g. order cannot transition from DELIVERED to PREPARING; cannot cancel once OUT_FOR_DELIVERY).",
            "Notify stakeholders (Customer, Restaurant, DeliveryPartner) upon state transitions via Observer Pattern.",
            "Record timestamp and location history along each transition stage."
        ],
        "constraints": [
            "Cancellations must execute compensation actions (e.g. refund payment if paid, release driver reservation)."
        ],
        "hints": [
            "Combine the State Pattern for transition validation with the Observer Pattern for event dispatching.",
            "Pass an OrderContext into state transition methods to allow state changes to update the context safely."
        ],
        "keyEntities": [
            "Order",
            "OrderState",
            "OrderPlacedState",
            "PreparingState",
            "DeliveredState",
            "OrderObserver"
        ],
        "selfReviewChecklist": [
            "Are invalid transitions cleanly rejected with domain exceptions?",
            "Is the observer event system decoupled from state validation logic?",
            "Can new notifications channels be added without modifying order states?"
        ],
        "referenceNotes": """### State Machine with Event Broadcasting

```java
public interface OrderState {
    void handlePayment(OrderContext ctx);
    void acceptByRestaurant(OrderContext ctx);
    void startDelivery(OrderContext ctx);
    void markDelivered(OrderContext ctx);
    void cancel(OrderContext ctx);
}

public class OrderContext {
    private OrderState currentState;
    private final String orderId;
    private final List<OrderObserver> observers = new ArrayList<>();

    public OrderContext(String orderId) {
        this.orderId = orderId;
        this.currentState = new OrderCreatedState();
    }
    public void setState(OrderState next) {
        this.currentState = next;
        notifyObservers();
    }
    private void notifyObservers() {
        for (OrderObserver o : observers) o.onOrderUpdated(this);
    }
}
```""",
        "relatedPatternIds": ["state", "observer"],
        "commonMistakes": [
            "Allowing direct state assignment (`order.setStatus(...)`) bypassing business validation invariants.",
            "Coupling SMS/Push notification logic directly inside each State class."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_order": make_node("n_order", "OrderContext", "class",
                    [("-", "orderId", "String"), ("-", "state", "OrderState"), ("-", "observers", "List<OrderObserver>")],
                    [("+", "setState", "void", "s: OrderState"), ("+", "cancel", "void", "")],
                    50, 80),
                "n_state": make_node("n_state", "OrderState", "interface",
                    [],
                    [("+", "next", "void", "ctx: OrderContext"), ("+", "cancel", "void", "ctx: OrderContext")],
                    420, 80),
                "n_prep": make_node("n_prep", "PreparingState", "class",
                    [],
                    [("+", "next", "void", "ctx: OrderContext"), ("+", "cancel", "void", "ctx: OrderContext")],
                    250, 280),
                "n_out": make_node("n_out", "OutForDeliveryState", "class",
                    [],
                    [("+", "next", "void", "ctx: OrderContext"), ("+", "cancel", "void", "ctx: OrderContext")],
                    500, 280),
                "n_obs": make_node("n_obs", "OrderObserver", "interface",
                    [],
                    [("+", "onOrderUpdate", "void", "ctx: OrderContext")],
                    720, 80)
            },
            "edges": {
                "e1": make_edge("e1", "n_order", "n_state", "association", "current state"),
                "e2": make_edge("e2", "n_prep", "n_state", "implementation"),
                "e3": make_edge("e3", "n_out", "n_state", "implementation"),
                "e4": make_edge("e4", "n_order", "n_obs", "association", "notifies (0..*)")
            }
        }
    },

    # 6. Tic-Tac-Toe Game
    {
        "id": "tic-tac-toe",
        "title": "Tic-Tac-Toe Game",
        "difficulty": "easy",
        "tags": ["oop", "strategy", "game-design"],
        "summary": "Design an extensible N x N Tic-Tac-Toe game supporting multiple players, custom symbols, undo moves, and pluggable win-checking algorithms.",
        "requirements": [
            "Support generalized $N \\times N$ board size (default 3x3).",
            "Support $M$ players taking alternating turns placing their assigned piece symbol (X, O, Triangle, etc.).",
            "Validate moves: coordinates must be within board bounds and target cell must be unoccupied.",
            "Detect winning condition in $O(1)$ time complexity per move rather than rescanning the full board.",
            "Detect draw condition when board is full and no winner has emerged."
        ],
        "constraints": [
            "Move evaluation must scale to large boards ($N = 1000$) efficiently."
        ],
        "hints": [
            "Track row counts, column counts, and diagonal counts in integer arrays to achieve $O(1)$ win checking per move.",
            "Use a `Deque<Move>` to support undoing moves if required."
        ],
        "keyEntities": [
            "TicTacToeGame",
            "Board",
            "Player",
            "Piece",
            "Move",
            "WinDetectionStrategy"
        ],
        "selfReviewChecklist": [
            "Does the board support arbitrary grid size $N$ without rewriting core loop logic?",
            "Is win checking implemented in $O(1)$ time rather than traversing the full $N \\times N$ grid on every turn?",
            "Are Piece and Player cleanly decoupled?"
        ],
        "referenceNotes": """### O(1) Fast Win Detection Algorithm

Maintain counts per row, column, and two diagonals for each player:

```java
public class Board {
    private final int size;
    private final Piece[][] grid;
    private final int[] rowCounts;
    private final int[] colCounts;
    private int diagCount = 0;
    private int antiDiagCount = 0;

    public Board(int size) {
        this.size = size;
        this.grid = new Piece[size][size];
        this.rowCounts = new int[size];
        this.colCounts = new int[size];
    }

    public boolean placePiece(int row, int col, Piece piece, int playerVal) {
        if (grid[row][col] != null) return false;
        grid[row][col] = piece;

        rowCounts[row] += playerVal;
        colCounts[col] += playerVal;
        if (row == col) diagCount += playerVal;
        if (row + col == size - 1) antiDiagCount += playerVal;

        int target = size * playerVal;
        return rowCounts[row] == target || colCounts[col] == target || diagCount == target || antiDiagCount == target;
    }
}
```""",
        "relatedPatternIds": ["strategy", "factory-method"],
        "commonMistakes": [
            "Traversing the entire $N \\times N$ board on every move, resulting in $O(N^2)$ checks instead of $O(1)$ counters.",
            "Hardcoding fixed 'X' and 'O' strings instead of a polymorphic or enum Piece model."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_game": make_node("n_game", "TicTacToeGame", "class",
                    [("-", "board", "Board"), ("-", "players", "Queue<Player>"), ("-", "winner", "Player")],
                    [("+", "playTurn", "boolean", "row: int, col: int"), ("+", "isGameOver", "boolean", "")],
                    50, 80),
                "n_board": make_node("n_board", "Board", "class",
                    [("-", "size", "int"), ("-", "grid", "Piece[][]"), ("-", "freeCells", "int")],
                    [("+", "placePiece", "boolean", "r: int, c: int, p: Piece"), ("+", "checkWin", "boolean", "r: int, c: int")],
                    380, 80),
                "n_player": make_node("n_player", "Player", "class",
                    [("-", "name", "String"), ("-", "piece", "Piece")],
                    [("+", "getPiece", "Piece", "")],
                    700, 80),
                "n_piece": make_node("n_piece", "Piece", "enum",
                    [],
                    [],
                    700, 280, ["X", "O", "TRIANGLE"])
            },
            "edges": {
                "e1": make_edge("e1", "n_game", "n_board", "composition", "contains"),
                "e2": make_edge("e2", "n_game", "n_player", "association", "participants (2..*)"),
                "e3": make_edge("e3", "n_player", "n_piece", "association", "assigned piece")
            }
        }
    },

    # 7. Snake and Ladder Game
    {
        "id": "snake-and-ladder",
        "title": "Snake and Ladder Game",
        "difficulty": "easy",
        "tags": ["oop", "strategy", "game-design"],
        "summary": "Design a multiplayer Snake and Ladder board game supporting customizable board dimensions, multiple dice, snakes, ladders, and win conditions.",
        "requirements": [
            "Model an $N$-sized linear board (traditionally 1 to 100).",
            "Support Jumpers: Snakes (move backward from head to tail) and Ladders (move forward from base to top).",
            "Support $M$ players rolling a configurable number of $K$-sided dice.",
            "Handle landing rules: landing on a snake or ladder immediately transports the player to the jumper end position.",
            "Support overshoot rules (exact roll required to finish at 100, or bounce back)."
        ],
        "constraints": [
            "Snakes and ladders must not form an infinite cyclic loop (e.g. ladder $10 \\rightarrow 20$, snake $20 \\rightarrow 10$)."
        ],
        "hints": [
            "Model both Snake and Ladder using a unified `Jumper` class with `start` and `end` coordinates.",
            "Use a `Queue<Player>` to rotate turns cleanly among players."
        ],
        "keyEntities": [
            "SnakeAndLadderGame",
            "Board",
            "Cell",
            "Jumper",
            "Player",
            "Dice"
        ],
        "selfReviewChecklist": [
            "Are Snakes and Ladders abstracted polymorphically (or via a unified Jumper model)?",
            "Is dice rolling encapsulated into a testable Dice component allowing mock values in unit tests?",
            "Does the board prevent cyclic snake/ladder loops during setup?"
        ],
        "referenceNotes": """### Unified Jumper Model & Game Loop

```java
public class Jumper {
    private final int start;
    private final int end;
    public Jumper(int start, int end) {
        this.start = start;
        this.end = end;
    }
    public int getStart() { return start; }
    public int getEnd() { return end; }
    public boolean isSnake() { return start > end; }
    public boolean isLadder() { return start < end; }
}

public class SnakeAndLadderGame {
    private final Board board;
    private final Queue<Player> players = new LinkedList<>();
    private final Dice dice;
    private Player winner = null;

    public void playTurn() {
        Player current = players.poll();
        int roll = dice.roll();
        int nextPos = current.getPosition() + roll;

        if (nextPos <= board.getTotalCells()) {
            Jumper jumper = board.getJumperAt(nextPos);
            if (jumper != null) nextPos = jumper.getEnd();
            current.setPosition(nextPos);
        }
        if (current.getPosition() == board.getTotalCells()) {
            winner = current;
        } else {
            players.offer(current);
        }
    }
}
```""",
        "relatedPatternIds": ["strategy"],
        "commonMistakes": [
            "Creating separate complex hierarchies for Snake and Ladder when both are simple coordinate mappings `(start -> end)`.",
            "Using tight coupling with `Math.random()` rather than a mockable Dice strategy interface."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_game": make_node("n_game", "SnakeAndLadderGame", "class",
                    [("-", "board", "Board"), ("-", "players", "Queue<Player>"), ("-", "dice", "Dice")],
                    [("+", "playTurn", "void", ""), ("+", "getWinner", "Player", "")],
                    50, 80),
                "n_board": make_node("n_board", "Board", "class",
                    [("-", "size", "int"), ("-", "jumpers", "Map<Integer, Jumper>")],
                    [("+", "getNextPosition", "int", "curr: int, roll: int")],
                    380, 80),
                "n_jumper": make_node("n_jumper", "Jumper", "class",
                    [("-", "start", "int"), ("-", "end", "int")],
                    [("+", "isSnake", "boolean", ""), ("+", "isLadder", "boolean", "")],
                    700, 80),
                "n_player": make_node("n_player", "Player", "class",
                    [("-", "name", "String"), ("-", "position", "int")],
                    [("+", "setPosition", "void", "pos: int")],
                    250, 280),
                "n_dice": make_node("n_dice", "Dice", "class",
                    [("-", "sides", "int")],
                    [("+", "roll", "int", "")],
                    550, 280)
            },
            "edges": {
                "e1": make_edge("e1", "n_game", "n_board", "composition", "contains"),
                "e2": make_edge("e2", "n_board", "n_jumper", "association", "jumpers (0..*)"),
                "e3": make_edge("e3", "n_game", "n_player", "association", "players (2..*)"),
                "e4": make_edge("e4", "n_game", "n_dice", "association", "uses")
            }
        }
    },

    # 8. Payment Wallet & Ledger
    {
        "id": "payment-wallet",
        "title": "Payment Wallet & Ledger",
        "difficulty": "hard",
        "tags": ["oop", "command", "strategy", "transactions"],
        "summary": "Design a digital payment wallet and double-entry accounting ledger supporting wallet-to-wallet transfers, multi-currency conversion, and strict idempotency.",
        "requirements": [
            "Support multi-currency wallets with atomic balance top-up, withdraw, and peer-to-peer transfer.",
            "Implement double-entry bookkeeping: every transaction consists of at least one Debit and one Credit matching in net sum.",
            "Guarantee idempotency on transactions using unique client idempotency keys.",
            "Maintain audit trail of all transactions and enforce positive balance invariants (no overdraft unless approved)."
        ],
        "constraints": [
            "Zero money creation or loss: sum of all debits must equal sum of all credits.",
            "Thread safety across concurrent transactions on the same wallet."
        ],
        "hints": [
            "Apply the Command Pattern for transaction execution (`TransferCommand`, `DepositCommand`).",
            "Store transactions as immutable ledger entries rather than simply mutating a single balance column."
        ],
        "keyEntities": [
            "Wallet",
            "Account",
            "Transaction",
            "LedgerEntry",
            "TransactionCommand",
            "IdempotencyManager"
        ],
        "selfReviewChecklist": [
            "Is the double-entry accounting invariant preserved on every balance movement?",
            "Are duplicate requests with identical idempotency keys safely deduplicated?",
            "Are wallet locks acquired in a consistent ordering (e.g. by account ID) to prevent deadlocks?"
        ],
        "referenceNotes": """### Double-Entry Ledger & Lock Ordering

To prevent deadlocks during transfers between Account A and Account B, always acquire locks ordered by Account ID:

```java
public class WalletService {
    private final ConcurrentHashMap<String, Account> accounts = new ConcurrentHashMap<>();
    private final Set<String> processedKeys = Collections.newSetFromMap(new ConcurrentHashMap<>());

    public boolean transfer(String idempotencyKey, String fromId, String toId, BigDecimal amount) {
        if (!processedKeys.add(idempotencyKey)) {
            // Already processed; return cached success
            return true;
        }

        Account firstLock = fromId.compareTo(toId) < 0 ? accounts.get(fromId) : accounts.get(toId);
        Account secondLock = fromId.compareTo(toId) < 0 ? accounts.get(toId) : accounts.get(fromId);

        synchronized (firstLock) {
            synchronized (secondLock) {
                Account from = accounts.get(fromId);
                Account to = accounts.get(toId);
                if (from.getBalance().compareTo(amount) < 0) return false;

                from.debit(amount);
                to.credit(amount);
                Ledger.record(new LedgerEntry(fromId, toId, amount));
                return true;
            }
        }
    }
}
```""",
        "relatedPatternIds": ["command", "strategy"],
        "commonMistakes": [
            "Mutating account balance in-place without generating immutable double-entry ledger entries.",
            "Arbitrary lock acquisition during peer transfers, causing distributed deadlocks."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_wallet": make_node("n_wallet", "WalletService", "class",
                    [("-", "accounts", "Map<String, Account>"), ("-", "idempotency", "IdempotencyManager")],
                    [("+", "transfer", "boolean", "key: String, from: String, to: String, amt: double")],
                    50, 80),
                "n_account": make_node("n_account", "Account", "class",
                    [("-", "accountId", "String"), ("-", "balance", "double"), ("-", "currency", "String")],
                    [("+", "debit", "void", "amt: double"), ("+", "credit", "void", "amt: double")],
                    380, 80),
                "n_ledger": make_node("n_ledger", "Ledger", "class",
                    [("-", "entries", "List<LedgerEntry>")],
                    [("+", "record", "void", "entry: LedgerEntry")],
                    700, 80),
                "n_cmd": make_node("n_cmd", "TransactionCommand", "interface",
                    [],
                    [("+", "execute", "boolean", ""), ("+", "rollback", "void", "")],
                    380, 280),
                "n_transfer": make_node("n_transfer", "TransferCommand", "class",
                    [("-", "fromAccount", "Account"), ("-", "toAccount", "Account"), ("-", "amount", "double")],
                    [("+", "execute", "boolean", "")],
                    700, 280)
            },
            "edges": {
                "e1": make_edge("e1", "n_wallet", "n_account", "aggregation", "manages (0..*)"),
                "e2": make_edge("e2", "n_wallet", "n_ledger", "association", "records to"),
                "e3": make_edge("e3", "n_transfer", "n_cmd", "implementation")
            }
        }
    },

    # 9. Multi-Channel Notification Service
    {
        "id": "notification-service-lld",
        "title": "Notification Service (Multiple Channels)",
        "difficulty": "medium",
        "tags": ["oop", "strategy", "factory-method", "observer"],
        "summary": "Design an enterprise notification dispatching service supporting Email, SMS, Push, and Webhook channels with priority queues, rate limits, and fallback strategies.",
        "requirements": [
            "Support multiple notification delivery channels: Email (SendGrid), SMS (Twilio), Mobile Push (FCM/APNs), Webhook.",
            "Support notification prioritization (CRITICAL/OTP > PROMOTIONAL).",
            "Allow user opt-out preferences per channel and rate limiting (max 5 SMS/hour per user).",
            "Implement automatic fallback (e.g. if SMS fails, retry via WhatsApp or Email)."
        ],
        "constraints": [
            "Third-party vendor failures must not crash the notification pipeline.",
            "High throughput: dispatching must be asynchronous."
        ],
        "hints": [
            "Use the Strategy Pattern for `NotificationChannel` with implementations `EmailChannel`, `SmsChannel`, `PushChannel`.",
            "Use Factory Method to instantiate channels based on notification metadata."
        ],
        "keyEntities": [
            "NotificationService",
            "Notification",
            "NotificationChannel",
            "EmailChannel",
            "SmsChannel",
            "PushChannel",
            "ChannelFactory"
        ],
        "selfReviewChecklist": [
            "Can a new delivery channel (e.g. Slack or Discord) be plugged in without modifying core dispatch logic?",
            "Is channel selection decoupled via a Factory or Strategy interface?",
            "Are user channel preferences checked prior to calling vendor delivery APIs?"
        ],
        "referenceNotes": """### Extensible Notification Dispatch Architecture

```java
public interface NotificationChannel {
    boolean send(Notification notification);
}

public class EmailChannel implements NotificationChannel {
    @Override
    public boolean send(Notification notification) {
        System.out.println("Sending email to " + notification.getRecipient() + ": " + notification.getBody());
        return true;
    }
}

public class SmsChannel implements NotificationChannel {
    @Override
    public boolean send(Notification notification) {
        System.out.println("Sending SMS to " + notification.getRecipient() + ": " + notification.getBody());
        return true;
    }
}

public class NotificationService {
    private final Map<ChannelType, NotificationChannel> channels = new EnumMap<>(ChannelType.class);

    public void registerChannel(ChannelType type, NotificationChannel channel) {
        channels.put(type, channel);
    }

    public boolean dispatch(Notification notification) {
        NotificationChannel channel = channels.get(notification.getChannelType());
        if (channel == null) throw new IllegalArgumentException("Unsupported channel");
        return channel.send(notification);
    }
}
```""",
        "relatedPatternIds": ["strategy", "factory-method", "observer"],
        "commonMistakes": [
            "Hardcoding `if (type == SMS) sendTwilio()` blocks inside business services.",
            "Synchronously blocking user registration threads waiting for external SMS vendor HTTP roundtrips."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_service": make_node("n_service", "NotificationService", "class",
                    [("-", "channels", "Map<ChannelType, NotificationChannel>")],
                    [("+", "dispatch", "boolean", "n: Notification"), ("+", "registerChannel", "void", "t: ChannelType, c: NotificationChannel")],
                    50, 80),
                "n_channel": make_node("n_channel", "NotificationChannel", "interface",
                    [],
                    [("+", "send", "boolean", "n: Notification")],
                    420, 80),
                "n_email": make_node("n_email", "EmailChannel", "class",
                    [("-", "smtpHost", "String")],
                    [("+", "send", "boolean", "n: Notification")],
                    250, 280),
                "n_sms": make_node("n_sms", "SmsChannel", "class",
                    [("-", "twilioClient", "Object")],
                    [("+", "send", "boolean", "n: Notification")],
                    480, 280),
                "n_push": make_node("n_push", "PushChannel", "class",
                    [("-", "fcmToken", "String")],
                    [("+", "send", "boolean", "n: Notification")],
                    710, 280)
            },
            "edges": {
                "e1": make_edge("e1", "n_service", "n_channel", "association", "delegates to (1..*)"),
                "e2": make_edge("e2", "n_email", "n_channel", "implementation"),
                "e3": make_edge("e3", "n_sms", "n_channel", "implementation"),
                "e4": make_edge("e4", "n_push", "n_channel", "implementation")
            }
        }
    },

    # 10. Job Scheduler / Task Queue
    {
        "id": "job-scheduler",
        "title": "Job Scheduler / Task Queue",
        "difficulty": "hard",
        "tags": ["oop", "command", "observer", "concurrency"],
        "summary": "Design an in-process thread-safe task scheduler supporting one-time delayed tasks, recurring fixed-rate jobs, cron expressions, and prioritized worker execution.",
        "requirements": [
            "Support scheduling one-time tasks with execution delay $\\Delta t$.",
            "Support scheduling recurring tasks with fixed interval delay or cron expressions.",
            "Execute scheduled tasks across a bounded worker thread pool.",
            "Support task cancellation and priority execution (High > Normal > Low).",
            "Handle task exceptions without killing scheduler supervisor threads."
        ],
        "constraints": [
            "Scheduler must not busy-wait in a high-CPU loop; use blocking wait until next due task.",
            "Graceful shutdown must drain executing jobs without abrupt thread termination."
        ],
        "hints": [
            "Use a `PriorityBlockingQueue<ScheduledTask>` ordered by `scheduledExecutionTime`.",
            "Worker supervisor thread sleeps until `queue.peek().getExecutionTime() - System.currentTimeMillis()`."
        ],
        "keyEntities": [
            "JobScheduler",
            "Job",
            "ScheduledTask",
            "ExecutionStrategy",
            "WorkerThreadPool"
        ],
        "selfReviewChecklist": [
            "Does the scheduler prevent busy-waiting when no tasks are due?",
            "Are task commands executed independently across thread pool workers?",
            "Can tasks be safely cancelled before their execution time arrives?"
        ],
        "referenceNotes": """### DelayQueue Worker Engine

```java
public interface Job {
    void execute();
}

public class ScheduledTask implements Comparable<ScheduledTask> {
    private final String taskId;
    private final Job job;
    private final long executionTime;
    private volatile boolean cancelled = false;

    public ScheduledTask(String taskId, Job job, long executionTime) {
        this.taskId = taskId; this.job = job; this.executionTime = executionTime;
    }
    public void cancel() { this.cancelled = true; }
    public boolean isCancelled() { return cancelled; }
    public void run() { if (!cancelled) job.execute(); }

    @Override
    public int compareTo(ScheduledTask other) {
        return Long.compare(this.executionTime, other.executionTime);
    }
}
```""",
        "relatedPatternIds": ["command", "observer"],
        "commonMistakes": [
            "Polling the queue in an unbounded `while(true) { check(); }` loop, consuming 100% CPU.",
            "Uncaught exceptions in a user job terminating the primary scheduling thread."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_scheduler": make_node("n_scheduler", "JobScheduler", "class",
                    [("-", "taskQueue", "PriorityBlockingQueue<ScheduledTask>"), ("-", "workerPool", "ExecutorService")],
                    [("+", "schedule", "String", "job: Job, delayMs: long"), ("+", "cancel", "boolean", "taskId: String")],
                    50, 80),
                "n_job": make_node("n_job", "Job", "interface",
                    [],
                    [("+", "execute", "void", "")],
                    420, 80),
                "n_task": make_node("n_task", "ScheduledTask", "class",
                    [("-", "job", "Job"), ("-", "executionTime", "long"), ("-", "isCancelled", "boolean")],
                    [("+", "run", "void", ""), ("+", "cancel", "void", "")],
                    700, 80),
                "n_emailjob": make_node("n_emailjob", "EmailDigestJob", "class",
                    [("-", "userId", "String")],
                    [("+", "execute", "void", "")],
                    420, 280)
            },
            "edges": {
                "e1": make_edge("e1", "n_scheduler", "n_task", "aggregation", "schedules (0..*)"),
                "e2": make_edge("e2", "n_task", "n_job", "association", "executes"),
                "e3": make_edge("e3", "n_emailjob", "n_job", "implementation")
            }
        }
    },

    # 11. In-Memory Cache with TTL
    {
        "id": "in-memory-ttl-cache",
        "title": "In-Memory Cache with TTL",
        "difficulty": "medium",
        "tags": ["oop", "strategy", "singleton", "concurrency"],
        "summary": "Design a thread-safe in-memory key-value cache supporting Time-To-Live (TTL) expiration, passive on-access eviction, and active background cleanup.",
        "requirements": [
            "Support basic cache operations: `get(key)`, `put(key, value, ttlMs)`, `remove(key)`.",
            "Enforce lazy/passive TTL expiration on `get()`: return `null` and evict key if TTL has expired.",
            "Implement active background periodic cleanup thread to prevent memory leaks from unread expired keys.",
            "Thread-safe reads and writes using fine-grained locking or ReadWriteLock."
        ],
        "constraints": [
            "Background cleaner thread must not block cache reads.",
            "Memory usage should be bounded."
        ],
        "hints": [
            "Wrap values in a `CacheEntry<V>` holding value and `expiryTime = now + ttl`.",
            "Use `ReentrantReadWriteLock` to allow multiple concurrent readers while serializing writes."
        ],
        "keyEntities": [
            "TtlCache",
            "CacheEntry",
            "EvictionStrategy",
            "TtlExpiryCleaner",
            "ReadWriteLock"
        ],
        "selfReviewChecklist": [
            "Does `get()` check for expired TTL before returning the cached value?",
            "Is there an active cleaner thread purging expired entries that are never queried again?",
            "Are read operations concurrent via ReadWriteLock?"
        ],
        "referenceNotes": """### Dual Passive and Active TTL Eviction Strategy

```java
public class TtlCache<K, V> {
    private static class CacheEntry<V> {
        final V value;
        final long expiryTime;
        CacheEntry(V value, long ttlMs) {
            this.value = value;
            this.expiryTime = System.currentTimeMillis() + ttlMs;
        }
        boolean isExpired() { return System.currentTimeMillis() > expiryTime; }
    }

    private final Map<K, CacheEntry<V>> store = new ConcurrentHashMap<>();

    public V get(K key) {
        CacheEntry<V> entry = store.get(key);
        if (entry == null) return null;
        if (entry.isExpired()) {
            store.remove(key); // passive eviction
            return null;
        }
        return entry.value;
    }

    public void put(K key, V value, long ttlMs) {
        store.put(key, new CacheEntry<>(value, ttlMs));
    }

    // Active cleanup method run by scheduled background executor
    public void cleanupExpired() {
        long now = System.currentTimeMillis();
        store.entrySet().removeIf(e -> e.getValue().expiryTime < now);
    }
}
```""",
        "relatedPatternIds": ["strategy", "singleton"],
        "commonMistakes": [
            "Relying solely on passive eviction: if keys are never accessed again, memory leaks indefinitely.",
            "Running active cleanup with `synchronized(this)`, freezing all readers during sweep."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_cache": make_node("n_cache", "TtlCache", "class",
                    [("-", "store", "Map<K, CacheEntry<V>>"), ("-", "cleaner", "TtlExpiryCleaner")],
                    [("+", "get", "V", "key: K"), ("+", "put", "void", "k: K, v: V, ttlMs: long"), ("+", "remove", "void", "k: K")],
                    50, 80),
                "n_entry": make_node("n_entry", "CacheEntry", "class",
                    [("-", "value", "V"), ("-", "expiryTime", "long")],
                    [("+", "isExpired", "boolean", "")],
                    420, 80),
                "n_cleaner": make_node("n_cleaner", "TtlExpiryCleaner", "class",
                    [("-", "intervalMs", "long")],
                    [("+", "clean", "void", "c: TtlCache")],
                    720, 80)
            },
            "edges": {
                "e1": make_edge("e1", "n_cache", "n_entry", "composition", "stores (0..*)"),
                "e2": make_edge("e2", "n_cache", "n_cleaner", "association", "scheduled by")
            }
        }
    },

    # 12. Pub-Sub System
    {
        "id": "pub-sub-system",
        "title": "Pub-Sub System",
        "difficulty": "hard",
        "tags": ["oop", "observer", "singleton", "concurrency"],
        "summary": "Design an in-memory topic-based Publish-Subscribe broker supporting multiple publishers, topic subscriptions, push/pull delivery, and subscriber offsets.",
        "requirements": [
            "Support topic creation, subscriber registration, and message publishing.",
            "Deliver published messages to all active topic subscribers (fan-out).",
            "Allow subscribers to consume messages asynchronously without blocking the publisher thread.",
            "Support both push delivery (dispatch to subscriber callback) and pull delivery (subscriber pulls next offset)."
        ],
        "constraints": [
            "A slow subscriber must not block message delivery to other faster subscribers on the same topic."
        ],
        "hints": [
            "Use the Observer Pattern: Topic maintains a list of Subscriber observers.",
            "Give each subscriber an isolated message queue (`BlockingQueue<Message>`) so slow consumers don't block the broker."
        ],
        "keyEntities": [
            "PubSubBroker",
            "Topic",
            "Subscriber",
            "Publisher",
            "Message",
            "PushDispatcher"
        ],
        "selfReviewChecklist": [
            "Does each subscriber maintain independent message delivery isolation?",
            "Can multiple publishers write concurrently to the same topic safely?",
            "Is publisher throughput protected from slow subscriber latency?"
        ],
        "referenceNotes": """### Isolated Subscriber Queues with Dispatcher Threads

```java
public interface Subscriber {
    String getId();
    void onMessage(Message message);
}

public class Topic {
    private final String name;
    private final List<Message> messageLog = new CopyOnWriteArrayList<>();
    private final Set<Subscriber> subscribers = ConcurrentHashMap.newKeySet();

    public Topic(String name) { this.name = name; }
    public void addSubscriber(Subscriber s) { subscribers.add(s); }
    public void publish(Message msg) {
        messageLog.add(msg);
        for (Subscriber s : subscribers) {
            CompletableFuture.runAsync(() -> s.onMessage(msg));
        }
    }
}

public class PubSubBroker {
    private final ConcurrentHashMap<String, Topic> topics = new ConcurrentHashMap<>();
    public Topic getOrCreateTopic(String name) {
        return topics.computeIfAbsent(name, Topic::new);
    }
}
```""",
        "relatedPatternIds": ["observer", "singleton"],
        "commonMistakes": [
            "Invoking subscriber handlers synchronously inside `publish()`, allowing one hanging subscriber to hang all publishing.",
            "Failing to support thread-safe subscriber registration during active broadcasts."
        ],
        "referenceDiagram": {
            "nodes": {
                "n_broker": make_node("n_broker", "PubSubBroker", "class",
                    [("-", "topics", "Map<String, Topic>")],
                    [("+", "createTopic", "Topic", "name: String"), ("+", "publish", "void", "topic: String, msg: Message")],
                    50, 80),
                "n_topic": make_node("n_topic", "Topic", "class",
                    [("-", "name", "String"), ("-", "subscribers", "List<Subscriber>")],
                    [("+", "publish", "void", "msg: Message"), ("+", "subscribe", "void", "s: Subscriber")],
                    420, 80),
                "n_sub": make_node("n_sub", "Subscriber", "interface",
                    [],
                    [("+", "onMessage", "void", "msg: Message")],
                    720, 80),
                "n_msg": make_node("n_msg", "Message", "class",
                    [("-", "id", "String"), ("-", "payload", "String"), ("-", "timestamp", "long")],
                    [("+", "getPayload", "String", "")],
                    420, 280)
            },
            "edges": {
                "e1": make_edge("e1", "n_broker", "n_topic", "composition", "manages (0..*)"),
                "e2": make_edge("e2", "n_topic", "n_sub", "association", "fans out to (0..*)"),
                "e3": make_edge("e3", "n_topic", "n_msg", "association", "contains (0..*)")
            }
        }
    }
]

# Validation
print("Validating 12 new problems...")
for p in new_problems:
    errs = validate_diagram(p["referenceDiagram"])
    if errs:
        print(f"Error in {p['id']}: {errs}")
        raise ValueError(f"Validation failed for {p['id']}")
    else:
        print(f"  OK: {p['id']} - diagram valid with 0 warnings")

# Read existing
with open("bluprnt-client/public/content/lld-problems.json") as f:
    existing_problems = json.load(f)

existing_ids = {p["id"] for p in existing_problems}
added = 0
for p in new_problems:
    if p["id"] not in existing_ids:
        existing_problems.append(p)
        added += 1

print(f"Added {added} new problems. Total now: {len(existing_problems)}")

with open("bluprnt-client/public/content/lld-problems.json", "w") as f:
    json.dump(existing_problems, f, indent=2)

print("Saved updated lld-problems.json successfully!")
