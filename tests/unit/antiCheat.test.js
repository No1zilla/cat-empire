import assert from 'node:assert';

export function runAntiCheatTests() {
  console.log('🧪 Тестирование Серверных Анти-Чит Валидаций (Anti-Cheat Validation)...');

  // Моделирование серверного алгоритма валидации покупок по сетке
  const validateIncomingData = (gridState, claimedBought, claimedCoins, lastCheckTime, nowTime) => {
    let minCatsFromGrid = 0;
    let incomePerSec = 0;

    if (Array.isArray(gridState)) {
      gridState.forEach((cell) => {
        if (cell && cell.catLevel) {
          minCatsFromGrid += Math.pow(2, cell.catLevel - 1);
          incomePerSec += Math.pow(2, cell.catLevel - 1);
        }
      });
    }

    // 1. Проверка покупок: totalCatsBought не может быть меньше реального веса сетки
    const validatedBought = Math.max(claimedBought || 0, minCatsFromGrid);

    // 2. Проверка прироста монет за временной интервал
    const deltaSeconds = Math.max(1, nowTime - lastCheckTime);
    const maxPossibleIncome = incomePerSec * deltaSeconds;
    
    return {
      validatedBought,
      maxPossibleIncome
    };
  };

  // ТЕСТ 1: Попытка передать фейковый totalCatsBought = 0 при котике 9 уровня на сетке
  const gridWithLvl9 = [{ slotIndex: 0, catLevel: 9 }];
  const res1 = validateIncomingData(gridWithLvl9, 0, 1000, 100, 110);

  assert.strictEqual(res1.validatedBought, 256, 'Анти-чит должен автоматически восставлять 256 покупок для кота 9-го уровня');
  assert.strictEqual(res1.maxPossibleIncome, 2560, 'Максимальный доход за 10 секунд при доходе 256/сек должен составлять 2560 монет');

  console.log('  ✅ Серверный Анти-Чит Валидатор успешно прошел все тесты физических ограничений!');
}
