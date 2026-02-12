/**
 * Battle Integration Tests
 * Tests the complete battle system flow
 */

class BattleIntegrationTest extends TestSuite {
  constructor() {
    super('BattleIntegration');
    this.gameEngine = null;
    this.stateManager = null;
    this.battleSystem = null;
    this.battleMap = null;
    this.combatCalculator = null;
    this.aiController = null;
    this.cityRepository = null;
    this.personRepository = null;
  }

  async beforeAll() {
    this.stateManager = new StateManager();
    this.gameEngine = new GameEngine(this.stateManager);
    
    const dataLoader = new DataLoader();
    await dataLoader.loadFromXML('/data/dat.xml');
    
    this.cityRepository = new CityRepository(dataLoader.getData().cities);
    this.personRepository = new PersonRepository(dataLoader.getData().persons);
    this.skillRepository = new SkillRepository(dataLoader.getData().skills);
    
    this.combatCalculator = new CombatCalculator(this.skillRepository);
    this.battleMap = new BattleMap(15, 15);
    this.aiController = new AIController(this.combatCalculator);
    
    this.weatherSystem = new WeatherSystem();
    this.skillSystem = new SkillSystem(this.skillRepository, this.weatherSystem);
    
    this.battleSystem = new BattleSystem(
      this.gameEngine,
      this.battleMap,
      this.combatCalculator,
      this.skillSystem,
      this.weatherSystem,
      this.aiController
    );
    
    this.stateManager.setState({
      currentPeriod: 1,
      currentYear: 184,
      currentMonth: 1,
      playerForceId: 1
    });
  }

  beforeEach() {
    // Reset battle map
    this.battleMap = new BattleMap(15, 15);
    this.battleSystem.setBattleMap(this.battleMap);
    
    // Create test generals
    this.attackerGeneral = this.personRepository.getById(1);
    this.attackerGeneral.setForceId(1);
    this.attackerGeneral.setStrength(80);
    this.attackerGeneral.setIntelligence(70);
    this.attackerGeneral.setCommand(75);
    this.attackerGeneral.setSoldier(1000);
    this.attackerGeneral.setSoldierType('cavalry');
    
    this.defenderGeneral = this.personRepository.getById(10);
    this.defenderGeneral.setForceId(2);
    this.defenderGeneral.setStrength(70);
    this.defenderGeneral.setIntelligence(65);
    this.defenderGeneral.setCommand(70);
    this.defenderGeneral.setSoldier(1000);
    this.defenderGeneral.setSoldierType('infantry');
    
    // Set up battle units
    this.attackerUnit = new BattleUnit(this.attackerGeneral, 1);
    this.defenderUnit = new BattleUnit(this.defenderGeneral, 2);
  }

  // ==================== Test: Battle Initialization ====================
  
  testBattleInitialization() {
    const attackerUnits = [this.attackerUnit];
    const defenderUnits = [this.defenderUnit];
    
    const battleConfig = {
      attackerUnits,
      defenderUnits,
      mapWidth: 15,
      mapHeight: 15,
      terrainSeed: 12345
    };
    
    const battle = this.battleSystem.initializeBattle(battleConfig);
    
    this.assertNotNull(battle, 'Battle should be initialized');
    this.assertEquals(battle.state, 'initialized', 'Battle state should be initialized');
    this.assertEquals(battle.attackerUnits.length, 1, 'Should have 1 attacker unit');
    this.assertEquals(battle.defenderUnits.length, 1, 'Should have 1 defender unit');
  }

  // ==================== Test: Combat Damage Calculation ====================
  
  testCombatDamageCalculation() {
    const damage = this.combatCalculator.calculateDamage(
      this.attackerUnit,
      this.defenderUnit,
      { terrain: 'plain' }
    );
    
    this.assertGreaterThan(damage, 0, 'Damage should be positive');
    this.assertLessThan(damage, 500, 'Damage should be reasonable');
    
    // Apply damage
    const initialHP = this.defenderUnit.getCurrentHP();
    this.defenderUnit.takeDamage(damage);
    
    this.assertEquals(
      this.defenderUnit.getCurrentHP(),
      initialHP - damage,
      'HP should decrease by damage amount'
    );
  }

  // ==================== Test: Terrain Effects on Combat ====================
  
  testTerrainEffectsOnCombat() {
    // Calculate damage on different terrains
    const plainDamage = this.combatCalculator.calculateDamage(
      this.attackerUnit,
      this.defenderUnit,
      { terrain: 'plain' }
    );
    
    const mountainDamage = this.combatCalculator.calculateDamage(
      this.attackerUnit,
      this.defenderUnit,
      { terrain: 'mountain' }
    );
    
    // Mountain should provide defense bonus
    this.assertLessThan(
      mountainDamage,
      plainDamage,
      'Damage should be lower on mountain terrain due to defense bonus'
    );
  }

