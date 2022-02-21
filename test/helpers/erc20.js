const {getRaffleActorsAsync} = require('../../helpers/address');
const {toWei} = require('../../helpers/utils');
const {MAX_INT} = require('../../helpers/constants');

const tokenBalanceDeltaAfterAction = async (tokenInstance, tokenHolder, action) => {
  const balanceBeforeAction = await tokenInstance.balanceOf(tokenHolder);

  await action();

  const balanceAfterAction = await tokenInstance.balanceOf(tokenHolder);

  const delta = balanceAfterAction.sub(balanceBeforeAction);

  return delta;
};

const topUpUser = async (
  userAddress,
  {
    mockRewardInstance,
    stakingInstance,
    amount = toWei('1000', 'ether')
  }
) => {
  const {owner} = await getRaffleActorsAsync();

  await mockRewardInstance.mint(userAddress, amount, {from: owner});

  if(stakingInstance) {
    await mockRewardInstance.approve(stakingInstance.address, MAX_INT, {from: userAddress});
  }
};

module.exports = {
  tokenBalanceDeltaAfterAction,
  topUpUser
};
