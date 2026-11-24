import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ArrowRight,
  Layers,
  Cpu,
  BookOpen,
  AlertCircle,
  ExternalLink,
  Flame,
  Award,
  ChevronRight,
  ShieldAlert,
  Zap,
  RefreshCw,
  FileText,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ContentRepository } from '../repository/ContentRepository';
import type { InterviewPrompt } from '../types/content';
import { db } from '../db/database';

export interface MockScenario {
  id: string;
  type: 'hld' | 'lld';
  title: string;
  subtitle: string;
  difficulty: 'Medium' | 'Hard';
  estimatedMinutes: number;
  prompt: string;
  requirements: string[];
  scaleNumbers?: string[];
  rubric: string[];
  canvasLink: string;
  referenceNotes: string;
}

export const MOCK_SCENARIOS: MockScenario[] = [
  // HLD Mocks
  {
    id: 'mock-hld-url-shortener',
    type: 'hld',
    title: 'HLD Mock: Global URL Shortener',
    subtitle: '100M URLs/day, read-heavy, sub-15ms global redirection SLA.',
    difficulty: 'Medium',
    estimatedMinutes: 45,
    prompt: 'Design a global URL shortening service like TinyURL or bit.ly with 100:1 read-to-write ratio.',
    requirements: [
      'Generate a 7-character short alias for any long URL.',
      'Redirect short URL accesses to the target URL in < 15ms.',
      'Support custom aliases and expiration TTLs.',
      'Track click metrics and analytics.'
    ],
    scaleNumbers: ['100M writes/day (~1,160 QPS)', '116,000 read QPS', '90 TB storage over 5 years'],
    rubric: [
      'Did you compute QPS and storage requirements accurately?',
      'Did you use Base62 bijective encoding over 64-bit distributed IDs instead of truncated hashing?',
      'Did you design a Redis cache layer for the top 20% hot URLs?',
      'Did you explain the trade-offs between 301 vs 302 redirection?'
    ],
    canvasLink: '/playground?template=url-shortener',
    referenceNotes: 'Base62 conversion of 64-bit Snowflake IDs avoids hash collisions. Caching top 20% hot links in Redis satisfies 99% of reads directly from RAM.'
  },
  {
    id: 'mock-hld-chat-application',
    type: 'hld',
    title: 'HLD Mock: Real-Time Chat App',
    subtitle: '50M concurrent WebSocket connections, 1-on-1 and group channels.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design a real-time messaging platform like WhatsApp or Slack supporting 50M concurrent users.',
    requirements: [
      'Real-time 1-on-1 and group messaging with delivery receipts (Sent, Delivered, Read).',
      'User online/offline presence tracking.',
      'Message history sync across multiple user devices.'
    ],
    scaleNumbers: ['50M concurrent connections', '10B messages/day', 'P95 latency < 50ms'],
    rubric: [
      'Did you terminate WebSockets at a stateless gateway layer?',
      'Did you use Redis Pub/Sub or Kafka to route messages across gateway servers?',
      'Did you partition message history in Cassandra by conversation_id?',
      'Did you address heartbeats and TTLs for presence status?'
    ],
    canvasLink: '/playground',
    referenceNotes: 'Persistent WebSockets for delivery, Redis session registry mapping user to gateway, Cassandra message store partitioned by chat room.'
  },
  {
    id: 'mock-hld-notification-system',
    type: 'hld',
    title: 'HLD Mock: Multi-Channel Notification System',
    subtitle: '1 Billion notifications/day across APNs, FCM, SMS, and Email.',
    difficulty: 'Medium',
    estimatedMinutes: 45,
    prompt: 'Design a high-volume notification dispatch service with priority queues and provider failover.',
    requirements: [
      'Support Push (iOS/Android), SMS, and Email.',
      'Prioritize transactional OTPs over promotional marketing blasts.',
      'Enforce user frequency caps and opt-out preferences.'
    ],
    scaleNumbers: ['1B notifications/day (~12,000 QPS avg, 50,000 peak QPS)'],
    rubric: [
      'Did you isolate critical OTPs from marketing batches in separate queues?',
      'Did you include rate-limiting and frequency-capping tables in Redis?',
      'Did you model secondary vendor fallback for SMS/Email failures?'
    ],
    canvasLink: '/playground',
    referenceNotes: 'Asynchronous queue tiers with worker pools interfacing with APNs/FCM/Twilio. Sliding-window Redis throttles protect users from spam.'
  },
  {
    id: 'mock-hld-ecommerce-system',
    type: 'hld',
    title: 'HLD Mock: Flash-Sale E-Commerce System',
    subtitle: '500,000 fans competing for 50,000 limited items with zero overselling.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design an e-commerce checkout and inventory system capable of absorbing flash sale traffic surges.',
    requirements: [
      'Browse catalog, reserve items in cart, and complete payment checkout.',
      'Strictly guarantee zero overselling of limited inventory.',
      'Release reserved items if payment is not completed within 15 minutes.'
    ],
    scaleNumbers: ['25,000 checkout QPS peak', '100% inventory accuracy'],
    rubric: [
      'Did you avoid relational database row locks during flash sales?',
      'Did you use Redis Lua scripts for atomic stock decrement?',
      'Did you use the Saga pattern for distributed order-payment-inventory orchestration?'
    ],
    canvasLink: '/playground?template=ecommerce-checkout',
    referenceNotes: 'Pre-load inventory into Redis with atomic Lua decrement. Meter traffic with a virtual waiting room. Coordinate checkout via Saga orchestrator.'
  },
  {
    id: 'mock-hld-weakest-topic',
    type: 'hld',
    title: 'HLD Mock: Adaptive Weakest Topic Drill',
    subtitle: 'Dynamically targeted interview prompt focusing on your lowest-scoring distributed systems topic.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design a distributed consensus and metadata coordinator (ZooKeeper / Raft) managing leader election and configuration locking.',
    requirements: [
      'Maintain cluster quorum with leader election under network partitions.',
      'Support distributed locks with monotonic fencing tokens.',
      'Provide linearizable reads and atomic writes.'
    ],
    rubric: [
      'Did you enforce majority quorum Q = floor(N/2) + 1?',
      'Did you explain fencing tokens to prevent zombie leader split-brain writes?',
      'Did you address heartbeats and election timeout jitter?'
    ],
    canvasLink: '/playground',
    referenceNotes: 'Raft consensus with odd-node clustering (3, 5, 7). Monotonic fencing tokens passed to downstream storage to reject delayed writes.'
  },
  {
    id: 'mock-hld-new-problem',
    type: 'hld',
    title: 'HLD Mock: Unseen Design Challenge (Web Crawler)',
    subtitle: 'Fresh design challenge testing first-principles distributed systems thinking.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design a distributed web crawler that traverses the World Wide Web and downloads 1 Billion web pages per month.',
    requirements: [
      'Crawl 1 Billion pages/month with politeness constraints (respect robots.txt, avoid swamping hosts).',
      'Detect and eliminate duplicate URLs using Bloom filters.',
      'Store raw HTML and metadata for downstream search indexers.'
    ],
    rubric: [
      'Did you separate URL Frontier (priority & politeness queues) from worker fetchers?',
      'Did you use Bloom filters or fingerprint hashes for URL deduplication?',
      'Did you design an asynchronous DNS resolution cache?'
    ],
    canvasLink: '/playground',
    referenceNotes: 'URL Frontier with host-partitioned politeness queues, Bloom filters for deduplication, and S3 object storage for raw HTML snapshots.'
  },
  {
    id: 'mock-hld-full-mock',
    type: 'hld',
    title: 'HLD Mock: Complete 45-Minute Staff Interview',
    subtitle: 'Comprehensive end-to-end staff-level interview with phase countdown and scoring rubric.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design a global distributed video streaming platform like Netflix or YouTube supporting video transcoding, CDN playback, and real-time viewing telemetry.',
    requirements: [
      'Upload video content, transcode into multi-bitrate HLS/DASH streams, and distribute via edge CDNs.',
      'Support resume playback from last watched timestamp across devices.',
      'Handle millions of concurrent 4K playback streams with sub-second buffering.'
    ],
    rubric: [
      'Did you separate upload ingestion & async transcoding pipeline from CDN playback?',
      'Did you size egress bandwidth and storage for multi-bitrate chunking?',
      'Did you design an in-memory bookmark service for playback progress?'
    ],
    canvasLink: '/playground?template=netflix-streaming',
    referenceNotes: 'Async transcode pipeline over S3 and batch workers, Open Connect edge caching for 95%+ CDN offload, Redis for playback position bookmarks.'
  },

  // LLD Mocks
  {
    id: 'mock-lld-parking-lot',
    type: 'lld',
    title: 'LLD Mock: Multi-Floor Parking Lot',
    subtitle: 'OOP modeling, vehicle spot assignment, Strategy pattern fee calculation, and thread safety.',
    difficulty: 'Medium',
    estimatedMinutes: 45,
    prompt: 'Design an object-oriented software system for an automated multi-floor parking lot.',
    requirements: [
      'Support multiple floors and spot sizes: Compact, Large, Handicapped, Motorcycle.',
      'Support vehicle types (Car, Truck, Motorcycle) and issue parking tickets at entry.',
      'Calculate exit fees using interchangeable pricing strategies (Hourly, Flat Rate).'
    ],
    rubric: [
      'Did you decouple Vehicle from ParkingSpot?',
      'Is fee calculation decoupled via a Strategy interface?',
      'Are concurrent spot allocations synchronized to prevent double parking?'
    ],
    canvasLink: '/lld/problems/parking-lot',
    referenceNotes: 'ParkingLot facade delegating spot allocation to ParkingFloor and fee calculation to FeeCalculationStrategy.'
  },
  {
    id: 'mock-lld-book-my-show',
    type: 'lld',
    title: 'LLD Mock: Cinema Ticket Booking',
    subtitle: 'Theater/Screen hierarchy, seat locking, payment checkout timeout, and concurrency.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design a movie ticket booking system like BookMyShow with concurrent seat holding.',
    requirements: [
      'Model Cinema, Screen, Show, and Seat entities.',
      'Allow users to select seats and hold them temporarily for 10 minutes.',
      'Ensure no two users can book or hold the exact same seat simultaneously.'
    ],
    rubric: [
      'Did you model Seat as distinct from ShowSeat (which contains show-specific status and price)?',
      'Did you implement thread-safe seat locking with timeout expiration?',
      'Is payment processing decoupled from seat reservation?'
    ],
    canvasLink: '/lld/problems/book-my-show',
    referenceNotes: 'BookingSystem coordinates ShowSeats with status transitions (AVAILABLE -> HELD -> BOOKED) using synchronization or Redis locks.'
  },
  {
    id: 'mock-lld-rate-limiter',
    type: 'lld',
    title: 'LLD Mock: In-Memory Rate Limiter',
    subtitle: 'Token Bucket algorithm, pluggable strategies, sub-millisecond evaluation, thread safety.',
    difficulty: 'Medium',
    estimatedMinutes: 45,
    prompt: 'Design a thread-safe, high-throughput in-memory rate limiting library.',
    requirements: [
      'Support per-client limits with configurable capacity and refill rate.',
      'Pluggable algorithms: Token Bucket and Sliding Window Log via Strategy pattern.',
      'Sub-millisecond evaluation latency without global lock contention.'
    ],
    rubric: [
      'Did you calculate token refills lazily on request arrival rather than spawning background threads per client?',
      'Is client tracking isolated using ConcurrentHashMap without locking the entire registry?',
      'Is the rate limiting algorithm encapsulated behind an interface?'
    ],
    canvasLink: '/lld/problems/rate-limiter',
    referenceNotes: 'Lazy token calculation: tokens = min(capacity, current + delta * refillRate). ConcurrentHashMap with per-client synchronization.'
  },
  {
    id: 'mock-lld-splitwise',
    type: 'lld',
    title: 'LLD Mock: Expense Sharing App (Splitwise)',
    subtitle: 'Group balances, unequal/percentage splits, Strategy pattern, and debt simplification.',
    difficulty: 'Medium',
    estimatedMinutes: 45,
    prompt: 'Design an expense-sharing application like Splitwise supporting multiple split types.',
    requirements: [
      'Support Equal, Exact, and Percentage expense splits.',
      'Maintain running net balances between users in a group.',
      'Support debt simplification algorithm to minimize total transaction count.'
    ],
    rubric: [
      'Did you use the Strategy Pattern for SplitStrategy (EqualSplit, ExactSplit, PercentageSplit)?',
      'Did you validate that percentage splits sum strictly to 100%?',
      'Did you maintain a balance sheet ledger tracking who owes whom?'
    ],
    canvasLink: '/lld/problems/splitwise',
    referenceNotes: 'ExpenseManager delegates validation and balance updates to polymorphic SplitStrategy implementations.'
  },
  {
    id: 'mock-lld-weakest-topic',
    type: 'lld',
    title: 'LLD Mock: Adaptive Weakest LLD Drill',
    subtitle: 'Targeted practice on State Pattern and Concurrency Guards.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design an ATM System modeling card authentication, state transitions, and cash dispensing.',
    requirements: [
      'Model states: Idle, HasCard, PinValidated, Dispensing.',
      'Dispense cash using optimal denominations ($100, $50, $20) via Chain of Responsibility.',
      'Atomic rollback if hardware dispenser jams.'
    ],
    rubric: [
      'Did you implement the State Pattern for ATM lifecycle?',
      'Did you implement Chain of Responsibility for CashDispenser?',
      'Is BankService mocked behind an interface?'
    ],
    canvasLink: '/lld/problems/atm-system',
    referenceNotes: 'ATM context delegates operations to ATMState. CashDispenser uses Chain of Responsibility for currency denominations.'
  },
  {
    id: 'mock-lld-new-problem',
    type: 'lld',
    title: 'LLD Mock: Unseen Design Challenge (Job Scheduler)',
    subtitle: 'Design an in-process prioritized task scheduler with worker pools.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design an in-process thread-safe task scheduler supporting delayed and recurring fixed-rate jobs.',
    requirements: [
      'Schedule one-time delayed tasks and recurring cron jobs.',
      'Execute tasks across a bounded worker thread pool.',
      'Support task cancellation and priority execution.'
    ],
    rubric: [
      'Did you use a PriorityBlockingQueue ordered by execution timestamp to avoid busy-waiting?',
      'Are jobs modeled polymorphically via a Job interface?',
      'Did you handle exceptions inside worker threads to prevent scheduler collapse?'
    ],
    canvasLink: '/lld/problems/job-scheduler',
    referenceNotes: 'JobScheduler uses PriorityBlockingQueue with supervisor thread waiting on next due timestamp. WorkerPool executes tasks asynchronously.'
  },
  {
    id: 'mock-lld-full-mock',
    type: 'lld',
    title: 'LLD Mock: Complete 45-Minute LLD Interview',
    subtitle: 'End-to-end object-oriented architecture modeling under strict time limits.',
    difficulty: 'Hard',
    estimatedMinutes: 45,
    prompt: 'Design a digital payment wallet with double-entry accounting and strict idempotency.',
    requirements: [
      'Support wallet top-up, withdrawal, and peer-to-peer transfers.',
      'Enforce double-entry accounting: sum of debits must equal sum of credits.',
      'Idempotency key deduplication to prevent double-charging.'
    ],
    rubric: [
      'Did you acquire locks in consistent lexicographical order to prevent deadlocks?',
      'Are transactions recorded as immutable ledger entries rather than in-place balance overwrites?',
      'Did you use the Command Pattern for transaction execution and rollback?'
    ],
    canvasLink: '/lld/problems/payment-wallet',
    referenceNotes: 'WalletService acquires account locks ordered by account ID to prevent deadlocks. Command pattern executes double-entry ledger entries.'
  }
];

