import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Code2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Boxes,
  Cpu,
  GitBranch,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClassDiagramEditor } from '../components/lld/ClassDiagramEditor';
import type { LldDiagram } from '../core/types/lld';

export const LldFoundationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'uml' | 'solid' | 'oop'>('uml');
  const [selectedSolid, setSelectedSolid] = useState<string>('srp');
  const [selectedRelation, setSelectedRelation] = useState<string>('composition');

  // Interactive Reference Diagram demonstrating all 6 UML Relationships
  const demoDiagram: LldDiagram = {
    nodes: {
      n_univ: {
        id: 'n_univ',
        position: { x: 50, y: 50 },
        data: {
          name: 'University',
          kind: 'class',
          fields: [
            { id: 'f1', visibility: '-', name: 'name', type: 'String' },
            { id: 'f2', visibility: '-', name: 'departments', type: 'List<Department>' },
          ],
          methods: [
            { id: 'm1', visibility: '+', name: 'admitStudent', type: 'void', params: 's: Student' },
          ],
        },
      },
      n_dept: {
        id: 'n_dept',
        position: { x: 420, y: 50 },
        data: {
          name: 'Department',
          kind: 'class',
          fields: [
            { id: 'f1', visibility: '-', name: 'deptCode', type: 'String' },
            { id: 'f2', visibility: '-', name: 'professors', type: 'List<Professor>' },
          ],
          methods: [
            { id: 'm1', visibility: '+', name: 'addCourse', type: 'void', params: 'c: Course' },
          ],
        },
      },
      n_prof: {
        id: 'n_prof',
        position: { x: 800, y: 50 },
        data: {
          name: 'Professor',
          kind: 'class',
          fields: [
            { id: 'f1', visibility: '-', name: 'facultyId', type: 'String' },
            { id: 'f2', visibility: '-', name: 'specialization', type: 'String' },
          ],
          methods: [
            { id: 'm1', visibility: '+', name: 'conductLecture', type: 'void', params: 'c: Course' },
          ],
        },
      },
      n_person: {
        id: 'n_person',
        position: { x: 800, y: 280 },
        data: {
          name: 'Person',
          kind: 'abstract',
          fields: [
            { id: 'f1', visibility: '#', name: 'id', type: 'String' },
            { id: 'f2', visibility: '#', name: 'name', type: 'String' },
          ],
          methods: [
            { id: 'm1', visibility: '+', name: 'getEmail', type: 'String', params: '' },
          ],
        },
      },
      n_eval: {
        id: 'n_eval',
        position: { x: 420, y: 280 },
        data: {
          name: 'Evaluatable',
          kind: 'interface',
          fields: [],
          methods: [
            { id: 'm1', visibility: '+', name: 'submitGrade', type: 'boolean', params: 's: Student, score: double' },
          ],
        },
      },
      n_course: {
        id: 'n_course',
        position: { x: 50, y: 280 },
        data: {
          name: 'Course',
          kind: 'class',
          fields: [
            { id: 'f1', visibility: '-', name: 'courseId', type: 'String' },
            { id: 'f2', visibility: '-', name: 'title', type: 'String' },
          ],
          methods: [
            { id: 'm1', visibility: '+', name: 'generateSyllabus', type: 'String', params: '' },
          ],
        },
      },
    },
    edges: {
      e1: {
        id: 'e1',
        source: 'n_univ',
        target: 'n_dept',
        data: {
          kind: 'composition',
          label: 'owns (1..*)',
          sourceMultiplicity: '1',
          targetMultiplicity: '1..*',
        },
      },
      e2: {
        id: 'e2',
        source: 'n_dept',
        target: 'n_prof',
        data: {
          kind: 'aggregation',
          label: 'employs',
          sourceMultiplicity: '1',
          targetMultiplicity: '0..*',
        },
      },
      e3: {
        id: 'e3',
        source: 'n_prof',
        target: 'n_person',
        data: {
          kind: 'inheritance',
          label: 'is-a',
        },
      },
      e4: {
        id: 'e4',
        source: 'n_prof',
        target: 'n_eval',
        data: {
          kind: 'implementation',
          label: 'implements',
        },
      },
      e5: {
        id: 'e5',
        source: 'n_dept',
        target: 'n_course',
        data: {
          kind: 'association',
          label: 'offers',
          sourceMultiplicity: '1',
          targetMultiplicity: '1..*',
        },
      },
      e6: {
        id: 'e6',
        source: 'n_course',
        target: 'n_eval',
        data: {
          kind: 'dependency',
          label: 'uses',
        },
      },
    },
  };

  const relationshipGuides = [
    {
      id: 'inheritance',
      name: 'Inheritance (Generalization)',
      symbol: '───▷ (Solid line, hollow triangle)',
      description: 'Strict "is-a" taxonomy where a subclass derives state and behavior from a superclass.',
      rule: 'SubClass extends SuperClass. Always verify Liskov Substitution: any instance of SuperClass must be replaceable by SubClass.',
      code: `public class Professor extends Person {\n    private String facultyId;\n}`,
    },
    {
      id: 'implementation',
      name: 'Implementation (Realization)',
      symbol: '┄┄┄▷ (Dashed line, hollow triangle)',
      description: 'A concrete class promises to satisfy the behavioral contract declared by an Interface.',
      rule: 'Class implements Interface. Interfaces must remain stateless without instance fields.',
      code: `public class Professor implements Evaluatable {\n    @Override\n    public boolean submitGrade(Student s, double score) { return true; }\n}`,
    },
    {
      id: 'composition',
      name: 'Composition (Strong "Has-a")',
      symbol: '───◆ (Solid line, filled diamond on owner)',
      description: 'Part-whole relationship where the parts cannot exist without the whole. Lifecycles are strictly coupled.',
      rule: 'If University is destroyed, its Departments cease to exist. University instantiates and owns Department.',
      code: `public class University {\n    private final List<Department> departments = new ArrayList<>();\n    public University() {\n        departments.add(new Department("CS")); // Created & owned\n    }\n}`,
    },
    {
      id: 'aggregation',
      name: 'Aggregation (Weak "Has-a")',
      symbol: '───◇ (Solid line, hollow diamond on container)',
      description: 'Container-contained relationship where the contained items have an independent lifecycle outside the container.',
      rule: 'A Department has Professors, but if the Department closes, the Professors continue to exist and can move to another university.',
      code: `public class Department {\n    private List<Professor> professors; // Injected from outside\n    public void addProfessor(Professor p) { this.professors.add(p); }\n}`,
    },
    {
      id: 'association',
      name: 'Association',
      symbol: '───> (Solid line, open arrow)',
      description: 'Structural link between two peer classes where one class maintains a reference field to another.',
      rule: 'Department offers Courses. Bidirectional or unidirectional navigational link.',
      code: `public class Department {\n    private List<Course> offeredCourses;\n}`,
    },
    {
      id: 'dependency',
      name: 'Dependency',
      symbol: '┄┄┄> (Dashed line, open arrow)',
      description: 'Weakest relationship where a class temporarily uses another as a method parameter, return type, or local variable.',
      rule: '"Uses-a" transient link without storing a permanent instance field.',
      code: `public class Course {\n    public void grade(Evaluatable evaluator) { ... } // Dependency in signature\n}`,
    },
  ];

  const solidGuides = [
    {
      id: 'srp',
      letter: 'S',
      title: 'Single Responsibility Principle',
      motto: 'A class should have one, and only one, reason to change.',
      badSmell: 'God Class: OrderService that validates items, calculates taxes, debits credit cards, and formats HTML emails all in one method.',
      refactored: `// 1. Core Order Entity\npublic class Order { private String id; private double total; }\n\n// 2. Isolated Billing Responsibility\npublic class PaymentProcessor {\n    public void processPayment(Order o, String card) { ... }\n}\n\n// 3. Isolated Notification Responsibility\npublic class OrderNotificationService {\n    public void sendConfirmationEmail(Order o) { ... }\n}`,
    },
    {
      id: 'ocp',
      letter: 'O',
      title: 'Open / Closed Principle',
      motto: 'Software entities should be open for extension, but closed for modification.',
      badSmell: 'Using switch-cases or chained if-else to calculate shipping rates based on carrier: modifying the class whenever a new courier is onboarded.',
      refactored: `public interface ShippingStrategy {\n    double calculateCost(Package pkg);\n}\n\npublic class FedExShipping implements ShippingStrategy {\n    public double calculateCost(Package pkg) { return pkg.getWeight() * 1.5; }\n}\n\npublic class DhlShipping implements ShippingStrategy {\n    public double calculateCost(Package pkg) { return pkg.getWeight() * 2.1; }\n}`,
    },
    {
      id: 'lsp',
      letter: 'L',
      title: 'Liskov Substitution Principle',
      motto: 'Subtypes must be substitutable for their base types without altering correctness.',
      badSmell: 'Square inheriting from Rectangle: overriding setWidth() to also mutate height, breaking client assumptions that width and height vary independently.',
      refactored: `public interface Shape {\n    double getArea();\n}\n\npublic class Rectangle implements Shape {\n    private final double w, h;\n    public Rectangle(double w, double h) { this.w = w; this.h = h; }\n    public double getArea() { return w * h; }\n}\n\npublic class Square implements Shape {\n    private final double side;\n    public Square(double s) { this.side = s; }\n    public double getArea() { return side * side; }\n}`,
    },
    {
      id: 'isp',
      letter: 'I',
      title: 'Interface Segregation Principle',
      motto: 'Clients should not be forced to depend on methods they do not use.',
      badSmell: 'Fat Worker interface containing work(), eat(), sleep(): forcing RobotWorker to throw UnsupportedOperationException on eat() and sleep().',
      refactored: `public interface Workable {\n    void work();\n}\n\npublic interface Feedable {\n    void eat();\n}\n\npublic class HumanWorker implements Workable, Feedable {\n    public void work() { ... }\n    public void eat() { ... }\n}\n\npublic class RobotWorker implements Workable {\n    public void work() { ... } // Zero unused methods forced\n}`,
    },
    {
      id: 'dip',
      letter: 'D',
      title: 'Dependency Inversion Principle',
      motto: 'High-level modules should not depend on low-level modules; both should depend on abstractions.',
      badSmell: 'UserService directly instantiating private MySqlDatabase db = new MySqlDatabase(); tightly coupling business rules to a concrete SQL driver.',
      refactored: `public interface UserRepository {\n    User findById(String id);\n}\n\npublic class UserService {\n    private final UserRepository repository; // Injected interface\n    public UserService(UserRepository repo) { this.repository = repo; }\n}\n\npublic class PostgresUserRepository implements UserRepository { ... }`,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900/40 via-cyan-900/30 to-slate-900 border border-cyan-500/20 p-8 sm:p-10 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LLD Core Curriculum</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            OOP Fundamentals, UML Relationships & SOLID Principles
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            The foundation of Low-Level Design interviews. Master object-oriented modelling, precise UML notation distinctions, and clean architecture principles before tackling complex systems.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/lld/problems"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 transition inline-flex items-center gap-2"
            >
              <span>Practice Problem Bank (18 Problems)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/lld/patterns"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 transition"
            >
              GoF Design Patterns (8)
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('uml')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'uml'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>1. UML Class Relationships</span>
        </button>
        <button
          onClick={() => setActiveTab('solid')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'solid'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>2. SOLID Principles Masterclass</span>
        </button>
        <button
          onClick={() => setActiveTab('oop')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'oop'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>3. OOP Core Pillars (A-P-I-E)</span>
        </button>
      </div>

      {/* Tab 1: UML Relationships */}
      {activeTab === 'uml' && (
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Interactive UML Class Relationships Canvas
            </h2>
            <p className="text-xs text-slate-500">
              Inspect the 6 fundamental UML structural relationships modeled inside a cohesive University management domain:
            </p>
          </div>

          {/* Embedded Interactive ReadOnly Diagram Canvas */}
          <div className="h-96 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner bg-slate-900/50">
            <ClassDiagramEditor
              initialDiagram={demoDiagram}
              readOnly={true}
            />
          </div>

          {/* Relationship Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relationshipGuides.map((rel) => (
              <div
                key={rel.id}
                onClick={() => setSelectedRelation(rel.id)}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedRelation === rel.id
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-md ring-1 ring-cyan-500'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {rel.name}
                    </h3>
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-1 rounded inline-block">
                    {rel.symbol}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rel.description}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Rule: {rel.rule}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <pre className="text-[10px] font-mono bg-slate-900 text-slate-200 p-2.5 rounded-lg overflow-x-auto">
                    {rel.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: SOLID Principles */}
      {activeTab === 'solid' && (
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              SOLID Design Principles
            </h2>
            <p className="text-xs text-slate-500">
              The gold-standard architectural tenets for robust, maintainable, and decoupled object-oriented code.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {solidGuides.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedSolid(g.id)}
                className={`p-3 rounded-xl border text-center transition ${
                  selectedSolid === g.id
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl font-black block">{g.letter}</span>
                <span className="text-[10px] font-bold block truncate">{g.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Active SOLID Detail Card */}
          {(() => {
            const cur = solidGuides.find((g) => g.id === selectedSolid) || solidGuides[0];
            return (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black">
                    {cur.letter}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {cur.title}
                    </h3>
                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                      "{cur.motto}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bad code smell */}
                  <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                    <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                      Anti-Pattern & Code Smell
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300/90 leading-relaxed">
                      {cur.badSmell}
                    </p>
                  </div>

                  {/* Refactored Java Solution */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Clean Refactored Architecture (Java)
                    </h4>
                    <pre className="text-xs font-mono bg-slate-900 text-slate-200 p-4 rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                      {cur.refactored}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 3: OOP Pillars */}
      {activeTab === 'oop' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
              E
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Encapsulation
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Bundling data and methods into a single unit while restricting direct external access to internal state via private fields and controlled public accessors. Protects invariants and prevents state corruption.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Abstraction
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Hiding complex internal implementation details and exposing only essential behavioral contracts through abstract classes and interfaces. Allows changing underlying algorithms without breaking client code.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              I
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Inheritance
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Mechanism where a subclass inherits properties and behaviors from a parent class to foster code reuse. Prefer composition over inheritance when relationships are not strictly hierarchical.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
              P
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Polymorphism
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Ability of different classes to respond to the same message in distinct ways (runtime dynamic dispatch through overriding, and compile-time overloading). Underpins the Strategy and Factory patterns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
