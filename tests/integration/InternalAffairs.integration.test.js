/**
 * Internal Affairs Integration Tests
 * Tests the complete internal affairs command flow
 */

class InternalAffairsIntegrationTest extends TestSuite {
  constructor() {
    super('InternalAffairsIntegration');
    this.gameEngine = null;
    this.stateManager = null;
    this.internalAffairsSystem = null;
    this.cityRepository = null;
    this.personRepository = null;
  }

  async beforeAll() {
    // Initialize game systems
    this.stateManager = new StateManager();
    this.gameEngine = new GameEngine(this.stateManager);
    
    // Load test data
    const dataLoader = new DataLoader();
    await dataLoader.loadFromXML('/data/dat.xml');
    
    this.cityRepository = new CityRepository(dataLoader.getData().cities);
    this.personRepository = new PersonRepository(dataLoader.getData().persons);
    
    // Initialize internal affairs system
    this.internalAffairsSystem = new InternalAffairsSystem(
      this.gameEngine,
      this.cityRepository,
      this.personRepository
    );
    
    // Set up initial game state
    this.stateManager.setState({
      currentPeriod: 1,
      currentYear: 184,
      currentMonth: 1,
      playerForceId: 1
    });
  }

  afterAll() {
    this.gameEngine = null;
    this.stateManager = null;
  }

  beforeEach() {
    // Reset test city and person state
    this.testCity = this.cityRepository.getById(1);
    this.testGeneral = this.personRepository.getById(1);
    
    // Ensure test general is in test city
    this.testGeneral.setCityId(1);
    this.testGeneral.setForceId(1);
    this.testGeneral.setEnergy(100);
    this.testCity.setForceId(1);
  }

  // ==================== Test: Complete Assart Command Flow ====================
  
  testCompleteAssartFlow() {
    // Arrange
    const initialAgri = this.testCity.getAgriculture();
    const initialEnergy = this.testGeneral.getEnergy();
    
    const order = new Order({
      type: 'internal',
      command: 'assart',
      cityId: 1,
      generalId: 1
    });
    
    // Act
    const result = this.internalAffairsSystem.executeOrder(order);
    
    // Assert
    this.assertTrue(result.success, 'Assart command should succeed');
    this.assertGreaterThan(
      this.testCity.getAgriculture(),
      initialAgri,
      'Agriculture should increase'
    );
    this.assertLessThan(
      this.testGeneral.getEnergy(),
      initialEnergy,
      'General energy should decrease'
    );
    this.assertEquals(
      result.commandType,
      'assart',
      'Result should indicate assart command'
    );
  }

  // ==================== Test: Complete Business Command Flow ====================
  
  testCompleteBusinessFlow() {
    const initialCommerce = this.testCity.getCommerce();
    const initialEnergy = this.testGeneral.getEnergy();
    
    const order = new Order({
      type: 'internal',
      command: 'business',
      cityId: 1,
      generalId: 1
    });
    
    const result = this.internalAffairsSystem.executeOrder(order);
    
    this.assertTrue(result.success, 'Business command should succeed');
    this.assertGreaterThan(
      this.testCity.getCommerce(),
      initialCommerce,
      'Commerce should increase'
    );
  }

  // ==================== Test: Search Command with All Outcomes ====================
  
  testSearchCommandVariousOutcomes() {
    // Test search multiple times to cover different outcomes
    const outcomes = [];
    
    for (let i = 0; i < 10; i++) {
      this.testGeneral.setEnergy(100);
      
      const order = new Order({
        type: 'internal',
        command: 'search',
        cityId: 1,
        generalId: 1
      });
      
      const result = this.internalAffairsSystem.executeOrder(order);
      outcomes.push(result.outcome);
    }
    
    // Should have at least one successful outcome
    const hasSuccess = outcomes.some(o => o !== 'nothing');
    this.assertTrue(hasSuccess, 'Search should have successful outcomes');
  }

  // ==================== Test: Father Command with Disaster Recovery ====================
  
  testFatherCommandDisasterRecovery() {
    // Set disaster on city
    this.testCity.setDisasterType('flood');
    this.testCity.setDisasterLevel(3);
    const initialDefense = this.testCity.getDefense();
    
    const order = new Order({
      type: 'internal',
      command: 'father',
      cityId: 1,
      generalId: 1
    });
    
    const result = this.internalAffairsSystem.executeOrder(order);
    
    this.assertTrue(result.success, 'Father command should succeed');
    this.assertGreaterThan(
      this.testCity.getDefense(),
      initialDefense,
      'Defense should increase (disaster prevention)'
    );
  }

  // ==================== Test: Inspection Command Loyalty Effects ====================
  
  testInspectionCommandLoyaltyEffects() {
    // Add generals to city
    const general2 = this.personRepository.getById(2);
    general2.setCityId(1);
    general2.setForceId(1);
    general2.setLoyalty(50);
    
    const initialLoyalty = general2.getLoyalty();
    
    const order = new Order({
      type: 'internal',
      command: 'inspection',
      cityId: 1,
      generalId: 1  // Monarch performs inspection
    });
    
    const result = this.internalAffairsSystem.executeOrder(order);
    
    this.assertTrue(result.success, 'Inspection command should succeed');
    this.assertGreaterThan(
      general2.getLoyalty(),
      initialLoyalty,
      'General loyalty should increase after inspection'
    );
  }

