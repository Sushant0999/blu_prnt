# BluPrnt: Exhaustive System Architecture & Feature Specification Report

> **Document Type:** Technical System Specification & Feature Catalog  
> **Target Audience:** Technical Reviewers, Software Architects, Engineering Leads, AI Systems (Claude / Senior Technical Reviewers)  
> **Application Name:** **BluPrnt** (Interactive Distributed Systems & System Design Studio)  
> **Repository:** `system_design_prep` (Full-Stack Monorepo: `bluprnt-client` + `bluprnt-server`)  
> **Technology Stack:** React 18, TypeScript 5.5, Vite, Tailwind CSS, React Flow, Yjs CRDT, WebSockets, WebRTC, Dexie.js (IndexedDB), Node.js, Express, Vitest (117+ Passing Tests).

---

## Executive Summary

**BluPrnt** is a production-grade, all-in-one interactive learning, discrete-event simulation, and real-time collaborative whiteboard studio purpose-built for Distributed Systems and System Design. It bridges the gap between abstract distributed systems theory and operational reality by unifying:
1. An **interactive drag-and-drop React Flow architectural canvas** with real-time multi-user CRDT collaboration.
2. A **discrete-event $M/M/c$ queuing simulation engine** calculating DAG critical path latency, worker concurrency, and dropped traffic.
3. An **in-flight fault injection Chaos Studio** and an automated **A+ to F Reliability & Single Point of Failure (SPOF) Linter**.
4. An **Architecture Challenge Arena** featuring real-world incident drills (Black Friday, Zero-SPOF Ledger, Low-Latency Dispatch).
5. **18 universal, auto-streaming distributed algorithm visualizers** with dual-mode continuous streaming and frame-by-frame lockstep step-through execution.
6. **Back-of-the-envelope capacity calculators** with real-time Pareto distributions and cloud infrastructure cost estimation.
7. An **algorithmic spaced repetition system (SRS)** powered by the SuperMemo SM-2 engine.
8. A comprehensive **curriculum, real-world senior case studies, and mock staff interview scenarios**.
9. A unified **single-instance full-stack deployment** supporting offline PWA execution, local IndexedDB caching, and cloud delta sync.

---

## 1. Collaborative Topology Playground (Whiteboard & Canvas)

The Playground (`/playground`) is BluPrnt's flagship visual architecture studio where users construct, simulate, and stress-test distributed topologies.

### 1.1 Canvas Infrastructure & Interaction Design
- **React Flow Integration:** High-performance DAG rendering with hardware-accelerated pan, zoom, background dot-grid snapping, and dynamic interactive mini-map.
- **Smart Ergonomic Viewport:** `fitViewOptions={{ padding: 0.25, minZoom: 0.7, maxZoom: 1.15 }}` prevents microscopic scaling on large viewports while ensuring all components are immediately readable.
- **Collapsible Component Catalog (`NodePalette`):** Left-docked drawer grouping 43 production-grade cloud components across 7 infrastructure categories. Features instant toggle collapse to recover 256px of horizontal workspace.
- **3-Way Edge Disconnection:**
  1. Hovering directly over any animated edge badge reveals an instant red `×` disconnect trigger.
  2. Selecting any edge on the canvas and pressing `Backspace` or `Delete`.
  3. Opening the Right Sidebar Properties Inspector and clicking `×` next to any upstream or downstream dependency.
- **Edge Routing & Dynamic Bezier Paths:** Custom `AnimatedEdge` rendering SVG particle animations traveling along bezier lines. Flow velocity and particle frequency dynamically scale with real-time RPS load. Packet colors indicate health:
  - **Cyan (`#06b6d4`):** Healthy flow ($<70\%$ link saturation).
  - **Amber (`#f59e0b`):** Congested link ($70\% - 100\%$ saturation).
  - **Rose (`#f43f5e`):** Severe packet dropping / bottleneck ($>100\%$ saturation).

### 1.2 Enterprise Component Registry (43 Dedicated Components Across 7 Tiers)
Each component carries deterministic default configurations (replicas, baseline QPS per instance, baseline latency in ms, category, icon, and operational description):

1. **Ingress & Clients (8 Components):**
   - `client-web`: Single-Page Application (SPA) browser issuing HTTPS & WebSocket requests.
   - `client-mobile`: Native iOS/Android clients with intermittent cellular latency.
   - `client-iot`: IoT telemetry fleet emitting high-frequency MQTT/UDP packets.
   - `dns-route53`: Anycast GeoDNS with latency-based routing (Route 53).
   - `cdn-edge`: Cloudflare / CloudFront Edge caching static assets and dynamic responses.
   - `load-balancer-l4`: AWS NLB / Layer 4 TCP/UDP ultra-low-latency load balancer.
   - `api-gateway`: Kong / Envoy API Gateway terminating TLS, enforcing auth & rate limiting.
   - `reverse-proxy-nginx`: Nginx reverse proxy and HTTP connection multiplexer.
2. **Compute & APIs (9 Components):**
   - `service-springboot`: Spring Boot Java microservice with HikariCP database connection pooling.
   - `service-app`: General-purpose Node.js/Go API application service.
   - `service-auth`: Dedicated OAuth2 / JWT authentication service.
   - `service-payment`: PCI-DSS compliant payment processing service.
   - `service-search-api`: Query dispatch and Elasticsearch aggregation gateway.
   - `service-worker`: Asynchronous background batch queue worker.
   - `service-serverless`: AWS Lambda / Cloud Functions ephemeral compute.
   - `service-ml-inference`: GPU-accelerated model serving and inference endpoint.
   - `service-graphql`: Apollo GraphQL federation and query resolution gateway.
