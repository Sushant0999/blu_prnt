import json
import os

LESSONS_DIR = "bluprnt-client/public/content/lessons"
os.makedirs(LESSONS_DIR, exist_ok=True)

remaining_lessons = [
    # Course 2: Network & Ingress
    {
        "id": "load-balancers",
        "title": "Load Balancers & Traffic Routing Algorithms",
        "intro": "Load balancers distribute incoming network traffic across a cluster of backend servers to ensure no single server becomes an overwhelmed bottleneck.",
        "objectives": [
            "Differentiate Layer 4 (Transport/NLB) from Layer 7 (Application/ALB) load balancing.",
            "Compare Round Robin, Weighted, Least Connections, and IP Hash algorithms.",
            "Configure active health checks and seamless zero-downtime connection draining."
        ],
        "body": "### Layer 4 vs Layer 7 Load Balancing\n- **Layer 4 (Transport Layer - TCP/UDP)**: Routes packets based purely on IP and port without decrypting or inspecting payload content. Achieves ultra-low microsecond latency and millions of packets per second (e.g. AWS NLB, IPVS).\n- **Layer 7 (Application Layer - HTTP/HTTPS)**: Decrypts TLS and inspects HTTP headers, cookies, URL paths, and query parameters. Enables content-based routing, path-based dispatching (`/api/v1/orders` vs `/api/v1/auth`), and header-based rate limiting (e.g. Nginx, Envoy, AWS ALB).\n\n### Common Routing Algorithms\n1. **Round Robin**: Distributes requests sequentially across identical servers.\n2. **Weighted Round Robin**: Allocates proportional request shares based on server CPU/RAM capacity weights.\n3. **Least Connections**: Dispatches incoming requests to the server currently handling the fewest active connections. Optimal for long-lived WebSocket or database sessions.\n4. **Consistent Hashing**: Routes requests using client IP or session ID tokens to maintain cache locality.",
        "keyIdea": "Use Layer 4 for lightning-fast raw packet forwarding at the edge; use Layer 7 for intelligent microservice routing, TLS termination, and auth offload.",
        "sim": "load-balancer",
        "diagramType": "loadbalancer",
        "concepts": [
            {"title": "Active vs Passive Health Checks", "body": "Active probes periodically query health endpoints (e.g. HTTP GET /healthz). Passive checks monitor live request status codes, ejecting nodes on consecutive 5xx errors."},
            {"title": "Connection Draining (Deregistration Delay)", "body": "Allows in-flight requests to complete gracefully while stopping new traffic to terminating or redeploying instances."}
        ],
        "examples": ["AWS ALB routing path-based requests to ECS container clusters.", "Nginx reverse proxy load balancing upstream Node.js processes."],
        "resources": [{"title": "Envoy Proxy Architecture Guide", "url": "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/arch_overview"}],
        "quiz": [
            {"id": "q1", "prompt": "Which routing algorithm is most effective when request execution durations vary widely?", "options": ["Round Robin", "Least Connections", "Random Selection", "Static Port Mapping"], "correct": 1, "explanation": "Least Connections prevents request accumulation on servers bogged down by long-running transactions."}
        ]
    },
    {
        "id": "cdn-edge",
        "title": "Content Delivery Networks (CDN)",
        "intro": "A Content Delivery Network (CDN) is a globally distributed network of Point of Presence (PoP) edge servers that caches assets close to end users.",
        "objectives": [
            "Evaluate Anycast GeoDNS routing and BGP latency optimization.",
            "Formulate cache invalidation strategies using surrogate keys and versioned URLs.",
            "Leverage stale-while-revalidate and origin shielding to eliminate origin stampedes."
        ],
        "body": "### How CDNs Slash Latency\nTranscontinental internet latency is bounded by the speed of light in fiber (~5ms per 1,000 km). Round-trips between Tokyo and Virginia take ~160ms. By caching static assets (images, JavaScript, CSS) and pre-rendered API responses at regional Edge PoPs, response times drop to < 15ms.\n\n### Origin Shielding & Tiered Caching\nWhen hundreds of regional PoPs miss simultaneously, the origin server faces a devastating stampede. An **Origin Shield** introduces an intermediate parent cache tier that consolidates regional edge misses, collapsing 100 origin queries into a single origin request.",
        "keyIdea": "The fastest request is the one that never hits your datacenter. Offload 90%+ of ingress traffic at the edge using Anycast and surrogate caching headers.",
        "concepts": [
            {"title": "Anycast Routing", "body": "Multiple physical PoPs across the globe advertise the exact same IP address via BGP. Internet routers automatically route client packets to the topologically closest PoP."},
            {"title": "Stale-While-Revalidate", "body": "Edge immediately returns cached stale data to the client while asynchronously fetching fresh content from the origin in the background."}
        ],
        "examples": ["Cloudflare Edge caching dynamic responses with Cache-Tag invalidation.", "Netflix Open Connect CDN appliances deployed directly inside ISP datacenters."],
        "resources": [{"title": "RFC 5861 - HTTP Cache-Control Extensions", "url": "https://datatracker.ietf.org/doc/html/rfc5861"}],
        "quiz": [
            {"id": "q1", "prompt": "What does an Origin Shield protect against?", "options": ["DDoS attacks on client browsers", "Cache misses across hundreds of regional PoPs swamping the primary backend database", "SSL certificate expiration", "BGP route poisoning"], "correct": 1, "explanation": "An Origin Shield aggregates cache misses across edge PoPs so the primary origin receives only one consolidated fetch."}
        ]
    },
    {
        "id": "api-gateway",
        "title": "API Gateway & Reverse Proxies",
        "intro": "An API Gateway acts as the single entry point for client applications, orchestrating routing, protocol translation, authentication, and cross-cutting security.",
        "objectives": [
            "Implement centralized authentication, TLS termination, and distributed rate limiting.",
            "Apply the Backend-For-Frontend (BFF) architectural pattern for mobile and web clients.",
            "Configure canary traffic splitting and circuit-breaking at the edge tier."
        ],
        "body": "### Responsibilities of an API Gateway\nIn a microservices architecture, exposing dozens of internal services directly to mobile or web clients creates tight coupling, security vulnerabilities, and network chattiness. An API Gateway encapsulates internal microservice topology:\n- **Security**: Terminating TLS, validating OAuth2 / JWT bearer tokens, and blocking malicious payloads.\n- **Rate Limiting**: Enforcing token-bucket throttles by IP or API key before requests touch compute tiers.\n- **Protocol Translation**: Translating external REST/JSON HTTP requests into high-speed internal gRPC Protobuf calls.\n- **Canary Routing**: Shifting 5% of user traffic to experimental service versions using header rules.",
        "keyIdea": "Centralize cross-cutting concerns (auth, rate limiting, telemetry) at the API Gateway so microservices can focus purely on business logic.",
        "concepts": [
            {"title": "Backend-for-Frontend (BFF)", "body": "Dedicated lightweight gateways tailored for specific client formats (e.g. mobile BFF optimizing payload size vs desktop web BFF)."},
            {"title": "Request Aggregation", "body": "The gateway calls multiple downstream microservices in parallel and merges the responses into a single combined payload for mobile clients."}
        ],
        "examples": ["Kong / Envoy API Gateway validating JWTs and enforcing Redis rate limits."],
        "resources": [{"title": "Pattern: API Gateway (Chris Richardson)", "url": "https://microservices.io/patterns/apigateway.html"}],
        "quiz": [
            {"id": "q1", "prompt": "What architectural pattern creates distinct gateway instances tailored specifically for web vs mobile clients?", "options": ["Service Mesh", "Backend-For-Frontend (BFF)", "Strangler Fig", "CQRS"], "correct": 1, "explanation": "BFF creates client-specific gateways so mobile payloads can be aggressively trimmed for cellular networks."}
        ]
    },
    {
        "id": "api-protocols",
        "title": "REST vs gRPC vs GraphQL",
        "intro": "Selecting the optimal communication protocol between clients, gateways, and internal services defines network bandwidth efficiency, schema contracts, and developer velocity.",
        "objectives": [
            'Compare REST (HTTP/1.1 JSON), gRPC (HTTP/2 Protobuf), and GraphQL (declarative queries).',
            'Evaluate payload serialization benchmarks: JSON text parsing vs Protobuf binary encoding.',
            'Mitigate the GraphQL N+1 database problem using DataLoader batching.'
        ],
        "body": "### Protocol Comparison Matrix\n\n| Feature | REST | gRPC | GraphQL |\n| :--- | :--- | :--- | :--- |\n| **Transport** | HTTP/1.1 or HTTP/2 | HTTP/2 Multiplexed | HTTP/1.1 or HTTP/2 |\n| **Data Format** | JSON (Text) | Protocol Buffers (Binary) | JSON (Text) |\n| **Schema Contract** | OpenAPI (Optional) | Strict `.proto` files (Enforced) | GraphQL Schema AST |\n| **Performance** | Moderate (Text parsing) | Ultra-Fast (Binary, compact) | Moderate (Query parsing AST) |\n| **Best Used For** | Public 3rd-party APIs | Internal Microservices | Complex UI / Mobile Apps |\n\n### Why gRPC Dominates Internal Microservices\nProtocol Buffers serializes data into dense binary streams up to 80% smaller than JSON. Because fields are mapped by numeric integer tags rather than text string keys, CPU serialization and deserialization overhead is reduced by $5\\times$ to $10\\times$.",
        "keyIdea": "Use gRPC for high-throughput, low-latency service-to-service calls; use REST for public developer APIs; use GraphQL for rich, client-driven UI applications.",
        "concepts": [
            {"title": "Over-fetching and Under-fetching", "body": "REST endpoints often return superfluous data (over-fetching) or require multiple round-trips to assemble a view (under-fetching). GraphQL solves this by letting clients declare exact required fields."},
            {"title": "DataLoader", "body": "A batching and caching utility that coalesces individual database queries into a single `SELECT WHERE id IN (...)`, eliminating the N+1 problem."}
        ],
        "examples": ["Netflix transitioning internal service communication from REST to gRPC for microsecond efficiency."],
        "resources": [{"title": "gRPC Documentation & Benchmarks", "url": "https://grpc.io/docs/"}],
        "quiz": [
            {"id": "q1", "prompt": "Why is gRPC significantly faster than standard REST over JSON?", "options": ["It encrypts data with 512-bit keys", "Binary Protobuf encoding and HTTP/2 stream multiplexing slash serialization and network overhead", "It runs over UDP instead of TCP", "It eliminates database queries completely"], "correct": 1, "explanation": "Binary Protocol Buffers serialization and HTTP/2 multiplexing eliminate text parsing overhead and connection churn."}
        ]
    },

    # Course 3: Storage, Caching & Streaming
    {
        "id": "sql-vs-nosql",
        "title": "SQL vs NoSQL Data Stores",
        "intro": "Choosing between Relational (SQL) and Non-Relational (NoSQL) storage engines shapes transaction semantics, query capabilities, and horizontal scaling limits.",
        "objectives": [
            "Analyze ACID transactional guarantees vs BASE (Basically Available, Soft-state, Eventual consistency).",
            "Classify NoSQL families: Key-Value, Document, Wide-Column, Graph, and Columnar OLAP.",
            "Determine when to choose relational schemas vs denormalized document models."
        ],
        "body": "### Taxonomy of Database Engines\n1. **Relational (RDBMS)**: PostgreSQL, MySQL. Rigid relational schemas, joins, B-Tree indexes, and ACID transactions. Difficult to scale writes horizontally beyond a single primary node.\n2. **Key-Value**: Redis, DynamoDB. Extreme throughput ($O(1)$ lookups) by partition key. Zero relational joins.\n3. **Document**: MongoDB, Couchbase. Semi-structured JSON documents. Ideal for polymorphic schemas and hierarchical data.\n4. **Wide-Column (LSM)**: Apache Cassandra, ScyllaDB. Partition key + clustering column. High write throughput, scalable across global masterless clusters.\n5. **Columnar OLAP**: ClickHouse, Snowflake. Organizes data by column rather than row, enabling lightning-fast analytical aggregation across billions of records.",
        "keyIdea": "Default to PostgreSQL for transactional integrity and complex relational queries. Adopt NoSQL when write volume, global replication, or specific data shapes (graphs, timeseries) exceed RDBMS limits.",
        "concepts": [
            {"title": "B-Tree vs LSM-Tree", "body": "B-Trees optimize for random reads with in-place page updates ($O(\\log N)$). LSM-Trees optimize for write throughput with sequential appends and background compaction."},
            {"title": "Denormalization", "body": "Duplicating data across documents to eliminate expensive cross-node joins at query time."}
        ],
        "examples": ["Stripe using PostgreSQL for transaction ledgers; Uber using Cassandra for driver location histories."],
        "resources": [{"title": "Database Internals (Alex Petrov)", "url": "https://www.databass.dev/"}],
        "quiz": [
            {"id": "q1", "prompt": "Which database engine family is best optimized for high-volume analytical aggregations (e.g. SUM, AVG) across billions of historical records?", "options": ["Relational OLTP (MySQL)", "Document Store (MongoDB)", "Columnar OLAP (ClickHouse)", "Graph Database (Neo4j)"], "correct": 2, "explanation": "Columnar storage reads only the relevant columns from disk into memory, delivering orders of magnitude faster analytics."}
        ]
    },
    {
        "id": "message-queues",
        "title": "Message Queues & Event-Driven Architecture",
        "intro": "Message queues decouple distributed producers and consumers, smoothing out spiky workloads, absorbing traffic surges, and guaranteeing reliable asynchronous processing.",
        "objectives": [
            "Contrast point-to-point queues (RabbitMQ, SQS) with append-only distributed event logs (Kafka).",
            "Formulate message delivery guarantees: At-Least-Once, At-Most-Once, and Exactly-Once (Idempotency).",
            "Implement Dead Letter Queues (DLQ) and exponential retry policies."
        ],
        "body": "### Why Asynchronous Messaging Matters\nSynchronous HTTP request-reply chains couple services together: if service $C$ is slow or down, services $A$ and $B$ block, exhausting worker threads and causing cascading outages. Message queues decouple this pipeline:\n- **Buffering (Leaky Bucket)**: Queue absorbs a 10x traffic spike while background workers consume at a steady, sustainable pace.\n- **Temporal Decoupling**: Producers can emit messages even if consumer workers are temporarily offline for deployment.\n- **Dead Letter Queue (DLQ)**: Poison pill messages that fail repeatedly after max retries are quarantined for developer inspection without clogging the main queue.",
        "keyIdea": "Decouple synchronous HTTP chains with asynchronous queues. Treat delivery as 'At-Least-Once' and make all consumer handlers idempotent.",
        "sim": "messageQueue",
        "diagramType": "queue",
        "concepts": [
            {"title": "Backpressure", "body": "Signaling producers to slow down when downstream consumer queues exceed memory or latency thresholds."},
            {"title": "Poison Pill Messages", "body": "Malformed messages that crash consumer processes upon receipt, requiring quarantine via DLQs."}
        ],
        "examples": ["AWS SQS triggering Lambda workers for background video transcode jobs."],
        "resources": [{"title": "Enterprise Integration Patterns", "url": "https://www.enterpriseintegrationpatterns.com/"}],
        "quiz": [
            {"id": "q1", "prompt": "What is the purpose of a Dead Letter Queue (DLQ)?", "options": ["To permanently delete expired messages", "To isolate unprocessable messages after repeated retries without halting the pipeline", "To prioritize VIP customer transactions", "To replicate messages across AWS regions"], "correct": 1, "explanation": "A DLQ captures poison pill messages that fail processing repeatedly, allowing normal traffic to continue unblocked."}
        ]
    },
    {
        "id": "kafka-architecture",
        "title": "Apache Kafka (Topics, Partitions, Consumer Groups)",
        "intro": "Apache Kafka is a distributed event streaming platform built as an append-only commit log, supporting millions of events per second with strict per-partition ordering.",
        "objectives": [
            "Deconstruct Kafka's fundamental storage unit: the partitioned append-only commit log.",
            "Analyze consumer group rebalancing and distributed partition assignment.",
            "Achieve zero-copy high throughput using Linux sendfile and sequential disk I/O."
        ],
        "body": "### Partitioning & Order Guarantees\nA Kafka Topic is divided into multiple **Partitions**. Kafka guarantees strict total ordering **only within a single partition**, not across partitions. Producers specify a Partition Key (e.g. `order_id` or `user_id`); all records sharing the same key are guaranteed to land on the same partition via hash mod:\n\n$$\\text{partition} = \\text{hash}(\\text{key}) \\pmod{\\text{numPartitions}}$$\n\n### Consumer Groups & Scalability\nA Consumer Group represents a single logical subscriber. Each partition in a topic is consumed by exactly **one** consumer instance in the group at any given time. If you have 8 partitions, having more than 8 consumer instances in the group leaves the excess consumers idle.",
        "keyIdea": "Kafka treats disk as an append-only log, exploiting sequential I/O and OS page caches to outperform in-memory brokers at scale.",
        "sim": "messageQueue",
        "diagramType": "kafka",
        "concepts": [
            {"title": "Zero-Copy Data Transfer", "body": "Kafka uses the `sendfile()` system call to transfer bytes directly from OS page cache to the network socket, bypassing user-space memory buffers."},
            {"title": "In-Sync Replicas (ISR)", "body": "The set of broker replicas that are fully caught up with the partition leader's commit log."}
        ],
        "examples": ["Uber streaming trillions of daily driver telemetry pings through Kafka clusters into Apache Flink."],
        "resources": [{"title": "Kafka: The Definitive Guide (Narkhede et al.)", "url": "https://www.confluent.io/resources/kafka-the-definitive-guide/"}],
        "quiz": [
            {"id": "q1", "prompt": "If a Kafka topic has 6 partitions and a consumer group has 10 worker instances, how many workers will actively consume data?", "options": ["All 10 workers evenly", "6 workers (4 will remain idle)", "Only 1 leader worker", "12 workers via hyper-threading"], "correct": 1, "explanation": "Each partition is assigned to at most one consumer in a group. Excess consumers beyond the partition count remain idle."}
        ]
    },
    {
        "id": "key-value-store",
        "title": "Distributed Key-Value Store",
        "intro": "Master the design of a globally distributed, fault-tolerant key-value store modeled on Amazon's foundational Dynamo paper.",
        "objectives": [
            "Implement consistent hashing with virtual nodes for uniform data distribution.",
            "Formulate quorum read/write equations ($R + W > N$) for tunable consistency.",
            "Resolve concurrent write conflicts using Vector Clocks and Read Repair."
        ],
        "body": "### The Dynamo Architecture Playbook\nA distributed key-value store provides two simple operations: `get(key)` and `put(key, value)`, but scales across thousands of nodes worldwide:\n- **Partitioning**: Consistent Hashing Ring with virtual nodes (vnodes) to prevent hot-spot skew.\n- **Replication**: The coordinator node replicates keys to the $N$ successive physical nodes clockwise on the ring.\n- **Tunable Quorum**: Configure replica count $N$, read quorum $R$, and write quorum $W$. When $R + W > N$, the read quorum is mathematically guaranteed to overlap with the write quorum by at least one node, providing strong consistency.\n- **Sloppy Quorum & Hinted Handoff**: If designated replica nodes are temporarily unreachable during network partitioning, healthy peer nodes temporarily accept writes and hand them back once the primary recovers.",
        "keyIdea": "Tunable quorums ($R + W > N$) allow engineers to dynamically dial between sub-millisecond write latency ($W=1$) and strict read consistency ($R+W>N$).",
        "sim": "consistent-hashing",
        "diagramType": "dynamo",
        "concepts": [
            {"title": "Read Repair", "body": "When a client reads from $R$ nodes and detects conflicting version timestamps, the coordinator immediately writes the latest version back to the stale nodes in the background."},
            {"title": "Anti-Entropy with Merkle Trees", "body": "Nodes compare cryptographic hash trees of their key ranges to synchronize missing data with minimal network payload transfer."}
        ],
        "examples": ["Amazon DynamoDB and Apache Cassandra distributed storage engines."],
        "resources": [{"title": "Dynamo: Amazon's Highly Available Key-value Store", "url": "https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html"}],
        "quiz": [
            {"id": "q1", "prompt": "In a distributed key-value store with replication factor N=3, what values of R (read quorum) and W (write quorum) guarantee strong consistency?", "options": ["R=1, W=1", "R=1, W=2", "R=2, W=2", "R=3, W=0"], "correct": 2, "explanation": "When R=2 and W=2, R + W = 4 > 3 (N), guaranteeing that the read set intersects with at least one node from the write set."}
        ]
    },

    # Course 4: Classic System Designs
    {
        "id": "url-shortener",
        "title": "Global URL Shortener (TinyURL)",
        "intro": "Design a globally available URL shortener that converts long web URLs into compact 7-character aliases at 100:1 read-to-write scale.",
        "objectives": [
            "Generate short keys using Base62 bijective encoding over 64-bit distributed IDs.",
            "Evaluate 301 Permanent Redirect (browser caches, zero server load) vs 302 Temporary Redirect (analytics tracking).",
            "Cache top 20% hot links in Redis to satisfy 99% of read requests sub-millisecond."
        ],
        "body": "### Capacity & Math\n- **Write Traffic**: 100M URLs created/day $\\approx 1,160$ write QPS.\n- **Read Traffic**: 100:1 read-write ratio $\\approx 116,000$ read QPS.\n- **Key Space**: Using alphanumeric characters $[a-z, A-Z, 0-9]$ gives 62 symbols. A 7-character short URL supports:\n\n$$62^7 \\approx 3.52 \\times 10^{12} \\text{ (3.5 Trillion unique URLs)}$$\n\n### Encoding Strategy\nAvoid hashing (MD5/SHA256 truncated) as it produces hash collisions requiring expensive database existence lookups. Instead, use a **Distributed ID Generator** (Snowflake or counter range allocation) to obtain a globally unique 64-bit integer, and convert it directly to Base62 string representation.",
        "keyIdea": "Use a distributed unique ID generator combined with Base62 encoding to eliminate hash collisions completely. Offload 99% of reads using Redis and CDN edge caching.",
        "diagramType": "urlshortener",
        "concepts": [
            {"title": "301 vs 302 Redirection", "body": "301 redirects are cached permanently by browsers (bypassing your servers on subsequent clicks). 302 redirects force requests through your server every time, essential for click tracking and analytics."},
            {"title": "Cache Eviction", "body": "Standard LRU cache retaining the most recently accessed links handles skewed virality distributions perfectly."}
        ],
        "examples": ["bit.ly and t.co shortening billions of links."],
        "resources": [{"title": "System Design Interview - URL Shortener", "url": "https://bytebytego.com/"}],
        "quiz": [
            {"id": "q1", "prompt": "Why is Base62 conversion of a distributed ID superior to truncating an MD5 hash?", "options": ["Base62 encrypts the original URL", "Bijective Base62 conversion guarantees zero hash collisions", "MD5 cannot support uppercase letters", "Base62 runs entirely in CPU cache"], "correct": 1, "explanation": "Converting a unique 64-bit integer to Base62 is a 1-to-1 mathematical mapping with 0% chance of collision."}
        ]
    },
    {
        "id": "unique-id-generator",
        "title": "Distributed Unique ID Generator",
        "intro": "Generate globally unique 64-bit roughly time-ordered IDs at 100,000+ QPS without central database auto-increment bottlenecks.",
        "objectives": [
            "Deconstruct Twitter Snowflake 64-bit layout (timestamp, datacenter, worker, sequence).",
            "Mitigate NTP backward clock drift in production servers.",
            "Compare UUIDv4 vs Snowflake for relational database B-tree index locality."
        ],
        "body": "### The Twitter Snowflake Layout\nA 64-bit integer fitting standard SQL `BIGINT` primary keys:\n- **1 sign bit**: Always 0 (positive integer).\n- **41-bit Timestamp**: Milliseconds elapsed since a custom epoch (e.g. Nov 2024). $2^{41}$ ms $\\approx 69$ years of lifespan.\n- **5-bit Datacenter ID**: Supports up to 32 datacenters.\n- **5-bit Worker ID**: Supports up to 32 worker machines per datacenter (1,024 total nodes).\n- **12-bit Sequence Counter**: Increments for IDs generated within the exact same millisecond ($2^{12} = 4,096$ IDs/ms per worker $\\approx 4.09$ million IDs/sec per machine).",
        "keyIdea": "Roughly time-ordered 64-bit IDs preserve database B-tree index insertion locality and eliminate locking across distributed nodes.",
        "diagramType": "snowflake",
        "concepts": [
            {"title": "B-Tree Locality vs UUIDv4", "body": "Random 128-bit UUIDv4 scatters inserts across random B-tree pages, triggering massive disk I/O page thrashing. Snowflake IDs insert sequentially at the end of the B-tree leaf pages."},
            {"title": "Clock Skew Mitigation", "body": "If NTP jumps system time backward, the generator detects `current_time < last_timestamp` and pauses until the clock catches up, or throws a hardware clock alert."}
        ],
        "examples": ["Discord utilizing Snowflake IDs for all messages and channels."],
        "resources": [{"title": "Twitter Snowflake Announcement", "url": "https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake"}],
        "quiz": [
            {"id": "q1", "prompt": "Why does UUIDv4 degrade database insertion throughput compared to Snowflake IDs?", "options": ["UUIDs are stored as encrypted blobs", "Randomness in UUIDv4 causes B-Tree page splits and random disk I/O thrashing", "UUIDs cannot be indexed in SQL", "UUID generation requires synchronous network RPCs"], "correct": 1, "explanation": "UUIDv4 random values force writes into arbitrary pages throughout the B-tree, causing frequent page splits and cache misses."}
        ]
    },
    {
        "id": "notification-service",
        "title": "Notification Service at Scale",
        "intro": "Design an enterprise notification dispatch platform distributing billions of notifications across Mobile Push (FCM/APNs), SMS, and Email.",
        "objectives": [
            "Architect prioritized queue tiers (Transactional/OTP > Marketing/Bulk).",
            "Implement multi-vendor failover routing and deduplication.",
            "Enforce user opt-out preferences and frequency-capping rate limiters."
        ],
        "body": "### Architecture Overview\n1. **API Ingress**: Validates sender authentication, inspects payload schema, and queries User Preferences DB (opt-out settings, quiet hours).\n2. **Prioritization Queues**: Critical notifications (2FA OTPs, fraud alerts) bypass marketing queues via dedicated high-priority workers.\n3. **Vendor Gateways**: Decoupled worker microservices interfacing with external third-party providers:\n   - iOS: Apple Push Notification service (APNs)\n   - Android: Firebase Cloud Messaging (FCM)\n   - SMS: Twilio, MessageBird (with automated multi-vendor fallback)\n   - Email: SendGrid, Amazon SES\n4. **Rate Limiting & De-duplication**: Redis sliding window limits user frequency (e.g. max 3 marketing emails/day).",
        "keyIdea": "Third-party vendors fail frequently. Isolate providers behind asynchronous queues with automated secondary vendor failover.",
        "sim": "messageQueue",
        "diagramType": "notification",
        "concepts": [
            {"title": "Idempotent Dispatch", "body": "Hashing `(user_id, event_type, event_id)` in Redis ensures double-taps by users never trigger duplicate billing SMS messages."},
            {"title": "Delivery Analytics Loop", "body": "Webhook listener receiving delivery receipts, bounce rates, and click tracking from vendors."}
        ],
        "examples": ["Uber dispatching real-time driver arrival notifications."],
        "resources": [{"title": "Designing a Notification System (System Design)", "url": "https://bytebytego.com/"}],
        "quiz": [
            {"id": "q1", "prompt": "How should a notification service protect users from being spammed by marketing campaigns?", "options": ["Disable email delivery completely", "Enforce rate limiting and frequency capping based on user preference tables in Redis", "Rely on third-party vendors to filter duplicates", "Batch all notifications once a week"], "correct": 1, "explanation": "Frequency capping tables in Redis intercept and drop or delay lower-priority marketing messages exceeding user limits."}
        ]
    },
    {
        "id": "chat-application",
        "title": "Real-Time Chat Application",
        "intro": "Design a highly scalable 1-on-1 and group chat system supporting 50M+ concurrent persistent connections, message delivery receipts, and presence tracking.",
        "objectives": [
            "Establish stateful WebSocket connection clusters with Redis Pub/Sub backbones.",
            "Design wide-column message storage (Cassandra/ScyllaDB) partitioned by conversation ID.",
            "Implement real-time online/offline presence tracking clusters."
        ],
        "body": "### Connection Tier & Message Routing\n- **Persistent Connections**: Mobile and web clients maintain bi-directional WebSocket connections terminated at stateless WebSocket Gateway nodes.\n- **User-to-Server Mapping**: A distributed in-memory session registry (Redis Cluster) maps `userId -> gateway_server_id`.\n- **Message Dispatch**: When Alice sends a message to Bob:\n  1. Alice's gateway writes the message to the Message Store (Cassandra) with status `SENT`.\n  2. Gateway queries Redis for Bob's active server.\n  3. If Bob is online, Redis Pub/Sub routes the message to Bob's gateway instance, which pushes it over his open WebSocket.\n  4. If Bob is offline, the gateway enqueues a Mobile Push Notification (FCM/APNs).",
        "keyIdea": "Use WebSockets for real-time delivery, Redis Pub/Sub for inter-gateway routing, and wide-column storage partitioned by chat room for sequential history reads.",
        "diagramType": "chat",
        "concepts": [
            {"title": "Heartbeat Presence", "body": "Clients emit heartbeats every 30 seconds into Redis with a 60-second TTL. If a heartbeat expires without renewal, user state flips to Offline."},
            {"title": "Message Delivery Receipts", "body": "Three-stage state machine: Sent (single check), Delivered (double gray checks), Read (double blue checks)."}
        ],
        "examples": ["Discord running thousands of Elixir/Erlang BEAM nodes for massive chat guild routing."],
        "resources": [{"title": "How Discord Stores Billions of Messages", "url": "https://discord.com/blog/how-discord-stores-billions-of-messages"}],
        "quiz": [
            {"id": "q1", "prompt": "Why is Cassandra or ScyllaDB preferred over relational SQL databases for chat message history?", "options": ["Cassandra supports multi-table joins natively", "Cassandra delivers massive sequential write throughput and efficient range scans by message timestamp within a chat room partition", "Cassandra runs natively in browser memory", "SQL databases cannot store UTF-8 emojis"], "correct": 1, "explanation": "Cassandra's LSM-tree architecture allows high-throughput writes and fast sequential reads partitioned by `(channel_id, message_id)`."}
        ]
    },
    {
        "id": "news-feed",
        "title": "News Feed / Timeline Architecture",
        "intro": "Design a real-time social timeline system (Twitter/Instagram) generating customized content feeds for hundreds of millions of users.",
        "objectives": [
            "Evaluate Fan-Out-On-Write (Push model) vs Fan-Out-On-Read (Pull model).",
            "Architect hybrid models mitigating celebrity 'hotkey' fan-out bottlenecks.",
            "Structure multi-tier Redis timeline caches for sub-10ms feed rendering."
        ],
        "body": "### Fan-Out Models Compared\n\n#### 1. Fan-Out on Write (Push Model)\nWhen user Alice posts a photo, background workers immediately append the post ID into the timeline feed caches of all Alice's followers.\n- **Pros**: Reading the feed is lightning-fast ($O(1)$ read from follower's pre-computed Redis list).\n- **Cons**: Severe bottleneck for celebrity users with 50M+ followers (one post triggers 50 million write operations).\n\n#### 2. Fan-Out on Read (Pull Model)\nFollowers fetch posts on demand by querying their followees' latest posts and merging them in memory at read time.\n- **Pros**: Zero write amplification on posting.\n- **Cons**: Generating the feed is slow ($O(N)$ multi-query merge on every refresh).\n\n### The Industry Hybrid Architecture\n- Use **Push (Fan-out on write)** for standard users ($< 25,000$ followers).\n- Use **Pull (Fan-out on read)** for celebrities: do not push celebrity posts to follower caches. Instead, merge celebrity posts dynamically into the user's feed upon request.",
        "keyIdea": "Use a hybrid fan-out model: push for regular users to keep reads $O(1)$; pull for celebrities to eliminate catastrophic write amplification.",
        "diagramType": "newsfeed",
        "concepts": [
            {"title": "Redis Timeline Lists", "body": "Storing the top 800 post IDs in a Redis Sorted Set (ZSET) with timestamp scores delivers instant feed scrolling."},
            {"title": "Rank Scoring Engine", "body": "Machine learning ranking service scoring candidate post IDs based on engagement probability, affinity, and recency."}
        ],
        "examples": ["Twitter/X timeline architecture transitioning to hybrid fanout."],
        "resources": [{"title": "Timelines at Scale (Twitter Engineering)", "url": "https://blog.twitter.com/engineering/en_us/topics/infrastructure/2017/the-infrastructure-behind-twitter-scale"}],
        "quiz": [
            {"id": "q1", "prompt": "Why does a pure Push (Fan-Out on Write) model fail when a celebrity with 80M followers posts a tweet?", "options": ["Followers\\' phones crash from notifications", "A single write generates 80 million concurrent cache writes, causing massive queue lag and worker thread starvation", "The tweet exceeds 280 characters", "Redis cannot store more than 10,000 items"], "correct": 1, "explanation": "The extreme write amplification of 80M writes per post overwhelms message queues and background worker pools."}
        ]
    },
    {
        "id": "search-autocomplete",
        "title": "Search Autocomplete (Typeahead)",
        "intro": "Design a real-time search typeahead system returning top-k query completions within 20 milliseconds as users type character-by-character.",
        "objectives": [
            "Construct and optimize Trie (prefix tree) data structures with precomputed top-k suggestions.",
            "Sample query frequencies using background MapReduce/Spark aggregation jobs.",
            "Distribute prefix trees across Redis clusters using consistent hashing."
        ],
        "body": "### Data Structure: Trie with Precomputed Top-K\nA standard Trie prefix search requires traversing from the prefix node down to all leaf nodes and sorting by frequency, which is far too slow for a 20ms SLA. **Optimization**: Store the top-5 most frequent search queries directly inside each Trie node:\n\n```\n          [root]\n          /    \\\n        's'    'a'\n        /        \\\n      'sy'       'ap'\n (top: 'system',  (top: 'apple',\n  'sysdesign')     'app store')\n```\nLookup latency drops to $O(L)$, where $L$ is the length of the query string (e.g. 3-5 characters), completely independent of total catalog size!",
        "keyIdea": "Precompute the top-k suggestions at every node in the prefix Trie. Query latency depends only on input prefix length, not dictionary size.",
        "diagramType": "trie",
        "concepts": [
            {"title": "Frequency Sampling", "body": "Instead of logging every single keystroke, log 1 out of every 100 queries to calculate statistical frequency distributions with minimal I/O."},
            {"title": "Client-Side Debouncing", "body": "Debouncing queries in JavaScript (e.g. 150ms delay) prevents flooding backend servers while the user is actively typing."}
        ],
        "examples": ["Google instant search autocomplete and Amazon product typeahead."],
        "resources": [{"title": "System Design: Search Autocomplete", "url": "https://bytebytego.com/"}],
        "quiz": [
            {"id": "q1", "prompt": "How does storing precomputed top-k results at each Trie node improve lookup latency?", "options": ["It compresses the Trie using gzip", "It reduces query time complexity from traversing the entire subtree to O(L) where L is prefix length", "It eliminates the need for RAM", "It bypasses network round trips"], "correct": 1, "explanation": "Precomputing top-k results at each node allows instant lookup in O(L) time without traversing downstream descendants."}
        ]
    },
    {
        "id": "file-storage",
        "title": "Distributed File Storage (Google Drive)",
        "intro": "Design a scalable cloud file storage and synchronization service (Google Drive, Dropbox) supporting multi-gigabyte uploads, chunk deduplication, and cross-device sync.",
        "objectives": [
            "Implement block-level chunking (4MB blocks) with content-addressed SHA-256 deduplication.",
            "Separate relational file metadata (folder hierarchy, permissions) from immutable block object storage (S3).",
            "Enable resumable uploads and delta sync for modified documents."
        ],
        "body": "### Architectural Decomposition\n1. **Block Storage Service**: Large files are split on the client into uniform 4MB chunks. Each chunk is hashed using SHA-256 (`chunk_hash = SHA256(data)`). If the chunk hash already exists in storage, upload is skipped (**deduplication**).\n2. **Metadata Database**: Stores file names, user directory hierarchies, version histories, and the ordered list of chunk hashes comprising each file.\n3. **Sync Notification Service**: Long-polling or WebSocket connections notify other client devices when files change, instructing them to download only the modified 4MB delta chunks.",
        "keyIdea": "Separate metadata from blob data. Split files into content-addressed chunks to achieve bandwidth-saving deduplication and resumable multi-part uploads.",
        "diagramType": "filestorage",
        "concepts": [
            {"title": "Content-Addressed Storage", "body": "Storing and naming chunks by their cryptographic SHA-256 hash ensures that identical files uploaded by different users share the same underlying storage."},
            {"title": "Resumable Uploads", "body": "Client uploads chunks independently; if network drops at 90%, only the failed 4MB chunk needs retransmission, not the entire multi-gigabyte file."}
        ],
        "examples": ["Dropbox infrastructure scaling block storage over Amazon S3 and custom Magic Pocket clusters."],
        "resources": [{"title": "Dropbox Architecture: Scaling Magic Pocket", "url": "https://dropbox.tech/infrastructure"}],
        "quiz": [
            {"id": "q1", "prompt": "What is the primary benefit of splitting large files into 4MB chunks named by their SHA-256 hash?", "options": ["Files become encrypted automatically", "Enables global deduplication, delta sync, and resilient resumable uploads", "Prevents files from being downloaded over mobile networks", "Increases relational database query speed"], "correct": 1, "explanation": "Content-addressed chunking enables bandwidth-saving deduplication and allows uploading only modified chunks."}
        ]
    },
    {
        "id": "ecommerce-system",
        "title": "E-Commerce Order & Inventory Pipeline",
        "intro": "Design an e-commerce checkout and inventory management pipeline capable of handling flash-sale traffic surges without overselling inventory.",
        "objectives": [
            "Orchestrate distributed transactions across Order, Payment, and Inventory services using the Saga Pattern.",
            "Enforce atomic inventory reservations using Redis distributed locks and Lua scripts.",
            "Implement cart expiration timers and stock compensation rollbacks."
        ],
        "body": "### Preventing Overselling in Flash Sales\nDuring flash sales (e.g. 10,000 users vying for 100 gaming consoles), relational database `UPDATE inventory SET stock = stock - 1 WHERE id = ? AND stock > 0` triggers extreme row-level lock contention and connection pool exhaustion.\n\n### The High-Concurrency Inventory Solution\n1. **Pre-load Stock into Redis**: Store available stock as an integer in Redis.\n2. **Atomic Lua Reservation**: Execute atomic stock decrement via Lua script in single-threaded Redis:\n```lua\nif redis.call('get', KEYS[1]) > '0' then\n    return redis.call('decr', KEYS[1])\nelse\n    return -1\nend\n```\n3. **Delayed Cart TTL**: If user does not complete payment within 15 minutes, an event timer increments Redis stock and releases the reservation.",
        "keyIdea": "Protect primary databases from flash-sale lock contention using atomic Redis Lua scripts. Use the Saga pattern to manage distributed compensation transactions.",
        "diagramType": "ecommerce",
        "concepts": [
            {"title": "Saga Orchestration", "body": "A centralized orchestrator coordinates transaction steps across services and triggers compensating transactions (refunds, stock release) upon failure."},
            {"title": "Two-Phase Commit (2PC) vs Saga", "body": "2PC holds blocking locks across databases until all commit. Sagas execute independent local transactions with asynchronous compensating rollback, maximizing throughput."}
        ],
        "examples": ["Amazon flash sale checkout architecture handling Cyber Monday order surges."],
        "resources": [{"title": "Pattern: Saga (Chris Richardson)", "url": "https://microservices.io/patterns/data/saga.html"}],
        "quiz": [
            {"id": "q1", "prompt": "Why is a Saga pattern preferred over Two-Phase Commit (2PC) in high-throughput microservices?", "options": ["Sagas guarantee ACID across all databases", "2PC holds synchronous database locks, creating severe latency bottlenecks and availability fragility", "Sagas eliminate the need for payment gateways", "2PC cannot be used with SQL databases"], "correct": 1, "explanation": "2PC's synchronous locking across distributed nodes creates severe bottlenecks and vulnerability to single-node failures."}
        ]
    },
    {
        "id": "payment-system",
        "title": "Payment System & Double-Entry Ledger",
        "intro": "Architect a mission-critical payment processing system guaranteeing exactly-once charge semantics, idempotency, and audit-compliant double-entry accounting.",
        "objectives": [
            "Enforce strict API idempotency using unique Idempotency Keys and distributed mutexes.",
            "Implement double-entry bookkeeping: $\\sum \\text{Debits} = \\sum \\text{Credits}$ at all times.",
            "Design asynchronous payment gateway reconciliation and settlement batch workers."
        ],
        "body": "### The Idempotency Protocol\nNetwork calls fail unpredictably. When a client times out waiting for a payment response, it retries. Without idempotency, the customer is billed twice.\n1. Client generates UUID `Idempotency-Key` header with charge request.\n2. Server attempts atomic insert of key in Redis/DB with status `PROCESSING`.\n3. If duplicate key arrives while processing, server returns `HTTP 409 Conflict` or waits.\n4. Once payment gateway (Stripe) succeeds, server saves final response payload mapped to the key. Subsequent retries immediately return cached `HTTP 200 OK`.\n\n### Double-Entry Accounting Invariant\nMoney cannot be created or destroyed. Every transaction consists of matched Debit and Credit entries:\n$$\\sum \\text{Debits} - \\sum \\text{Credits} = 0$$\nNever store user balances as mutable raw numbers; compute balance from immutable ledger audit rows.",
        "keyIdea": "Money systems must be strictly idempotent and backed by immutable double-entry ledgers. Always reconcile external payment gateway logs asynchronously.",
        "diagramType": "payment",
        "concepts": [
            {"title": "Reconciliation Engine", "body": "Daily batch worker comparing internal ledger records with external payment processor bank settlement files (BAI2 / MT940)."},
            {"title": "Payment State Machine", "body": "Initialized -> Authorized -> Captured (or Voided / Refunded)."}
        ],
        "examples": ["Stripe API idempotency design handling billions of transactions."],
        "resources": [{"title": "Designing Robust Payment Systems (Stripe Engineering)", "url": "https://stripe.com/blog/idempotency"}],
        "quiz": [
            {"id": "q1", "prompt": "What core rule governs double-entry bookkeeping in payment ledgers?", "options": ["Only debit operations are recorded", "Every transaction must contain equal matching debit and credit entries with net sum zero", "User balances must be stored in volatile RAM caches", "Transactions can only be executed during banking hours"], "correct": 1, "explanation": "Double-entry accounting requires every balance transfer to record equal debits and credits, preserving total system balance."}
        ]
    },
    {
        "id": "ticket-booking",
        "title": "High-Concurrency Ticket Booking (BookMyShow)",
        "intro": "Design a high-concurrency ticket booking platform handling viral stadium concert sales with zero double-booking and fair virtual queuing.",
        "objectives": [
            "Implement distributed seat holding with short-lived TTLs using Redis mutexes.",
            "Protect primary databases during flash sales via Virtual Waiting Rooms (Token buckets).",
            "Handle seat release timeouts when customers abandon payment checkout."
        ],
        "body": "### The Flash-Sale Ticket Problem\nWhen tickets for a stadium concert go live, 500,000 fans attempt to reserve 50,000 seats in seconds. Direct database queries crash under row-lock contention.\n\n### The Multi-Tier Architecture\n1. **Virtual Waiting Room (Queue-IT)**: Incoming users enter a waiting room queue and are admitted to the seat selection canvas in metered batches matching backend processing capacity.\n2. **Temporary Seat Hold (Redis Mutex with TTL)**: When Alice clicks seat `A-12`, server acquires Redis distributed lock `SET lock:seat:A12 user_alice NX EX 600` (10-minute lease).\n3. **Seat State Transition**: `AVAILABLE -> HELD -> BOOKED`.\n4. **Timeout Expiration**: If payment is not completed in 10 minutes, Redis key expires and seat returns to `AVAILABLE`.",
        "keyIdea": "Meter incoming flash traffic with a virtual waiting room. Use distributed Redis locks with finite leases (TTLs) to manage temporary seat holds.",
        "diagramType": "ticketbooking",
        "concepts": [
            {"title": "Optimistic Locking", "body": "Database rows verify version number on commit (`UPDATE seat SET status='BOOKED', version=2 WHERE id='A12' AND version=1`)."},
            {"title": "Seat Map Caching", "body": "Compress stadium seat availability bitmap and distribute via CDN with short 2-second TTLs."}
        ],
        "examples": ["Ticketmaster and BookMyShow handling stadium world tour drops."],
        "resources": [{"title": "How Ticketmaster Handles Flash Sales", "url": "https://tech.ticketmaster.com/"}],
        "quiz": [
            {"id": "q1", "prompt": "Why should temporary seat holds carry a strict Time-To-Live (TTL)?", "options": ["To comply with GDPR rules", "To automatically release seats back to other customers if a user abandons checkout without paying", "To reduce network bandwidth on Wi-Fi", "To force users to re-login"], "correct": 1, "explanation": "A TTL ensures seats locked by users who drop off or experience payment failure are automatically freed for other buyers."}
        ]
    },
    {
        "id": "ride-sharing",
        "title": "Ride Sharing & Geospatial Dispatch (Uber)",
        "intro": "Design a real-time ride hailing and dispatch system tracking millions of moving driver locations and matching riders with sub-second latency.",
        "objectives": [
            "Structure geospatial indexing using hierarchical spatial cells (Uber H3 / Google S2 / QuadTree).",
            "Process high-frequency driver location heartbeats over persistent WebSocket/gRPC streams.",
            "Execute optimal bipartite matching between riders and nearby drivers."
        ],
        "body": "### Geospatial Indexing: H3 Hexagonal Grid\nLatitude/Longitude pairs cannot be queried efficiently with B-tree range queries ($O(N)$ table scans). Modern ride-sharing platforms discretize the Earth\\'s surface into hierarchical spatial cells:\n- **Uber H3**: Hexagonal hierarchical spatial index. Hexagons have the unique mathematical property that all 6 adjacent neighbors are equidistant, making radius and travel-distance calculations uniform.\n- **Driver Location Updates**: Drivers emit location pings `(lat, lon, driver_id, status)` every 4 seconds. The dispatch engine maps `(lat, lon)` to an H3 cell index (e.g. resolution 8, ~460m across) and updates an in-memory spatial index (Redis Geospatial / memory table).\n- **Nearby Driver Query**: `h3.kRing(riderCell, 2)` retrieves all adjacent cells within 2 rings, finding candidates in $O(1)$ time.",
        "keyIdea": "Discretize the globe into hexagonal cells (Uber H3). Route location pings into in-memory spatial indexes to evaluate nearby driver queries in O(1) time.",
        "diagramType": "ridesharing",
        "concepts": [
            {"title": "Bipartite Dispatch Matching", "body": "Batching ride requests every 5 seconds to solve global optimization (Hungarian algorithm) rather than naive greedy first-come matching."},
            {"title": "Trip State Machine", "body": "Requested -> Matching -> DriverAssigned -> Arrived -> InTrip -> Completed."}
        ],
        "examples": ["Uber Geospatial dispatching architecture running on custom H3 hex grids."],
        "resources": [{"title": "H3: Uber's Hexagonal Hierarchical Spatial Index", "url": "https://www.uber.com/blog/h3/"}],
        "quiz": [
            {"id": "q1", "prompt": "Why are hexagonal cells (H3) preferred over square grid cells for geospatial dispatch?", "options": ["Hexagons take less disk space", "All adjacent neighbor cell centers are equidistant in a hexagon grid, eliminating diagonal distance distortion", "Hexagons align with satellite orbits", "Square grids cannot cover curved terrain"], "correct": 1, "explanation": "In a square grid, diagonal neighbors are $\\sqrt{2}$ times farther away. In a hexagonal grid, all 6 neighbors are strictly equidistant."}
        ]
    },

    # Course 5: Reliability, Observability & Security
    {
        "id": "service-discovery",
        "title": "Service Discovery & Health Checking",
        "intro": "In ephemeral containerized environments (Kubernetes, auto-scaled clouds), service discovery dynamically tracks live IP addresses and port bindings of microservice instances.",
        "objectives": [
            "Compare Client-Side Discovery (Netflix Eureka) with Server-Side Discovery (AWS ALB / Kubernetes CoreDNS).",
            "Configure heartbeat leases, TTLs, and consensus-backed service registries (Consul / ZooKeeper).",
            "Mitigate cascading node failure loops using exponential dampening."
        ],
        "body": "### Client-Side vs Server-Side Discovery\n- **Client-Side Discovery**: Service client queries the Service Registry (Consul, Eureka) directly, obtains the list of available IP addresses, and applies local load balancing algorithms (Round Robin, Least Response Time). Fewer network hops, but couples client libraries to registry technology.\n- **Server-Side Discovery**: Service client issues requests to a stable DNS name or reverse proxy (Kubernetes Service / AWS ALB). The proxy queries the registry and routes traffic to backend pods. Language-agnostic, but adds an intermediate proxy hop.",
        "keyIdea": "Automate IP registration and deregistration in dynamic cloud clusters. Pair heartbeat TTLs with self-preservation modes to prevent network blips from wiping healthy registries.",
        "diagramType": "servicediscovery",
        "concepts": [
            {"title": "Heartbeat Leases", "body": "Instances send heartbeat pings every 10s. If 3 consecutive heartbeats are missed, the registry marks the node unhealthy and deregisters it."},
            {"title": "Eureka Self-Preservation Mode", "body": "If sudden network partitions cause > 15% of nodes to drop heartbeats simultaneously, Eureka halts deregistration to avoid wiping the entire cluster."}
        ],
        "examples": ["Kubernetes CoreDNS resolving `order-service.default.svc.cluster.local` to active pod IPs."],
        "resources": [{"title": "Service Discovery in a Microservices Architecture", "url": "https://www.nginx.com/blog/service-discovery-in-a-microservices-architecture/"}],
        "quiz": [
            {"id": "q1", "prompt": "What triggers Eureka's Self-Preservation mode?", "options": ["CPU usage exceeding 90%", "A sudden drop in overall heartbeats (>15%) indicating a network partition rather than true node crashes", "A new pod deployment", "SSL certificate invalidation"], "correct": 1, "explanation": "Self-preservation prevents catastrophic deregistration of healthy nodes during cross-datacenter network blips."}
        ]
    },
    {
        "id": "fault-tolerance",
        "title": "Fault Tolerance & Redundancy Models",
        "intro": "Fault-tolerant systems anticipate, absorb, and recover from hardware crashes, network severed links, and software bugs without total system collapse.",
        "objectives": [
            "Classify failure modes: Crash-Stop, Crash-Recovery, and Byzantine Faults.",
            "Implement N+2 redundancy, active-passive vs active-active failovers.",
            "Apply the Bulkhead pattern to prevent single component failures from consuming all resources."
        ],
        "body": "### Core Redundancy Models\n- **Active-Passive (Warm/Cold Standby)**: Primary node handles 100% of traffic; secondary replica syncs data and takes over only when primary fails via heartbeat heartbeat fencing. May incur 10-60s failover downtime.\n- **Active-Active (Multi-Master)**: All nodes concurrently serve read and write traffic across multiple availability zones. Requires distributed conflict resolution.\n- **N+2 Redundancy**: System provisions $N$ nodes required for peak traffic plus 2 additional spare nodes to absorb simultaneous node failures and rolling OS upgrades without capacity degradation.",
        "keyIdea": "Design for failure as a constant reality. Isolate resources with bulkheads and provision N+2 headroom so node crashes cause zero customer degradation.",
        "diagramType": "faulttolerance",
        "concepts": [
            {"title": "Bulkhead Isolation", "body": "Partitioning thread pools, connection pools, and memory so a crash or delay in a non-essential service (e.g. recommendations) cannot freeze checkout processing."},
            {"title": "Graceful Degradation", "body": "Automatically disabling heavy non-essential features (personalized widgets, animations) to keep core transaction paths responsive during outages."}
        ],
        "examples": ["Netflix Chaos Monkey randomly killing production AWS instances to enforce fault resilience."],
        "resources": [{"title": "Release It! (Michael Nygard)", "url": "https://pragprog.com/titles/mnee2/release-it-second-edition/"}],
        "quiz": [
            {"id": "q1", "prompt": "What does the Bulkhead pattern accomplish in distributed microservices?", "options": ["Compresses network packets", "Isolates critical resource pools so failure in one subsystem does not consume all resources and crash the host process", "Encrypts inter-service communication", "Automatically scales Kubernetes nodes"], "correct": 1, "explanation": "Like compartments in a ship's hull, bulkheads isolate failures and prevent total process collapse."}
        ]
    },
    {
        "id": "circuit-breakers",
        "title": "Retries & Circuit Breakers",
        "intro": "Protect downstream dependencies and prevent cascading distributed failures using adaptive retry backoff algorithms and stateful circuit breakers.",
        "objectives": [
            "Model the 3 states of a Circuit Breaker: Closed, Open, and Half-Open.",
            "Implement Exponential Backoff with Full Jitter to eliminate retry storms.",
            "Configure fallback responses (cache reads, static defaults) on tripped circuits."
        ],
        "body": "### The Circuit Breaker State Machine\n1. **Closed**: Normal operations. Requests pass through to downstream service. Failure count is tracked over a sliding time window.\n2. **Open**: If failure rate exceeds threshold (e.g. 50% errors over 10 seconds), the circuit trips to **Open**. All subsequent requests fail fast immediately without hitting downstream, sparing the struggling service.\n3. **Half-Open**: After a cooldown sleep window (e.g. 30 seconds), circuit permits a small canary fraction of requests through. If canary calls succeed, circuit resets to **Closed**; if they fail, circuit flips back to **Open**.\n\n### Exponential Backoff with Full Jitter\nRetrying immediately upon failure causes **retry storms (thundering herds)**. Always add randomness (jitter):\n\n$$\\text{sleep} = \\text{random}(0, \\min(\\text{cap}, \\text{base} \\times 2^{\\text{attempt}}))$$",
        "keyIdea": "Fail fast when downstream is drowning. Exponential backoff with jitter prevents retry avalanches; circuit breakers give downstream services breathing room to recover.",
        "sim": "circuitBreaker",
        "diagramType": "circuitbreaker",
        "concepts": [
            {"title": "Thundering Herd (Retry Storm)", "body": "When thousands of client requests retry at the exact same millisecond interval, creating periodic shockwaves that repeatedly knock recovering servers back offline."},
            {"title": "Fallback Cache", "body": "Returning cached stale data or generic defaults when the circuit is Open, preserving partial user functionality."}
        ],
        "examples": ["Resilience4j and Envoy distributed circuit breaker filters."],
        "resources": [{"title": "Exponential Backoff and Jitter (AWS Architecture Blog)", "url": "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/"}],
        "quiz": [
            {"id": "q1", "prompt": "Why is \\'Full Jitter\\' added to exponential backoff algorithms?", "options": ["To increase payload compression", "To decorrelate retry timestamps across clients, preventing periodic synchronized traffic spikes (retry storms)", "To bypass HTTPS TLS handshakes", "To prioritize mobile clients over desktop clients"], "correct": 1, "explanation": "Jitter spreads out retries evenly over time, preventing synchronized thundering herd spikes on downstream services."}
        ]
    },
    {
        "id": "observability",
        "title": "Observability (Logs, Metrics, Traces)",
        "intro": "Observability empowers software engineers to understand the internal state of complex distributed systems by analyzing external outputs: Metrics, Logs, and Distributed Traces.",
        "objectives": [
            "Implement distributed context propagation using W3C TraceContext standards.",
            "Compare Prometheus pull-based time-series metrics with push-based collectors.",
            "Structure JSON logging with correlated Trace IDs and Span IDs."
        ],
        "body": "### The Three Pillars of Observability\n1. **Metrics (Numeric Time-Series)**: Counters, Gauges, and Histograms (Prometheus, Datadog). Ultra-lightweight aggregation answering *\\'Is the system healthy?\\'* and *\\'What is the current P99 latency?\\'*.\n2. **Logs (Structured Events)**: JSON formatted log lines containing timestamp, level, message, and context. Answering *\\'What exactly happened during this discrete event?\\'*.\n3. **Distributed Tracing (Execution Path)**: Tracing a single user request as it traverses across multiple microservices. Every service forwards HTTP headers:\n   - `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`\n   Visualized as Gantt charts in Jaeger or Zipkin, pinpointing the exact microservice causing latency bottlenecks.",
        "keyIdea": "Metrics alert you to problems; distributed traces isolate the bottleneck service; structured logs explain the root cause.",
        "diagramType": "observability",
        "concepts": [
            {"title": "Context Propagation", "body": "Injecting and extracting TraceID and SpanID headers across HTTP, gRPC, and Kafka boundaries to link asynchronous spans together."},
            {"title": "Sampling Strategies", "body": "Recording 1% of successful traces (probabilistic sampling) but 100% of error traces (tail-based sampling) to conserve network and storage overhead."}
        ],
        "examples": ["OpenTelemetry SDK exporting spans to Jaeger and metrics to Prometheus."],
        "resources": [{"title": "OpenTelemetry Documentation", "url": "https://opentelemetry.io/"}],
        "quiz": [
            {"id": "q1", "prompt": "What observability tool is specifically designed to isolate which microservice is responsible for a latency delay across a distributed call graph?", "options": ["Single-instance log file", "Distributed Tracing (OpenTelemetry / Jaeger)", "Operating system top command", "Database EXPLAIN query"], "correct": 1, "explanation": "Distributed tracing connects spans across service boundaries into a unified timeline, immediately highlighting the slowest downstream dependency."}
        ]
    },
    {
        "id": "system-security",
        "title": "Security in System Design",
        "intro": "Embed zero-trust defense-in-depth principles across all architectural tiers, encompassing network boundaries, cryptographic identity, and data protection.",
        "objectives": [
            "Enforce Mutual TLS (mTLS) and SPIFFE identities for service-to-service communication.",
            "Validate stateless JWT tokens with asymmetric public key cryptography (RS256/EdDSA).",
            "Mitigate OWASP Top 10 vulnerabilities (SQLi, XSS, SSRF) using Web Application Firewalls (WAF)."
        ],
        "body": "### Defense-in-Depth Tiers\n1. **Edge & Ingress**: Cloudflare / AWS WAF filtering SQL injection, Cross-Site Scripting (XSS), and Layer 7 volumetric DDoS attacks.\n2. **Network Perimeter**: Private VPC subnets. Database nodes placed in private isolated subnets with zero public internet IP addresses.\n3. **Service Mesh Zero-Trust**: Never trust internal datacenter networks. Enforce **Mutual TLS (mTLS)**: both client and server authenticate each other using x509 cryptographic certificates.\n4. **Authentication & Authorization**: API Gateway validates OAuth2 / OIDC JSON Web Tokens (JWT). Asymmetric signing (RS256) allows microservices to verify authenticity using public keys without querying a centralized auth database.\n5. **Data Protection**: Encryption at rest (AES-256 with AWS KMS envelope encryption) and column-level encryption for sensitive PII (credit cards, social security numbers).",
        "keyIdea": "Assume internal network compromise. Enforce zero-trust with mTLS, sign APIs with HMAC/JWT, and encrypt sensitive data both in transit and at rest.",
        "diagramType": "security",
        "concepts": [
            {"title": "Envelope Encryption", "body": "Encrypting plaintext data with a unique Data Encryption Key (DEK), and encrypting the DEK with a master Key Encryption Key (KEK) managed in HSM hardware."},
            {"title": "HMAC Request Signing", "body": "Clients sign request payloads with a shared secret (`HMAC-SHA256(payload, secret)`). Prevents replay attacks and data tampering in transit."}
        ],
        "examples": ["Istio service mesh automating mTLS certificate rotation across Kubernetes pods."],
        "resources": [{"title": "NIST Zero Trust Architecture (SP 800-207)", "url": "https://csrc.nist.gov/publications/detail/sp/800-207/final"}],
        "quiz": [
            {"id": "q1", "prompt": "Why is asymmetric JWT signing (RS256) superior to symmetric signing (HS256) in microservice architectures?", "options": ["RS256 tokens are shorter", "Downstream microservices can verify tokens using the public key without needing access to the secret private key", "HS256 requires internet access to verify", "RS256 runs without CPU cycles"], "correct": 1, "explanation": "With RS256, only the auth server holds the private signing key. Microservices verify signatures using the public key, so a compromised service cannot forge tokens."}
        ]
    }
]

print(f'Writing remaining {len(remaining_lessons)} HLD lessons...')
for l in remaining_lessons:
    path = os.path.join(LESSONS_DIR, f"{l['id']}.json")
    with open(path, "w") as f:
        json.dump(l, f, indent=2)
    print(f"  Wrote {path}")

print("All HLD lesson files successfully written!")