  // ==================== Test: Surrender Command Flow ====================
  
  testSurrenderCommandFlow() {
    // Create a captured general
    const capturedGeneral = this.personRepository.getById(10);
    capturedGeneral.setForceId(2);  // Enemy force
    capturedGeneral.setCityId(null);
    capturedGeneral.setIsCaptured(true);
    capturedGeneral.setLoyalty(30);  // Low loyalty for higher success chance
    
    // Add to city's captives
    this.testCity.addCaptive(10);
    
    const order = new Order({
      type: 'internal',
      command: 'surrender',
      cityId: 1,
      generalId: 1,
      targetId: 10
    });
    
    const result = this.internalAffairsSystem.executeOrder(order);
    
    // Result may succeed or fail depending on loyalty and intelligence
    this.assertNotNull(result, 'Surrender should return a result');
    
    if (result.success) {
      this.assertEquals(
        capturedGeneral.getForceId(),
        1,
        'Captured general should join player force on success'
      );
      this.assertFalse(
        capturedGeneral.getIsCaptured(),
        'General should no longer be captured'
      );
    }
  }

  // ==================== Test: Exchange Command Resource Trading ====================
  
  testExchangeCommandResourceTrading() {
    const initialMoney = this.testCity.getMoney();
    const initialFood = this.testCity.getFood();
    
    // Buy food
    const order = new Order({
      type: 'internal',
      command: 'exchange',
      cityId: 1,
      generalId: 1,
      action: 'buy',
      amount: 1000
    });
    
    const result = this.internalAffairsSystem.executeOrder(order);
    
    this.assertTrue(result.success, 'Exchange command should succeed');
    this.assertLessThan(
      this.testCity.getMoney(),
      initialMoney,
      'Money should decrease when buying food'
    );
    this.assertGreaterThan(
      this.testCity.getFood(),
      initialFood,
      'Food should increase when buying'
    );
  }

  // ==================== Test: Move Command Between Cities ====================
  
  testMoveCommandBetweenCities() {
    // Connect cities
    const city2 = this.cityRepository.getById(2);
    city2.setForceId(1);  // Same force
    this.testCity.addConnection(2);
    city2.addConnection(1);
    
    const generalToMove = this.personRepository.getById(3);
    generalToMove.setCityId(1);
    generalToMove.setForceId(1);
    
    const order = new Order({
      type: 'internal',
      command: 'move',
      cityId: 1,
      targetCityId: 2,
      generalId: 3
    });
    
    const result = this.internalAffairsSystem.executeOrder(order);
    
    this.assertTrue(result.success, 'Move command should succeed');
    this.assertEquals(
      generalToMove.getCityId(),
      2,
      'General should be moved to target city'
    );
  }

  // ==================== Test: Energy Consumption Across Commands ====================
  
  testEnergyConsumptionConsistency() {
    const commands = ['assart', 'business', 'search', 'father', 'inspection'];
    
    commands.forEach(cmd => {
      this.testGeneral.setEnergy(100);
      const initialEnergy = this.testGeneral.getEnergy();
      
      const order = new Order({
        type: 'internal',
        command: cmd,
        cityId: 1,
        generalId: 1
      });
      
      this.internalAffairsSystem.executeOrder(order);
      
      this.assertLessThan(
        this.testGeneral.getEnergy(),
        initialEnergy,
        `${cmd} command should consume energy`
      );
    });
  }

  // ==================== Test: Invalid Command Handling ====================
  
  testInvalidCommandHandling() {
    // Test with insufficient energy
    this.testGeneral.setEnergy(0);
    
    const order = new Order({
      type: 'internal',
      command: 'assart',
      cityId: 1,
      generalId: 1
    });
    
    const result = this.internalAffairsSystem.executeOrder(order);
    
    this.assertFalse(result.success, 'Command should fail with no energy');
    this.assertTrue(
      result.error.includes('energy') || result.error.includes('体力'),
      'Error should mention energy'
    );
  }

  // ==================== Test: Month-End Resource Growth Integration ====================
  
  testMonthEndResourceGrowth() {
    const initialMoney = this.testCity.getMoney();
    const initialFood = this.testCity.getFood();
    
    // Set commerce to ensure growth
    this.testCity.setCommerce(80);
    this.testCity.setAgriculture(80);
    this.testCity.setTaxRate(10);
    
    // Trigger month-end
    const resourceSystem = new ResourceSystem(this.cityRepository);
    resourceSystem.processMonthEnd(1);  // Process for force 1
    
    this.assertGreaterThan(
      this.testCity.getMoney(),
      initialMoney,
      'Money should grow at month end'
    );
    this.assertGreaterThan(
      this.testCity.getFood(),
      initialFood,
      'Food should grow at month end'
    );
  }
}

// Register and run tests
if (typeof window !== 'undefined') {
  window.internalAffairsIntegrationTest = new InternalAffairsIntegrationTest();
}