3. **Caching (5 Components):**
   - `cache-redis`: Redis standalone / cluster in-memory key-value store.
   - `cache-memcached`: Multi-threaded high-throughput slab memory cache.
   - `cache-redis-pubsub`: Redis Pub/Sub low-latency event broker.
   - `cache-distributed-ring`: Consistent hash partitioned distributed cache cluster.
   - `cache-app-local`: Local in-process memory cache (Guava / Caffeine / LRU).
4. **Databases & Storage (8 Components):**
   - `db-postgres-primary`: PostgreSQL ACID primary relational database.
   - `db-postgres-replica`: Read-only asynchronous read replica.
   - `db-mysql-cluster`: MySQL Galera / InnoDB multi-master cluster.
   - `db-mongodb`: Document store with sharded collections.
   - `db-cassandra`: Wide-column distributed NoSQL database with tunable consistency.
   - `db-dynamodb`: Fully managed serverless key-value / document database.
   - `db-clickhouse`: Columnar OLAP analytical database for real-time aggregation.
   - `db-neo4j`: Property graph database for social graph traversal.
5. **Queues & Streaming (5 Components):**
   - `queue-kafka`: Distributed partitioned event log and streaming broker.
   - `queue-rabbitmq`: AMQP message broker supporting complex routing keys.
   - `queue-aws-sqs`: Managed distributed point-to-point message queue.
   - `queue-pulsar`: Multi-tenant message streaming with tiered storage.
   - `queue-event-bridge`: Event bus routing decoupled SaaS events.
6. **Storage & Search (4 Components):**
   - `storage-s3`: S3-compatible highly durable object storage.
   - `search-elasticsearch`: Distributed Lucene inverted index search cluster.
   - `storage-efs-nfs`: Elastic distributed Network File System.
   - `storage-cold-glacier`: High-latency archival cold storage.
7. **Resilience & Security (4 Components):**
   - `resilience-waf`: Web Application Firewall protecting against OWASP Top 10 / DDoS.
   - `resilience-circuit-breaker`: Envoy / Resilience4j distributed circuit breaker.
   - `resilience-rate-limiter`: Redis-backed token bucket distributed rate limiter.
   - `resilience-distributed-lock`: Redlock / ZooKeeper distributed mutex coordinator.

### 1.3 Pre-Loaded Enterprise Production Templates
Users can switch instantly between production architectures:
- **Blank Canvas (`blank`):** Empty-state starter with quick-add pills for rapid prototyping.
- **Parallel Spring Boot Microservices (`parallel-spring-services`):** Web Client $\rightarrow$ Layer 7 Gateway $\rightarrow$ 4 parallel services (Orders, Users, Catalog, Billing) $\rightarrow$ Shared PostgreSQL Primary.
- **URL Shortener / Bitly (`url-shortener`):** Web Clients $\rightarrow$ CDN Edge $\rightarrow$ API Gateway $\rightarrow$ URL Redirection App $\rightarrow$ Redis Cache $\rightarrow$ PostgreSQL Storage.
- **E-Commerce Checkout (`ecommerce-checkout`):** Inbound Ingress $\rightarrow$ API Gateway $\rightarrow$ Order Service $\rightarrow$ Kafka Bus $\rightarrow$ Payment Service + Inventory Worker.
- **Uber Geospatial Dispatch (`uber-dispatch`):** Driver/Rider Mobile Fleet $\rightarrow$ Envoy Ingress $\rightarrow$ H3 Hexagonal Spatial Indexer $\rightarrow$ Dispatch Matching Engine $\rightarrow$ Kafka Telemetry $\rightarrow$ Redis Geo-Cache $\rightarrow$ Cassandra Master Trip Store.
- **Netflix Streaming Playback (`netflix-streaming`):** Global Smart TVs $\rightarrow$ Route 53 GeoDNS $\rightarrow$ Open Connect CDN Edge + Zuul Gateway $\rightarrow$ Playback Orchestrator $\rightarrow$ EVCache (Memcached Cluster) $\rightarrow$ Cassandra Title DB.
- **Stripe Double-Entry Ledger (`stripe-ledger`):** Merchant Terminals $\rightarrow$ Idempotency & Auth Gateway $\rightarrow$ Payment Charge Engine $\rightarrow$ Card Network Connector + Double-Entry Ledger Database $\rightarrow$ Outbox Dead Letter Queue.

---

## 2. Discrete-Event Simulation & Queuing Theory Engine

BluPrnt does not rely on static diagrams. It runs a deterministic mathematical simulation model over the canvas DAG.

### 2.1 Queuing Theory ($M/M/c$) & Worker Concurrency Model
- Implements an **$M/M/c$ queuing model** based on Little's Law ($L = \lambda W$).
- **Worker Allocation:** Each component replica provisions a worker thread pool ($maxWorkers = \text{replicas} \times 100$).
- **Non-Linear Queuing Wait Times ($W_q$):** When node traffic approaches utilization $\rho = \frac{\lambda}{c \cdot \mu} \to 1.0$, the wait time spikes exponentially:
  $$W_q = \frac{\rho^{\sqrt{2(c+1)}}}{c(1 - \rho)} \cdot \frac{1}{\mu}$$