  // ==================== Test: Unit Movement and Pathfinding ====================
  
  testUnitMovementAndPathfinding() {
    // Place unit on map
    this.battleMap.placeUnit(this.attackerUnit, 2, 2);
    
    // Calculate movement range
    const moveRange = this.battleSystem.calculateMovementRange(
      this.attackerUnit,
      2,
      2
    );
    
    this.assertTrue(
      Array.isArray(moveRange),
      'Movement range should be an array of positions'
    );
    this.assertGreaterThan(moveRange.length, 0, 'Should have movement options');
    
    // Move unit
    const targetX = 4;
    const targetY = 4;
    const canMove = this.battleSystem.moveUnit(
      this.attackerUnit,
      targetX,
      targetY
    );
    
    this.assertTrue(canMove, 'Should be able to move to valid position');
    this.assertEquals(this.attackerUnit.getX(), targetX, 'Unit X position should update');
    this.assertEquals(this.attackerUnit.getY(), targetY, 'Unit Y position should update');
  }

  // ==================== Test: Attack Range Calculation ====================
  
  testAttackRangeCalculation() {
    this.battleMap.placeUnit(this.attackerUnit, 5, 5);
    
    const attackRange = this.battleSystem.calculateAttackRange(
      this.attackerUnit,
      5,
      5
    );
    
    this.assertTrue(
      Array.isArray(attackRange),
      'Attack range should be an array'
    );
    
    // Should include adjacent cells
    const hasAdjacent = attackRange.some(pos => 
      Math.abs(pos.x - 5) <= 1 && Math.abs(pos.y - 5) <= 1
    );
    this.assertTrue(hasAdjacent, 'Attack range should include adjacent cells');
  }

  // ==================== Test: Skill Usage ====================
  
  testSkillUsage() {
    // Give attacker a skill
    this.attackerGeneral.setSkills([{ skillId: 1, level: 1 }]);
    this.attackerUnit = new BattleUnit(this.attackerGeneral, 1);
    
    // Set MP
    this.attackerUnit.setCurrentMP(50);
    
    const skills = this.skillSystem.getAvailableSkills(this.attackerUnit);
    
    this.assertTrue(skills.length > 0, 'Should have available skills');
    
    // Use skill
    if (skills.length > 0) {
      const skill = skills[0];
      const initialMP = this.attackerUnit.getCurrentMP();
      
      const result = this.skillSystem.useSkill(
        this.attackerUnit,
        this.defenderUnit,
        skill
      );
      
      this.assertTrue(result.success, 'Skill use should succeed');
      this.assertLessThan(
        this.attackerUnit.getCurrentMP(),
        initialMP,
        'MP should decrease after skill use'
      );
    }
  }

  // ==================== Test: Weather Effects ====================
  
  testWeatherEffects() {
    // Set weather
    this.weatherSystem.setWeather('rain');
    
    const weather = this.weatherSystem.getCurrentWeather();
    this.assertEquals(weather, 'rain', 'Weather should be set correctly');
    
    // Check weather effects on skills
    const skillEffect = this.skillSystem.getWeatherEffect(1);  // Fire skill
    
    // Rain should reduce fire skill effectiveness
    this.assertLessThan(skillEffect, 1.0, 'Fire skills should be less effective in rain');
  }

  // ==================== Test: AI Controller Decision Making ====================
  
  testAIControllerDecisionMaking() {
    this.battleMap.placeUnit(this.attackerUnit, 3, 3);
    this.battleMap.placeUnit(this.defenderUnit, 5, 5);
    
    const aiDecision = this.aiController.makeDecision(
      this.defenderUnit,
      [this.attackerUnit],
      this.battleMap
    );
    
    this.assertNotNull(aiDecision, 'AI should make a decision');
    this.assertTrue(
      ['move', 'attack', 'skill', 'defend'].includes(aiDecision.action),
      'AI action should be valid'
    );
  }

  // ==================== Test: Battle Turn Flow ====================
  
  testBattleTurnFlow() {
    const battleConfig = {
      attackerUnits: [this.attackerUnit],
      defenderUnits: [this.defenderUnit],
      mapWidth: 15,
      mapHeight: 15
    };
    
    this.battleSystem.initializeBattle(battleConfig);
    
    const initialTurn = this.battleSystem.getCurrentTurn();
    
    // End turn
    this.battleSystem.endTurn();
    
    const nextTurn = this.battleSystem.getCurrentTurn();
    
    this.assertNotEquals(initialTurn, nextTurn, 'Turn should advance');
  }

  // ==================== Test: Unit Death and Removal ====================
  
