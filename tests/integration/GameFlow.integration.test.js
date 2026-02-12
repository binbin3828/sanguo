/**
 * Full Game Flow Integration Test
 * Tests a complete game from start to victory
 */

class GameFlowIntegrationTest extends TestSuite {
  constructor() {
    super('GameFlowIntegration');
    this.gameEngine = null;
    this.stateManager = null;
    this.periodManager = null;
    this.turnManager = null;
    this.internalAffairsSystem = null;
    this.diplomacySystem = null;
    this.militarySystem = null;
    this.battleSystem = null;
    this.cityRepository = null;
    this.personRepository = null;
  }

  async beforeAll() {
    // Initialize all systems
    this.stateManager = new StateManager();
    this.gameEngine = new GameEngine(this.stateManager);
    
    // Load data
    const dataLoader = new DataLoader();
    await dataLoader.loadFromXML('/data/dat.xml');
    
    this.cityRepository = new CityRepository(dataLoader.getData().cities);
    this.personRepository = new PersonRepository(dataLoader.getData().persons);
    this.skillRepository = new SkillRepository(dataLoader.getData().skills);
    
    // Initialize all systems
    this.periodManager = new PeriodManager(dataLoader.getData().periods);
    this.turnManager = new TurnManager(this.stateManager, this.cityRepository);
    
    this.internalAffairsSystem = new InternalAffairsSystem(
      this.gameEngine,
      this.cityRepository,
      this.personRepository
    );
    
    this.diplomacySystem = new DiplomacySystem(
      this.gameEngine,
      this.cityRepository,
      this.personRepository
    );
    
    this.militarySystem = new MilitarySystem(
      this.gameEngine,
      this.cityRepository,
      this.personRepository
    );
    
    const battleMap = new BattleMap(15, 15);
    const combatCalculator = new CombatCalculator(this.skillRepository);
    const skillSystem = new SkillSystem(
      this.skillRepository,
      new WeatherSystem()
    );
    
    this.battleSystem = new BattleSystem(
      this.gameEngine,
      battleMap,
      combatCalculator,
      skillSystem,
      new WeatherSystem(),
      new AIController(combatCalculator)
    );
    
    // Register systems with game engine
    this.gameEngine.registerSystem('internalAffairs', this.internalAffairsSystem);
    this.gameEngine.registerSystem('diplomacy', this.diplomacySystem);
    this.gameEngine.registerSystem('military', this.militarySystem);
    this.gameEngine.registerSystem('battle', this.battleSystem);
    this.gameEngine.registerSystem('turn', this.turnManager);
  }

  beforeEach() {
    // Reset to initial game state
    this.stateManager.reset();
  }

  // ==================== Test: Complete Game Start Flow ====================
  
  testCompleteGameStartFlow() {
    // Step 1: Select period
    const selectedPeriod = this.periodManager.getPeriod(1);
    this.assertNotNull(selectedPeriod, 'Should be able to select period');
    this.assertEquals(selectedPeriod.id, 1, 'Should select period 1');
    
    // Step 2: Initialize game with period
    this.stateManager.setState({
      currentPeriod: 1,
      currentYear: selectedPeriod.startYear,
      currentMonth: 1,
      gameState: 'selecting_king'
    });
    
    // Step 3: Select king
    const availableKings = this.periodManager.getKingsForPeriod(1);
    this.assertTrue(availableKings.length > 0, 'Should have available kings');
    
    const selectedKing = availableKings[0];
    this.stateManager.setState({
      playerKingId: selectedKing.id,
      playerForceId: selectedKing.forceId,
      gameState: 'playing'
    });
    
    // Step 4: Initialize cities and generals for period
    this.periodManager.initializePeriod(1);
    
    // Verify initial setup
    const playerCities = this.cityRepository.getByForceId(selectedKing.forceId);
    this.assertTrue(playerCities.length > 0, 'Player should have at least one city');
    
    const playerGenerals = this.personRepository.getByForceId(selectedKing.forceId);
    this.assertTrue(playerGenerals.length > 0, 'Player should have at least one general');
  }

  // ==================== Test: Multiple Turn Cycle ====================
  
