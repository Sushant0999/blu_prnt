import json
import os

LESSONS_DIR = "bluprnt-client/public/content/lessons"
os.makedirs(LESSONS_DIR, exist_ok=True)

# 1. Catalog 5 Thematic Courses covering all 31 HLD topics
catalog_data = {
  "courses": [
    {
      "id": "distributed-foundations",
      "title": "1. Distributed Foundations & Core Metrics",
      "subtitle": "Latency, throughput, scaling boundaries, and physical consistency limits",
      "icon": "Layers",
      "description": "Master the physical and theoretical constraints of computing across unreliable networks, from Little's Law to Brewer's CAP theorem.",
      "topics": [
        {
          "id": "client-server-arch",
          "title": "Client-Server Architecture & Connection Multiplexing",
          "summary": "Stateful vs stateless protocols, HTTP/1.1 vs HTTP/2 vs HTTP/3, and TCP connection pooling.",
          "lesson": "client-server"
        },
        {
          "id": "latency-vs-throughput",
          "title": "Latency vs Throughput & Tail Latency",
          "summary": "Little's Law, P50/P90/P99 latency distribution, tail amplification in fan-out microservices, and Amdahl's law.",
          "lesson": "latency-throughput"
        },
        {
          "id": "scaling-strategies",
          "title": "Horizontal vs Vertical Scaling",
          "summary": "Shared-nothing vs shared-disk architectures, database read-replicas, partition keys, and auto-scaling cooldowns.",
          "lesson": "scaling-strategies"
        },
        {
          "id": "capacity-estimation",
          "title": "Back-of-the-Envelope Capacity Estimation",
          "summary": "QPS, memory 80/20 rule, network egress bandwidth, power-of-two memory approximations, and IOPS calculations.",
          "lesson": "capacity-estimation"
        },
        {
          "id": "cap-theorem",
          "title": "CAP Theorem & PACELC Model",
          "summary": "Consistency vs Availability trade-offs under inevitable network partitions, and latency trade-offs during normal operations.",
          "lesson": "cap-theorem"
        },
        {
          "id": "consistency-models",
          "title": "Distributed Consistency Models",
          "summary": "Linearizability, Sequential Consistency, Causal Consistency, Read-Your-Writes, and Eventual Consistency guarantees.",
          "lesson": "consistency-models"
        }
      ]
    },
    {
      "id": "network-ingress-protocols",
      "title": "2. Ingress, Network & Communication Protocols",
      "subtitle": "Load balancers, API gateways, edge CDNs, and protocol trade-offs",
      "icon": "Globe",
      "description": "Examine how client requests traverse edge PoPs, load balancers, and reverse proxies into backend microservices.",
      "topics": [
        {
          "id": "load-balancers",
          "title": "Load Balancers & Traffic Routing Algorithms",
          "summary": "Layer 4 (TCP/NLB) vs Layer 7 (HTTP/ALB), Round Robin, Weighted, Least Connections, and IP Hash algorithms.",
          "lesson": "load-balancers"
        },
        {
          "id": "cdn-edge",
          "title": "Content Delivery Networks (CDN)",
          "summary": "Anycast GeoDNS, Edge PoPs, origin shielding, stale-while-revalidate, and dynamic response acceleration.",
          "lesson": "cdn-edge"
        },
        {
          "id": "api-gateway",
          "title": "API Gateway & Reverse Proxies",
          "summary": "TLS termination, centralized JWT authentication, distributed rate limiting, canary routing, and BFF pattern.",
          "lesson": "api-gateway"
        },
        {
          "id": "api-protocols",
          "title": "REST vs gRPC vs GraphQL",
          "summary": "JSON text serialization vs Protobuf binary HTTP/2 multiplexing vs declarative single-endpoint query resolution.",
          "lesson": "api-protocols"
        }
      ]
    },
    {
      "id": "storage-caching-streaming",
      "title": "3. Storage Engines, Caching & Streaming",
      "subtitle": "Relational vs NoSQL, LSM-trees, consistent hashing, and message logs",
      "icon": "Database",
      "description": "Understand disk I/O mechanics, write amplification, consistent hash rings, and high-throughput append-only event logs.",
      "topics": [
        {
          "id": "caching-fundamentals",
          "title": "Distributed Caching & Invalidation",
          "summary": "Cache-Aside, Write-Through, Write-Behind, cache stampede prevention, and eviction algorithms.",
          "lesson": "caching"
        },
        {
          "id": "sql-vs-nosql",
          "title": "SQL vs NoSQL Data Stores",
          "summary": "Relational ACID vs Document, Wide-Column, Graph, Key-Value, and columnar OLAP query engines.",
          "lesson": "sql-vs-nosql"
        },
        {
          "id": "message-queues",
          "title": "Message Queues & Asynchronous Decoupling",
          "summary": "Point-to-point queues (RabbitMQ/SQS), push vs pull dispatching, backpressure, and dead letter queues (DLQ).",
          "lesson": "message-queues"
        },
        {
          "id": "kafka-deep-dive",
          "title": "Apache Kafka (Topics, Partitions, Consumer Groups)",
          "summary": "Append-only commit logs, partition rebalancing, In-Sync Replicas (ISR), segment files, and zero-copy sendfile.",
          "lesson": "kafka-architecture"
        },
        {
          "id": "consistent-hashing-topic",
          "title": "Consistent Hashing & Ring Distribution",
          "summary": "Virtual nodes, minimal key displacement during churn, and clockwise hash token routing.",
          "lesson": "consistent-hashing"
        },
        {
          "id": "lsm-trees-topic",
          "title": "LSM-Trees & Compaction Mechanics",
          "summary": "MemTables, SSTables, Bloom filters, and sequential append-only disk efficiency.",
          "lesson": "lsm-trees"
        },
        {
          "id": "key-value-store",
          "title": "Distributed Key-Value Store",
          "summary": "Dynamo-style architecture, vector clocks, hinted handoff, read repair, and tunable quorum ($R+W>N$).",
          "lesson": "key-value-store"
        }
      ]
    },
    {
      "id": "classic-system-designs",
      "title": "4. Classic Architectural System Designs",
      "subtitle": "Production-grade system architectures from TinyURL to Ride Sharing",
      "icon": "Cpu",
      "description": "End-to-end architectural case studies with functional requirements, non-functional targets, bottlenecks, and senior staff trade-offs.",
      "topics": [
        {
          "id": "url-shortener",
          "title": "Global URL Shortener (TinyURL)",
          "summary": "Base62 bijective encoding, 100:1 read-to-write ratio, Redis edge caching, and 301 vs 302 redirection semantics.",
          "lesson": "url-shortener"
        },
        {
          "id": "unique-id-generator",
          "title": "Distributed Unique ID Generator",
          "summary": "Twitter Snowflake 64-bit layout, millisecond timestamp ordering, machine ID bits, and NTP clock drift mitigation.",
          "lesson": "unique-id-generator"
        },
        {
          "id": "notification-service",
          "title": "Notification Service at Scale",
          "summary": "Prioritized queue dispatch, multi-vendor fallbacks (FCM/APNs/Twilio), deduplication, and user opt-out preferences.",
          "lesson": "notification-service"
        },
        {
          "id": "chat-application",
          "title": "Real-Time Chat Application",
          "summary": "Persistent WebSocket connection tier, presence tracking clusters, Redis Pub/Sub room routing, and Cassandra message history.",
          "lesson": "chat-application"
        },
        {
          "id": "news-feed",
          "title": "News Feed / Timeline Architecture",
          "summary": "Fan-out-on-write (push) vs Fan-out-on-read (pull), hybrid celebrity models, and Redis timeline list caches.",
          "lesson": "news-feed"
        },
        {
          "id": "search-autocomplete",
          "title": "Search Autocomplete (Typeahead)",
          "summary": "Trie prefix tree serialization, frequency sampling, distributed prefix caching, and n-gram indexing.",
          "lesson": "search-autocomplete"
        },
        {
          "id": "file-storage",
          "title": "Distributed File Storage (Google Drive)",
          "summary": "4MB block chunking, SHA-256 content-addressed deduplication, metadata DB, and S3 block storage.",
          "lesson": "file-storage"
        },
        {
          "id": "ecommerce-system",
          "title": "E-Commerce Order & Inventory Pipeline",
          "summary": "Distributed transactions, Saga orchestration vs choreography, Redis inventory locks, and cart TTL expiration.",
          "lesson": "ecommerce-system"
        },
        {
          "id": "payment-system",
          "title": "Payment System & Double-Entry Ledger",
          "summary": "Strict idempotency keys, double-entry immutable accounting, payment gateway failover, and reconciliation batches.",
          "lesson": "payment-system"
        },
        {
          "id": "ticket-booking",
          "title": "High-Concurrency Ticket Booking (BookMyShow)",
          "summary": "Flash sale inventory protection, distributed seat reservation with TTL, virtual waiting rooms, and DB lock contention.",
          "lesson": "ticket-booking"
        },
        {
          "id": "ride-sharing",
          "title": "Ride Sharing & Geospatial Dispatch (Uber)",
          "summary": "Geospatial indexing (H3 / S2 cells), driver location heartbeat streams, and real-time bipartite matching dispatch.",
          "lesson": "ride-sharing"
        }
      ]
    },
    {
      "id": "resilience-observability-security",
      "title": "5. Reliability, Observability & Security",
      "subtitle": "Service discovery, fault tolerance, circuit breakers, and zero-trust security",
      "icon": "ShieldCheck",
      "description": "Protect microservices from cascading collapses, monitor distributed telemetry, and enforce cryptographic zero-trust boundaries.",
      "topics": [
        {
          "id": "service-discovery",
          "title": "Service Discovery & Health Checking",
          "summary": "Client-side (Eureka) vs Server-side (ALB/Kubernetes CoreDNS) discovery, heartbeat leases, and consensus registries.",
          "lesson": "service-discovery"
        },
        {
          "id": "fault-tolerance",
          "title": "Fault Tolerance & Redundancy Models",
          "summary": "Crash-stop vs Byzantine faults, failover topologies, $N+2$ redundancy, bulkheads, and graceful degradation.",
          "lesson": "fault-tolerance"
        },
        {
          "id": "rate-limiting-topic",
          "title": "Traffic Shaping & Rate Limiting",
          "summary": "Token buckets, leaky buckets, sliding windows, and distributed atomic rate counters.",
          "lesson": "rate-limiting"
        },
        {
          "id": "circuit-breakers",
          "title": "Retries & Circuit Breakers",
          "summary": "Exponential backoff with full jitter, circuit breaker state machine (Closed, Open, Half-Open), and fallback caches.",
          "lesson": "circuit-breakers"
        },
        {
          "id": "observability",
          "title": "Observability (Logs, Metrics, Traces)",
          "summary": "OpenTelemetry span propagation, W3C TraceContext, Prometheus pull metrics, and structured distributed logging.",
          "lesson": "observability"
        },
        {
          "id": "system-security",
          "title": "Security in System Design",
          "summary": "Mutual TLS (mTLS), OAuth2 / OIDC token validation, HMAC request signing, WAF DDoS filtering, and encryption at rest.",
          "lesson": "system-security"
        }
      ]
    }
  ]
}

with open("bluprnt-client/public/content/catalog.json", "w") as f:
    json.dump(catalog_data, f, indent=2)

print("Saved catalog.json with 5 thematic courses covering all 31 HLD topics!")
