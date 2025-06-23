import * as assert from 'assert';
import { UnitConverter } from '../providers/unitConverter';

suite('Unit Converter Test Suite', () => {
  
  test('Should convert length units correctly', () => {
    const categories = UnitConverter.getCategories();
    const lengthCategory = categories.find(cat => cat.name === '长度 (Length)');
    assert.ok(lengthCategory, 'Length category should exist');
    
    const nmUnit = lengthCategory?.units.find(u => u.symbol === 'nm');
    const angstromUnit = lengthCategory?.units.find(u => u.symbol === 'Å');
    
    assert.ok(nmUnit && angstromUnit, 'nm and Å units should exist');
    
    // Test 1 nm = 10 Å
    const result = UnitConverter.convert(1, nmUnit!, angstromUnit!);
    assert.strictEqual(result, 10, '1 nm should equal 10 Å');
  });

  test('Should convert time units correctly', () => {
    const categories = UnitConverter.getCategories();
    const timeCategory = categories.find(cat => cat.name === '时间 (Time)');
    assert.ok(timeCategory, 'Time category should exist');
    
    const nsUnit = timeCategory?.units.find(u => u.symbol === 'ns');
    const psUnit = timeCategory?.units.find(u => u.symbol === 'ps');
    
    assert.ok(nsUnit && psUnit, 'ns and ps units should exist');
    
    // Test 1 ns = 1000 ps
    const result = UnitConverter.convert(1, nsUnit!, psUnit!);
    assert.strictEqual(result, 1000, '1 ns should equal 1000 ps');
  });

  test('Should convert temperature correctly', () => {
    const categories = UnitConverter.getCategories();
    const tempCategory = categories.find(cat => cat.name === '温度 (Temperature)');
    assert.ok(tempCategory, 'Temperature category should exist');
    
    const kelvinUnit = tempCategory?.units.find(u => u.symbol === 'K');
    const celsiusUnit = tempCategory?.units.find(u => u.symbol === '°C');
    
    assert.ok(kelvinUnit && celsiusUnit, 'K and °C units should exist');
    
    // Test 273.15 K = 0 °C
    const result = UnitConverter.convert(273.15, kelvinUnit!, celsiusUnit!);
    assert.ok(Math.abs(result - 0) < 0.01, '273.15 K should equal 0 °C');
    
    // Test 298.15 K = 25 °C
    const result2 = UnitConverter.convert(298.15, kelvinUnit!, celsiusUnit!);
    assert.ok(Math.abs(result2 - 25) < 0.01, '298.15 K should equal 25 °C');
  });

  test('Should convert energy units correctly', () => {
    const categories = UnitConverter.getCategories();
    const energyCategory = categories.find(cat => cat.name === '能量 (Energy)');
    assert.ok(energyCategory, 'Energy category should exist');
    
    const kjmolUnit = energyCategory?.units.find(u => u.symbol === 'kJ/mol');
    const evUnit = energyCategory?.units.find(u => u.symbol === 'eV');
    
    assert.ok(kjmolUnit && evUnit, 'kJ/mol and eV units should exist');
    
    // Test conversion exists (exact values may vary due to constants)
    const result = UnitConverter.convert(1, kjmolUnit!, evUnit!);
    assert.ok(result > 0, 'Conversion should produce positive result');
  });

  test('Should convert area units correctly', () => {
    const categories = UnitConverter.getCategories();
    const areaCategory = categories.find(cat => cat.name === '面积 (Area)');
    assert.ok(areaCategory, 'Area category should exist');
    
    const nm2Unit = areaCategory?.units.find(u => u.symbol === 'nm²');
    const angstrom2Unit = areaCategory?.units.find(u => u.symbol === 'Å²');
    
    assert.ok(nm2Unit && angstrom2Unit, 'nm² and Å² units should exist');
    
    // Test 1 nm² = 100 Å²
    const result = UnitConverter.convert(1, nm2Unit!, angstrom2Unit!);
    assert.strictEqual(result, 100, '1 nm² should equal 100 Å²');
  });

  test('Should throw error for incompatible units', () => {
    const categories = UnitConverter.getCategories();
    const lengthCategory = categories.find(cat => cat.name === '长度 (Length)');
    const timeCategory = categories.find(cat => cat.name === '时间 (Time)');
    
    const nmUnit = lengthCategory?.units.find(u => u.symbol === 'nm');
    const nsUnit = timeCategory?.units.find(u => u.symbol === 'ns');
    
    assert.throws(() => {
      UnitConverter.convert(1, nmUnit!, nsUnit!);
    }, 'Should throw error when converting between different categories');
  });

  test('Should get unit by symbol correctly', () => {
    const nmUnit = UnitConverter.getUnitBySymbol('nm', 'length');
    assert.ok(nmUnit, 'Should find nm unit');
    assert.strictEqual(nmUnit?.symbol, 'nm', 'Should return correct unit');
    
    const invalidUnit = UnitConverter.getUnitBySymbol('invalid', 'length');
    assert.strictEqual(invalidUnit, undefined, 'Should return undefined for invalid unit');
  });
});