- **Tail Latency Percentiles:** Computes deterministic $p50$, $p95$, and $p99$ tail latency across all nodes, incorporating processing jitter and queuing delay.
- **Cascading Failure Risk Classifier:** Analyzes upstream saturation and assigns categorical risk: `low`, `moderate`, `high`, or `severe`.

### 2.2 DAG Latency & 3-Color Cycle Detection Engine (`dagLatency.ts`)
- **Topological Traversal:** Computes the true end-to-end critical path latency from root ingress nodes to terminal storage/queue nodes.
- **3-Color Depth-First Search (DFS):** Node coloring (`0 = Unvisited`, `1 = Visiting`, `2 = Visited`) reliably detects cyclic dependencies in real time, alerting the user via a prominent warning pill without locking or crashing the browser thread.
- **Dead/Killed Node Bypassing:** When a node is knocked offline by Chaos Studio, the DAG solver isolates the dead branch and marks connected downstream latency as disconnected ($\infty$).

### 2.3 Bottleneck & Traffic Saturation Engine (`bottleneck.ts`)
- **Throughput Calculation:** Evaluates each node's total capacity:
  $$C_{\text{total}} = \text{replicas} \times \text{capacityQps} \times \text{tierMultiplier}$$
- **Saturation Percentage:** $\text{Saturation} = \frac{\text{Incoming RPS}}{C_{\text{total}}} \times 100\%$.
- **Dropped Request Calculation:** If incoming traffic exceeds $C_{\text{total}}$, dropped requests are calculated: $\text{Dropped RPS} = \text{Incoming RPS} - C_{\text{total}}$.
- **Dynamic Visual Health Rings:**
  - **Green ($<70\%$):** Normal healthy operation.
  - **Amber ($70\% - 100\%$):** Elevated load nearing threshold.
  - **Red / Pulsing Rose ($>100\%$):** Critical capacity bottleneck with active packet dropping.

---

## 3. Vertical Machine Sizing & Infrastructure Cost Estimation

Beyond scaling horizontal replica counts, BluPrnt enables per-node vertical hardware sizing.

### 3.1 Five Virtual Machine Hardware Tiers (`machineTiers.ts`)
Each tier alters the node's baseline QPS capacity, modifies its processing latency multiplier, and updates cloud infrastructure billing:
1. **T1: Micro (`micro` - AWS `t3.micro` equivalent):**
   - Specifications: 1 vCPU, 2 GB RAM, $15/month ($0.02/hr).
   - Capacity: 500 base QPS, $1.4\times$ latency penalty.
   - Role: Lightweight ingress proxies, development mocks, low-throughput worker scripts.
2. **T2: Standard (`standard` - AWS `c6i.large` equivalent):**
   - Specifications: 4 vCPU, 8 GB RAM, $65/month ($0.09/hr).
   - Capacity: 2,500 base QPS, $1.0\times$ baseline latency.
   - Role: General-purpose microservices, API servers.
3. **T3: Compute-Optimized (`compute` - AWS `c6i.4xlarge` equivalent):**
   - Specifications: 16 vCPU, 32 GB RAM, $260/month ($0.36/hr).
   - Capacity: 10,000 base QPS, $0.65\times$ latency speedup.
   - Role: Cryptographic verification, payment auth, encoding, high-frequency APIs.
4. **T4: Memory-Optimized (`memory` - AWS `r6i.8xlarge` equivalent):**
   - Specifications: 32 vCPU, 128 GB RAM, $680/month ($0.94/hr).
   - Capacity: 25,000 base QPS, $0.45\times$ latency speedup.
   - Role: Redis clusters, in-memory caches, Cassandra ring nodes.
5. **T5: Bare Metal Ultra (`metal` - AWS `c6i.metal` equivalent):**
   - Specifications: 64 vCPU, 256 GB RAM, $1,650/month ($2.29/hr).
   - Capacity: 60,000 base QPS, $0.30\times$ ultra-low latency.
   - Role: Extreme real-time matching engines, primary relational databases, Kafka message brokers.

### 3.2 Real-Time Cloud Infrastructure Bill Estimator (`costEstimator.ts`)
Calculates estimated monthly infrastructure expenses based on provisioned architecture:
- **Compute Costs:** $\sum (\text{replicas} \times \text{tierDef.monthlyCostUsd})$.
- **Stateful Storage Costs:** Automatically detects stateful components (Databases, Queues, Caches) and provisions 500GB gp3 SSD storage with high IOPS ($50/month per stateful replica).
- **Network Egress Billing:** Assumes 2.5 KB average HTTP transaction size at AWS/Cloudflare egress rates of $0.085 per GB:
  $$\text{GB Egress} = \frac{\text{Target RPS} \times 2,592,000 \text{ sec/month} \times 2.5 \text{ KB}}{1024 \times 1024}$$
- **KPI Metrics:** Outputs Total Monthly Spend ($/mo), Compute Spend, Storage Spend, Network Egress Spend, and Unit Cost per Million Requests ($/M req).

---

## 4. Chaos Studio & Fault Injection Suite

