import fs from 'fs';
import path from 'path';

const problems = [
  {
    id: "parking-lot",
    title: "Parking Lot System",
    difficulty: "easy",
    tags: ["oop", "strategy", "factory", "design-patterns"],
    summary: "Design an automated multi-floor parking lot supporting different vehicle types, allocation strategies, ticketing, and dynamic fee calculation.",
    requirements: [
      "Support multiple floors with designated spot types: Compact, Large, Handicapped, Motorcycle, Electric.",
      "Support multiple vehicle types: Car, Truck, Van, Motorcycle.",
      "Issue a ticket at entry recording entry time, assigned spot, and vehicle license plate.",
      "Calculate parking fees at exit based on vehicle type and duration using interchangeable pricing strategies (e.g., hourly, flat rate).",
      "Display real-time availability boards per floor and spot type."
    ],
    constraints: [
      "A spot cannot be assigned to more than one active vehicle.",
      "Vehicle must only park in compatible spots (e.g. Motorcycle in any or motorcycle-only spot; Truck only in Large spot).",
      "Thread safety for spot allocation should be accounted for in design."
    ],
    hints: [
      "Separate the concept of a Vehicle from the Spot it occupies. Vehicles have types, and Spots have sizes/types.",
      "Use the Strategy Pattern for FeeCalculationStrategy so different rates (weekend, holiday, EV charging) can be swapped without modifying the Ticket or ParkingLot class.",
      "Consider a Factory for creating parking spots and vehicles, or an AllocationStrategy for choosing optimal spots (e.g., closest to entrance, lowest floor first)."
    ],
    keyEntities: [
      "ParkingLot",
      "ParkingFloor",
      "ParkingSpot",
      "Vehicle",
      "ParkingTicket",
      "FeeCalculationStrategy"
    ],
    selfReviewChecklist: [
      "Did you encapsulate spot allocation logic away from the main ParkingLot facade?",
      "Can new vehicle or spot types be added without rewriting existing fee calculation logic (Open/Closed Principle)?",
      "Is fee calculation decoupled via a Strategy interface?",
      "Does the ParkingTicket capture essential state (ticketId, spotId, entryTime, vehicleId)?"
    ],
    referenceDiagram: {
      nodes: {
        "node_parking_lot": {
          id: "node_parking_lot",
          position: { x: 50, y: 50 },
          data: {
            name: "ParkingLot",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "floors", type: "List<ParkingFloor>" },
              { id: "f2", visibility: "-", name: "feeStrategy", type: "FeeCalculationStrategy" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "parkVehicle", type: "ParkingTicket", params: "vehicle: Vehicle" },
              { id: "m2", visibility: "+", name: "unparkVehicle", type: "double", params: "ticket: ParkingTicket" }
            ]
          }
        },
        "node_parking_floor": {
          id: "node_parking_floor",
          position: { x: 380, y: 50 },
          data: {
            name: "ParkingFloor",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "floorNumber", type: "int" },
              { id: "f2", visibility: "-", name: "spots", type: "Map<SpotType, List<ParkingSpot>>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "findAvailableSpot", type: "ParkingSpot", params: "type: SpotType" }
            ]
          }
        },
        "node_parking_spot": {
          id: "node_parking_spot",
          position: { x: 700, y: 50 },
          data: {
            name: "ParkingSpot",
            kind: "abstract",
            fields: [
              { id: "f1", visibility: "#", name: "spotId", type: "String" },
              { id: "f2", visibility: "#", name: "isOccupied", type: "boolean" },
              { id: "f3", visibility: "#", name: "type", type: "SpotType" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "assignVehicle", type: "void", params: "vehicle: Vehicle" },
              { id: "m2", visibility: "+", name: "removeVehicle", type: "void" }
            ]
          }
        },
        "node_vehicle": {
          id: "node_vehicle",
          position: { x: 700, y: 350 },
          data: {
            name: "Vehicle",
            kind: "abstract",
            fields: [
              { id: "f1", visibility: "#", name: "licensePlate", type: "String" },
              { id: "f2", visibility: "#", name: "type", type: "VehicleType" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "getType", type: "VehicleType" }
            ]
          }
        },
        "node_parking_ticket": {
          id: "node_parking_ticket",
          position: { x: 50, y: 350 },
          data: {
            name: "ParkingTicket",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "ticketId", type: "String" },
              { id: "f2", visibility: "-", name: "entryTime", type: "Date" },
              { id: "f3", visibility: "-", name: "exitTime", type: "Date" },
              { id: "f4", visibility: "-", name: "spotId", type: "String" },
              { id: "f5", visibility: "-", name: "vehicle", type: "Vehicle" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "calculateDurationHours", type: "double" }
            ]
          }
        },
        "node_fee_strategy": {
          id: "node_fee_strategy",
          position: { x: 380, y: 350 },
          data: {
            name: "FeeCalculationStrategy",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "calculateFee", type: "double", params: "ticket: ParkingTicket" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_parking_lot", target: "node_parking_floor", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1..*" } },
        "e2": { id: "e2", source: "node_parking_floor", target: "node_parking_spot", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "0..*" } },
        "e3": { id: "e3", source: "node_parking_lot", target: "node_fee_strategy", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e4": { id: "e4", source: "node_parking_lot", target: "node_parking_ticket", data: { kind: "association", label: "issues" } },
        "e5": { id: "e5", source: "node_parking_ticket", target: "node_vehicle", data: { kind: "association", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e6": { id: "e6", source: "node_parking_spot", target: "node_vehicle", data: { kind: "association", label: "parks", sourceMultiplicity: "0..1", targetMultiplicity: "0..1" } }
      }
    },
    referenceNotes: `### Parking Lot Architectural Rationale\n\n1. **Composition over Aggregation**: Floors belong strictly to the Parking Lot and Spots belong strictly to their floor.\n2. **Strategy Pattern for Fees**: \`FeeCalculationStrategy\` permits hourly, flat-rate, or surge pricing without modifying the ticket or parking lot core.\n3. **Single Responsibility**: \`ParkingLot\` acts as the Facade managing tickets and top-level flows, while \`ParkingFloor\` handles spatial search for free spots.`,
    relatedPatternIds: ["strategy", "factory-method"],
    commonMistakes: [
      "Hardcoding fee calculation formulas inside the Ticket or ParkingLot class.",
      "Making Vehicle inherit from ParkingSpot or vice-versa.",
      "Allowing Spot allocation without synchronization or atomic state transitions."
    ]
  },
  {
    id: "lru-cache",
    title: "LRU Cache",
    difficulty: "easy",
    tags: ["oop", "data-structures", "cache"],
    summary: "Design a fast Least Recently Used (LRU) Cache supporting get and put in O(1) time complexity with automatic capacity eviction.",
    requirements: [
      "Initialize cache with positive integer capacity.",
      "get(key): Return value of key if exists, else -1 or null. Marks key as most recently used.",
      "put(key, value): Update value if key exists, otherwise insert key-value pair.",
      "When cache exceeds capacity, evict the least recently used key prior to insertion.",
      "All get and put operations must run in O(1) average time complexity."
    ],
    constraints: [
      "O(1) time complexity requires combining a Hash Map with a Doubly Linked List.",
      "Must correctly update pointers when moving nodes to head or evicting from tail."
    ],
    hints: [
      "A Doubly Linked List provides O(1) removal of an arbitrary node if you already hold its reference.",
      "A Hash Map maps keys directly to DoublyLinkedListNode objects, providing O(1) lookups.",
      "Use dummy head and tail sentinel nodes to eliminate null checks when adding and removing nodes."
    ],
    keyEntities: [
      "LRUCache",
      "DoublyLinkedList",
      "CacheNode"
    ],
    selfReviewChecklist: [
      "Did you use sentinel head and tail nodes to simplify edge cases?",
      "Does get() move the accessed node to the most recent position?",
      "Does put() update an existing key in-place and reposition it?",
      "Is the Hash Map updated whenever a node is evicted from the list?"
    ],
    referenceDiagram: {
      nodes: {
        "node_lru_cache": {
          id: "node_lru_cache",
          position: { x: 50, y: 100 },
          data: {
            name: "LRUCache",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "capacity", type: "int" },
              { id: "f2", visibility: "-", name: "nodeMap", type: "Map<K, CacheNode<K, V>>" },
              { id: "f3", visibility: "-", name: "list", type: "DoublyLinkedList<K, V>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "get", type: "V", params: "key: K" },
              { id: "m2", visibility: "+", name: "put", type: "void", params: "key: K, value: V" }
            ]
          }
        },
        "node_doubly_linked_list": {
          id: "node_doubly_linked_list",
          position: { x: 420, y: 100 },
          data: {
            name: "DoublyLinkedList",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "head", type: "CacheNode<K, V>" },
              { id: "f2", visibility: "-", name: "tail", type: "CacheNode<K, V>" },
              { id: "f3", visibility: "-", name: "size", type: "int" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "addToHead", type: "void", params: "node: CacheNode<K, V>" },
              { id: "m2", visibility: "+", name: "removeNode", type: "void", params: "node: CacheNode<K, V>" },
              { id: "m3", visibility: "+", name: "removeTail", type: "CacheNode<K, V>" }
            ]
          }
        },
        "node_cache_node": {
          id: "node_cache_node",
          position: { x: 750, y: 100 },
          data: {
            name: "CacheNode",
            kind: "class",
            fields: [
              { id: "f1", visibility: "+", name: "key", type: "K" },
              { id: "f2", visibility: "+", name: "val", type: "V" },
              { id: "f3", visibility: "+", name: "prev", type: "CacheNode<K, V>" },
              { id: "f4", visibility: "+", name: "next", type: "CacheNode<K, V>" }
            ],
            methods: []
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_lru_cache", target: "node_doubly_linked_list", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e2": { id: "e2", source: "node_doubly_linked_list", target: "node_cache_node", data: { kind: "association", label: "links", sourceMultiplicity: "1", targetMultiplicity: "0..*" } },
        "e3": { id: "e3", source: "node_lru_cache", target: "node_cache_node", data: { kind: "association", label: "indexes", sourceMultiplicity: "1", targetMultiplicity: "0..*" } }
      }
    },
    referenceNotes: `### LRU Cache Design Key Points\n\n- **Map + Doubly Linked List**: Hash map alone cannot order elements in O(1) move time; list alone cannot find elements in O(1). Together they achieve O(1) get, put, and eviction.\n- **Sentinel Nodes**: Using dummy head and tail simplifies boundary conditions so insertion at head and deletion at tail never encounter null references.`,
    relatedPatternIds: [],
    commonMistakes: [
      "Using a single-linked list, which requires O(N) to delete a middle node because you cannot access prev.",
      "Forgetting to store both key AND value inside CacheNode (key is required to delete from the Map during tail eviction).",
      "Failing to update eviction ordering when calling get()."
    ]
  },
  {
    id: "vending-machine",
    title: "Vending Machine",
    difficulty: "medium",
    tags: ["oop", "state", "strategy", "design-patterns"],
    summary: "Design an automated vending machine handling inventory, coin/cash collection, product dispensing, change calculation, and refund workflows.",
    requirements: [
      "Support states: Idle/NoCoin, HasCoin/Selection, Dispensing, SoldOut.",
      "Accept multiple coin denominations (1, 5, 10, 25 cents, notes).",
      "Allow user to select an item by code. Validate funds and inventory.",
      "Dispense item, deduct inventory, and return change.",
      "Allow user to cancel transaction and receive full refund prior to dispensing."
    ],
    constraints: [
      "State transitions must follow legal flows (e.g. cannot dispense without coins).",
      "Change must be calculated accurately from available cash inventory; if exact change cannot be provided, cancel and refund."
    ],
    hints: [
      "Use the State Pattern: Define a VendingMachineState interface with methods like insertCoin, selectItem, dispense, refund.",
      "Represent distinct state classes: IdleState, HasCoinState, DispensingState, SoldOutState.",
      "Encapsulate coin change calculation with a Greedy or Dynamic Programming change strategy."
    ],
    keyEntities: [
      "VendingMachine",
      "VendingMachineState",
      "Inventory",
      "Item",
      "Coin",
      "CoinChangeCalculator"
    ],
    selfReviewChecklist: [
      "Are machine states represented as polymorphic classes instead of massive switch-case statements?",
      "Does VendingMachine delegate user actions directly to the currentState?",
      "Is item inventory separated from payment balance state?",
      "Does cancellation safely return inserted funds?"
    ],
    referenceDiagram: {
      nodes: {
        "node_vm": {
          id: "node_vm",
          position: { x: 50, y: 150 },
          data: {
            name: "VendingMachine",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "currentState", type: "VendingMachineState" },
              { id: "f2", visibility: "-", name: "inventory", type: "Inventory" },
              { id: "f3", visibility: "-", name: "currentBalance", type: "int" },
              { id: "f4", visibility: "-", name: "selectedItemCode", type: "String" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "setState", type: "void", params: "state: VendingMachineState" },
              { id: "m2", visibility: "+", name: "insertCoin", type: "void", params: "coin: Coin" },
              { id: "m3", visibility: "+", name: "selectItem", type: "void", params: "code: String" },
              { id: "m4", visibility: "+", name: "dispense", type: "void" },
              { id: "m5", visibility: "+", name: "cancelAndRefund", type: "List<Coin>" }
            ]
          }
        },
        "node_vm_state": {
          id: "node_vm_state",
          position: { x: 420, y: 50 },
          data: {
            name: "VendingMachineState",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "insertCoin", type: "void", params: "vm: VendingMachine, coin: Coin" },
              { id: "m2", visibility: "+", name: "selectItem", type: "void", params: "vm: VendingMachine, code: String" },
              { id: "m3", visibility: "+", name: "dispense", type: "void", params: "vm: VendingMachine" },
              { id: "m4", visibility: "+", name: "cancel", type: "List<Coin>", params: "vm: VendingMachine" }
            ]
          }
        },
        "node_idle_state": {
          id: "node_idle_state",
          position: { x: 300, y: 260 },
          data: {
            name: "IdleState",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "insertCoin", type: "void", params: "vm: VendingMachine, coin: Coin" }
            ]
          }
        },
        "node_has_coin_state": {
          id: "node_has_coin_state",
          position: { x: 500, y: 260 },
          data: {
            name: "HasCoinState",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "selectItem", type: "void", params: "vm: VendingMachine, code: String" },
              { id: "m2", visibility: "+", name: "cancel", type: "List<Coin>", params: "vm: VendingMachine" }
            ]
          }
        },
        "node_dispense_state": {
          id: "node_dispense_state",
          position: { x: 700, y: 260 },
          data: {
            name: "DispensingState",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "dispense", type: "void", params: "vm: VendingMachine" }
            ]
          }
        },
        "node_inventory": {
          id: "node_inventory",
          position: { x: 50, y: 440 },
          data: {
            name: "Inventory",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "itemStock", type: "Map<String, Integer>" },
              { id: "f2", visibility: "-", name: "itemDetails", type: "Map<String, Item>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "deductStock", type: "void", params: "code: String" },
              { id: "m2", visibility: "+", name: "isAvailable", type: "boolean", params: "code: String" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_vm", target: "node_vm_state", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e2": { id: "e2", source: "node_idle_state", target: "node_vm_state", data: { kind: "implementation" } },
        "e3": { id: "e3", source: "node_has_coin_state", target: "node_vm_state", data: { kind: "implementation" } },
        "e4": { id: "e4", source: "node_dispense_state", target: "node_vm_state", data: { kind: "implementation" } },
        "e5": { id: "e5", source: "node_vm", target: "node_inventory", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1" } }
      }
    },
    referenceNotes: `### State Pattern Implementation in Vending Machine\n\n- The State Pattern encapsulates valid and invalid transitions cleanly.\n- In \`IdleState\`, attempting to dispense throws an IllegalStateException.\n- Once coins are accepted, transitioning to \`HasCoinState\` enables selection and cancellation.\n- \`Inventory\` manages quantity tracking independent of vending mechanics.`,
    relatedPatternIds: ["state", "strategy"],
    commonMistakes: [
      "Using an enum for State with huge switch-case statements inside VendingMachine (violates OCP).",
      "Allowing item dispensing directly from HasCoinState without verifying inventory.",
      "Losing coin balance when transaction is aborted."
    ]
  },
  {
    id: "splitwise",
    title: "Splitwise / Expense Sharing App",
    difficulty: "medium",
    tags: ["oop", "strategy", "observer", "finance"],
    summary: "Design an expense sharing system supporting user groups, varied split strategies (equal, exact, percentage), balance tracking, and debt simplification.",
    requirements: [
      "Users can add expenses within a group or directly with other users.",
      "Support multiple split types: EQUAL, EXACT, PERCENTAGE.",
      "Track who owes whom with directional balance balances.",
      "Provide a simplify debts algorithm (minimize transactions between parties).",
      "Send notifications to involved users when an expense is recorded or settled."
    ],
    constraints: [
      "Split total must exactly equal the total expense amount (for PERCENTAGE: total percentages must equal 100%).",
      "Debt simplification must maintain net individual balances."
    ],
    hints: [
      "Use the Strategy Pattern for ExpenseSplitStrategy (EqualSplitStrategy, ExactSplitStrategy, PercentageSplitStrategy).",
      "Use the Observer Pattern to notify users when an expense is added or modified.",
      "Represent debt balances as directional edges in a graph or as a net balance map."
    ],
    keyEntities: [
      "User",
      "Group",
      "Expense",
      "Split",
      "ExpenseSplitStrategy",
      "BalanceSheetController"
    ],
    selfReviewChecklist: [
      "Is validation of splits decoupled into respective Strategy classes?",
      "Does the system handle precision issues (e.g. 100 / 3 = 33.33, 33.33, 33.34)?",
      "Are users notified of balance updates using Observer/Listeners?",
      "Can new split types (e.g. shares/ratios) be added without modifying existing code?"
    ],
    referenceDiagram: {
      nodes: {
        "node_user": {
          id: "node_user",
          position: { x: 50, y: 50 },
          data: {
            name: "User",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "userId", type: "String" },
              { id: "f2", visibility: "-", name: "name", type: "String" },
              { id: "f3", visibility: "-", name: "email", type: "String" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "updateNotification", type: "void", params: "msg: String" }
            ]
          }
        },
        "node_group": {
          id: "node_group",
          position: { x: 380, y: 50 },
          data: {
            name: "Group",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "groupId", type: "String" },
              { id: "f2", visibility: "-", name: "members", type: "List<User>" },
              { id: "f3", visibility: "-", name: "expenses", type: "List<Expense>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "addExpense", type: "void", params: "expense: Expense" }
            ]
          }
        },
        "node_expense": {
          id: "node_expense",
          position: { x: 380, y: 300 },
          data: {
            name: "Expense",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "expenseId", type: "String" },
              { id: "f2", visibility: "-", name: "amount", type: "double" },
              { id: "f3", visibility: "-", name: "paidBy", type: "User" },
              { id: "f4", visibility: "-", name: "splits", type: "List<Split>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "validate", type: "boolean" }
            ]
          }
        },
        "node_split": {
          id: "node_split",
          position: { x: 50, y: 300 },
          data: {
            name: "Split",
            kind: "abstract",
            fields: [
              { id: "f1", visibility: "#", name: "user", type: "User" },
              { id: "f2", visibility: "#", name: "amountOwed", type: "double" }
            ],
            methods: []
          }
        },
        "node_split_strategy": {
          id: "node_split_strategy",
          position: { x: 700, y: 300 },
          data: {
            name: "ExpenseSplitStrategy",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "calculateSplits", type: "List<Split>", params: "total: double, splits: List<Split>" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_group", target: "node_user", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1..*" } },
        "e2": { id: "e2", source: "node_group", target: "node_expense", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "0..*" } },
        "e3": { id: "e3", source: "node_expense", target: "node_split", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1..*" } },
        "e4": { id: "e4", source: "node_expense", target: "node_split_strategy", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e5": { id: "e5", source: "node_split", target: "node_user", data: { kind: "association", sourceMultiplicity: "1", targetMultiplicity: "1" } }
      }
    },
    referenceNotes: `### Splitwise Architectural Choices\n\n- **Strategy Pattern for Splits**: Different types of splits (Equal, Exact, Percentage) have distinct validation and mathematical rules.\n- **Observer Pattern for Updates**: When an expense is recorded in a Group, all users referenced in the splits are notified.\n- **Balance Settlement**: Balances can be tracked in a \`BalanceSheetController\` as a bipartite graph of debts and simplified via greedy min-cash-flow algorithms.`,
    relatedPatternIds: ["strategy", "observer"],
    commonMistakes: [
      "Rounding issues when dividing odd figures (e.g. $10 among 3 people).",
      "Coupling expense persistence directly with individual user classes.",
      "Failing to support expenses between individuals outside of a formal group."
    ]
  },
  {
    id: "elevator-system",
    title: "Elevator Control System",
    difficulty: "hard",
    tags: ["oop", "state", "strategy", "command", "concurrency"],
    summary: "Design an intelligent elevator dispatch system controlling multiple elevator cars, handling internal floor selections, external hallway calls, and scheduling optimization.",
    requirements: [
      "Manage multiple elevator cars across N floors.",
      "Handle internal requests (passenger selects floor inside car) and external requests (passenger presses UP/DOWN in hallway).",
      "Elevator states: MOVING_UP, MOVING_DOWN, IDLE, MAINTENANCE, DOORS_OPEN.",
      "Dispatcher algorithm (SCAN/LOOK or nearest car strategy) to assign cars efficiently.",
      "Safety mechanisms: emergency stop, overload sensor detection."
    ],
    constraints: [
      "Direction changes should prevent starvation of passengers in opposing directions.",
      "Dispatcher should allocate the most optimal car (e.g. idle car on floor or car already moving in matching direction)."
    ],
    hints: [
      "Model ElevatorCar with a State pattern representing its motion and door state.",
      "Represent button presses as Commands or Requests, queued inside ElevatorController or Dispatcher.",
      "Use the Strategy Pattern for scheduling: LOOK / SCAN / Nearest Car."
    ],
    keyEntities: [
      "ElevatorSystem",
      "ElevatorController",
      "ElevatorCar",
      "ElevatorState",
      "ElevatorDirection",
      "Request",
      "DispatchStrategy"
    ],
    selfReviewChecklist: [
      "Did you decouple internal car buttons from external hall call panels?",
      "Is car motion and door handling modeled as a state machine?",
      "Can dispatch algorithms be swapped via a Strategy interface?",
      "How are multiple concurrent button presses synchronized?"
    ],
    referenceDiagram: {
      nodes: {
        "node_elevator_system": {
          id: "node_elevator_system",
          position: { x: 50, y: 100 },
          data: {
            name: "ElevatorSystem",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "controllers", type: "List<ElevatorController>" },
              { id: "f2", visibility: "-", name: "dispatchStrategy", type: "DispatchStrategy" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "handleHallRequest", type: "void", params: "floor: int, dir: Direction" }
            ]
          }
        },
        "node_dispatch_strategy": {
          id: "node_dispatch_strategy",
          position: { x: 50, y: 350 },
          data: {
            name: "DispatchStrategy",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "selectCar", type: "ElevatorController", params: "req: Request, cars: List<ElevatorController>" }
            ]
          }
        },
        "node_elevator_controller": {
          id: "node_elevator_controller",
          position: { x: 400, y: 100 },
          data: {
            name: "ElevatorController",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "car", type: "ElevatorCar" },
              { id: "f2", visibility: "-", name: "upRequests", type: "TreeSet<Integer>" },
              { id: "f3", visibility: "-", name: "downRequests", type: "TreeSet<Integer>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "enqueueDestination", type: "void", params: "floor: int" },
              { id: "m2", visibility: "+", name: "stepSimulation", type: "void" }
            ]
          }
        },
        "node_elevator_car": {
          id: "node_elevator_car",
          position: { x: 750, y: 100 },
          data: {
            name: "ElevatorCar",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "id", type: "int" },
              { id: "f2", visibility: "-", name: "currentFloor", type: "int" },
              { id: "f3", visibility: "-", name: "state", type: "ElevatorState" },
              { id: "f4", visibility: "-", name: "direction", type: "Direction" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "moveUp", type: "void" },
              { id: "m2", visibility: "+", name: "moveDown", type: "void" },
              { id: "m3", visibility: "+", name: "openDoors", type: "void" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_elevator_system", target: "node_elevator_controller", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1..*" } },
        "e2": { id: "e2", source: "node_elevator_system", target: "node_dispatch_strategy", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e3": { id: "e3", source: "node_elevator_controller", target: "node_elevator_car", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1" } }
      }
    },
    referenceNotes: `### Elevator System Design Notes\n\n- **Controller vs Car**: Separate the physical hardware state (\`ElevatorCar\`) from its decision making and request queue (\`ElevatorController\`).\n- **Dispatch Strategy**: Hall calls are assigned to the most appropriate car via \`DispatchStrategy\` (e.g. elevator closest and heading toward caller).\n- **Dual Priority Queues / TreeSets**: LOOK scheduling uses two sorted sets: floors above for the upward sweep, and floors below for downward.`,
    relatedPatternIds: ["state", "strategy", "command"],
    commonMistakes: [
      "Letting the Car itself coordinate the entire building's hallway calls.",
      "Neglecting passenger direction when dispatching cars (leading to unnecessary stops).",
      "Not handling concurrent internal and external requests."
    ]
  },
  {
    id: "book-my-show",
    title: "BookMyShow / Movie Booking System",
    difficulty: "hard",
    tags: ["oop", "concurrency", "state", "observer", "factory"],
    summary: "Design a movie ticket reservation platform managing cinemas, halls, screens, shows, seat layouts, temporary locks, and payment processing.",
    requirements: [
      "List cities, cinemas/theatres, screens, and scheduled shows for movies.",
      "Users select seats for a specific show.",
      "Temporarily lock chosen seats for 10 minutes during checkout to avoid double booking.",
      "Confirm booking upon successful payment; release seat lock if payment fails or timeout occurs.",
      "Send notifications with ticket confirmation (Email/SMS)."
    ],
    constraints: [
      "Two users must never be able to book or simultaneously hold the exact same seat.",
      "Seat locks must have a deterministic TTL (Time To Live)."
    ],
    hints: [
      "Distinguish between a physical Seat (ScreenSeat: Row A, Col 1) and a ShowSeat (Seat status specific to a Show: Available, Locked, Booked).",
      "Use State Pattern or explicit status enum for ShowSeat: AVAILABLE, TEMPORARILY_LOCKED, BOOKED.",
      "SeatLockService can manage lock expiry with timestamps or scheduled timers.",
      "Observer pattern notifies payment gateway and user notification services."
    ],
    keyEntities: [
      "Cinema",
      "Screen",
      "Movie",
      "Show",
      "Seat",
      "ShowSeat",
      "Booking",
      "SeatLockService",
      "Payment"
    ],
    selfReviewChecklist: [
      "Did you decouple physical theater seats from per-show seat booking state?",
      "Is there a designated mechanism/service to lock seats temporarily during checkout?",
      "Are booking states (Created, PendingPayment, Confirmed, Expired) cleanly defined?",
      "Does booking confirmation release locks and update ShowSeat status atomically?"
    ],
    referenceDiagram: {
      nodes: {
        "node_cinema": {
          id: "node_cinema",
          position: { x: 50, y: 50 },
          data: {
            name: "Cinema",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "cinemaId", type: "String" },
              { id: "f2", visibility: "-", name: "city", type: "String" },
              { id: "f3", visibility: "-", name: "screens", type: "List<Screen>" }
            ],
            methods: []
          }
        },
        "node_screen": {
          id: "node_screen",
          position: { x: 380, y: 50 },
          data: {
            name: "Screen",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "screenId", type: "String" },
              { id: "f2", visibility: "-", name: "physicalSeats", type: "List<Seat>" }
            ],
            methods: []
          }
        },
        "node_show": {
          id: "node_show",
          position: { x: 700, y: 50 },
          data: {
            name: "Show",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "showId", type: "String" },
              { id: "f2", visibility: "-", name: "movie", type: "Movie" },
              { id: "f3", visibility: "-", name: "startTime", type: "Date" },
              { id: "f4", visibility: "-", name: "showSeats", type: "Map<String, ShowSeat>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "getAvailableSeats", type: "List<ShowSeat>" }
            ]
          }
        },
        "node_show_seat": {
          id: "node_show_seat",
          position: { x: 700, y: 350 },
          data: {
            name: "ShowSeat",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "showSeatId", type: "String" },
              { id: "f2", visibility: "-", name: "seat", type: "Seat" },
              { id: "f3", visibility: "-", name: "status", type: "SeatStatus" },
              { id: "f4", visibility: "-", name: "price", type: "double" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "lockSeat", type: "boolean" },
              { id: "m2", visibility: "+", name: "confirmBooking", type: "void" }
            ]
          }
        },
        "node_seat_lock_service": {
          id: "node_seat_lock_service",
          position: { x: 380, y: 350 },
          data: {
            name: "SeatLockService",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "lockTtlSeconds", type: "int" },
              { id: "f2", visibility: "-", name: "locks", type: "Map<String, SeatLock>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "tryLockSeats", type: "boolean", params: "show: Show, seats: List<ShowSeat>, user: User" },
              { id: "m2", visibility: "+", name: "releaseSeats", type: "void", params: "show: Show, seats: List<ShowSeat>" }
            ]
          }
        },
        "node_booking": {
          id: "node_booking",
          position: { x: 50, y: 350 },
          data: {
            name: "Booking",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "bookingId", type: "String" },
              { id: "f2", visibility: "-", name: "user", type: "User" },
              { id: "f3", visibility: "-", name: "bookedSeats", type: "List<ShowSeat>" },
              { id: "f4", visibility: "-", name: "status", type: "BookingStatus" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "confirm", type: "void" },
              { id: "m2", visibility: "+", name: "cancel", type: "void" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_cinema", target: "node_screen", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1..*" } },
        "e2": { id: "e2", source: "node_screen", target: "node_show", data: { kind: "association", sourceMultiplicity: "1", targetMultiplicity: "0..*" } },
        "e3": { id: "e3", source: "node_show", target: "node_show_seat", data: { kind: "composition", sourceMultiplicity: "1", targetMultiplicity: "1..*" } },
        "e4": { id: "e4", source: "node_seat_lock_service", target: "node_show_seat", data: { kind: "association", label: "locks" } },
        "e5": { id: "e5", source: "node_booking", target: "node_show_seat", data: { kind: "association", label: "reserves" } }
      }
    },
    referenceNotes: `### Movie Booking Core Architecture\n\n- **Physical Seat vs ShowSeat**: Screens have fixed physical layouts (Row, Column, Category: Regular, Premium). A \`ShowSeat\` binds a physical seat to a temporal screening with independent availability status.\n- **Seat Locking Isolation**: High concurrency happens during seat selection. Separating lock logic into \`SeatLockService\` allows testing time-based lease releases cleanly.\n- **State Transitions**: \`ShowSeat\` transitions: AVAILABLE -> TEMPORARILY_LOCKED -> BOOKED (or reverts to AVAILABLE if checkout expires).`,
    relatedPatternIds: ["state", "observer", "factory-method"],
    commonMistakes: [
      "Mutating the physical theater seat directly when a user reserves a ticket (corrupting future shows).",
      "Failing to support lock timeouts, permanently holding seats when checkout tabs are abandoned.",
      "No synchronization on seat lock acquisition resulting in double-booking."
    ]
  }
];

