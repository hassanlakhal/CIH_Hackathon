/**
 * Transform raw wallet balance response into UI-friendly dashboard data.
 * Does NOT rename or mutate official API field names in the service layer.
 * This transform is used only for UI consumption.
 */
export function transformBalanceForUI(balanceResponse) {
  if (!balanceResponse?.result?.balance?.length) return null;

  const valueString = balanceResponse.result.balance[0].value;
  const parsedValue = parseFloat(valueString.replace(',', '.'));

  return {
    currentBalance: parsedValue || 0,
    currency: 'MAD',
    contractId: '', // Added later if needed
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Transform raw wallet operations into UI-friendly activity items.
 */
export function transformOperationsForUI(operationsResponse) {
  if (!operationsResponse?.result) return [];

  return operationsResponse.result.map((op) => {
    const rawAmt = parseFloat(String(op.amount || op.totalAmount).replace(',', '.') || '0');
    const isCredit = op.type === 'CREDIT';
    const amount = isCredit ? Math.abs(rawAmt) : -Math.abs(rawAmt);

    const labelOptions = [op.clientNote, `${op.beneficiaryFirstName || ''} ${op.beneficiaryLastName || ''}`.trim()];
    const label = labelOptions.find(l => l && l.length > 0) || 'Opération';

    let category = 'other';
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('aura')) category = 'aura_save';
    else if (lowerLabel.includes('virement')) category = 'income';
    else if (lowerLabel.includes('paiement') || lowerLabel.includes('jumia') || lowerLabel.includes('carrefour')) category = 'shopping';

    let parsedDate = new Date();
    try {
      if (op.date) parsedDate = new Date(op.date);
    } catch (e) {
      // fallback
    }

    return {
      id: op.referenceId || String(Math.random()),
      label: label,
      amount: amount,
      date: parsedDate.toISOString(),
      type: isCredit ? 'credit' : 'debit',
      category: category,
      status: op.status === '000' ? 'completed' : 'pending',
      reference: op.referenceId || '',
    };
  });
}

/**
 * Derive "invisible moves" from operations — these are Aura-generated
 * automatic savings transfers identified by a convention in the label.
 */
export function extractInvisibleMoves(operations) {
  return operations.filter(
    (op) =>
      op.label?.toLowerCase().includes('aura') ||
      op.category === 'aura_save' ||
      op.category === 'invisible_move'
  );
}

/**
 * Compute dashboard summary metrics from balance and operations data.
 */
export function computeDashboardMetrics(balance, operations, settings) {
  const totalSaved = operations
    .filter((op) => op.category === 'aura_save' || op.category === 'invisible_move')
    .reduce((sum, op) => sum + Math.abs(op.amount), 0);

  const safetyFloor = settings?.safetyFloor ?? 200;
  const safeToSave = Math.max(0, (balance?.currentBalance ?? 0) - safetyFloor);
  const savingsGoal = settings?.savingsGoal ?? 5000;
  const goalProgress = savingsGoal > 0 ? Math.min(1, totalSaved / savingsGoal) : 0;

  return {
    totalSaved,
    currentBalance: balance?.currentBalance ?? 0,
    safetyFloor,
    safeToSave,
    savingsGoal,
    goalProgress,
    currency: balance?.currency ?? 'MAD',
  };
}