export const InterviewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mock' | 'redraw' | 'revision' | 'prompts'>('mock');
  const [selectedMock, setSelectedMock] = useState<MockScenario>(MOCK_SCENARIOS[0]);
  const [mockFilter, setMockFilter] = useState<'all' | 'hld' | 'lld'>('all');

  // 45-Minute Timer State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [candidateNotes, setCandidateNotes] = useState<string>('');
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [showSolution, setShowSolution] = useState<boolean>(false);

  // Q&A Prompts State
  const [prompts, setPrompts] = useState<InterviewPrompt[]>([]);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [revealedMap, setRevealedMap] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Timer Ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await ContentRepository.getInterviewPrompts();
        setPrompts(data.prompts || []);

        const records = await db.interviews.toArray();
        const map: Record<string, boolean> = {};
        records.forEach((r) => {
          map[r.promptId] = r.bookmarked;
        });
        setBookmarkedMap(map);
      } catch (e) {
        console.error('Failed to load prompts', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            confetti({ particleCount: 50, spread: 60 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => setIsTimerRunning(true);
  const handlePauseTimer = () => setIsTimerRunning(false);
  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeftSeconds(45 * 60);
    setChecklistState({});
    setShowSolution(false);
  };

  // Determine current interview phase
  const elapsedMinutes = (45 * 60 - timeLeftSeconds) / 60;
  const currentPhase =
    elapsedMinutes < 5
      ? { step: 1, name: 'Phase 1: Requirements & Sizing', time: '0 – 5 min', color: 'text-cyan-500' }
      : elapsedMinutes < 15
      ? { step: 2, name: 'Phase 2: High-Level Architecture', time: '5 – 15 min', color: 'text-indigo-500' }
      : elapsedMinutes < 35
      ? { step: 3, name: 'Phase 3: Deep Dives & Data Models', time: '15 – 35 min', color: 'text-amber-500' }
      : { step: 4, name: 'Phase 4: Failure Modes & Bottlenecks', time: '35 – 45 min', color: 'text-rose-500' };

  const filteredMocks = MOCK_SCENARIOS.filter(
    (m) => mockFilter === 'all' || m.type === mockFilter
  );

  const toggleBookmark = async (promptId: string) => {
    const nextVal = !bookmarkedMap[promptId];
    setBookmarkedMap((prev) => ({ ...prev, [promptId]: nextVal }));
    await db.interviews.put({
      promptId,
      bookmarked: nextVal,
      practiced: true,
      updatedAt: Date.now(),
    });
  };

  const toggleReveal = (id: string) => {
    setRevealedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = ['All', 'Observability & Latency', 'API Design & Transactions', 'Consensus & Partitions'];
  const filteredPrompts = prompts.filter(
    (p) => selectedCategory === 'All' || p.category === selectedCategory
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 border border-cyan-500/20 p-6 md:p-10 shadow-xl overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practice & Mock Interview Suite</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Master Senior System Design Interviews
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Time-boxed 45-minute simulations, 14 targeted mock scenarios (HLD + LLD), memory redraw drills, and senior staff interview rubrics.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('mock')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                activeTab === 'mock'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>45-Min Mock Cockpit (14 Scenarios)</span>
            </button>
            <button
              onClick={() => setActiveTab('redraw')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                activeTab === 'redraw'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Blank Canvas Redraw Drills</span>
            </button>
            <button
              onClick={() => setActiveTab('revision')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                activeTab === 'revision'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Revision Radar & Cram Mode</span>
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                activeTab === 'prompts'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Staff Q&A Prompts</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: 45-Minute Timed Mock Cockpit */}
      {activeTab === 'mock' && (
        <div className="space-y-8">
          {/* Cockpit Status Bar */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Clock display */}
            <div className="flex items-center gap-4">
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
                {formatTime(timeLeftSeconds)}
              </div>

              <div className="flex items-center gap-2">
                {!isTimerRunning ? (
                  <button
                    onClick={handleStartTimer}
                    className="p-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white shadow-md shadow-cyan-500/20 transition"
                    title="Start Interview Timer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handlePauseTimer}
                    className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/20 transition"
                    title="Pause Interview Timer"
                  >
                    <Pause className="w-5 h-5 fill-current" />
                  </button>
                )}
                <button
                  onClick={handleResetTimer}
                  className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  title="Reset 45-Min Timer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Current Phase Indicator */}
            <div className="flex-1 max-w-md w-full space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${currentPhase.color}`}>
                  {currentPhase.name}
                </span>
                <span className="font-mono text-slate-400">{currentPhase.time}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-1000"
                  style={{ width: `${Math.min(100, (elapsedMinutes / 45) * 100)}%` }}
                />
              </div>
            </div>

            {/* Action link to Live Workspace */}
            <Link
              to={selectedMock.canvasLink}
              target="_blank"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition inline-flex items-center gap-2 shrink-0"
            >
              <span>Open Design Canvas</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Scenario Selector & Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: 14 Scenario Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Select Mock Scenario
                </h3>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setMockFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition ${mockFilter === 'all' ? 'bg-white dark:bg-slate-900 shadow-sm text-cyan-600' : 'text-slate-500'}`}
                  >
                    All (14)
                  </button>
                  <button
                    onClick={() => setMockFilter('hld')}
                    className={`px-2.5 py-1 rounded-lg transition ${mockFilter === 'hld' ? 'bg-white dark:bg-slate-900 shadow-sm text-cyan-600' : 'text-slate-500'}`}
                  >
                    HLD (7)
                  </button>
                  <button
                    onClick={() => setMockFilter('lld')}
                    className={`px-2.5 py-1 rounded-lg transition ${mockFilter === 'lld' ? 'bg-white dark:bg-slate-900 shadow-sm text-cyan-600' : 'text-slate-500'}`}
                  >
                    LLD (7)
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredMocks.map((mock) => {
                  const isSelected = selectedMock.id === mock.id;
                  return (
                    <div
                      key={mock.id}
                      onClick={() => setSelectedMock(mock)}
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-md ring-1 ring-cyan-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${mock.type === 'hld' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'}`}>
                          {mock.type.toUpperCase()} Mock
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {mock.difficulty} • {mock.estimatedMinutes}m
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {mock.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {mock.subtitle}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Mock Workspace, Rubric, and Notes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Scenario Details */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedMock.title}
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Target: 45 Minutes
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedMock.prompt}
                </p>

                {/* Requirements */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Functional & Scope Requirements:
                  </h4>
                  <ul className="space-y-1 pl-4 list-disc text-xs text-slate-600 dark:text-slate-400">
                    {selectedMock.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>

                {/* Scale Numbers if available */}
                {selectedMock.scaleNumbers && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                      Target Scale Constraints:
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedMock.scaleNumbers.map((num, i) => (
                        <span key={i} className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rubric Checklist */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Staff-Level Evaluation Rubric
                  </h3>
                  <span className="text-xs text-slate-500">
                    Check off points as you address them
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedMock.rubric.map((item, idx) => {
                    const isChecked = !!checklistState[`rubric_${idx}`];
                    return (
                      <label
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setChecklistState((prev) => ({
                              ...prev,
                              [`rubric_${idx}`]: !prev[`rubric_${idx}`],
                            }))
                          }
                          className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Candidate Notes & Scratchpad */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Interview Scratchpad & Notes
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Auto-saved</span>
                </div>
                <textarea
                  value={candidateNotes}
                  onChange={(e) => setCandidateNotes(e.target.value)}
                  placeholder="Draft sizing calculations, schema tables, API contracts, and trade-offs..."
                  className="w-full h-36 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs focus:ring-2 focus:ring-cyan-500 resize-none leading-relaxed text-slate-900 dark:text-slate-100"
                />

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setShowSolution((prev) => !prev)}
                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    {showSolution ? 'Hide Model Architecture Solution' : 'Reveal Model Architecture Solution'}
                  </button>

                  <button
                    onClick={() => {
                      confetti({ particleCount: 75, spread: 70 });
                      alert('Mock solution recorded in your IndexedDB journal!');
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition"
                  >
                    Submit Mock Solution
                  </button>
                </div>

                {showSolution && (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 mt-4 space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Model Staff-Level Architectural Rationale
                    </h4>
                    <p className="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                      {selectedMock.referenceNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Memory Redraw Drills */}
      {activeTab === 'redraw' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-cyan-500" />
              <span>Blank Canvas Redraw Drills (Memory Reconstruction)</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
              Deliberate memory practice: choose a design problem, launch an empty canvas, and reconstruct the architecture from scratch without notes. Submit to reveal the side-by-side gold standard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Redraw: Global URL Shortener',
                type: 'HLD',
                prompt: 'Reconstruct Ingress, CDN edge, API Gateway, Redis cache, and DB replication from memory.',
                link: '/playground?template=blank',
                target: 'url-shortener',
              },
              {
                title: 'Redraw: Multi-Floor Parking Lot',
                type: 'LLD',
                prompt: 'Model ParkingLot, ParkingFloor, ParkingSpot hierarchy, Vehicle types, and Fee Strategy.',
                link: '/lld/problems/parking-lot',
                target: 'parking-lot',
              },
              {
                title: 'Redraw: Real-Time Chat Architecture',
                type: 'HLD',
                prompt: 'Reconstruct WebSocket connection gateways, Redis session registry, and Cassandra history store.',
                link: '/playground?template=blank',
                target: 'chat-application',
              },
              {
                title: 'Redraw: In-Memory Rate Limiter',
                type: 'LLD',
                prompt: 'Model RateLimiter, TokenBucketStrategy, SlidingWindowLog, and thread-safe registry.',
                link: '/lld/problems/rate-limiter',
                target: 'rate-limiter',
              },
              {
                title: 'Redraw: E-Commerce Flash Checkout',
                type: 'HLD',
                prompt: 'Reconstruct Saga orchestrator, inventory locks, and payment gateway rollback topology.',
                link: '/playground?template=blank',
                target: 'ecommerce-checkout',
              },
              {
                title: 'Redraw: Digital Payment Wallet & Ledger',
                type: 'LLD',
                prompt: 'Model Wallet, Account, Transaction, and Command Pattern double-entry accounting ledger.',
                link: '/lld/problems/payment-wallet',
                target: 'payment-wallet',
              },
            ].map((drill, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                      {drill.type} Drill
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">No Notes Allowed</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {drill.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {drill.prompt}
                  </p>
                </div>

                <Link
                  to={drill.link}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs text-center shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition flex items-center justify-center gap-1.5"
                >
                  <span>Launch Blank Redraw Canvas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Revision Radar & Cram Mode */}
      {activeTab === 'revision' && (
        <div className="space-y-8">
          {/* Quick Cram Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>1. High-Yield Power-of-Two Math</span>
              </h3>
              <div className="space-y-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                <div>2^10 = 1,024 ≈ 1 KB</div>
                <div>2^20 = 1,048,576 ≈ 1 MB</div>
                <div>2^30 = 1,073,741,824 ≈ 1 GB</div>
                <div>2^40 ≈ 1 Terabyte (TB)</div>
                <div>86,400 seconds/day ≈ 100,000 sec</div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Timer className="w-4 h-4" />
                <span>2. Latency Numbers Every SWE Knows</span>
              </h3>
              <div className="space-y-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                <div>L1 Cache Reference: 0.5 ns</div>
                <div>Branch Mispredict: 5 ns</div>
                <div>Main Memory (RAM) Read: 100 ns</div>
                <div>SSD Random Read: 150 µs</div>
                <div>Cross-datacenter RTT: 150 ms</div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>3. Pre-Interview Pitfall Traps</span>
              </h3>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <div>• Never use UUIDv4 for high-write B-Tree primary keys.</div>
                <div>• Never omit jitter from exponential backoff retries.</div>
                <div>• Always calculate token bucket refills lazily.</div>
                <div>• Always acquire multiple locks in strict ID order.</div>
              </div>
            </div>
          </div>

          {/* Quick-Scan Design Notes Drawer */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              High-Yield Design Notes Summary (52 Topics)
            </h3>
            <p className="text-xs text-slate-500">
              Bulletproof 1-minute cheat sheets for rapid review before your mock interview:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                { title: 'Consistent Hashing', note: 'Virtual nodes prevent hot-spot clustering. When adding or removing a node, only K/N keys are displaced on average.' },
                { title: 'LSM-Trees vs B-Trees', note: 'LSM-trees turn random writes into sequential disk append log entries. B-trees optimize for random point reads with O(log N) latency.' },
                { title: 'Saga Pattern', note: 'Decoupled local transactions with compensating rollbacks. Replaces blocking Two-Phase Commit in microservices.' },
                { title: 'Idempotency Keys', note: 'Client generates UUID header. Server atomically inserts key with status PROCESSING to prevent duplicate charging on retries.' },
                { title: 'Token Bucket vs Leaky Bucket', note: 'Token Bucket allows bursts up to capacity while refilling steadily. Leaky Bucket smooths traffic to a strictly constant egress rate.' },
                { title: 'CAP Theorem & PACELC', note: 'If Partition (A vs C); Else (Latency vs Consistency). You cannot choose CA in physical distributed systems.' },
              ].map((c, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{c.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{c.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Senior Interview Prompts */}
      {activeTab === 'prompts' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Senior Staff Interview Prompts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real interview questions asked at Google, Meta, and Netflix, complete with senior staff tradeoffs.
              </p>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Prompts Cards */}
          <div className="space-y-4">
            {filteredPrompts.map((p) => {
              const isRevealed = revealedMap[p.id];
              const isBookmarked = bookmarkedMap[p.id];

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                          {p.category}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          Level: {p.level}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleBookmark(p.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isBookmarked
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title="Bookmark Question"
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {p.question}
                    </h3>

                    {/* Reveal Button */}
                    <button
                      onClick={() => toggleReveal(p.id)}
                      className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 flex items-center gap-1"
                    >
                      <span>{isRevealed ? 'Hide Staff Solution' : 'Reveal Staff Solution & Tradeoffs'}</span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isRevealed ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Solution Container */}
                    {isRevealed && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs">
                        <div className="space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            Architectural Solution:
                          </p>
                          <div className="whitespace-pre-line font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            {p.answer}
                          </div>
                        </div>

                        {p.keyPoints && p.keyPoints.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px]">
                              Key Staff Talking Points:
                            </span>
                            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                              {p.keyPoints.map((pt, i) => (
                                <li key={i}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {p.tradeoffs && p.tradeoffs.length > 0 && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
                            <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">
                              Senior Trade-offs to Emphasize:
                            </span>
                            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                              {p.tradeoffs.map((to, i) => (
                                <li key={i}>{to}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