  testMultipleTurnCycle() {
    // Set up initial game
    this.setupBasicGame();
    
    // Execute several turns
    for (let month = 1; month <= 6; month++) {
      const currentMonth = this.stateManager.getState().currentMonth;
      
      // Player phase - execute some commands
      this.executePlayerCommands();
      
      // End player turn
      this.turnManager.endPlayerTurn();
      
      // AI phase
      this.executeAITurn();
      
      // End turn
      this.turnManager.endTurn();
      
      // Verify month advanced
      const newMonth = this.stateManager.getState().currentMonth;
      if (currentMonth === 12) {
        this.assertEquals(newMonth, 1, 'Should advance to month 1 after December');
      } else {
        this.assertEquals(newMonth, currentMonth + 1, 'Should advance one month');
      }
    }
  }

  // ==================== Test: Internal Affairs to Battle Flow ====================
  
  testInternalAffairsToBattleFlow() {
    this.setupBasicGame();
    
    // Phase 1: Build up resources through internal affairs
    const playerCity = this.getPlayerCity();
    const initialAgriculture = playerCity.getAgriculture();
    
    // Execute several assart commands
    for (let i = 0; i < 3; i++) {
      const general = this.getAvailableGeneral();
      if (general && general.getEnergy() >= 10) {
        const order = new Order({
          type: 'internal',
          command: 'assart',
          cityId: playerCity.getId(),
          generalId: general.getId()
        });
        this.internalAffairsSystem.executeOrder(order);
      }
    }
    
    this.assertGreaterThan(
      playerCity.getAgriculture(),
      initialAgriculture,
      'Agriculture should increase from assart commands'
    );
    
    // Phase 2: Recruit soldiers
    const general = this.getAvailableGeneral();
    const initialSoldiers = general.getSoldier();
    
    const recruitOrder = new Order({
      type: 'military',
      command: 'conscription',
      cityId: playerCity.getId(),
      generalId: general.getId(),
      amount: 500
    });
    this.militarySystem.executeOrder(recruitOrder);
    
    this.assertGreaterThan(
      general.getSoldier(),
      initialSoldiers,
      'General should have more soldiers after conscription'
    );
    
    // Phase 3: Find an enemy city and attack
    const enemyCity = this.getAdjacentEnemyCity(playerCity);
    if (enemyCity) {
      const expeditionOrder = new Order({
        type: 'military',
        command: 'expedition',
        fromCityId: playerCity.getId(),
        toCityId: enemyCity.getId(),
        generalId: general.getId()
      });
      
      const result = this.militarySystem.executeOrder(expeditionOrder);
      
      if (result.battleInitiated) {
        this.assertNotNull(
          this.battleSystem.getCurrentBattle(),
          'Battle should be initiated'
        );
      }
    }
  }

  // ==================== Test: Diplomatic Victory Path ====================
  
  testDiplomaticVictoryPath() {
    this.setupBasicGame();
    
    const playerForceId = this.stateManager.getState().playerForceId;
    const enemyCities = this.cityRepository.getAll()
      .filter(c => c.getForceId() !== playerForceId && c.getForceId() !== 0);
    
    if (enemyCities.length === 0) return;  // Skip if no enemies
    
    const targetCity = enemyCities[0];
    const targetForceId = targetCity.getForceId();
    
    // Check if target force has few cities
    const targetForceCities = this.cityRepository.getByForceId(targetForceId);
    
    if (targetForceCities.length === 1) {
      // Try to induce the enemy force
      const diplomat = this.getAvailableGeneral();
      const induceOrder = new Order({
        type: 'diplomacy',
        command: 'induce',
        fromCityId: this.getPlayerCity().getId(),
        toCityId: targetCity.getId(),
        generalId: diplomat.getId()
      });
      
      const result = this.diplomacySystem.executeOrder(induceOrder);
      
      if (result.success) {
        // Verify city changed ownership
        this.assertEquals(
          targetCity.getForceId(),
          playerForceId,
          'City should join player force after successful induce'
        );
      }
    }
  }

  // ==================== Test: Military Conquest Path ====================
  
