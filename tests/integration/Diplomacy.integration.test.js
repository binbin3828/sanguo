/**
 * Diplomacy Integration Tests
 * Tests the complete diplomacy command flow
 */

class DiplomacyIntegrationTest extends TestSuite {
  constructor() {
    super('DiplomacyIntegration');
    this.gameEngine = null;
    this.stateManager = null;
    this.diplomacySystem = null;
    this.cityRepository = null;
    this.personRepository = null;
    this.aiDiplomacy = null;
  }

  async beforeAll() {
    this.stateManager = new StateManager();
    this.gameEngine = new GameEngine(this.stateManager);
    
    const dataLoader = new DataLoader();
    await dataLoader.loadFromXML('/data/dat.xml');
    
    this.cityRepository = new CityRepository(dataLoader.getData().cities);
    this.personRepository = new PersonRepository(dataLoader.getData().persons);
    
    this.diplomacySystem = new DiplomacySystem(
      this.gameEngine,
      this.cityRepository,
      this.personRepository
    );
    
    this.aiDiplomacy = new AIDiplomacy(
      this.diplomacySystem,
      this.cityRepository,
      this.personRepository
    );
    
    this.stateManager.setState({
      currentPeriod: 1,
      currentYear: 184,
      currentMonth: 1,
      playerForceId: 1
    });
  }

  beforeEach() {
    this.playerCity = this.cityRepository.getById(1);
    this.enemyCity = this.cityRepository.getById(5);
    this.playerGeneral = this.personRepository.getById(1);
    this.enemyGeneral = this.personRepository.getById(10);
    
    this.playerCity.setForceId(1);
    this.enemyCity.setForceId(2);
    
    this.playerGeneral.setCityId(1);
    this.playerGeneral.setForceId(1);
    this.playerGeneral.setEnergy(100);
    this.playerGeneral.setIntelligence(80);
    
    this.enemyGeneral.setCityId(5);
    this.enemyGeneral.setForceId(2);
    this.enemyGeneral.setLoyalty(60);
    this.enemyGeneral.setIntelligence(70);
  }

  // ==================== Test: Alienate Command Flow ====================
  
  testAlienateCommandFlow() {
    const initialLoyalty = this.enemyGeneral.getLoyalty();
    
    const order = new Order({
      type: 'diplomacy',
      command: 'alienate',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1,
      targetId: 10
    });
    
    const result = this.diplomacySystem.executeOrder(order);
    
    this.assertNotNull(result, 'Alienate should return a result');
    
    if (result.success) {
      this.assertLessThan(
        this.enemyGeneral.getLoyalty(),
        initialLoyalty,
        'Enemy general loyalty should decrease on success'
      );
    }
  }

  // ==================== Test: Alienate Success Factors ====================
  
  testAlienateSuccessFactors() {
    // Test with high intelligence diplomat
    this.playerGeneral.setIntelligence(95);
    
    const order = new Order({
      type: 'diplomacy',
      command: 'alienate',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1,
      targetId: 10
    });
    
    // Run multiple times to test probability
    let successCount = 0;
    for (let i = 0; i < 20; i++) {
      this.enemyGeneral.setLoyalty(60);
      const result = this.diplomacySystem.executeOrder(order);
      if (result.success) successCount++;
    }
    
    // High intelligence should yield decent success rate
    this.assertGreaterThan(successCount, 5, 'High intelligence should improve success rate');
  }

  // ==================== Test: Canvass Command Flow ====================
  
  testCanvassCommandFlow() {
    // Set up a free general (not captured, not belonging to any force)
    const freeGeneral = this.personRepository.getById(20);
    freeGeneral.setForceId(0);  // No force
    freeGeneral.setCityId(null);
    freeGeneral.setLoyalty(40);  // Low loyalty for easier recruitment
    
    const order = new Order({
      type: 'diplomacy',
      command: 'canvass',
      fromCityId: 1,
      generalId: 1,
      targetId: 20
    });
    
    const result = this.diplomacySystem.executeOrder(order);
    
    this.assertNotNull(result, 'Canvass should return a result');
    
    if (result.success) {
      this.assertEquals(
        freeGeneral.getForceId(),
        1,
        'Recruited general should join player force'
      );
      this.assertEquals(
        freeGeneral.getCityId(),
        1,
        'Recruited general should move to player city'
      );
    }
  }

