/**
 * OutageLab Simulation Engine
 * 
 * Handles deterministic state transitions for each scenario.
 * All game logic lives here — independent of HTTP layer.
 */

const SCENARIOS = {
  'bad-deployment': require('./scenarios/badDeployment'),
  'db-connection-failure': require('./scenarios/dbConnectionFailure'),
  'traffic-surge': require('./scenarios/trafficSurge'),
};

/**
 * Initialize a fresh run from a scenario definition
 */
function initializeRun(scenarioDef) {
  const scenario = SCENARIOS[scenarioDef.scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioDef.scenarioId}`);

  const initialState = scenario.getInitialState();
  return {
    serviceStates: initialState.serviceStates,
    logs: initialState.logs,
    actionHistory: [],
    score: 1000,
    engineState: initialState.engineState,
  };
}

/**
 * Process an action against the current run state
 * Returns { updated fields to merge into the run, actionResult }
 */
function processAction(scenarioId, currentRun, action, targetService) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  // Validate action
  const validActions = scenario.getValidActions(currentRun.engineState);
  if (!validActions.includes(action)) {
    return {
      success: false,
      effective: false,
      message: `Action "${action}" is not available in the current state.`,
      scoreChange: 0,
      updates: {},
    };
  }

  // Execute action
  const result = scenario.applyAction(action, targetService, currentRun);

  return result;
}

/**
 * Check if a scenario is resolved
 */
function checkResolution(scenarioId, engineState) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) return false;
  return scenario.isResolved(engineState);
}

/**
 * Generate the final postmortem report
 */
function generateReport(scenarioId, run) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  return scenario.generateReport(run);
}

/**
 * Get list of available actions for current state
 */
function getAvailableActions(scenarioId, engineState) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) return [];
  return scenario.getValidActions(engineState);
}

module.exports = {
  initializeRun,
  processAction,
  checkResolution,
  generateReport,
  getAvailableActions,
};