A dedicated in-flight chaos engineering control panel (`ChaosStudio.tsx`) allows engineers to simulate distributed incidents with zero page reloads:
- **Traffic Surge (3x Spike):** Simulates sudden viral spikes or flash sales, multiplying inbound RPS by $3\times$ to observe autoscaling lag and queue overflow.
- **Node Kill (Hardware / Process Crash):** Randomly or selectively terminates an active node (`isDead: true`). All inbound traffic to the killed node drops immediately with $100\%$ failure, validating whether redundant replicas or fallback routes absorb the load.
- **Sever Link (Network Partition):** Cuts an edge between two specific services to simulate cross-datacenter fiber cuts or AWS Availability Zone (AZ) isolation, testing circuit breaker trips and fallback caches.
- **Latency Jitter (+250ms Injection):** Injects 250ms of synthetic network jitter across the cluster, exposing cascading thread exhaustion and timeout storms.
- **Heal All (One-Click Recovery):** Restores all dead nodes, reconnects severed edges, flushes jitter, and clears traffic backpressure back to steady state.

---

## 5. Production Reliability Linter & SPOF Auditor

The Architecture Linter (`architectureLinter.ts`) programmatically inspects the canvas topology, evaluates failure modes, and outputs a letter grade (**A+**, **A**, **B**, **C**, **D**, **F**) alongside a numerical score ($0 - 100$).

### 5.1 Automated Audit Rules & Severity Ratings
1. **Critical: Service Offline / Killed Node:** Alerts if any killed component is receiving live traffic without failover.
2. **Critical: Capacity Exceeded / Dropping Traffic:** Pinpoints the exact node dropping traffic and specifies the exact number of additional replicas needed to survive.
3. **High: Single Point of Failure (SPOF) on Stateful Databases:** Flags any database or storage component running with `replicas: 1`. Recommends active-passive read replicas or multi-master replication.
4. **High: Uncached Database Queries:** Flags direct connections from API gateways or web services into databases without an intermediate caching layer (Redis / Memcached).
5. **High: Missing Asynchronous Buffering (No Message Queue):** Flags high-throughput API endpoints connecting directly to slow downstream disk databases without Kafka/RabbitMQ decoupling.
6. **Medium: Compute Service SPOF:** Flags business-critical compute services running with single instances (`replicas: 1`).
7. **Medium: Missing Edge CDN:** Flags user-facing web clients connecting directly to internal load balancers without an edge CDN (Cloudflare/CloudFront) for static offload and DDoS mitigation.
8. **Info: Single Node Microservice:** Advisory warning for microservices running at lower redundancy tiers.

---

## 6. Architecture Incident Challenge Arena

Interactive incident drill scenarios (`ArchitectureChallengesModal.tsx`) presenting production crises with automated real-time objective validation:

1. **Challenge 1: Black Friday Stampede (Intermediate):**
   - **Scenario:** E-commerce checkout pipeline hit with 50,000 RPS flash sale demand.
   - **Objectives:**
     1. Zero dropped requests ($0$ dropped RPS across all nodes).
     2. Handled throughput $\ge 45,000$ RPS.
     3. Zero nodes running above $100\%$ capacity saturation.
   - **Solution Vector:** Scale Order Service and Inventory Worker replicas, upgrade Kafka broker to Compute tier.
2. **Challenge 2: Zero SPOF Financial Ledger (Staff Engineer):**
   - **Scenario:** Audit a Stripe-style payment ledger for high availability and regulatory resilience.
   - **Objectives:**
     1. Reliability Audit Score $\ge 90\%$.
     2. All database and storage nodes must have $\ge 2$ redundant replicas.
     3. Zero Critical security or availability audit warnings.
   - **Solution Vector:** Provision PostgreSQL read replicas, place Redis cache in front of ledger queries, add Outbox dead-letter queues.
3. **Challenge 3: Ultra-Low Latency Geospatial Dispatch (Intermediate):**
   - **Scenario:** Uber driver-passenger matching demands sub-35ms dispatch latency under 40,000 RPS.
   - **Objectives:**
     1. Critical path SLA latency $\le 35$ ms.
     2. Cluster throughput $\ge 35,000$ RPS.
     3. Dispatch and matching engines upgraded to Compute or Memory tiers.
   - **Solution Vector:** Eliminate slow B-tree hops, leverage in-memory H3 hexagonal indexing, upgrade matchers to `c6i.4xlarge`.

---

## 7. Real-Time Collaborative Whiteboard (Yjs CRDT & WebSockets)

BluPrnt supports Google Docs-style real-time collaboration on the architectural canvas (`useCollabSession.ts`, `roomManager.ts`, `wsHandler.ts`).

### 7.1 CRDT Architecture & Document Model
- **Yjs Shared Document:** Coordinates state across peers using Conflict-free Replicated Data Types (`Y.Doc`).
- **Synchronized Data Maps:**
  - `nodes`: Keyed map of React Flow node positions, dimensions, replicas, tiers, and telemetry.
  - `edges`: Directed connections with animated state and source/target handle anchors.
  - `settings`: Active room traffic rate, simulation toggle, and active template.
  - `chat`: Real-time multi-user chat log with timestamps and user badges.
  - `comments`: Granular node-anchored comment threads with author attribution and resolution tracking.
  - `snapshots`: Named version history checkpoints enabling one-click historical restore.

### 7.2 Multi-User Presence & Awareness Protocol
- **Live Cursor Tracking:** Broadcasts smooth mouse coordinate vectors ($x, y$) with assigned peer colors and display names.
- **Node Selection Outlines:** Displays colored halos and peer name tags around nodes currently selected or being edited by other collaborators.
- **Top Header Avatar Stack (`CollabHeader`):** Shows all online collaborators with real-time ping/latency indicators and editable display names.
- **Role-Based Access Control (RBAC):**
  - **Owner:** Full administrative authority, snapshot creation, room token regeneration, and participant expulsion.
  - **Editor:** Read and write permissions to move nodes, add components, connect edges, and run simulations.
  - **Viewer:** Read-only observer mode. Server-side WebSocket enforcement rejects mutation packets from viewers.