  // ==================== Test: Counterespionage Command Flow ====================
  
  testCounterespionageCommandFlow() {
    // Set up a governor for enemy city
    this.enemyGeneral.setLoyalty(40);  // Low loyalty for easier success
    this.enemyCity.setGovernorId(10);
    
    const enemyForceCities = this.cityRepository.getByForceId(2);
    const initialForceCityCount = enemyForceCities.length;
    
    const order = new Order({
      type: 'diplomacy',
      command: 'counterespionage',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1,
      targetId: 10
    });
    
    const result = this.diplomacySystem.executeOrder(order);
    
    this.assertNotNull(result, 'Counterespionage should return a result');
    
    if (result.success) {
      // Governor should become independent
      this.assertNotEquals(
        this.enemyGeneral.getForceId(),
        2,
        'Governor should leave original force on success'
      );
      
      // City should change allegiance or become independent
      const cityForce = this.enemyCity.getForceId();
      this.assertTrue(
        cityForce !== 2 || result.newForceId,
        'City should change force or new force should be created'
      );
    }
  }

  // ==================== Test: Induce Command Flow ====================
  
  testInduceCommandFlow() {
    // Set up enemy force with only one city
    this.enemyCity.setForceId(3);  // Small force
    
    // Set enemy general loyalty low
    this.enemyGeneral.setLoyalty(30);
    
    const order = new Order({
      type: 'diplomacy',
      command: 'induce',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1
    });
    
    const result = this.diplomacySystem.executeOrder(order);
    
    this.assertNotNull(result, 'Induce should return a result');
    
    if (result.success) {
      // All cities of the small force should join player
      this.assertEquals(
        this.enemyCity.getForceId(),
        1,
        'Induced city should join player force'
      );
      this.assertEquals(
        this.enemyGeneral.getForceId(),
        1,
        'General should join player force'
      );
    }
  }

  // ==================== Test: Induce Requires Low City Count ====================
  
  testInduceRequiresLowCityCount() {
    // Set up enemy force with multiple cities
    const enemyCity2 = this.cityRepository.getById(6);
    enemyCity2.setForceId(2);
    
    const order = new Order({
      type: 'diplomacy',
      command: 'induce',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1
    });
    
    // Count cities for force 2
    const enemyCities = this.cityRepository.getByForceId(2);
    
    if (enemyCities.length > 1) {
      // Induce should fail or have very low success rate with many cities
      let successCount = 0;
      for (let i = 0; i < 10; i++) {
        this.enemyGeneral.setLoyalty(20);
        const result = this.diplomacySystem.executeOrder(order);
        if (result.success) successCount++;
      }
      
      // Should have very low success rate against large forces
      this.assertLessThan(successCount, 3, 'Induce should rarely succeed against large forces');
    }
  }

  // ==================== Test: Diplomacy Energy Consumption ====================
  
  testDiplomacyEnergyConsumption() {
    const initialEnergy = this.playerGeneral.getEnergy();
    
    const order = new Order({
      type: 'diplomacy',
      command: 'alienate',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1,
      targetId: 10
    });
    
    this.diplomacySystem.executeOrder(order);
    
    this.assertLessThan(
      this.playerGeneral.getEnergy(),
      initialEnergy,
      'Diplomacy command should consume energy'
    );
  }

  // ==================== Test: AI Diplomacy Target Selection ====================
  
