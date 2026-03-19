// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// ─── Interface ────────────────────────────────────────────────────────────────

interface IVault {
    function recordStreak(
        address player,
        uint256 roundId,
        uint256 dayIndex,
        uint256 volume
    ) external;

    function playerRecords(
        uint256 roundId,
        address player
    )
        external
        view
        returns (
            uint256 streak,
            uint256 volume,
            uint256 lastValidDay,
            bool claimed,
            bool entered
        );
}

/**
 * @title StreakOracle
 * @notice Off-chain data bridge that accepts validated streak proofs from a
 *         trusted backend hot wallet and forwards them to CeloGrindVault.
 * @dev The trusted submitter is a hot wallet controlled by the oracle service.
 *      Validation rules enforced here:
 *        1. Player must be registered in the round (checked via vault call)
 *        2. dayIndex must be 0-6 (within round window)
 *        3. volume >= 0.50 USDT minimum (500_000 with 6 decimals)
 *        4. Max 1 submission per player per day per round (rate limiting)
 */
contract StreakOracle is Ownable {

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Minimum qualifying volume: 0.50 USDT (6 decimals)
    uint256 public constant MIN_VOLUME = 500_000;

    /// @notice Days per round
    uint256 public constant DAYS_IN_ROUND = 7;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice The CeloGrindVault contract this oracle feeds into
    IVault public vault;

    /// @notice The trusted hot wallet address allowed to submit streak proofs
    address public trustedSubmitter;

    /// @notice roundId => player => dayIndex => submitted
    /// @dev Rate limiting: prevents duplicate submissions for the same (player, round, day)
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public submitted;

    // ─── Events ───────────────────────────────────────────────────────────────

    event StreakSubmitted(
        address indexed player,
        uint256 indexed roundId,
        uint256 dayIndex,
        uint256 volume
    );
    event SubmitterUpdated(address indexed oldSubmitter, address indexed newSubmitter);
    event VaultUpdated(address indexed oldVault, address indexed newVault);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Unauthorized();
    error VolumeTooLow(uint256 provided, uint256 minimum);
    error InvalidDayIndex(uint256 dayIndex);
    error AlreadySubmitted(address player, uint256 roundId, uint256 dayIndex);
    error PlayerNotRegistered(address player, uint256 roundId);
    error InvalidAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param _vault            The CeloGrindVault contract address
     * @param _trustedSubmitter The backend oracle hot wallet address
     */
    constructor(address _vault, address _trustedSubmitter) Ownable(msg.sender) {
        if (_vault == address(0) || _trustedSubmitter == address(0)) revert InvalidAddress();
        vault = IVault(_vault);
        trustedSubmitter = _trustedSubmitter;
    }

    // ─── Submission ───────────────────────────────────────────────────────────

    /**
     * @notice Submit a validated streak proof for a player.
     * @dev Only callable by the trusted submitter hot wallet.
     *
     * Validation:
     *   - Caller must be trustedSubmitter
     *   - volume >= 0.50 USDT (500_000 with 6 decimals)
     *   - dayIndex must be 0–6
     *   - No prior submission for this (player, round, day)
     *   - Player must be registered in the round (checked via vault)
     *
     * @param player    The player's wallet address
     * @param roundId   The round this streak belongs to
     * @param dayIndex  Day within the round (0 = first day, 6 = last day)
     * @param volume    Qualifying cUSD volume for this day
     */
    function submitStreak(
        address player,
        uint256 roundId,
        uint256 dayIndex,
        uint256 volume
    ) external {
        if (msg.sender != trustedSubmitter) revert Unauthorized();
        if (volume < MIN_VOLUME) revert VolumeTooLow(volume, MIN_VOLUME);
        if (dayIndex >= DAYS_IN_ROUND) revert InvalidDayIndex(dayIndex);
        if (submitted[roundId][player][dayIndex]) {
            revert AlreadySubmitted(player, roundId, dayIndex);
        }

        // Check player is registered in the vault
        (, , , , bool entered) = vault.playerRecords(roundId, player);
        if (!entered) revert PlayerNotRegistered(player, roundId);

        // Mark as submitted (rate limit) before external call
        submitted[roundId][player][dayIndex] = true;

        // Forward to vault
        vault.recordStreak(player, roundId, dayIndex, volume);

        emit StreakSubmitted(player, roundId, dayIndex, volume);
    }

    /**
     * @notice Batch submit multiple streak proofs in one tx.
     * @dev Useful for backfilling or catching up on multiple players at once.
     *      Any individual submission that would revert is skipped (continues).
     *      Emits StreakSubmitted only for successful entries.
     *
     * @param players    Array of player addresses
     * @param roundIds   Array of round IDs
     * @param dayIndexes Array of day indexes
     * @param volumes    Array of qualifying volumes
     */
    function batchSubmitStreaks(
        address[] calldata players,
        uint256[] calldata roundIds,
        uint256[] calldata dayIndexes,
        uint256[] calldata volumes
    ) external {
        if (msg.sender != trustedSubmitter) revert Unauthorized();

        uint256 n = players.length;
        require(
            roundIds.length == n && dayIndexes.length == n && volumes.length == n,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < n; i++) {
            address player = players[i];
            uint256 roundId = roundIds[i];
            uint256 dayIndex = dayIndexes[i];
            uint256 volume = volumes[i];

            // Skip rather than revert so we don't lose valid submissions
            if (volume < MIN_VOLUME) continue;
            if (dayIndex >= DAYS_IN_ROUND) continue;
            if (submitted[roundId][player][dayIndex]) continue;

            (, , , , bool entered) = vault.playerRecords(roundId, player);
            if (!entered) continue;

            submitted[roundId][player][dayIndex] = true;

            try vault.recordStreak(player, roundId, dayIndex, volume) {
                emit StreakSubmitted(player, roundId, dayIndex, volume);
            } catch {
                // Undo rate-limit flag on failure so it can be retried
                submitted[roundId][player][dayIndex] = false;
            }
        }
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Update the trusted submitter hot wallet.
     * @param _submitter New submitter address
     */
    function setTrustedSubmitter(address _submitter) external onlyOwner {
        if (_submitter == address(0)) revert InvalidAddress();
        emit SubmitterUpdated(trustedSubmitter, _submitter);
        trustedSubmitter = _submitter;
    }

    /**
     * @notice Update the vault address.
     * @param _vault New vault contract address
     */
    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert InvalidAddress();
        emit VaultUpdated(address(vault), _vault);
        vault = IVault(_vault);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /**
     * @notice Check if a streak has already been submitted for a given day.
     * @param player    Player address
     * @param roundId   Round ID
     * @param dayIndex  Day index (0-6)
     * @return True if already submitted
     */
    function isSubmitted(
        address player,
        uint256 roundId,
        uint256 dayIndex
    ) external view returns (bool) {
        return submitted[roundId][player][dayIndex];
    }
}