- **Scoped Undo/Redo:** `Y.UndoManager` is strictly scoped to the local client's origin (`localOrigin`), preventing a user's `Ctrl+Z` from undoing edits made by remote teammates.
- **Local Offline Cache (`y-indexeddb`):** Persists collaborative session state in IndexedDB so canvas architectures survive accidental tab closures and connection drops.

---

## 8. 18 Universal Auto-Streaming Distributed Algorithm Simulators

BluPrnt includes 18 standalone algorithm visualizers accessible under `/simulators`. Each visualizer features **Universal Auto-Streaming** (starts streaming immediately upon page visit with zero click-to-send friction), dynamic mode switching, failure injection, continuous vs. lockstep debugger modes, and color + shape accessible outcome streams.

### 8.1 Unified Simulator Architecture (`SimulatorScreen.tsx`, `useTrafficGenerator.ts`)
- **Top Controls Bar:** Live play/pause toggle (`Space`), reset canvas (`R`), traffic rate slider ($1 - 100$ req/s), and bursty traffic mode toggle (alternating quiet gaps with $4\times$ traffic bursts).
- **Dual Execution Modes:**
  1. *Continuous Auto-Streaming Mode:* Real-time streaming generator emitting requests according to Poisson/burst distributions.
  2. *Step-by-Step Debugger Mode (`SimulatorDebugger.tsx`):* Freezes time, allowing frame-by-frame lockstep execution (`Step 1 Frame`, `+10 Fast-Forward`) with an execution step counter.
- **Custom Payload & Key Injector (`CustomPayloadInjector.tsx`):** Allows users to inject specific keys (e.g. `user:4099`, `order:txn_992`) or raw JSON payloads to trace exact hash routing, cache hits, and state transitions.
- **Accessible Outcome Strip (`RequestStrip.tsx`):** Renders the last 44 request outcomes. Every outcome is encoded with **both color AND unique geometric shape** for 100% color-blind accessibility:
  - Circle (●), Square (■), Diamond (◆), Triangle (▲), Cross (✕), Slash (⧸).
- **3 KPI Stat Tiles:** Every module renders three real-time telemetry gauges (e.g., Hit Rate %, Dropped Traffic, Replication Lag).

### 8.2 Comprehensive Verification Matrix of All 18 Modules