const patterns = [
  {
    id: "strategy",
    name: "Strategy Pattern",
    category: "behavioral",
    intent: "Define a family of algorithms, encapsulate each one, and make them interchangeable at runtime without modifying client classes.",
    problemItSolves: "When a class has multiple behaviors or algorithms (such as payment processing, discount pricing, or sorting) that switch based on conditions, code becomes cluttered with rigid conditionals. Strategy moves each algorithm into its own class.",
    whenToUse: [
      "You have multiple variants of an algorithm that should be selected at runtime.",
      "You want to isolate algorithm implementation details from client business logic.",
      "A class defines many behaviors that appear as multiple conditional branches in its methods."
    ],
    whenNotToUse: [
      "You only have one or two algorithms that rarely change.",
      "The client doesn't need to know the differences between algorithm variants."
    ],
    diagram: {
      nodes: {
        "node_context": {
          id: "node_context",
          position: { x: 50, y: 100 },
          data: {
            name: "Context",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "strategy", type: "PaymentStrategy" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "setStrategy", type: "void", params: "s: PaymentStrategy" },
              { id: "m2", visibility: "+", name: "executePayment", type: "void", params: "amount: double" }
            ]
          }
        },
        "node_strategy": {
          id: "node_strategy",
          position: { x: 420, y: 100 },
          data: {
            name: "PaymentStrategy",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "pay", type: "void", params: "amount: double" }
            ]
          }
        },
        "node_strat_a": {
          id: "node_strat_a",
          position: { x: 280, y: 300 },
          data: {
            name: "CreditCardPayment",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "cardNumber", type: "String" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "pay", type: "void", params: "amount: double" }
            ]
          }
        },
        "node_strat_b": {
          id: "node_strat_b",
          position: { x: 560, y: 300 },
          data: {
            name: "UpiPayment",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "upiId", type: "String" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "pay", type: "void", params: "amount: double" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_context", target: "node_strategy", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e2": { id: "e2", source: "node_strat_a", target: "node_strategy", data: { kind: "implementation" } },
        "e3": { id: "e3", source: "node_strat_b", target: "node_strategy", data: { kind: "implementation" } }
      }
    },
    javaCode: `public interface PaymentStrategy {\n    void pay(double amount);\n}\n\npublic class CreditCardPayment implements PaymentStrategy {\n    private final String cardNumber;\n    public CreditCardPayment(String cardNumber) {\n        this.cardNumber = cardNumber;\n    }\n    @Override\n    public void pay(double amount) {\n        System.out.println("Paid $" + amount + " via Card " + cardNumber);\n    }\n}\n\npublic class UpiPayment implements PaymentStrategy {\n    private final String upiId;\n    public UpiPayment(String upiId) {\n        this.upiId = upiId;\n    }\n    @Override\n    public void pay(double amount) {\n        System.out.println("Paid $" + amount + " via UPI ID " + upiId);\n    }\n}\n\npublic class ShoppingCart {\n    private PaymentStrategy strategy;\n    public void setStrategy(PaymentStrategy strategy) {\n        this.strategy = strategy;\n    }\n    public void checkout(double amount) {\n        strategy.pay(amount);\n    }\n}`,
    demoId: "strategy",
    relatedProblemIds: ["parking-lot", "splitwise", "elevator-system"],
    quiz: [
      {
        question: "What is the primary motivation for using the Strategy pattern?",
        options: [
          "To allow an object to change its class at runtime",
          "To encapsulate interchangeable algorithms and switch them without changing the client",
          "To guarantee only one instance of a class exists",
          "To provide a simplified facade interface to a complex subsystem"
        ],
        answerIndex: 1,
        explanation: "The Strategy pattern encapsulates algorithmic families so they can vary independently from clients that use them."
      },
      {
        question: "Which SOLID principle does the Strategy pattern most directly promote?",
        options: [
          "Single Responsibility and Open/Closed Principles",
          "Liskov Substitution only",
          "Interface Segregation only",
          "Law of Demeter"
        ],
        answerIndex: 0,
        explanation: "By isolating algorithms in separate classes, it enforces Single Responsibility and allows adding new algorithms without modifying existing code (Open/Closed)."
      },
      {
        question: "How does the Context typically hold a reference to the Strategy?",
        options: [
          "Via inheritance from the Strategy",
          "Through static global calls",
          "Through composition or aggregation referencing the Strategy interface",
          "By implementing the Strategy itself"
        ],
        answerIndex: 2,
        explanation: "The Context maintains a reference to a Strategy interface instance, allowing polymorphism at runtime."
      }
    ],
    flashcards: [
      {
        front: "What is the intent of the Strategy Pattern?",
        back: "Define a family of algorithms, encapsulate each one, and make them interchangeable at runtime without modifying the client."
      },
      {
        front: "How does Strategy differ from State Pattern?",
        back: "In Strategy, algorithms are typically chosen by the client and operate independently. In State, the states know about one another and transition automatically as state changes."
      },
      {
        front: "When should you avoid the Strategy Pattern?",
        back: "When you only have 1 or 2 algorithms that never change, as adding interfaces and classes introduces unnecessary indirection."
      }
    ]
  },
  {
    id: "observer",
    name: "Observer Pattern",
    category: "behavioral",
    intent: "Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.",
    problemItSolves: "Avoids tight coupling where a publisher must know all concrete subscriber classes to notify them of state changes.",
    whenToUse: [
      "An abstraction has two aspects, one dependent on the other.",
      "A change to one object requires changing others, and you don't know how many objects need to be changed.",
      "An object should be able to notify other objects without making assumptions about who those objects are."
    ],
    whenNotToUse: [
      "Subscribers are invoked in arbitrary order and performance overhead with large listener graphs is unacceptable without asynchronous event queues."
    ],
    diagram: {
      nodes: {
        "node_subject": {
          id: "node_subject",
          position: { x: 50, y: 100 },
          data: {
            name: "Subject",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "observers", type: "List<Observer>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "attach", type: "void", params: "o: Observer" },
              { id: "m2", visibility: "+", name: "detach", type: "void", params: "o: Observer" },
              { id: "m3", visibility: "+", name: "notifyObservers", type: "void" }
            ]
          }
        },
        "node_observer": {
          id: "node_observer",
          position: { x: 420, y: 100 },
          data: {
            name: "Observer",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "update", type: "void", params: "message: String" }
            ]
          }
        },
        "node_conc_obs_a": {
          id: "node_conc_obs_a",
          position: { x: 300, y: 300 },
          data: {
            name: "EmailAlertListener",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "update", type: "void", params: "message: String" }
            ]
          }
        },
        "node_conc_obs_b": {
          id: "node_conc_obs_b",
          position: { x: 550, y: 300 },
          data: {
            name: "SlackAlertListener",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "update", type: "void", params: "message: String" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_subject", target: "node_observer", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "0..*" } },
        "e2": { id: "e2", source: "node_conc_obs_a", target: "node_observer", data: { kind: "implementation" } },
        "e3": { id: "e3", source: "node_conc_obs_b", target: "node_observer", data: { kind: "implementation" } }
      }
    },
    javaCode: `import java.util.*;\n\npublic interface Observer {\n    void update(String event);\n}\n\npublic class Subject {\n    private final List<Observer> observers = new ArrayList<>();\n    public void attach(Observer o) { observers.add(o); }\n    public void detach(Observer o) { observers.remove(o); }\n    public void notifyAllObservers(String event) {\n        for (Observer o : observers) {\n            o.update(event);\n        }\n    }\n}\n\npublic class EmailNotification implements Observer {\n    @Override\n    public void update(String event) {\n        System.out.println("Email alert sent: " + event);\n    }\n}`,
    demoId: "observer",
    relatedProblemIds: ["splitwise", "book-my-show"],
    quiz: [
      {
        question: "What relationship exists between Subject and Observer?",
        options: [
          "One-to-One",
          "One-to-Many",
          "Many-to-Many only",
          "Composition where Subject creates Observers"
        ],
        answerIndex: 1,
        explanation: "The Observer pattern establishes a one-to-many relationship where one publisher notifies multiple subscribers."
      },
      {
        question: "What danger exists if observers are not detached when no longer needed?",
        options: [
          "Deadlock in every thread",
          "Memory leaks (lapsed listener problem)",
          "Compiler errors",
          "Stack overflow"
        ],
        answerIndex: 1,
        explanation: "Holding references to listeners in the Subject prevents garbage collection, known as the lapsed listener problem."
      },
      {
        question: "What is the difference between push and pull models in Observer?",
        options: [
          "Push sends detailed state data with notify; pull sends only minimal notice so observer queries the subject for details",
          "Push uses HTTP POST and pull uses HTTP GET",
          "Push is synchronous and pull is always asynchronous",
          "There is no difference"
        ],
        answerIndex: 0,
        explanation: "Push provides data directly in the update method parameter, whereas pull notifies the observer which queries the subject for what it needs."
      }
    ],
    flashcards: [
      {
        front: "What is the core intent of the Observer pattern?",
        back: "Define a one-to-many dependency so when an object updates its state, all dependents are notified automatically."
      },
      {
        front: "What is the 'Lapsed Listener' problem in Observer?",
        back: "When a subscriber forgets to unsubscribe from a publisher, keeping the subscriber in memory and causing a memory leak."
      },
      {
        front: "Push vs Pull model in Observer pattern?",
        back: "Push passes event data in the notification; Pull sends a minimal alert and lets observers fetch what they require."
      }
    ]
  },
  {
    id: "state",
    name: "State Pattern",
    category: "behavioral",
    intent: "Allow an object to alter its behavior when its internal state changes. The object will appear to change its class.",
    problemItSolves: "Replaces large conditional statements (switch/if-else) that govern an object's behavior depending on its current state with discrete state classes.",
    whenToUse: [
      "An object's behavior depends on its state, and it must change its behavior at runtime depending on that state.",
      "Operations have large multipart conditional statements that depend on the object's state."
    ],
    whenNotToUse: [
      "The state machine has only 2 trivial states with simple logic that rarely changes."
    ],
    diagram: {
      nodes: {
        "node_context": {
          id: "node_context",
          position: { x: 50, y: 100 },
          data: {
            name: "VendingContext",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "state", type: "State" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "setState", type: "void", params: "s: State" },
              { id: "m2", visibility: "+", name: "request", type: "void" }
            ]
          }
        },
        "node_state": {
          id: "node_state",
          position: { x: 400, y: 100 },
          data: {
            name: "State",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "handle", type: "void", params: "ctx: VendingContext" }
            ]
          }
        },
        "node_state_a": {
          id: "node_state_a",
          position: { x: 300, y: 300 },
          data: {
            name: "ReadyState",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "handle", type: "void", params: "ctx: VendingContext" }
            ]
          }
        },
        "node_state_b": {
          id: "node_state_b",
          position: { x: 540, y: 300 },
          data: {
            name: "DispensingState",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "handle", type: "void", params: "ctx: VendingContext" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_context", target: "node_state", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e2": { id: "e2", source: "node_state_a", target: "node_state", data: { kind: "implementation" } },
        "e3": { id: "e3", source: "node_state_b", target: "node_state", data: { kind: "implementation" } }
      }
    },
    javaCode: `public interface State {\n    void handleRequest(Context ctx);\n}\n\npublic class Context {\n    private State state;\n    public Context(State state) { this.state = state; }\n    public void setState(State state) { this.state = state; }\n    public void request() { state.handleRequest(this); }\n}\n\npublic class OffState implements State {\n    @Override\n    public void handleRequest(Context ctx) {\n        System.out.println("Turning ON...");\n        ctx.setState(new OnState());\n    }\n}\n\npublic class OnState implements State {\n    @Override\n    public void handleRequest(Context ctx) {\n        System.out.println("Turning OFF...");\n        ctx.setState(new OffState());\n    }\n}`,
    demoId: "state",
    relatedProblemIds: ["vending-machine", "elevator-system", "book-my-show"],
    quiz: [
      {
        question: "How does the State pattern avoid long switch or if/else statements?",
        options: [
          "By delegating state-specific behavior to polymorphic state objects",
          "By storing states in a database",
          "By using reflection",
          "By running multiple threads"
        ],
        answerIndex: 0,
        explanation: "Each branch of a conditional state check becomes an independent class implementing the State interface."
      },
      {
        question: "Who can trigger a state transition in the State pattern?",
        options: [
          "Only the Context class",
          "Only external clients",
          "Either the Context or concrete State subclasses themselves",
          "Only an abstract factory"
        ],
        answerIndex: 2,
        explanation: "Transitions can be driven by the Context or directly by concrete State classes when handling events."
      },
      {
        question: "What is a key difference between Strategy and State patterns?",
        options: [
          "State objects typically know about other states and transitions; Strategies are independent interchangeable algorithms",
          "Strategy uses interfaces, while State never does",
          "State is structural, Strategy is creational",
          "There is no difference"
        ],
        answerIndex: 0,
        explanation: "State encapsulates finite state transitions, while Strategy provides alternative ways of doing the same task."
      }
    ],
    flashcards: [
      {
        front: "What problem does the State Pattern solve?",
        back: "It eliminates sprawling switch/if-else statements when an object's behavior changes dramatically based on internal state."
      },
      {
        front: "Where are state transitions defined in the State pattern?",
        back: "Transitions can be managed either within the Context or inside the concrete State classes themselves."
      },
      {
        front: "State vs Strategy: What is the main difference?",
        back: "Strategy swaps algorithms without awareness of other strategies; State models transitions between distinct lifecycle phases."
      }
    ]
  },
  {
    id: "factory-method",
    name: "Factory Method Pattern",
    category: "creational",
    intent: "Define an interface for creating an object, but let subclasses decide which class to instantiate.",
    problemItSolves: "Avoids hardcoding concrete class constructors in client code, decoupling object creation from usage.",
    whenToUse: [
      "A class cannot anticipate the exact class of objects it must create.",
      "A class wants its subclasses to specify the objects it creates.",
      "Classes delegate responsibility to one of several helper subclasses."
    ],
    whenNotToUse: [
      "The product family is small, static, and unlikely to expand."
    ],
    diagram: {
      nodes: {
        "node_creator": {
          id: "node_creator",
          position: { x: 50, y: 100 },
          data: {
            name: "DialogCreator",
            kind: "abstract",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "render", type: "void" },
              { id: "m2", visibility: "#", name: "createButton", type: "Button", isAbstract: true }
            ]
          }
        },
        "node_win_creator": {
          id: "node_win_creator",
          position: { x: 50, y: 300 },
          data: {
            name: "WindowsDialog",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "createButton", type: "Button" }
            ]
          }
        },
        "node_button": {
          id: "node_button",
          position: { x: 420, y: 100 },
          data: {
            name: "Button",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "onClick", type: "void" }
            ]
          }
        },
        "node_win_button": {
          id: "node_win_button",
          position: { x: 420, y: 300 },
          data: {
            name: "WindowsButton",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "onClick", type: "void" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_win_creator", target: "node_creator", data: { kind: "inheritance" } },
        "e2": { id: "e2", source: "node_win_button", target: "node_button", data: { kind: "implementation" } },
        "e3": { id: "e3", source: "node_win_creator", target: "node_win_button", data: { kind: "dependency", label: "instantiates" } },
        "e4": { id: "e4", source: "node_creator", target: "node_button", data: { kind: "dependency", label: "uses" } }
      }
    },
    javaCode: `public interface Button {\n    void render();\n}\n\npublic class HtmlButton implements Button {\n    public void render() { System.out.println("<button>Test</button>"); }\n}\n\npublic abstract class Dialog {\n    public void renderWindow() {\n        Button okButton = createButton();\n        okButton.render();\n    }\n    public abstract Button createButton();\n}\n\npublic class WebDialog extends Dialog {\n    @Override\n    public Button createButton() {\n        return new HtmlButton();\n    }\n}`,
    relatedProblemIds: ["parking-lot", "book-my-show"],
    quiz: [
      {
        question: "What is the primary role of the Factory Method pattern?",
        options: [
          "To encapsulate object creation in a method that subclasses override",
          "To guarantee thread safety during construction",
          "To prevent any new instances from being created",
          "To create a clone of an existing prototype"
        ],
        answerIndex: 0,
        explanation: "Factory Method delegates concrete instantiation to subclasses through polymorphism."
      },
      {
        question: "How does Factory Method fulfill the Dependency Inversion Principle?",
        options: [
          "High-level modules depend on abstractions (product interfaces) rather than concrete classes",
          "It forces all classes to be abstract",
          "It removes all dependencies",
          "It replaces interfaces with reflection"
        ],
        answerIndex: 0,
        explanation: "Clients code against the product interface instead of hard-coupling to concrete product constructors."
      },
      {
        question: "What is the difference between Simple Factory and Factory Method?",
        options: [
          "Simple Factory uses a single method with conditionals; Factory Method relies on class inheritance and overriding",
          "Simple Factory is an official GoF pattern, Factory Method is not",
          "There is no difference",
          "Factory Method cannot return interfaces"
        ],
        answerIndex: 0,
        explanation: "Simple Factory uses a static method with conditionals, whereas Factory Method is an abstract method meant to be overridden by subclasses."
      }
    ],
    flashcards: [
      {
        front: "What is the Factory Method Pattern?",
        back: "A creational pattern that defines an interface for creating an object, but lets subclasses decide which class to instantiate."
      },
      {
        front: "What principle does Factory Method promote?",
        back: "Open/Closed Principle: you can introduce new product types without breaking existing client code."
      },
      {
        front: "Simple Factory vs Factory Method?",
        back: "Simple Factory centralizes object creation in one class (violates OCP when adding new types); Factory Method uses inheritance and polymorphism."
      }
    ]
  },
  {
    id: "singleton",
    name: "Singleton Pattern",
    category: "creational",
    intent: "Ensure a class only has one instance, and provide a global point of access to it.",
    problemItSolves: "Controls access to shared resources such as database connections, loggers, or configuration managers.",
    whenToUse: [
      "Exactly one instance of a class is needed to coordinate actions across the system.",
      "Strict control over global access is required."
    ],
    whenNotToUse: [
      "In unit-tested systems where global state makes mocking and isolation difficult.",
      "When dependency injection frameworks can manage lifecycle cleanly."
    ],
    diagram: {
      nodes: {
        "node_singleton": {
          id: "node_singleton",
          position: { x: 200, y: 100 },
          data: {
            name: "DatabaseConnection",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "instance", type: "DatabaseConnection", isStatic: true }
            ],
            methods: [
              { id: "m1", visibility: "-", name: "DatabaseConnection", type: "void" },
              { id: "m2", visibility: "+", name: "getInstance", type: "DatabaseConnection", isStatic: true },
              { id: "m3", visibility: "+", name: "query", type: "void", params: "sql: String" }
            ]
          }
        }
      },
      edges: {}
    },
    javaCode: `public class DatabaseConnection {\n    private static volatile DatabaseConnection instance;\n    private DatabaseConnection() {}\n\n    public static DatabaseConnection getInstance() {\n        if (instance == null) {\n            synchronized (DatabaseConnection.class) {\n                if (instance == null) {\n                    instance = new DatabaseConnection();\n                }\n            }\n        }\n        return instance;\n    }\n}`,
    relatedProblemIds: ["lru-cache"],
    quiz: [
      {
        question: "Why is the constructor of a Singleton made private?",
        options: [
          "To prevent other classes from directly instantiating it with 'new'",
          "To prevent subclasses from inheriting",
          "For serialization purposes",
          "To make it run faster"
        ],
        answerIndex: 0,
        explanation: "A private constructor blocks direct instantiation from external classes."
      },
      {
        question: "What is the purpose of double-checked locking in Java Singleton?",
        options: [
          "To avoid synchronization overhead once the instance is already initialized",
          "To allow two instances to exist",
          "To prevent garbage collection",
          "To support multiple inheritance"
        ],
        answerIndex: 0,
        explanation: "The first check avoids synchronizing on every getInstance() call after the singleton is created."
      },
      {
        question: "Why is the instance field marked volatile in double-checked locking?",
        options: [
          "To prevent instruction reordering where a partially initialized object reference is published",
          "To make the field private",
          "To write it to disk",
          "To disable garbage collection"
        ],
        answerIndex: 0,
        explanation: "Volatile ensures writes to the instance reference happen before other threads read it, preventing partially-constructed object exposure."
      }
    ],
    flashcards: [
      {
        front: "What is a Singleton?",
        back: "A pattern ensuring a class has only one instance while providing a global access point."
      },
      {
        front: "Why use Double-Checked Locking in Java?",
        back: "To ensure thread safety while minimizing synchronization overhead after the instance is created."
      },
      {
        front: "What is a common criticism of Singleton?",
        back: "It introduces hidden global state, violates Single Responsibility, and makes unit testing/mocking difficult."
      }
    ]
  },
  {
    id: "builder",
    name: "Builder Pattern",
    category: "creational",
    intent: "Separate the construction of a complex object from its representation so that the same construction process can create different representations.",
    problemItSolves: "Avoids telescoping constructor anti-pattern (constructors with 10+ parameters) and supports immutable object creation.",
    whenToUse: [
      "Building complex objects with many optional and mandatory fields.",
      "Constructing immutable objects where setters cannot be exposed.",
      "The algorithm for creating a complex object should be independent of the parts."
    ],
    whenNotToUse: [
      "The object is simple and has only a few parameters that rarely change."
    ],
    diagram: {
      nodes: {
        "node_http_req": {
          id: "node_http_req",
          position: { x: 50, y: 100 },
          data: {
            name: "HttpRequest",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "url", type: "String" },
              { id: "f2", visibility: "-", name: "method", type: "String" },
              { id: "f3", visibility: "-", name: "headers", type: "Map<String, String>" }
            ],
            methods: []
          }
        },
        "node_builder": {
          id: "node_builder",
          position: { x: 420, y: 100 },
          data: {
            name: "HttpRequestBuilder",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "url", type: "String" },
              { id: "f2", visibility: "-", name: "method", type: "String" },
              { id: "f3", visibility: "-", name: "headers", type: "Map<String, String>" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "setUrl", type: "HttpRequestBuilder", params: "url: String" },
              { id: "m2", visibility: "+", name: "setMethod", type: "HttpRequestBuilder", params: "method: String" },
              { id: "m3", visibility: "+", name: "build", type: "HttpRequest" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_builder", target: "node_http_req", data: { kind: "dependency", label: "creates" } }
      }
    },
    javaCode: `public class HttpRequest {\n    private final String url;\n    private final String method;\n    private final int timeout;\n\n    private HttpRequest(Builder b) {\n        this.url = b.url;\n        this.method = b.method;\n        this.timeout = b.timeout;\n    }\n\n    public static class Builder {\n        private String url;\n        private String method = "GET";\n        private int timeout = 5000;\n\n        public Builder url(String url) { this.url = url; return this; }\n        public Builder method(String method) { this.method = method; return this; }\n        public Builder timeout(int ms) { this.timeout = ms; return this; }\n        public HttpRequest build() { return new HttpRequest(this); }\n    }\n}`,
    relatedProblemIds: ["parking-lot", "elevator-system"],
    quiz: [
      {
        question: "What problem does the Builder pattern eliminate?",
        options: [
          "Telescoping constructor parameter antipattern",
          "Polymorphic dispatch overhead",
          "Garbage collection cycles",
          "Circular class imports"
        ],
        answerIndex: 0,
        explanation: "Builder avoids constructors with long, confusing lists of optional parameters."
      },
      {
        question: "How does Builder help with object immutability?",
        options: [
          "Object fields can be declared final because construction happens in build() without public setters",
          "It forces all fields to be static",
          "It locks the memory page",
          "It converts the class to an interface"
        ],
        answerIndex: 0,
        explanation: "All fields can be assigned once in the private constructor and marked final, making the object immutable."
      },
      {
        question: "What is method chaining in Builder?",
        options: [
          "Methods return 'this' (the builder instance) to allow fluent chained calls",
          "Calling methods across different classes simultaneously",
          "A chain of inheritance",
          "Recursive invocation"
        ],
        answerIndex: 0,
        explanation: "Returning the builder reference enables a readable fluent API like .url('...').method('POST').build()."
      }
    ],
    flashcards: [
      {
        front: "What is the primary benefit of the Builder Pattern?",
        back: "Constructing complex objects step-by-step with readable fluent APIs, avoiding telescoping constructors while supporting immutability."
      },
      {
        front: "How does Builder support immutability?",
        back: "Fields in the target class are declared final; values are populated once in the constructor from the builder without public setters."
      },
      {
        front: "When is Builder overkill?",
        back: "When the target class has only 2 or 3 attributes and does not need optional configuration."
      }
    ]
  },
  {
    id: "decorator",
    name: "Decorator Pattern",
    category: "structural",
    intent: "Attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality.",
    problemItSolves: "Prevents class explosion caused by creating subclasses for every possible combination of features (e.g. Coffee with Milk, Whip, Sugar).",
    whenToUse: [
      "Add responsibilities to individual objects dynamically and transparently without affecting other objects.",
      "Extension by subclassing is impractical due to combinatoric explosion of subclasses."
    ],
    whenNotToUse: [
      "The component interface is large and complex to mirror in all decorators."
    ],
    diagram: {
      nodes: {
        "node_beverage": {
          id: "node_beverage",
          position: { x: 50, y: 100 },
          data: {
            name: "Beverage",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "getCost", type: "double" },
              { id: "m2", visibility: "+", name: "getDescription", type: "String" }
            ]
          }
        },
        "node_espresso": {
          id: "node_espresso",
          position: { x: 50, y: 300 },
          data: {
            name: "Espresso",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "getCost", type: "double" },
              { id: "m2", visibility: "+", name: "getDescription", type: "String" }
            ]
          }
        },
        "node_decorator": {
          id: "node_decorator",
          position: { x: 420, y: 100 },
          data: {
            name: "BeverageDecorator",
            kind: "abstract",
            fields: [
              { id: "f1", visibility: "#", name: "wrapped", type: "Beverage" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "getCost", type: "double" }
            ]
          }
        },
        "node_milk": {
          id: "node_milk",
          position: { x: 420, y: 300 },
          data: {
            name: "MilkDecorator",
            kind: "class",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "getCost", type: "double" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_espresso", target: "node_beverage", data: { kind: "implementation" } },
        "e2": { id: "e2", source: "node_decorator", target: "node_beverage", data: { kind: "implementation" } },
        "e3": { id: "e3", source: "node_decorator", target: "node_beverage", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e4": { id: "e4", source: "node_milk", target: "node_decorator", data: { kind: "inheritance" } }
      }
    },
    javaCode: `public interface Coffee {\n    double cost();\n    String description();\n}\n\npublic class SimpleCoffee implements Coffee {\n    public double cost() { return 2.0; }\n    public String description() { return "Simple Coffee"; }\n}\n\npublic abstract class CoffeeDecorator implements Coffee {\n    protected final Coffee decorated;\n    public CoffeeDecorator(Coffee c) { this.decorated = c; }\n    public double cost() { return decorated.cost(); }\n    public String description() { return decorated.description(); }\n}\n\npublic class Milk extends CoffeeDecorator {\n    public Milk(Coffee c) { super(c); }\n    public double cost() { return super.cost() + 0.5; }\n    public String description() { return super.description() + ", Milk"; }\n}`,
    relatedProblemIds: ["parking-lot"],
    quiz: [
      {
        question: "How does Decorator achieve extension without subclass explosion?",
        options: [
          "By wrapping an existing object inside another object that implements the same interface",
          "By generating bytecode at runtime",
          "By making all methods static",
          "By implementing multiple interfaces"
        ],
        answerIndex: 0,
        explanation: "Decorators wrap objects conforming to the same interface, chaining behaviors recursively at runtime."
      },
      {
        question: "Which Java standard library class is a famous example of the Decorator pattern?",
        options: [
          "java.io.BufferedReader wrapping FileReader",
          "java.util.ArrayList",
          "java.lang.String",
          "java.lang.Thread"
        ],
        answerIndex: 0,
        explanation: "Java I/O streams (BufferedInputStream, GZIPInputStream, FileInputStream) are the canonical Decorator example."
      },
      {
        question: "What is a disadvantage of the Decorator pattern?",
        options: [
          "It results in many small objects that are difficult to debug when deeply nested",
          "It breaks polymorphism",
          "It does not work with interfaces",
          "It forbids composition"
        ],
        answerIndex: 0,
        explanation: "Debugging layered decorators can be hard because errors happen deep in the wrapper chain."
      }
    ],
    flashcards: [
      {
        front: "What is the Decorator Pattern?",
        back: "A structural pattern that dynamically adds behavior to individual objects by wrapping them in decorator classes with the same interface."
      },
      {
        front: "What problem does Decorator prevent?",
        back: "Subclass explosion: instead of creating 20 subclasses for every combination of features, you wrap them dynamically."
      },
      {
        front: "Classic Java standard library example of Decorator?",
        back: "java.io classes: new BufferedReader(new InputStreamReader(new FileInputStream(...)))"
      }
    ]
  },
  {
    id: "command",
    name: "Command Pattern",
    category: "behavioral",
    intent: "Encapsulate a request as an object, thereby letting you parameterize clients with different requests, queue or log requests, and support undoable operations.",
    problemItSolves: "Decouples the invoker that triggers an action from the receiver that actually executes the business logic, enabling undo/redo and transactional queues.",
    whenToUse: [
      "Parameterize objects by an action to perform.",
      "Specify, queue, and execute requests at different times.",
      "Support undo, redo, and history logging."
    ],
    whenNotToUse: [
      "Operations are simple direct calls without any requirement for queuing, scheduling, or undo."
    ],
    diagram: {
      nodes: {
        "node_invoker": {
          id: "node_invoker",
          position: { x: 50, y: 100 },
          data: {
            name: "RemoteControl",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "command", type: "Command" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "pressButton", type: "void" }
            ]
          }
        },
        "node_cmd": {
          id: "node_cmd",
          position: { x: 380, y: 100 },
          data: {
            name: "Command",
            kind: "interface",
            fields: [],
            methods: [
              { id: "m1", visibility: "+", name: "execute", type: "void" },
              { id: "m2", visibility: "+", name: "undo", type: "void" }
            ]
          }
        },
        "node_light_on": {
          id: "node_light_on",
          position: { x: 380, y: 300 },
          data: {
            name: "LightOnCommand",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "light", type: "Light" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "execute", type: "void" },
              { id: "m2", visibility: "+", name: "undo", type: "void" }
            ]
          }
        },
        "node_receiver": {
          id: "node_receiver",
          position: { x: 700, y: 300 },
          data: {
            name: "Light",
            kind: "class",
            fields: [
              { id: "f1", visibility: "-", name: "isOn", type: "boolean" }
            ],
            methods: [
              { id: "m1", visibility: "+", name: "turnOn", type: "void" },
              { id: "m2", visibility: "+", name: "turnOff", type: "void" }
            ]
          }
        }
      },
      edges: {
        "e1": { id: "e1", source: "node_invoker", target: "node_cmd", data: { kind: "aggregation", sourceMultiplicity: "1", targetMultiplicity: "1" } },
        "e2": { id: "e2", source: "node_light_on", target: "node_cmd", data: { kind: "implementation" } },
        "e3": { id: "e3", source: "node_light_on", target: "node_receiver", data: { kind: "association", label: "delegates to", sourceMultiplicity: "1", targetMultiplicity: "1" } }
      }
    },
    javaCode: `public interface Command {\n    void execute();\n    void undo();\n}\n\npublic class Light {\n    public void turnOn() { System.out.println("Light ON"); }\n    public void turnOff() { System.out.println("Light OFF"); }\n}\n\npublic class TurnOnLightCommand implements Command {\n    private final Light light;\n    public TurnOnLightCommand(Light l) { this.light = l; }\n    public void execute() { light.turnOn(); }\n    public void undo() { light.turnOff(); }\n}\n\npublic class RemoteInvoker {\n    private Command cmd;\n    public void setCommand(Command c) { this.cmd = c; }\n    public void click() { cmd.execute(); }\n}`,
    relatedProblemIds: ["elevator-system"],
    quiz: [
      {
        question: "What are the four key participants in the Command pattern?",
        options: [
          "Command, Receiver, Invoker, Client",
          "Model, View, Controller, Service",
          "Strategy, Context, State, Adapter",
          "Subject, Observer, Broker, Worker"
        ],
        answerIndex: 0,
        explanation: "The Command encapsulates action, the Receiver performs it, the Invoker triggers it, and the Client configures them."
      },
      {
        question: "How does the Command pattern enable Undo/Redo?",
        options: [
          "By pushing executed Command objects onto a history stack with an undo() method reversing changes",
          "By resetting computer memory",
          "By re-running the application from the start",
          "By using Git under the hood"
        ],
        answerIndex: 0,
        explanation: "Maintaining a stack of executed commands allows calling undo() sequentially."
      },
      {
        question: "What is an advantage of turning requests into objects?",
        options: [
          "Commands can be queued, delayed, scheduled, serialized, and retried asynchronously",
          "It bypasses type checking",
          "It uses less memory than method calls",
          "It avoids needing any interfaces"
        ],
        answerIndex: 0,
        explanation: "Because the command is a first-class object, it can be passed over the wire, queued, or stored in history."
      }
    ],
    flashcards: [
      {
        front: "What is the intent of the Command Pattern?",
        back: "Encapsulate a request as an object, decoupling the invoker from the receiver, enabling undo/redo and queues."
      },
      {
        front: "How does Command support Undo/Redo?",
        back: "Commands implement execute() and undo(). Executed commands are saved on a stack and popped in reverse order."
      },
      {
        front: "Who are the 4 participants in the Command pattern?",
        back: "Invoker (triggers command), Command (interface), ConcreteCommand (wires action), Receiver (executes business logic)."
      }
    ]
  }
];

const clientDir = path.resolve(process.cwd(), 'bluprnt-client');
const publicContentDir = path.join(clientDir, 'public', 'content');

fs.writeFileSync(
  path.join(publicContentDir, 'lld-problems.json'),
  JSON.stringify(problems, null, 2)
);

fs.writeFileSync(
  path.join(publicContentDir, 'lld-patterns.json'),
  JSON.stringify(patterns, null, 2)
);

console.log("Successfully generated lld-problems.json and lld-patterns.json!");