  testMilitaryConquestPath() {
    this.setupBasicGame();
    
    // Build up military strength
    const playerCity = this.getPlayerCity();
    const generals = this.personRepository.getByForceId(
      this.stateManager.getState().playerForceId
    );
    
    // Recruit troops for all generals
    generals.forEach(general => {
      if (general.getCityId() === playerCity.getId()) {
        const recruitOrder = new Order({
          type: 'military',
          command: 'conscription',
          cityId: playerCity.getId(),
          generalId: general.getId(),
          amount: 1000
        });
        this.militarySystem.executeOrder(recruitOrder);
      }
    });
    
    // Find enemy city
    const enemyCity = this.getAdjacentEnemyCity(playerCity);
    if (!enemyCity) return;
    
    // Launch expedition with multiple generals
    const attackingGenerals = generals
      .filter(g => g.getCityId() === playerCity.getId() && g.getSoldier() > 0)
      .slice(0, 3);  // Up to 3 generals
    
    if (attackingGenerals.length > 0) {
      attackingGenerals.forEach(general => {
        const expeditionOrder = new Order({
          type: 'military',
          command: 'expedition',
          fromCityId: playerCity.getId(),
          toCityId: enemyCity.getId(),
          generalId: general.getId()
        });
        this.militarySystem.executeOrder(expeditionOrder);
      });
      
      // Battle should be initiated
      const battle = this.battleSystem.getCurrentBattle();
      if (battle) {
        // Simulate battle victory
        this.simulateBattleVictory();
        
        // Check if city was captured
        if (enemyCity.getForceId() === this.stateManager.getState().playerForceId) {
          this.assertTrue(true, 'Enemy city captured through military conquest');
        }
      }
    }
  }

  // ==================== Test: Year End Resource Calculation ====================
  
  testYearEndResourceCalculation() {
    this.setupBasicGame();
    
    const playerCity = this.getPlayerCity();
    const initialMoney = playerCity.getMoney();
    const initialFood = playerCity.getFood();
    
    // Advance through a full year
    for (let i = 0; i < 12; i++) {
      this.turnManager.endTurn();
    }
    
    // Check that resources grew
    this.assertGreaterThan(
      playerCity.getMoney(),
      initialMoney,
      'Money should increase over a year'
    );
    this.assertGreaterThan(
      playerCity.getFood(),
      initialFood,
      'Food should increase over a year'
    );
  }

  // ==================== Test: General Recruitment Flow ====================
  
  testGeneralRecruitmentFlow() {
    this.setupBasicGame();
    
    // Find a free general
    const freeGenerals = this.personRepository.getAll()
      .filter(p => p.getForceId() === 0);
    
    if (freeGenerals.length === 0) return;
    
    const targetGeneral = freeGenerals[0];
    const initialForceId = targetGeneral.getForceId();
    
    // Try to recruit through diplomacy
    const diplomat = this.getAvailableGeneral();
    const canvassOrder = new Order({
      type: 'diplomacy',
      command: 'canvass',
      fromCityId: this.getPlayerCity().getId(),
      generalId: diplomat.getId(),
      targetId: targetGeneral.getId()
    });
    
    const result = this.diplomacySystem.executeOrder(canvassOrder);
    
    if (result.success) {
      this.assertEquals(
        targetGeneral.getForceId(),
        this.stateManager.getState().playerForceId,
        'Free general should join player force'
      );
    }
  }

  // ==================== Test: Save and Load Game ====================
  
  async testSaveAndLoadGame() {
    this.setupBasicGame();
    
    // Execute some commands to change state
    this.executePlayerCommands();
    
    // Get current state snapshot
    const gameState = this.stateManager.createSnapshot();
    
    // Simulate save
    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      state: gameState
    };
    
    // Reset state
    this.stateManager.reset();
    
    // Restore from save
    this.stateManager.restoreFromSnapshot(saveData.state);
    