| # | Module ID | Core Algorithm & Visualizer Design | Implemented Modes | Color + Shape Outcomes | Center KPI Metric | Three Telemetry Stat Tiles |
|---|---|---|---|---|---|---|
| **1** | `rate-limiter` | **Token & Leaky Bucket Cylinder Apparatus:** Animated glass cylinder showing live liquid/token level, refill nozzle stream, and HTTP 429 overflow splash. | Token Bucket, Leaky Bucket, Fixed Window, Sliding Log, Sliding Counter | Allowed (●), Throttled (✕), Queued (■) | Tokens Remaining / Queue Fill % | Total Inbound, Pass Rate %, Throttled (429) |
| **2** | `load-balancer` | **Multi-Server Rack Cluster:** Server cards (A, B, C) with live active in-flight connection gauges, server weights, and packet routing arrows. | Round Robin, Weighted Round Robin, Least Connections, Least Response Time, IP Hash, Power of Two Choices | Server A (●), Server B (■), Server C (◆), 503 Overloaded (✕) | Active In-Flight Connections | Total Dispatched, Cluster Imbalance, Dropped (503) |
| **3** | `consistent-hashing` | **360° SVG Hash Ring:** Circular coordinates showing physical node positions, virtual nodes (Vnodes), live streaming key hashes, and a partition load bar chart. | Standard Ring (1 Slot), Virtual Nodes (Vnodes), Modulo % N, Rendezvous HRW Hashing | Node 1 (●), Node 2 (■), Node 3 (◆), Node 4 (▲), Remapped (✕) | Cluster Balance Score % | Active Nodes, Key Spread (Max-Min), Remappings |
| **4** | `cache-policies` | **8-Slot Memory Cache Matrix:** Memory slot cells showing key tags, hit/miss neon flash indicators, and cold-candidate eviction flags. | LRU (Least Recently Used), LFU (Least Frequently Used), FIFO, Random Eviction, TTL Expiration | Cache Hit (●), Cache Miss (■), Evicted (▲), Stampede (✕) | Hit Ratio % | Cache Occupancy, Hit Rate %, Total Evictions |
| **5** | `bloom-filter` | **32-Bit Binary Array Grid:** Glowing bit array cells, 3 independent hash functions ($k=3$), array saturation meter, and zero false-negative guarantee. | Standard Bloom Filter, Counting Bloom Filter, Cuckoo Filter | Def Not In Set (●), True Positive (■), False Positive (✕), Inserted (◆) | Bit Array Saturation % | Disk Reads Filtered %, False Positive Rate %, Known Keys |
| **6** | `lsm-tree` | **3-Tier Storage Engine:** RAM MemTable (SkipList buffer with fill %), Level 0 SSTables (overlapping disk files), and Level 1 SSTables (compacted deduplicated runs). | Leveled Compaction (LCS), Size-Tiered (STCS), Time-Window Compaction (TWCS) | MemTable Write (●), L0 Flush (■), Compaction Merge (◆), I/O Spike (✕) | MemTable Fill % | Total Ingestion, Active SSTables, Write Amplification |
| **7** | `storage-indexes` | **B+ Tree vs. LSM vs. Hash Index:** Hierarchical B+ tree node splitting, sequential log appends, and memory hash table collision buckets. | B+ Tree Index, LSM-Tree Index, In-Memory Hash Index | Fast Point Read (●), Page Split (■), Seq Append (◆), Hash Collision (✕) | Avg I/O Latency (ms) | Total Index Ops, Structural Events, Read Complexity |
| **8** | `replication` | **Distributed Leader-Follower Cluster:** Primary node streaming write-ahead log (WAL) entries to secondary followers with replication lag gauges. | Single-Leader Async, Single-Leader Sync, Semi-Sync, Quorum (W+R > N) | Quorum Commit (●), Async Ack (■), Stale Read (◆), Blocked/Timeout (✕) | Follower Lag (ms) | Replication Stream, Replication Lag, Stale Reads |
| **9** | `sharding` | **Database Shard Partitioning:** Multiple shard databases with routing hash ranges, directory lookups, and cross-shard scatter-gather queries. | Hash Sharding, Range Sharding, Directory Lookup, Geographic Sharding | Shard 1 (●), Shard 2 (■), Shard 3 (◆), Scatter-Gather (▲), Hotspot (✕) | Max Shard Load % | Total Queries, Cross-Shard %, Shard Distribution |
| **10** | `raft-consensus` | **5-Node Distributed Quorum Mesh:** Five Raft nodes with crown indicator for elected Leader, heartbeat pulse waves, term election timers, and network partition cuts. | Log Replication, Leader Election, Partition Isolation | Heartbeat Ack (●), Log Committed (■), Vote Granted (◆), Quorum Lost (✕) | Current Term & Quorum Health | Active Leader, Log Commit Index, Quorum Health |
| **11** | `distributed-tx` | **Multi-Service Transaction Pipeline:** Order $\rightarrow$ Payment $\rightarrow$ Inventory $\rightarrow$ Delivery pipeline demonstrating 2PC prepare/commit and Saga compensating rollbacks. | Saga Orchestration, Saga Choreography, Two-Phase Commit (2PC), Three-Phase Commit (3PC) | Commit Success (●), Prepare Phase (■), Saga Rollback (◆), Abort/Timeout (✕) | Transaction Success % | Total Executions, Success Rate %, Saga Compensations |
| **12** | `circuit-breaker` | **Tri-State FSM Apparatus:** Illuminated Finite State Machine (`CLOSED` $\longleftrightarrow$ `HALF-OPEN` $\longleftrightarrow$ `OPEN`) with trip failure counters and recovery cooldown timer. | Standard (Martin Fowler), Adaptive Latency Percentile | Succeeded (●), Fast-Failed (✕), Probe Trial (■), Fallback (◆) | State (`CLOSED` / `OPEN` / `HALF-OPEN`) | Current State, Total Trips, Fast-Failed Rejections |
| **13** | `retry-strategies` | **Retry Storm & Backoff Timeline:** Visualizes client retry attempts over time with exponential delays, random jitter distributions, and cascading retry storms. | Full Jitter, Exponential Backoff, Fixed Delay, No Retry, Retry Storm | First Try OK (●), Retry Success (■), Retries Exhausted (✕), Storm Wave (▲) | Traffic Multiplier ($x$) | Logical Inbound, Wire Requests Sent, Traffic Multiplier |
| **14** | `message-queue` | **Kafka-Style Partitioned Topic Stream:** Message conveyor belts showing partition offsets, consumer group lag markers, and dead letter queue (DLQ) routing. | Partitioned Consumer Group, Point-to-Point, Pub/Sub Fanout, Dead Letter Queue (DLQ) | Enqueued (●), Consumed (■), Pub/Sub Fanout (◆), DLQ Routed (✕) | Backlog Depth (msgs) | Total Produced, Consumer Lag, Dead Letter (DLQ) |
| **15** | `cdn-edge` | **Global Edge vs. Origin Architecture:** Edge PoP nodes caching content globally with origin shield fallbacks and Stale-While-Revalidate (SWR) background refreshes. | Pull CDN, Push CDN, Stale-While-Revalidate (SWR) | Edge Hit (●), Origin Fetch (■), SWR Revalidate (◆), Origin Down (✕) | Edge Offload % | Edge Inbound, Origin Offload %, Origin Shield Hits |
| **16** | `gossip-protocol` | **Decentralized Node Mesh Network:** Nodes exchanging state rumors via randomized peer fanout, tracking infection spread and Phi accrual failure detection. | Push-Pull Gossip, Push-Only Rumors, Phi Accrual Failure Detector | Disseminated (●), Merged/Updated (■), Accrual Heartbeat (◆), Suspected Dead (✕) | State Convergence % | Cluster Size, State Convergence %, Suspected Dead Nodes |
| **17** | `autoscaling` | **Kubernetes Horizontal Pod Autoscaler (HPA):** Pod replica matrix scaling in and out dynamically based on CPU/traffic watermarks and CoDel load shedding. | Reactive (CPU Threshold), Predictive (ML Anticipation), Load Shedding (CoDel) | Processed SLA (●), Scale-Out Pod (◆), Scale-In Pod (■), Load Shed 503 (✕) | Active Pod Replicas | Cluster Capacity, Active Pods, Shed Traffic (503) |
| **18** | `idempotency` | **Idempotent API Gateway & Deduplication:** Client retry stream passing through an idempotency lock table verifying unique request tokens and preventing double mutations. | Idempotency Keys (Effectively Once), At-Least-Once Delivery, At-Most-Once Delivery | New Processed (●), Deduped Safe (■), Double Charge (✕), Dropped Packet (▲) | Safe Dedup Rate % | Total Inbound, Safely Deduped, Duplicate Write Faults |