  testUnitDeathAndRemoval() {
    this.battleMap.placeUnit(this.defenderUnit, 5, 5);
    
    // Deal fatal damage
    this.defenderUnit.takeDamage(this.defenderUnit.getMaxHP() + 100);
    
    this.assertTrue(
      this.defenderUnit.isDead(),
      'Unit should be dead when HP reaches 0'
    );
    
    // Remove dead units
    this.battleSystem.removeDeadUnits();
    
    const unitAtPosition = this.battleMap.getUnitAt(5, 5);
    this.assertNull(unitAtPosition, 'Dead unit should be removed from map');
  }

  // ==================== Test: Battle Victory Condition ====================
  
  testBattleVictoryCondition() {
    const battleConfig = {
      attackerUnits: [this.attackerUnit],
      defenderUnits: [this.defenderUnit],
      mapWidth: 15,
      mapHeight: 15
    };
    
    this.battleSystem.initializeBattle(battleConfig);
    
    // Kill all defender units
    this.defenderUnit.takeDamage(this.defenderUnit.getMaxHP() + 100);
    this.battleSystem.removeDeadUnits();
    
    const winner = this.battleSystem.checkVictoryCondition();
    
    this.assertEquals(winner, 'attacker', 'Attacker should win when all defenders are dead');
  }

  // ==================== Test: Soldier Type Advantages ====================
  
  testSoldierTypeAdvantages() {
    // Cavalry vs Infantry - cavalry has advantage
    this.attackerGeneral.setSoldierType('cavalry');
    this.defenderGeneral.setSoldierType('infantry');
    
    const cavVsInf = this.combatCalculator.calculateDamage(
      new BattleUnit(this.attackerGeneral, 1),
      new BattleUnit(this.defenderGeneral, 2),
      { terrain: 'plain' }
    );
    
    // Infantry vs Cavalry - infantry is at disadvantage
    this.attackerGeneral.setSoldierType('infantry');
    this.defenderGeneral.setSoldierType('cavalry');
    
    const infVsCav = this.combatCalculator.calculateDamage(
      new BattleUnit(this.attackerGeneral, 1),
      new BattleUnit(this.defenderGeneral, 2),
      { terrain: 'plain' }
    );
    
    this.assertGreaterThan(cavVsInf, infVsCav, 
      'Cavalry should deal more damage to infantry than vice versa');
  }

  // ==================== Test: Counter Attack ====================
  
  testCounterAttack() {
    this.battleMap.placeUnit(this.attackerUnit, 4, 4);
    this.battleMap.placeUnit(this.defenderUnit, 5, 5);
    
    // Attacker attacks defender
    const initialAttackerHP = this.attackerUnit.getCurrentHP();
    
    this.battleSystem.performAttack(this.attackerUnit, this.defenderUnit);
    
    // Defender should counter if still alive and in range
    if (!this.defenderUnit.isDead()) {
      this.assertLessThan(
        this.attackerUnit.getCurrentHP(),
        initialAttackerHP,
        'Attacker should take counter damage'
      );
    }
  }

  // ==================== Test: Battle End and Rewards ====================
  
  testBattleEndAndRewards() {
    const battleConfig = {
      attackerUnits: [this.attackerUnit],
      defenderUnits: [this.defenderUnit],
      mapWidth: 15,
      mapHeight: 15,
      cityId: 1
    };
    
    this.battleSystem.initializeBattle(battleConfig);
    
    // Win the battle
    this.defenderUnit.takeDamage(this.defenderUnit.getMaxHP() + 100);
    this.battleSystem.removeDeadUnits();
    
    const result = this.battleSystem.endBattle();
    
    this.assertNotNull(result, 'Battle end should return results');
    this.assertEquals(result.winner, 'attacker', 'Should record winner');
    this.assertTrue(
      result.experienceGained > 0,
      'Should gain experience'
    );
    this.assertTrue(
      Array.isArray(result.survivors),
      'Should list survivors'
    );
  }

  // ==================== Test: Unit Status Effects ====================
  
  testUnitStatusEffects() {
    // Apply status effect
    this.attackerUnit.applyStatusEffect('poisoned', 3);  // Lasts 3 turns
    
    this.assertTrue(
      this.attackerUnit.hasStatusEffect('poisoned'),
      'Unit should have poisoned status'
    );
    
    const initialHP = this.attackerUnit.getCurrentHP();
    
    // Process turn - status should take effect
    this.battleSystem.processTurnEffects();
    
    this.assertLessThan(
      this.attackerUnit.getCurrentHP(),
      initialHP,
      'Poison should deal damage'
    );
    
    // Process 3 turns
    this.battleSystem.endTurn();
    this.battleSystem.endTurn();
    this.battleSystem.endTurn();
    
    this.assertFalse(
      this.attackerUnit.hasStatusEffect('poisoned'),
      'Status should expire after duration'
    );
  }
}

// Register tests
if (typeof window !== 'undefined') {
  window.battleIntegrationTest = new BattleIntegrationTest();
}