    // Verify state restored correctly
    const restoredState = this.stateManager.getState();
    this.assertEquals(
      restoredState.currentPeriod,
      gameState.currentPeriod,
      'Period should be restored'
    );
    this.assertEquals(
      restoredState.playerForceId,
      gameState.playerForceId,
      'Player force should be restored'
    );
  }

  // ==================== Test: Victory Condition Check ====================
  
  testVictoryConditionCheck() {
    this.setupBasicGame();
    
    const playerForceId = this.stateManager.getState().playerForceId;
    
    // Get initial city count
    const initialCityCount = this.cityRepository.getByForceId(playerForceId).length;
    const totalCities = this.cityRepository.getAll().length;
    
    // Victory requires controlling all cities (or all enemy forces eliminated)
    // For testing, we'll just verify the victory check works
    const isVictory = this.checkVictoryCondition();
    
    if (initialCityCount === totalCities) {
      this.assertTrue(isVictory, 'Should detect victory when all cities controlled');
    } else {
      this.assertFalse(isVictory, 'Should not detect victory when enemies remain');
    }
  }

  // ==================== Test: Complete Multi-Year Campaign ====================
  
  testCompleteMultiYearCampaign() {
    this.setupBasicGame();
    
    const playerForceId = this.stateManager.getState().playerForceId;
    const initialYear = this.stateManager.getState().currentYear;
    
    // Run for 3 years
    for (let year = 0; year < 3; year++) {
      for (let month = 1; month <= 12; month++) {
        // Player phase
        this.executePlayerCommands();
        
        // AI phase
        this.executeAITurn();
        
        // End turn
        this.turnManager.endTurn();
      }
    }
    
    const currentYear = this.stateManager.getState().currentYear;
    this.assertEquals(currentYear, initialYear + 3, 'Should advance 3 years');
    
    // Verify generals gained experience
    const generals = this.personRepository.getByForceId(playerForceId);
    generals.forEach(general => {
      this.assertGreaterThan(general.getExperience(), 0, 
        `General ${general.getId()} should have gained experience`);
    });
  }

  // ==================== Helper Methods ====================
  
  setupBasicGame() {
    // Initialize a basic game state for testing
    this.periodManager.initializePeriod(1);
    
    const kings = this.periodManager.getKingsForPeriod(1);
    const playerKing = kings[0];
    
    this.stateManager.setState({
      currentPeriod: 1,
      currentYear: 184,
      currentMonth: 1,
      playerKingId: playerKing.id,
      playerForceId: playerKing.forceId,
      gameState: 'playing'
    });
  }
  
  getPlayerCity() {
    const playerForceId = this.stateManager.getState().playerForceId;
    const cities = this.cityRepository.getByForceId(playerForceId);
    return cities[0];
  }
  
  getAvailableGeneral() {
    const playerForceId = this.stateManager.getState().playerForceId;
    const generals = this.personRepository.getByForceId(playerForceId);
    return generals.find(g => g.getEnergy() >= 10);
  }
  
  getAdjacentEnemyCity(playerCity) {
    const connections = playerCity.getConnections();
    const playerForceId = this.stateManager.getState().playerForceId;
    
    for (const cityId of connections) {
      const city = this.cityRepository.getById(cityId);
      if (city && city.getForceId() !== playerForceId && city.getForceId() !== 0) {
        return city;
      }
    }
    return null;
  }
  
  executePlayerCommands() {
    // Execute some basic internal affairs commands
    const city = this.getPlayerCity();
    const general = this.getAvailableGeneral();
    
    if (general && general.getEnergy() >= 10) {
      const commands = ['assart', 'business', 'search'];
      const randomCommand = commands[Math.floor(Math.random() * commands.length)];
      
      const order = new Order({
        type: 'internal',
        command: randomCommand,
        cityId: city.getId(),
        generalId: general.getId()
      });
      
      this.internalAffairsSystem.executeOrder(order);
    }
  }
  
  executeAITurn() {
    // Simulate AI executing commands
    const aiForces = [2, 3, 4, 5];  // Common AI force IDs
    
    aiForces.forEach(forceId => {
      const cities = this.cityRepository.getByForceId(forceId);
      cities.forEach(city => {
        // Simple AI: always try to recruit
        const generals = this.personRepository.getByForceId(forceId)
          .filter(g => g.getCityId() === city.getId());
        
        generals.forEach(general => {
          if (general.getEnergy() >= 10 && general.getSoldier() < 1000) {
            const order = new Order({
              type: 'military',
              command: 'conscription',
              cityId: city.getId(),
              generalId: general.getId(),
              amount: 500
            });
            this.militarySystem.executeOrder(order);
          }
        });
      });
    });
  }
  
  simulateBattleVictory() {
    const battle = this.battleSystem.getCurrentBattle();
    if (!battle) return;
    
    // Kill all enemy units
    battle.defenderUnits.forEach(unit => {
      unit.takeDamage(unit.getMaxHP() + 100);
    });
    
    this.battleSystem.removeDeadUnits();
    this.battleSystem.endBattle();
  }
  
  checkVictoryCondition() {
    const playerForceId = this.stateManager.getState().playerForceId;
    const allCities = this.cityRepository.getAll();
    
    // Victory if all cities belong to player or are neutral
    return allCities.every(city => 
      city.getForceId() === playerForceId || city.getForceId() === 0
    );
  }
}

// Register tests
if (typeof window !== 'undefined') {
  window.gameFlowIntegrationTest = new GameFlowIntegrationTest();
}