---

## 9. Back-of-the-Envelope Capacity Sizing Calculators

The Calculators page (`/calculators` - `sizingMath.ts`) provides deterministic formulas and interactive sliders for system sizing calculations:

### 9.1 Sizing Modules
1. **QPS to Server Count Sizing:**
   - Inputs: Daily Active Users (DAU), Requests per User per Day, Peak-to-Average Traffic Ratio, Server QPS Capacity, Redundancy Buffer ($N+2$ headroom).
   - Outputs: Average QPS, Peak QPS, Required Server Instances, Cluster Headroom %.
2. **Storage Volume & Retention Sizing:**
   - Inputs: Daily New Records, Average Record Size (KB), Retention Horizon (Years), Storage Replication Factor ($3\times$), Index/Metadata Overhead %.
   - Outputs: Raw Daily Ingestion, Total Replicated Storage (TB/PB), Annual Disk Growth Rate.
3. **Network Bandwidth & CDN Offload Sizing:**
   - Inputs: Peak RPS, Average Response Payload Size (KB), CDN Edge Cache Hit Rate %.
   - Outputs: Total Edge Ingress Bandwidth (Gbps), Origin Egress Bandwidth (Gbps), Bandwidth Cost Savings %.
4. **Cache RAM & Hot Working Set Sizing:**
   - Inputs: Total Unique Keys, Pareto Hot Working Set % (e.g. 80/20 rule), Average Value Size (Bytes), Key Metadata Overhead, Read QPS, Target Cache Hit Rate.
   - Outputs: Required RAM (GB), Number of Cache Nodes needed, Database Queries Avoided per Second.

---

## 10. Spaced Repetition (SRS) Flashcards & Gamification

A complete learning retention system implemented in `FlashcardsPage.tsx`, `sm2.ts`, and `streak.ts`.

### 10.1 SuperMemo-2 (SM-2) Pure Mathematical Engine
- Calculates review intervals ($I$), repetition counts ($n$), and ease factors ($EF$ clamped $\ge 1.3$) based on user recall ratings:
  - **Again ($q=0$):** Resets interval to 1 day, decrements ease factor.
  - **Hard ($q=3$):** Advances interval by $1.2\times$, slightly decreases ease factor.
  - **Good ($q=4$):** Advances interval by standard $EF \times I$.
  - **Easy ($q=5$):** Advances interval by $EF \times I \times 1.3$ bonus multiplier.
- **Dexie.js Persistence:** Card review states are persisted in the `srsCards` IndexedDB table. Daily due queues are dynamically calculated based on calendar date stamps.

### 10.2 Gamification & Daily Streaks
- Tracks consecutive daily learning activity in IndexedDB.
- **Streak Freeze Protection:** Provides grace-period protection against accidental streak breaks.
- **Inactivity Notification Scheduler (`notificationScheduler.ts`):** Opt-in web notifications reminding users when flashcards are due for review.

---

## 11. Curriculum, Case Studies & Staff Mock Interviews

Structured pedagogical content stored in `/public/content/` and accessed via `ContentRepository.ts`:

### 11.1 Curriculum & Formative Quizzes
- **Three Comprehensive Masterclass Courses:**
  1. *Distributed Foundations:* Network boundaries, CAP theorem, PACELC theorem, clock drift, and latency propagation.
  2. *Storage Engines & Partitioning:* LSM-tree compaction, B+ tree mechanics, write amplification, and sharding strategies.
  3. *Traffic Shaping & Resilience:* Rate limiters, token buckets, circuit breakers, and load shedding.
- **Interactive Quiz Runner (`QuizRunner.tsx`):** Step-by-step multiple choice questions with explanations, instant grading, confetti celebration animations, and IndexedDB score tracking.
- **Bidirectional Linking:** Every curriculum lesson features direct launch links into its corresponding interactive visualizer, and every visualizer links back to its theory lesson.

### 11.2 Real-World Production Case Studies (`cases.json`)
Deep architectural breakdowns covering functional requirements, non-functional constraints, high-throughput data models, and common interview pitfalls:
- **Design a Distributed Unique ID Generator:** Twitter Snowflake bit allocation (41-bit timestamp, 10-bit worker ID, 12-bit sequence), NTP backward clock drift mitigation.
- **Design a Real-Time Collaborative Document Editor:** Operational Transformation (OT) vs. Conflict-Free Replicated Data Types (CRDTs), RGA trees, tombstone garbage collection, WebSocket gateway tier.
- **Design a Global Distributed Rate Limiter:** Multi-region Redis clusters, sliding window log vs. sliding window counter, fail-open vs. fail-closed edge policies.

