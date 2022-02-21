const RAFFLE_STATES = {
  NO_REQUEST: 0,
  REQUEST_PENDING: 1,
  INCONCLUSIVE: 2
};

const ZERO_BYTES32 = '0x0';
const ZERO_BYTES = '0x0000000000000000000000000000000000000000000000000000000000000000';

const DEFAULT_GRACE_PERIOD = '604800'; // 1 week in seconds

const MAX_INT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

module.exports = {
  RAFFLE_STATES,
  DEFAULT_GRACE_PERIOD,
  MAX_INT,
  ZERO_BYTES32,
  ZERO_BYTES
};