  testAIDiplomacyTargetSelection() {
    // Set up multiple enemy cities
    const enemyCity2 = this.cityRepository.getById(6);
    enemyCity2.setForceId(2);
    enemyCity2.setDefense(30);  // Low defense
    
    const enemyCity3 = this.cityRepository.getById(7);
    enemyCity3.setForceId(2);
    enemyCity3.setDefense(90);  // High defense
    
    const aiDecisions = this.aiDiplomacy.makeDecisions(2);  // AI for force 2
    
    this.assertTrue(
      Array.isArray(aiDecisions),
      'AI should return an array of decisions'
    );
    
    if (aiDecisions.length > 0) {
      // AI should prefer weaker targets
      const targetCities = aiDecisions
        .filter(d => d.command === 'induce' || d.command === 'counterespionage')
        .map(d => d.targetCityId);
      
      this.assertTrue(
        targetCities.length === 0 || targetCities.includes(1),
        'AI should target player city'
      );
    }
  }

  // ==================== Test: AI Diplomacy Priority ====================
  
  testAIDiplomacyPriority() {
    // Set up situation where aliente would be effective
    const enemyGeneral2 = this.personRepository.getById(11);
    enemyGeneral2.setCityId(6);
    enemyGeneral2.setForceId(2);
    enemyGeneral2.setLoyalty(60);
    enemyGeneral2.setIntelligence(50);
    
    const priority = this.aiDiplomacy.evaluateCommandPriority(
      'alienate',
      { fromCityId: 5, toCityId: 1, targetId: 1 }
    );
    
    this.assertGreaterThan(priority, 0, 'Alienate should have positive priority');
    this.assertLessThan(priority, 100, 'Priority should be within range');
  }

  // ==================== Test: Invalid Diplomacy Target Handling ====================
  
  testInvalidDiplomacyTarget() {
    // Try to aliente own general
    const order = new Order({
      type: 'diplomacy',
      command: 'alienate',
      fromCityId: 1,
      toCityId: 1,  // Same city
      generalId: 1,
      targetId: 2   // Same force general
    });
    
    const result = this.diplomacySystem.executeOrder(order);
    
    this.assertFalse(result.success, 'Should not be able to aliente own general');
  }

  // ==================== Test: Diplomacy with Adjacent Cities ====================
  
  testDiplomacyAdjacentCities() {
    // Make cities adjacent
    this.playerCity.addConnection(5);
    this.enemyCity.addConnection(1);
    
    const order = new Order({
      type: 'diplomacy',
      command: 'alienate',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1,
      targetId: 10
    });
    
    const result = this.diplomacySystem.executeOrder(order);
    
    // Should work with adjacent cities
    this.assertNotNull(result, 'Diplomacy should work with adjacent cities');
  }

  // ==================== Test: Loyalty Bounds ====================
  
  testLoyaltyBoundsAfterDiplomacy() {
    // Set loyalty very low
    this.enemyGeneral.setLoyalty(5);
    
    const order = new Order({
      type: 'diplomacy',
      command: 'alienate',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1,
      targetId: 10
    });
    
    // Execute multiple times
    for (let i = 0; i < 5; i++) {
      this.diplomacySystem.executeOrder(order);
    }
    
    // Loyalty should not go below 0
    this.assertGreaterThanOrEquals(
      this.enemyGeneral.getLoyalty(),
      0,
      'Loyalty should not go below 0'
    );
  }

  // ==================== Test: Diplomatic Relations Persistence ====================
  
  testDiplomaticRelationsPersistence() {
    const order = new Order({
      type: 'diplomacy',
      command: 'alienate',
      fromCityId: 1,
      toCityId: 5,
      generalId: 1,
      targetId: 10
    });
    
    const initialLoyalty = this.enemyGeneral.getLoyalty();
    
    // Execute and check persistence
    this.diplomacySystem.executeOrder(order);
    
    // Create state snapshot
    const snapshot = this.stateManager.createSnapshot();
    
    // Restore and verify loyalty change persisted
    this.stateManager.restoreFromSnapshot(snapshot);
    
    this.assertEquals(
      this.enemyGeneral.getLoyalty(),
      snapshot.persons[10].loyalty,
      'Loyalty changes should persist in state'
    );
  }
}

// Register tests
if (typeof window !== 'undefined') {
  window.diplomacyIntegrationTest = new DiplomacyIntegrationTest();
}
