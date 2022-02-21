const batchTransactionsInBlock = async ethersTransactions => {
  await network.provider.send('evm_setAutomine', [false]);
  const pendingTxs = await Promise
    .all(ethersTransactions.map(tx => tx()));

  await network.provider.send('evm_mine');
  await network.provider.send('evm_setAutomine', [true]);

  const receipts = Promise.all(pendingTxs.map(tx => tx.wait()));

  return receipts;
};

module.exports = {
  batchTransactionsInBlock
};
