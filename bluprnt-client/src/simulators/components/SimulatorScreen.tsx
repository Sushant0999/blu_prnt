import React from 'react';
import { SimulatorDefinition } from '../engine/types';
import { useTrafficGenerator } from '../engine/useTrafficGenerator';
import { TopBarControls } from './TopBarControls';
import { ModeSelector } from './ModeSelector';
import { VisualCard } from './VisualCard';
import { RequestStrip } from './RequestStrip';
import { StatTiles } from './StatTiles';
import { TrafficPanel } from './TrafficPanel';
import { FailurePanel } from './FailurePanel';
import { SimulatorDebugger } from './SimulatorDebugger';
import { CustomPayloadInjector } from './CustomPayloadInjector';

interface SimulatorScreenProps {
  definition: SimulatorDefinition;
  customVisualizer?: (state: any, modeId: string) => React.ReactNode;
}

export const SimulatorScreen: React.FC<SimulatorScreenProps> = ({
  definition,
  customVisualizer,
}) => {
  const {
    rate,
    isBursty,
    isPaused,
    togglePause,
    resetAll,
    setRate,
    setBursty,
    isStepMode,
    stepModeCount,
    toggleStepMode,
    stepForward,
    injectCustomRequest,
    latestTrace,
    currentModeId,
    setMode,
    params,
    setParam,
    outcomesHistory,
    centerMetric,
    stats,
    liveState,
    triggerFailure,
  } = useTrafficGenerator(definition);

  // Active mode params combined with shared params
  const activeMode = definition.modes.find((m) => m.id === currentModeId);
  const combinedParamDefs = [...definition.params, ...(activeMode?.params || [])];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Top Bar with back button, title, status pill, play/pause and reset */}
      <TopBarControls
        title={definition.title}
        description={definition.description}
        linkedLessonId={definition.linkedLessonId}
        isPaused={isPaused}
        isBursty={isBursty}
        rate={rate}
        onTogglePause={togglePause}
        onReset={resetAll}
      />

      {/* Mode Selector with dynamic 1-line plain language explanation */}
      <ModeSelector
        modes={definition.modes}
        currentModeId={currentModeId}
        onSelectMode={setMode}
      />

      {/* Enterprise Step-Through Debugger Bar */}
      <SimulatorDebugger
        isStepMode={isStepMode}
        onToggleStepMode={toggleStepMode}
        onStepForward={stepForward}
        onReset={resetAll}
        isPaused={isPaused}
        onTogglePause={togglePause}
        currentStepCount={stepModeCount}
      />

      {/* Main Grid: Visuals + Stats + Strip (Left) and Controls + Custom Injection (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Visual Card, Outcomes Strip, Stat Tiles */}
        <div className="lg:col-span-2 space-y-4">
          <VisualCard
            simulatorId={definition.id}
            moduleTitle={definition.title}
            modeId={currentModeId}
            rate={rate}
            isPaused={isPaused}
            isBursty={isBursty}
            centerMetric={centerMetric}
            liveState={liveState}
            latestOutcome={outcomesHistory[outcomesHistory.length - 1]}
            params={params}
          >
            {customVisualizer && customVisualizer(liveState, currentModeId)}
          </VisualCard>

          {/* Last 44 Requests Outcome Strip */}
          <RequestStrip
            outcomes={outcomesHistory}
            availableOutcomes={definition.outcomes}
          />

          {/* Exactly 3 Stat Tiles */}
          <StatTiles stats={stats} />
        </div>

        {/* Right Column: Custom Key/Payload Injection, Traffic Panel & Failure Injections */}
        <div className="space-y-4">
          {/* Custom Payload & Key Injection Panel */}
          <CustomPayloadInjector
            simulatorId={definition.id}
            onInject={injectCustomRequest}
            latestTrace={latestTrace}
          />

          <TrafficPanel
            rate={rate}
            maxRate={definition.maxRate}
            isBursty={isBursty}
            onRateChange={setRate}
            onBurstyChange={setBursty}
            params={params}
            paramDefs={combinedParamDefs}
            onParamChange={setParam}
          />

          <FailurePanel
            failureActions={definition.failureActions}
            onTriggerFailure={triggerFailure}
          />
        </div>
      </div>
    </div>
  );
};