### 11.3 Senior Staff Mock Interviews (`interview.json`)
Staff-level trade-off interview scenarios with collapsible senior answers, key architecture rubrics, and trade-off matrices:
- **Diagnosing anomalous P99 latency spikes** (GC pauses, connection pool starvation, tail amplification across fan-out microservices, hedged request patterns).
- **Idempotent payment processing API** (`POST /v1/charges`, atomic `SETNX` reservation, body hashing, two-phase charge flow).
- **Split-brain network partition recovery** (strict majority quorums, fencing generation tokens, STONITH fencing).

---

## 12. Security, Pro Monetization & Server Infrastructure

BluPrnt includes a production-ready Express + TypeScript backend (`bluprnt-server/`) paired with client-side Pro tier gating (`ProPage.tsx`).

### 12.1 Pro Tier & Monetization
- **Free vs. Pro Tier Matrix:**
  - *Free Tier:* Full access to all 18 algorithm visualizers, calculators, and curriculum; System Design Playground limited to 1 active room with max 3 collaborative participants.
  - *Pro Tier:* Unlimited collaborative rooms, up to 10 simultaneous participants per room, cloud delta sync, and advanced architecture templates.
- **Stripe Checkout & Webhook Integration (`stripeRoutes.ts`):**
  - Generates secure Stripe Checkout sessions (`/api/stripe/create-checkout-session`).
  - Cryptographically verifies Stripe webhook signatures (`stripe.webhooks.constructEvent`) on `/api/stripe/webhook`.
  - Authoritative `is_pro` status is stored server-side with zero client-side trust.
- **24-Hour HMAC Temporary Unlock Tokens (`tokenSigner.ts`):**
  - Enables temporary offline or promotional Pro access via HMAC-SHA256 signed access tokens with millisecond expiration validation.

### 12.2 Cloud Delta-Sync (`syncRoutes.ts`)
- Client synchronizes local Dexie.js records (designs, flashcards, study progress) to the server via `/api/sync/push` and `/api/sync/pull` delta packets, resolving conflicts via client-side timestamps.

### 12.3 Offline PWA (Progressive Web App)
- **Service Worker (`public/sw.js`):** Cache-first strategy for static assets, JavaScript bundles, and JSON curriculum content.
- **Web App Manifest (`public/manifest.json`):** Full standalone PWA installability on desktop and mobile platforms.

---

## 13. Project Structure & Verification Summary

### 13.1 Directory Layout
```
bluprnt/
├── bluprnt-client/                     # Frontend SPA (Vite + React 18 + TS + Tailwind)
│   ├── public/content/                 # Curriculum, case studies, flashcards, interviews
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                 # AppShell, Collapsible Sidebar, Theme Toggle
│   │   │   ├── playground/             # React Flow Canvas, NodePalette, AnimatedEdge,
│   │   │   │                           # ChaosStudio, Linter, Inspector, Challenges, Collab
│   │   │   └── simulators/             # Legacy & standalone visualizer components
│   │   ├── core/
│   │   │   ├── algorithms/             # M/M/c Queuing, DAG Latency, Linter, SM-2, Sizing
│   │   │   ├── collab/                 # Yjs CRDT Hook & Awareness bindings
│   │   │   ├── registry/               # Node Registry (43 components), Machine Tiers
│   │   │   └── types/                  # Machine Tier & Content type definitions
│   │   ├── db/                         # Dexie.js IndexedDB schema & migrations
│   │   ├── pages/                      # Playground, Simulators, Calculators, Cases, etc.
│   │   ├── simulators/                 # 18 Universal Auto-Streaming Modules & Engines
│   │   │   ├── components/             # VisualCard, HUD, Debugger, Custom Injector
│   │   │   ├── engine/                 # Poisson & Bursty TrafficGenerator
│   │   │   └── modules/                # 18 Domain-Specific Simulation Logic Modules
│   │   └── tests/                      # 117+ Vitest unit and integration tests
├── bluprnt-server/                     # Backend API & Real-Time Relay (Express + TS)
│   └── src/
│       ├── collab/                     # Yjs WebSocket server & Room Manager
│       ├── core/                       # HMAC Token Signer & Security
│       ├── db/                         # Server persistence store
│       └── routes/                     # Stripe, Collab, and Cloud Sync routes
├── Dockerfile                          # Unified 1-instance multi-stage production build
├── render.yaml / railway.json          # Deployment manifests
└── README.md & PROGRESS.md             # Developer documentation and phase tracking
```

### 13.2 Automated Test Suite Verification
The monorepo contains comprehensive automated tests across the algorithmic engines:
- `dagLatency.test.ts`: Cycle detection and topological critical-path latency calculation.
- `bottleneck.test.ts`: Saturation, dropped RPS, and $M/M/c$ queuing theory math.
- `architectureLinter.test.ts`: Reliability scoring, SPOF detection, and missing cache checks.
- `collabBinding.test.ts` & `collabConvergence.test.ts`: Yjs bidirectional binding and multi-client convergence.
- `sm2.test.ts`: SuperMemo SM-2 interval and ease factor mathematical stability.
- `trafficGenerator.test.ts`: Poisson and bursty traffic distributions, PRNG determinism.
- `simulatorModules.test.ts`: Algorithmic state transitions across all 18 simulators.
- `registryDefinitionOfDone.test.ts`: Automated compliance verifying all 18 modules implement modes, outcomes, center metrics, and 3 stat tiles.
- **Verification Status:** **117 passing tests (100% pass rate), 0 TypeScript compilation errors, clean production bundle.**
